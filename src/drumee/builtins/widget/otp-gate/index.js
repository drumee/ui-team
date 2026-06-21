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
    resendService,
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

  const card = overlay.feed(
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
          // Addressable so we can grab the instance after feed() and wrap
          // its submit (see attachSubmitSpinner below).
          sys_pn: "otp-widget",
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
          // Opt-in: when set, dtk_otp delegates resend to the host (which
          // routes it to resendOtpGate) instead of self-POSTing — lets us show
          // a loading state. Omitted → widget keeps its built-in self-resend.
          resendService,
          uiHandler: [widget],
          dataset: { fit: "parent" },
        },
      ],
    })
  );

  // Loading-on-submit: dtk_otp self-POSTs the code from checkForm() once all
  // six boxes are filled and exposes no "submit started" hook, so we wrap the
  // instance's postService and flip data-submitting on its root for the
  // duration of the verify round-trip (see the `[data-submitting]` rule in
  // the otp-gate skin). Only the submit `api` is gated — resend already has
  // its own [data-resending] state and is delegated to the host anyway.
  attachSubmitSpinner(card, api, widget);
}

/**
 * Wrap the dtk_otp instance's postService so the verify round-trip shows a
 * spinner and locks input. Idempotent and best-effort: any failure to resolve
 * the instance just leaves the modal without a submit spinner.
 *
 * @param {Backbone.View} card  the Box.Y returned by overlay.feed()
 * @param {string}        api   the submit SERVICE (resend POSTs elsewhere)
 * @param {Backbone.View} host  host widget, for warn()
 */
async function attachSubmitSpinner(card, api, host) {
  if (!card || typeof card.ensurePart !== "function") return;
  let otp;
  try {
    otp = await card.ensurePart("otp-widget");
  } catch (e) {
    host && host.warn && host.warn("[otp-gate] no otp-widget to gate submit", e);
    return;
  }
  if (!otp || otp._otpGateSubmitWrapped || typeof otp.postService !== "function") {
    return;
  }
  otp._otpGateSubmitWrapped = true;
  const post = otp.postService.bind(otp);
  otp.postService = function (service, ...rest) {
    // Resend (and any non-verify POST) keeps the stock behaviour.
    if (service !== api) return post(service, ...rest);
    if (this.el) this.el.dataset.submitting = "1";
    let p;
    try {
      p = post(service, ...rest);
    } catch (e) {
      if (this.el) this.el.dataset.submitting = "0";
      throw e;
    }
    return Promise.resolve(p).finally(() => {
      // On success the modal is torn down; on a rejected code dtk_otp clears
      // the boxes for re-entry — either way the inputs unlock here.
      if (this.el) this.el.dataset.submitting = "0";
    });
  };
}

/**
 * Host-driven resend for the otp-gate modal. Opt in by passing
 * `resendService` to openOtpModal and routing that service to this helper from
 * the host's onUiEvent, e.g.:
 *
 *   case "otp-gate-resend": return resendOtpGate(this, cmd);
 *
 * `cmd` is the dtk_otp widget that fired the service. While otp.send is in
 * flight a spinner shows on the resend link (see the `[data-resending]` rule
 * in the otp-gate skin); on success the fresh secret is swapped into the
 * widget's payload and the digit boxes are cleared for re-entry.
 *
 * @param {Backbone.View} host       the widget that opened the modal
 * @param {Backbone.View} otpWidget  the dtk_otp instance (the onUiEvent `cmd`)
 */
async function resendOtpGate(host, otpWidget) {
  if (!host || !otpWidget || host._otpGateResending) return;
  host._otpGateResending = true;
  if (otpWidget.el) otpWidget.el.dataset.resending = "1";
  try {
    const otp = await sendOtp(host);
    if (!otp) {
      if (typeof otpWidget.displayMessage === "function") {
        otpWidget.displayMessage(LOCALE.UNKNOWN_ERROR, 1);
      }
      return;
    }
    // Only the secret changes; keep the rest of the payload (hub_id, mfa, …).
    const payload = otpWidget.mget("payload") || {};
    otpWidget.mset({ payload: { ...payload, secret: otp.secret } });
    // Clear the boxes so the stale code isn't auto-resubmitted.
    const p = await otpWidget.ensurePart("digits");
    if (p && p.children) {
      const boxes = p.children.toArray();
      for (const c of boxes) {
        if (typeof c.setValue === "function") c.setValue("");
      }
      if (boxes[0] && typeof boxes[0].focus === "function") boxes[0].focus();
    }
    if (typeof otpWidget.displayMessage === "function") {
      otpWidget.displayMessage(
        LOCALE.NEW_CODE_RESENT || `${LOCALE.VALIDATION_SENT_TO} ${otp.email}`
      );
    }
  } catch (e) {
    host.warn && host.warn("[otp-gate] resend failed", e);
    if (typeof otpWidget.displayMessage === "function") {
      otpWidget.displayMessage(LOCALE.UNKNOWN_ERROR, 1);
    }
  } finally {
    host._otpGateResending = false;
    if (otpWidget.el) otpWidget.el.dataset.resending = "0";
  }
}

module.exports = { sendOtp, openOtpModal, resendOtpGate };
