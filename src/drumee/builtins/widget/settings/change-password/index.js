/**
 * Change-password modal opened from the Account Credentials card in
 * settings_main. Two views: the form (current/new/confirm + eye toggles)
 * and a success acknowledgement after the server accepts the change.
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

    if (!current || !next || !confirm) {
      this._error = LOCALE.PASSWORD_FIELDS_REQUIRED;
      return this.rerender();
    }
    if (next === current) {
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

    let res;
    try {
      res = await this.postService({
        service: SERVICE.drumate.change_password,
        // hub_id pins the ACL owner check to the user's personal hub
        // (acl/drumate.json: scope=hub, src=owner) — otherwise 403.
        hub_id: Visitor.id,
        old_password: current,
        new_password: next,
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

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "change-password-toggle-current":
        return this.togglePasswordVisibility("current");
      case "change-password-toggle-next":
        return this.togglePasswordVisibility("next");
      case "change-password-toggle-confirm":
        return this.togglePasswordVisibility("confirm");
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
