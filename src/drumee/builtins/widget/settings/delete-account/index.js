
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
    this._password = this.getData().delete_password;
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


  /**
   * 
   */
  downloadSelected() {
    this.postService(SERVICE.drumate.backup, {
      hub_id: Visitor.id,
    }).then((data) => {
      if (data.status === 'OK') {
        this.ensurePart('message').then((p) => {
          p.feed(
            Skeletons.Note({
              className: `${this.fig.family}__warning-text`,
              content: ("A download link will be sent to {0}").format(Visitor.profile().email)
            })
          )
        })
        this.ensurePart("step2-button").then((p) => {
          p.setState(1)
        })
      }
    }).catch((e) => {
      this.warn("Caught error", e)
    })
  }

  /**
   * 
   */
  finalConfirm() {
    this.capturePassword();
    this.postService(SERVICE.drumate.check_password, {
      hub_id: Visitor.id,
      password: this.getData().delete_password,
    }).then((data) => {
      if (data.id !== Visitor.id) {
        this.ensurePart('error-box').then((p) => {
          p.feed(
            Skeletons.Note({
              className: `${this.fig.family}__warning-text`,
              content: LOCALE.WRONG_PASSOWRD
            })
          )
        })
      } else {
        this.postService(SERVICE.drumate.delete_account, {
          hub_id: Visitor.id,
          password: this.getData().delete_password,
        }).then((data) => {
          if (data.status === 'OK') {
            location.reload()
          } else {
            this.ensurePart('error-box').then((p) => {
              p.feed(
                Skeletons.Note({
                  className: `${this.fig.family}__warning-text`,
                  content: "Failde to remove the account"
                })
              )
            })
          }
        }).catch((e) => {
          this.warn("Caught error", e)
        })
      }
    }).catch((e) => {
      this.warn("Caught error", e)
    })
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
