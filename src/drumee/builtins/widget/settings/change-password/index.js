const { sendOtp, openOtpModal } = require("../../otp-gate");

/**
 * Change-password modal opened from the Account Credentials card in
 * settings_main. Two views: the form and a success acknowledgement after
 * the server accepts the change.
 *
 * Verification follows whether the ACCOUNT has ever set a password:
 *   - password-backed → type the current password (form shows the field);
 *   - never set one (OAuth signup) → confirm with an email OTP popup, and
 *     this flow effectively sets the account's first password.
 *
 * "Password-backed" = profile.password_set (stamped by signup, password
 * changes/resets, and self-healed by yp.login on every successful
 * password login). Accounts predating the flag fall back to OAuth-links
 * inference: linked provider → treat as OAuth-only until a password
 * login proves otherwise.
 */
class settings_change_password extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._step = "form";
    this._show = { current: false, next: false, confirm: false };
    this._values = { current: "", next: "", confirm: "" };
    this._error = "";
    this._submitting = false;
    // "Log out of other devices" — checked by default: the main reason
    // to change a password is suspicion that someone else has it.
    this._logoutOthers = true;
  }

  async onDomRefresh() {
    await this._resolveUsePassword();
    this.feed(require("./skeleton").default(this));
  }

  rerender() {
    this.feed(require("./skeleton").default(this));
  }

  usePassword() {
    // Resolved once in onDomRefresh (profile flag, else OAuth inference).
    return this._usePassword !== false;
  }

  /**
   * Always re-fetch password_set fresh from the server (same yp.hello +
   * Visitor.respawn pattern as settings_main._refreshVisitorProfile) —
   * never trust the cached Visitor.profile() carried over from page load.
   * That cache goes stale the moment the account's password state changes
   * server-side (e.g. this same modal just set the account's first
   * password via OTP): without a re-fetch, reopening it in the same tab
   * would keep reading the pre-change value and re-offer OTP forever.
   */
  async _resolveUsePassword() {
    try {
      const data = await this.fetchService(SERVICE.yp.hello, { hub_id: Visitor.id });
      if (data) Visitor.respawn(data);
    } catch (e) {
      this.warn("change-password: profile refresh failed", e);
    }
    const passwordSet = (Visitor.profile() || {}).password_set;
    if (passwordSet !== undefined && passwordSet !== null) {
      this._usePassword = parseInt(passwordSet) === 1;
      return;
    }
    // Legacy account predating the flag — infer from OAuth links.
    try {
      const res = await this.fetchService(SERVICE.drumate.list_oauth_links, {
        hub_id: Visitor.id,
      });
      const links = Array.isArray(res) ? res : (res && res.data) || [];
      this._usePassword = !(links && links.length > 0);
    } catch (e) {
      this._usePassword = true;
    }
  }

  _captureValues() {
    if (!this.el) return;
    const q = (n) => this.el.querySelector(`input[name="${n}"]`);
    this._values = {
      current: (q("current_password") || {}).value || "",
      next: (q("new_password") || {}).value || "",
      confirm: (q("confirm_password") || {}).value || "",
    };
  }

  togglePasswordVisibility(field) {
    this._captureValues();
    this._show[field] = !this._show[field];
    this.rerender();
  }

  toggleLogoutOthers() {
    this._captureValues();
    this._logoutOthers = !this._logoutOthers;
    this.rerender();
  }

  cancel() {
    this.triggerHandlers({ service: "change-password-cancel" });
    this.goodbye();
  }

  done() {
    this.triggerHandlers({ service: "change-password-done" });
    this.goodbye();
  }

  async submit() {
    if (this._submitting) return;
    this._captureValues();
    const { current, next, confirm } = this._values;
    const usePassword = this.usePassword();

    if ((usePassword && !current) || !next || !confirm) {
      this._error = LOCALE.PASSWORD_FIELDS_REQUIRED;
      return this.rerender();
    }
    if (usePassword && next === current) {
      this._error = LOCALE.PASSWORD_SAME_AS_CURRENT;
      return this.rerender();
    }
    if (next.length < 8) {
      this._error = LOCALE.PASSWORD_TOO_SHORT;
      return this.rerender();
    }
    if (next !== confirm) {
      this._error = LOCALE.PASSWORDS_DONT_MATCH;
      return this.rerender();
    }

    this._submitting = true;
    this._error = "";
    this.rerender();

    // OAuth-only accounts: confirm via email OTP, then the OTP modal posts
    // change_password itself with {secret, code, new_password}.
    if (!usePassword) return this._submitWithOtp(next);

    let res;
    try {
      res = await this.postService({
        service: SERVICE.drumate.change_password,
        // hub_id pins the ACL owner check to the user's personal hub
        // (acl/drumate.json: scope=hub, src=owner) — otherwise 403.
        hub_id: Visitor.id,
        old_password: current,
        new_password: next,
        logout_others: this._logoutOthers ? 1 : 0,
      });
    } catch (e) {
      this._submitting = false;
      this._error = LOCALE.PASSWORD_CHANGE_FAILED;
      return this.rerender();
    }

    // Server always returns 200; failures surface as an `error` field
    // in the payload (see drumate.change_password in server-team).
    const code = res && res.error;
    if (code === "wrong_password") {
      this._submitting = false;
      this._error = LOCALE.WRONG_CURRENT_PASSWORD;
      return this.rerender();
    }
    if (code === "uncompliant_password") {
      this._submitting = false;
      this._error = LOCALE.PASSWORD_TOO_SHORT;
      return this.rerender();
    }
    if (code) {
      this._submitting = false;
      this._error = LOCALE.PASSWORD_CHANGE_FAILED;
      return this.rerender();
    }

    this._step = "success";
    this._submitting = false;
    this._values = { current: "", next: "", confirm: "" };
    this.rerender();
  }

  async _submitWithOtp(next) {
    const otp = await sendOtp(this, SERVICE.drumate.change_password);
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
    return openOtpModal(this, {
      ...otp,
      api: SERVICE.drumate.change_password,
      payload: {
        new_password: next,
        logout_others: this._logoutOthers ? 1 : 0,
      },
      successService: "change-password-otp-success",
      cancelService: "change-password-otp-cancel",
    });
  }

  _onOtpSuccess(data) {
    if (data && data.error) {
      this._submitting = false;
      this._error =
        data.error === "INVALID_CODE"
          ? LOCALE.INVALID_CODE
          : LOCALE.PASSWORD_CHANGE_FAILED;
      return this.rerender();
    }
    this._step = "success";
    this._submitting = false;
    this._values = { current: "", next: "", confirm: "" };
    // rerender refeeds the root (modal + empty overlay slot), which also
    // clears the OTP popup.
    this.rerender();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "change-password-toggle-current":
        return this.togglePasswordVisibility("current");
      case "change-password-toggle-next":
        return this.togglePasswordVisibility("next");
      case "change-password-toggle-confirm":
        return this.togglePasswordVisibility("confirm");
      case "change-password-toggle-logout":
        return this.toggleLogoutOthers();
      case "change-password-otp-success":
        // args.data is present only on dtk_otp's programmatic success
        // dispatch — absent on stray clicks bubbling through the modal
        // (see otp-gate's dispatch note). Never treat a click as success.
        if (!args || !args.data) return;
        return this._onOtpSuccess(args.data);
      case "change-password-otp-cancel":
        this._submitting = false;
        return this.rerender();
      case "change-password-cancel":
        return this.cancel();
      case "change-password-submit":
        return this.submit();
      case "change-password-done":
        return this.done();
      default:
        return;
    }
  }
}

module.exports = settings_change_password;
