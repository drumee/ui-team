class settings_delete_account extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._step = 0;
    this._selected = new Set();
    this._showPassword = false;
    this._password = "";
  }

  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
  }

  goTo(step) {
    this._step = step;
    this.feed(require("./skeleton").default(this));
  }

  toggleSelection(key) {
    if (this._selected.has(key)) this._selected.delete(key);
    else this._selected.add(key);
    this.feed(require("./skeleton").default(this));
  }

  capturePassword() {
    const input = this.el && this.el.querySelector('input[name="delete_password"]');
    if (input) this._password = input.value;
  }

  togglePassword() {
    this.capturePassword();
    this._showPassword = !this._showPassword;
    this.feed(require("./skeleton").default(this));
  }

  cancel() {
    this.triggerHandlers({ service: "delete-account-cancel" });
    this.goodbye();
  }

  downloadSelected() {
    this.triggerHandlers({
      service: "delete-account-download",
      selection: Array.from(this._selected),
    });
  }

  finalConfirm() {
    this.capturePassword();
    this.triggerHandlers({
      service: "delete-account-confirm",
      password: this._password,
    });
    this.goodbye();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "delete-account-cancel":
        return this.cancel();

      case "delete-account-back":
        return this.goTo(Math.max(0, this._step - 1));

      case "delete-account-step1-continue":
        return this.goTo(1);

      case "delete-account-step2-skip":
      case "delete-account-step2-continue":
        return this.goTo(2);

      case "delete-account-toggle-item":
        return this.toggleSelection(cmd.mget("item_key"));

      case "delete-account-download":
        return this.downloadSelected();

      case "delete-account-toggle-password":
        return this.togglePassword();

      case "delete-account-final":
        return this.finalConfirm();

      default:
        return;
    }
  }
}

module.exports = settings_delete_account;
