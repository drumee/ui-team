/**
 * Shared email-OTP step-up auth helper.
 *
 * Used by any widget that needs to verify "is the user really at the
 * keyboard?" via an email code, regardless of whether they have a
 * password. Powers the MFA toggle, OAuth-only delete-account /
 * change-email, and any future step-up-protected action.
 *
 * Two helpers, both async, both expect the host widget to:
 *   1. Have a `sys_pn: "overlay"` Wrapper somewhere in its skeleton
 *      (Wrapper.X / Wrapper.Y).
 *   2. Handle the success/cancel services it passed in via onUiEvent.
 */

require("./skin");

/**
 * POST otp.send and return { secret, email } once the email is delivered,
 * or null if anything goes wrong. Inline-warn the host widget on failure
 * so the host can surface a user-facing error if it wants.
 */
async function sendOtp(widget) {
  const profile = Visitor.profile() || {};
  const email = profile.email;
  if (!email) {
    widget.warn && widget.warn("[otp-gate] no email on profile, cannot send OTP");
    return null;
  }
  let res;
  try {
    res = await widget.postService(SERVICE.otp.send, {
      hub_id: Visitor.id,
      email,
    });
  } catch (e) {
    widget.warn && widget.warn("[otp-gate] otp.send failed", e);
    return null;
  }
  if (!res || !res.secret) return null;
  // server returns secret even when SMTP failed (sent:0). Without a
  // delivered code the modal would be a dead end.
  if (!res.sent) return null;
  return { secret: res.secret, email };
}

/**
 * Open the OTP modal in the host's "overlay" Wrapper part.
 *
 * @param {Backbone.View} widget    host widget (must have sys_pn:"overlay")
 * @param {Object}        opts
 * @param {string}        opts.secret           secret returned by sendOtp
 * @param {string}        opts.email            recipient (for the message line)
 * @param {string}        opts.api              SERVICE.* the modal POSTs on completion
 * @param {Object}        [opts.payload={}]     extra fields merged into the POST body
 *                                              (secret, hub_id, code are added automatically)
 * @param {string}        [opts.title]          headline (defaults to LOCALE.MULTI_FACTOR_AUTH)
 * @param {string}        [opts.message]        subtitle (defaults to "VALIDATION_SENT_TO email")
 * @param {string}        opts.successService   onUiEvent service emitted by dtk_otp on success
 * @param {string}        opts.cancelService    onUiEvent service emitted by the close button
 *
 * The dtk_otp widget POSTs `{ ...payload, secret, hub_id, code }` to
 * `api` once the user enters six digits, then triggers `successService`
 * with the server response in `args.data`. Cancel triggers `cancelService`.
 */
async function openOtpModal(widget, opts) {
  const {
    secret,
    email,
    api,
    payload = {},
    title,
    message,
    successService,
    cancelService,
  } = opts;

  // dtk_otp lives in @drumee/ui-toolkit and its loadSeeds() isn't called
  // by the host bundle. Self-register on demand so Kind.waitFor resolves.
  if (!Kind.get("dtk_otp")) {
    Kind.registerAddons({
      dtk_otp: import("@drumee/ui-toolkit/widgets/otp"),
    });
  }
  await Kind.waitFor("dtk_otp");

  const overlay = await widget.ensurePart("overlay");
  if (!overlay) {
    widget.warn && widget.warn("[otp-gate] no `overlay` part on host widget");
    return;
  }

  overlay.feed(
    // bubble:0 + service:"otp-gate-noop" makes the card root a click sink:
    // the framework attaches an onclick that stops propagation, so clicks
    // anywhere inside the popup (including stray bubbles from digit cells
    // or resend link) never reach an ancestor that might dismiss the
    // overlay. Only the explicit close button below carries cancelService.
    Skeletons.Box.Y({
      className: "otp-gate-card",
      service: "otp-gate-noop",
      bubble: 0,
      uiHandler: [widget],
      kids: [
        Skeletons.Button.Svg({
          ico: "cross",
          className: "otp-gate-card__close-btn",
          service: cancelService,
          bubble: 0,
          uiHandler: [widget],
        }),
        {
          // NOTE: dtk_otp emits its success event via `this.mget(_a.service)`
          // — the SAME attribute the framework's __handleClick reads to
          // dispatch click events. So clicks on dtk_otp's empty space would
          // fire successService (e.g. "mfa-changed") and prematurely close
          // the modal. Setting `active:0` here is NOT a fix because line
          // 843 of letc.js (`if (mget('active') === 0) return`) also kills
          // the legitimate checkForm.triggerHandlers() success dispatch.
          // The guard lives in the consumer's onUiEvent: success cases
          // require `args.data` (present only on programmatic triggers,
          // absent on raw MouseEvents). See settings/main/index.js.
          kind: "dtk_otp",
          payload: {
            ...payload,
            secret,
            email,
            hub_id: Visitor.id,
          },
          api,
          title: title || LOCALE.MULTI_FACTOR_AUTH,
          message: message || `${LOCALE.VALIDATION_SENT_TO} ${email}`,
          service: successService,
          uiHandler: [widget],
          dataset: { fit: "parent" },
        },
      ],
    })
  );
}

module.exports = { sendOtp, openOtpModal };
