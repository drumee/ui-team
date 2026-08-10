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
 * Same key scheme as @drumee/ui-toolkit's dtk_otp (widgets/otp/index.js
 * `_lockKey`) — MUST stay in sync with it. Duplicated rather than shared
 * because dtk_otp is a vendored package (patched via patch-package) and
 * this file is app code; there's no clean import between the two.
 * @param {string} api SERVICE.* the OTP will verify against
 * @returns {string}
 */
function _lockKey(api) {
  const uid = (typeof Visitor !== "undefined" && Visitor.id) || "anon";
  return `drumee:otp-lock:${uid}:${api || "otp"}`;
}

/**
 * Read the client-side brute-force lock (see dtk_otp) WITHOUT opening the
 * modal. Returns 0 when unlocked/unknown/storage-unavailable, otherwise
 * the number of ms remaining.
 * @param {string} api
 * @returns {number}
 */
function _lockedMsRemaining(api) {
  try {
    const raw = window.localStorage.getItem(_lockKey(api));
    const state = raw ? JSON.parse(raw) : null;
    const remaining = state && state.lockedUntil ? state.lockedUntil - Date.now() : 0;
    return remaining > 0 ? remaining : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * "9:47" style, matching dtk_otp's in-modal countdown.
 * @param {number} ms
 * @returns {string}
 */
function _formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * POST otp.send and return { secret, email } once the email is delivered,
 * `{ locked: true, message }` if the account is still inside a brute-force
 * lock from a previous attempt (no mail sent — a wasted mint/send the user
 * can't act on for the next few minutes), or null if anything else goes
 * wrong. Inline-warn the host widget on failure so it can surface a
 * user-facing error if it wants.
 *
 * @param {Backbone.View} widget
 * @param {string} [api] the SERVICE.* this OTP will verify against — pass
 *   the SAME value you're about to hand openOtpModal so the lock check
 *   lines up with the modal's own (see dtk_otp's _lockKey). Omitting it
 *   checks the generic 'otp' bucket, which is safe but coarser.
 */
async function sendOtp(widget, api) {
  const remaining = _lockedMsRemaining(api);
  if (remaining > 0) {
    return {
      locked: true,
      message: (LOCALE.TOO_MANY_ATTEMPTS || "Too many attempts. Please try again in {0}.").format(
        _formatCountdown(remaining)
      ),
    };
  }
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
  // Use exists() (not get()) for the guard — get() warns "Failed to find
  // kind for dtk_otp" the first time, before we've registered it.
  if (!Kind.exists("dtk_otp")) {
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
          // Addressable so we can grab the instance and wrap its submit (see
          // attachSubmitSpinner below). partHandler pins where the part
          // registers: without it the framework registers on the nearest
          // ancestor declaring _handledEvents.part (not this card), so the
          // host could never resolve "otp-widget". Pinning to the host makes
          // host.on(part.ready) / host._branches deterministic.
          sys_pn: "otp-widget",
          partHandler: [widget],
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
  attachSubmitSpinner(widget, api);
}

/**
 * Wrap the dtk_otp instance's postService so the verify round-trip shows a
 * spinner and locks input. Idempotent and best-effort: if the widget never
 * mounts the modal simply runs without a submit spinner.
 *
 * dtk_otp's kind is pulled in via a dynamic import, so it mounts (and
 * registers its part) AFTER feed() returns — we can't `ensurePart` it
 * synchronously (its parent has no `_branches` yet). Instead we listen for the
 * part.ready event and wrap the instance the moment it registers.
 *
 * dtk_otp's kind is pulled in via a dynamic import, so it mounts (and registers
 * its part) AFTER feed() returns. It registers on its partHandler — which we
 * pin to `host` in the skeleton — so we listen on the host for part.ready and
 * wrap the instance the moment "otp-widget" registers.
 *
 * @param {Backbone.View} host  host widget (the dtk_otp partHandler)
 * @param {string}        api   the submit SERVICE (resend POSTs elsewhere)
 */
function attachSubmitSpinner(host, api) {
  if (!host || typeof host.on !== "function") return;

  const wrap = (otp) => {
    if (!otp || otp._otpGateSubmitWrapped || typeof otp.postService !== "function") {
      return;
    }
    otp._otpGateSubmitWrapped = true;
    const post = otp.postService.bind(otp);
    otp.postService = function (service, ...rest) {
      // Resend (and any non-verify POST) keeps the stock behaviour.
      if (service !== api) return post(service, ...rest);
      // Single-submit guard. dtk_otp.checkForm() has no in-flight lock and is
      // re-entrant (it re-fires on every digit keydown and on paste), so a full
      // set of boxes can POST the verify twice. For consume-once APIs like
      // delete_account the first POST clears the secret server-side, so the
      // second comes back INVALID_CODE — surfacing "wrong code" even though the
      // account was just deleted by the first POST. Swallow re-entrant submits:
      // return a promise that never settles so the duplicate shows neither
      // success nor error; the first submit's result is the only one that acts.
      if (this._otpGateSubmitInFlight) return new Promise(() => {});
      this._otpGateSubmitInFlight = true;
      if (this.el) this.el.dataset.submitting = "1";
      let p;
      try {
        p = post(service, ...rest);
      } catch (e) {
        this._otpGateSubmitInFlight = false;
        if (this.el) this.el.dataset.submitting = "0";
        throw e;
      }
      return Promise.resolve(p).finally(() => {
        // On success the modal is torn down; on a rejected code dtk_otp clears
        // the boxes for re-entry — either way the inputs unlock and the next
        // deliberate attempt is allowed through.
        this._otpGateSubmitInFlight = false;
        if (this.el) this.el.dataset.submitting = "0";
      });
    };
  };

  // Fast path: already registered on the host (host._branches is initialised by
  // its own skeleton parts long before the modal opens).
  const existing = host._branches && host._branches["otp-widget"];
  if (existing && (!existing.isDestroyed || !existing.isDestroyed())) {
    return wrap(existing);
  }
  // Otherwise wrap as soon as dtk_otp registers itself as the "otp-widget"
  // part. Use a named handler + targeted off so we don't disturb the host's
  // other part.ready listeners.
  const onReady = (child) => {
    if (child && child.mget && child.mget(_a.sys_pn) === "otp-widget") {
      host.off(_e.part.ready, onReady);
      wrap(child);
    }
  };
  host.on(_e.part.ready, onReady);
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
    const api = otpWidget.mget && otpWidget.mget(_a.api);
    const otp = await sendOtp(host, api);
    if (otp && otp.locked) {
      if (typeof otpWidget.displayMessage === "function") {
        otpWidget.displayMessage(otp.message, 1, 1);
      }
      return;
    }
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
