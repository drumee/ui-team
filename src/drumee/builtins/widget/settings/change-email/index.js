const { sendOtp, openOtpModal } = require("../../otp-gate");

/**
 * Change-email modal opened from the Account Credentials card in
 * settings_main. Two views: the form (current email read-only,
 * new email + current-password) and a success acknowledgement after
 * the server accepts the change.
 *
 * BE flow (server-team/service/private/drumate.js#change_email):
 *   - The server only takes `email` and validates format + uniqueness.
 *     It does NOT verify the password. We therefore pre-validate the
 *     current password via SERVICE.yp.check_password, then short-circuit
 *     on existing-address via SERVICE.yp.email_exists, and only then call
 *     SERVICE.drumate.change_email.
 *   - On format/existence failure the server replies 400 with a localized
 *     `error` string via exception.user(). That bypasses the postService
 *     promise (resolves to undefined) and lands in onServerComplain — we
 *     override it to surface the message inside this modal.
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

  async _callChangeEmail(email) {
    // hub_id pins the ACL owner check to the user's personal hub
    // (acl/drumate.json: scope=hub, src=owner) — otherwise 403.
    return this.postService({
      service: SERVICE.drumate.change_email,
      hub_id: Visitor.id,
      email,
    });
  }

  async submit() {
    if (this._submitting) return;
    this._captureValues();
    const { email, password } = this._values;
    const current = (Visitor.profile() || {}).email || "";
    const profile = Visitor.profile() || {};
    const passwordSet = profile.password_set;
    const usePassword =
      passwordSet === undefined || parseInt(passwordSet) === 1;

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

    // Passwordless / OAuth accounts (password_set === 0) have no current
    // password to verify — confirm the change via OTP instead of posting an
    // empty password to yp.check_password (which would always fail).
    if (!usePassword) return this._submitWithOtp(email);

    // Step 1 — verify current password. yp.check_password returns the
    // user row on success and an empty payload on mismatch.
    const pw = await this.postService(SERVICE.yp.check_password, {
      hub_id: Visitor.id,
      password,
    });
    if (this._error) return; // onServerComplain already reacted
    if (!pw || _.isEmpty(pw)) {
      this._submitting = false;
      this._error = LOCALE.WRONG_CURRENT_PASSWORD;
      return this.rerender();
    }

    // Step 2 — fail fast if the address is already taken. Saves a 400
    // round-trip and gives a friendlier inline message.
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

    const data = await this._callChangeEmail(email, { password });
    if (this._error) return;
    return this._onChangeEmailSuccess(email, data);
  }

  async _submitWithOtp(email) {
    const otp = await sendOtp(this, SERVICE.drumate.change_email);
    if (otp && otp.locked) {
      this._submitting = false;
      this._error = otp.message;
      return this.rerender();
    }
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
    if (this._resending || !this._sentTo) return;
    this._resending = true;
    this._error = "";
    this.rerender();

    const data = await this._callChangeEmail(this._sentTo);
    if (this._error) return;

    if (data && data.profile) {
      Visitor.set(_a.profile, data.profile);
    }
    this._resending = false;
    this.rerender();
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
      default:
        return;
    }
  }
}

module.exports = settings_change_email;
