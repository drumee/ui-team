const { sendOtp, openOtpModal } = require("../../otp-gate");

/**
 * Change-email modal opened from the Account Credentials card in
 * settings_main. Two views: the form (current email read-only,
 * new email + current-password) and a success acknowledgement after
 * the server accepts the change.
 *
 * Verifier branches on Visitor.profile().password_set:
 *   - 1 (or undefined for legacy): pre-check yp.check_password, then call
 *     drumate.change_email with {email, password}. The server now also
 *     re-verifies the password defense-in-depth.
 *   - 0: OAuth-only user — there's no password to enter. Fire otp.send,
 *     open the shared otp-gate modal, and submit drumate.change_email
 *     with {email, secret, code} for the server to validate.
 */
class settings_change_email extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._step = "form";
    this._show = { password: false };
    this._values = { email: "", password: "" };
    this._error = "";
    this._submitting = false;
    this._resending = false;
    this._sentTo = "";
  }

  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
  }

  rerender() {
    this.feed(require("./skeleton").default(this));
  }

  _captureValues() {
    if (!this.el) return;
    const q = (n) => this.el.querySelector(`input[name="${n}"]`);
    this._values = {
      email: (q("new_email") || {}).value || "",
      password: (q("confirm_password") || {}).value || "",
    };
  }

  togglePasswordVisibility() {
    this._captureValues();
    this._show.password = !this._show.password;
    this.rerender();
  }

  cancel() {
    this.triggerHandlers({ service: "change-email-cancel" });
    this.goodbye();
  }

  done() {
    this.triggerHandlers({ service: "change-email-done" });
    this.goodbye();
  }

  // postService funnels HTTP 400 (exception.user) here. We swallow the
  // default Backbone behaviour and render the message inside the modal.
  onServerComplain(payload) {
    let message = "";
    if (payload && _.isString(payload.error)) {
      message = payload.error;
    }
    this._submitting = false;
    this._resending = false;
    this._error = message || LOCALE.EMAIL_CHANGE_FAILED;
    this.rerender();
  }

  async _callChangeEmail(email, extra = {}) {
    // hub_id pins the ACL owner check to the user's personal hub
    // (acl/drumate.json: scope=hub, src=owner) — otherwise 403.
    // For password_set=1 users we forward the password so the server
    // can re-verify defense-in-depth. The OAuth path uses the dtk_otp
    // modal directly (it POSTs change_email with secret+code).
    return this.postService({
      service: SERVICE.drumate.change_email,
      hub_id: Visitor.id,
      email,
      ...extra,
    });
  }

  async submit() {
    if (this._submitting) return;
    this._captureValues();
    const { email, password } = this._values;
    const current = (Visitor.profile() || {}).email || "";
    const profile = Visitor.profile() || {};
    const passwordSet = profile.password_set;
    const usePassword = passwordSet === undefined || parseInt(passwordSet) === 1;

    if (!email) {
      this._error = LOCALE.EMAIL_FIELDS_REQUIRED;
      return this.rerender();
    }
    if (usePassword && !password) {
      this._error = LOCALE.EMAIL_FIELDS_REQUIRED;
      return this.rerender();
    }
    if (!email.isEmail || !email.isEmail()) {
      this._error = LOCALE.INVALID_EMAIL;
      return this.rerender();
    }
    if (email === current) {
      this._error = LOCALE.EMAIL_SAME_AS_CURRENT;
      return this.rerender();
    }

    this._submitting = true;
    this._error = "";
    this.rerender();

    // Fail fast if the address is already taken — same pre-check for
    // both password and OTP paths. Saves a 400 round-trip on the
    // change_email call.
    const exists = await this.postService(SERVICE.yp.email_exists, {
      hub_id: Visitor.id,
      value: email,
    });
    if (this._error) return;
    if (exists && exists.email) {
      this._submitting = false;
      this._error = email.printf
        ? email.printf(LOCALE.EMAIL_ALREADY_EXISTS)
        : LOCALE.EMAIL_ALREADY_EXISTS;
      return this.rerender();
    }

    if (usePassword) return this._submitWithPassword(email, password);
    return this._submitWithOtp(email);
  }

  async _submitWithPassword(email, password) {
    // Pre-check the password client-side (yp.check_password returns the
    // user row on success, empty on mismatch). The server-side
    // drumate.change_email also re-verifies; this just gives a faster
    // inline error.
    const pw = await this.postService(SERVICE.yp.check_password, {
      hub_id: Visitor.id,
      password,
    });
    if (this._error) return;
    if (!pw || _.isEmpty(pw)) {
      this._submitting = false;
      this._error = LOCALE.WRONG_CURRENT_PASSWORD;
      return this.rerender();
    }

    const data = await this._callChangeEmail(email, { password });
    if (this._error) return;
    return this._onChangeEmailSuccess(email, data);
  }

  async _submitWithOtp(email) {
    const otp = await sendOtp(this);
    if (!otp) {
      this._submitting = false;
      this._error = LOCALE.UNKNOWN_ERROR;
      return this.rerender();
    }
    // Stash the new email so the OTP success handler knows what to apply.
    this._pendingEmail = email;
    return openOtpModal(this, {
      ...otp,
      api: SERVICE.drumate.change_email,
      payload: { email },
      successService: "change-email-otp-success",
      cancelService: "change-email-otp-cancel",
    });
  }

  _onChangeEmailSuccess(email, data) {
    if (data && data.profile) {
      Visitor.set(_a.profile, data.profile);
    }
    // Notify the parent (settings_main) so it can refresh the email row
    // underneath the modal without waiting for the user to click Done.
    this.triggerHandlers({ service: "change-email-success", email });
    this._step = "success";
    this._submitting = false;
    this._sentTo = email;
    this._values = { email: "", password: "" };
    this.rerender();
  }

  async resend() {
    // The success view shows a "Resend email" link from a planned
    // confirmation-email flow that was never implemented server-side
    // (drumate.change_email applies the change directly, no email).
    // Re-firing change_email now also requires fresh credentials
    // (password or fresh OTP), neither of which we hold post-success.
    // Treat as a visual no-op until that flow ships.
    if (this._resending || !this._sentTo) return;
    this._resending = true;
    this.rerender();
    setTimeout(() => {
      this._resending = false;
      this.rerender();
    }, 400);
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "change-email-toggle-password":
        return this.togglePasswordVisibility();
      case "change-email-cancel":
        return this.cancel();
      case "change-email-submit":
        return this.submit();
      case "change-email-done":
        return this.done();
      case "change-email-resend":
        return this.resend();

      case "change-email-otp-success": {
        // dtk_otp already POSTed change_email{secret,code,email}. Server
        // returned the updated profile in args.data — apply it and flip
        // to the success step. Close the OTP overlay first.
        const email = this._pendingEmail;
        this._pendingEmail = null;
        this.ensurePart("overlay").then((p) => p && p.clear());
        return this._onChangeEmailSuccess(email, args && args.data);
      }

      case "change-email-otp-cancel":
        this._submitting = false;
        this._pendingEmail = null;
        this.ensurePart("overlay").then((p) => p && p.clear());
        return;

      default:
        return;
    }
  }
}

module.exports = settings_change_email;
