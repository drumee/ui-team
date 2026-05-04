/**
 * Change-email modal opened from the Account Credentials card in
 * settings_main. Two views: the form (current email read-only,
 * new email + password with eye toggle) and a success acknowledgement
 * after the server accepts the change.
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

  async submit() {
    if (this._submitting) return;
    this._captureValues();
    const { email, password } = this._values;
    const current = (Visitor.profile() || {}).email || "";

    if (!email || !password) {
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

    let res;
    try {
      res = await this.postService({
        service: SERVICE.drumate.change_email,
        // hub_id pins the ACL owner check to the user's personal hub
        // (acl/drumate.json: scope=hub, src=owner) — otherwise 403.
        hub_id: Visitor.id,
        email,
        password,
      });
    } catch (e) {
      this._submitting = false;
      this._error = LOCALE.EMAIL_CHANGE_FAILED;
      return this.rerender();
    }

    const code = res && res.error;
    if (code === "wrong_password") {
      this._submitting = false;
      this._error = LOCALE.WRONG_CURRENT_PASSWORD;
      return this.rerender();
    }
    if (code === "email_already_exist" || code === "EMAIL_ALREADY_EXIST") {
      this._submitting = false;
      this._error = LOCALE.EMAIL_ALREADY_EXISTS;
      return this.rerender();
    }
    if (code === "invalid_email_format" || code === "INVALID_EMAIL_FORMAT") {
      this._submitting = false;
      this._error = LOCALE.INVALID_EMAIL;
      return this.rerender();
    }
    if (code) {
      this._submitting = false;
      this._error = LOCALE.EMAIL_CHANGE_FAILED;
      return this.rerender();
    }

    this._step = "success";
    this._submitting = false;
    this._sentTo = email;
    this._values = { email: "", password: "" };
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
      default:
        return;
    }
  }
}

module.exports = settings_change_email;
