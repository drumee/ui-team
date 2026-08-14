
const { filesize } = require("@drumee/ui-essentials")
const { sendOtp, openOtpModal } = require("../../otp-gate");
const MAX_BLOB_SIZE = 100000000;

class settings_delete_account extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._export_only = !!this.mget("export_only");
    this._step = this._export_only ? 1 : 0;
    this._selected = new Set();
    this._showPassword = false;
    this._password = "";
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
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
   * Called by websocket events
   * @param {*} data 
   * @returns 
   */
  handleDownload(data) {
    if (this.mget("zipid") !== data.zipid) return;
    if (this._isDownloading === data.zipid) return;
    let progress = this.getPart('progress')
    if (data.exit === 0) {
      if (progress && !progress.isDestroyed()) {
        progress.suppress();
      }
      this._isDownloading = data.zipid;
      let { svc, keysel } = bootstrap();
      let hub_id = this.mget(_a.hub_id);
      let nid = this.mget(_a.nid) || 0;
      let url = `${svc}media.zip?hub_id=${hub_id}&nid=${nid}&id=${data.zipid}&keysel=${keysel}&zipname=${data.zipname}`;
      let a = document.createElement("a");
      a.href = url;
      a.download = data.zipname || "backup.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (this._zipsize > MAX_BLOB_SIZE) {
        Wm.alert(LOCALE.DOWNLOAD_LONG_TIME.format(data.zipname, filesize(this._zipsize)));
      }
      return;
    }

    if (data.exit > 0) {
      if (progress && !progress.isDestroyed()) {
        progress.feed(Skeletons.Note({
          className: `${this.fig.family}__progress-message`,
          content: "An error has occured",
        }));
      }
      return;
    }

    if (data.message == "BEING_CREATED" && progress && !progress.isDestroyed()) {
      progress.el.style.width = `${data.progress}%`;
    }
  }

  onWsMessage(svc, data, options = {}) {
    if (data && data.zipid) {
      this.handleDownload(data);
      // return;
    }
    // if (super.onWsMessage) super.onWsMessage(svc, data, options);
  }

  /**
   * This service won't wait for the backup to finish, since it ;ay take a longtime
   * Backup progress shall be handle through web socket events  
   * @returns 
   */
  downloadSelected() {
    if (!this._selected.size) {
      this.ensurePart("step2-button").then((p) => {
        p.setState(1)
      })
      return
    }
    this.postService(SERVICE.drumate.backup, {
      hub_id: Visitor.id,
      flags: this._selected.keys().toArray()
    }).then((data) => {
      if (!data.zipid) {
        this.warn("Got empty data")
        return;
      }
      this.mset({
        zipid: data.zipid,
        hub_id: Visitor.id,
        nid: data.nid || 0,
      });
      this._zipsize = data.size || 0;
      this.ensurePart("message").then((part) => {
        part.feed(require("./skeleton/progress").default(this));
      });
      this.ensurePart("step2-button").then((p) => {
        p.setState(1)
      })
    }).catch((e) => {
      this.warn("Caught error", e)
    })
  }

  /**
   * Final confirm forks on Visitor.profile().password_set:
   *   - 1 (or undefined for legacy users): pre-check yp/check_password,
   *     then POST drumate.delete_account with the password.
   *   - 0: OAuth-only user — there's no real password to verify. Send
   *     an email OTP, open the shared otp-gate modal, and let the user
   *     submit drumate.delete_account with secret + code.
   */
  finalConfirm() {
    const profile = Visitor.profile() || {};
    const passwordSet = profile.password_set;
    const usePassword = passwordSet === undefined || parseInt(passwordSet) === 1;

    if (usePassword) return this._finalConfirmWithPassword();
    return this._finalConfirmWithOtp();
  }

  _finalConfirmWithPassword() {
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
          location.reload()
        }).catch((e) => {
          this.warn("Caught error", e)
        })
      }
    }).catch((e) => {
      this.warn("Caught error", e)
    })
  }

  async _finalConfirmWithOtp() {
    // In-flight guard: otp.send is a slow round-trip (SMTP) and the confirm
    // button isn't disabled while it runs, so a user who clicks "Delete my
    // account" again (or a duplicate click dispatch) would fire several otp.send
    // calls — each minting a fresh code — landing multiple codes in one email
    // thread. Send exactly one per confirm. (The sibling MFA toggle guards the
    // same way with _mfaInFlight.)
    if (this._deleteOtpSending) return;
    this._deleteOtpSending = true;
    try {
      const otp = await sendOtp(this, SERVICE.drumate.delete_account);
      if (otp && otp.locked) {
        return this.ensurePart("error-box").then((p) => {
          p && p.feed(Skeletons.Note({
            className: `${this.fig.family}__warning-text`,
            content: otp.message,
          }));
        });
      }
      if (!otp) {
        return this.ensurePart("error-box").then((p) => {
          p && p.feed(Skeletons.Note({
            className: `${this.fig.family}__warning-text`,
            content: LOCALE.UNKNOWN_ERROR,
          }));
        });
      }
      return openOtpModal(this, {
        ...otp,
        api: SERVICE.drumate.delete_account,
        successService: "delete-account-otp-success",
        cancelService: "delete-account-otp-cancel",
      });
    } finally {
      this._deleteOtpSending = false;
    }
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

      case "delete-account-otp-success":
        // dtk_otp already POSTed delete_account with secret+code on
        // server side. The session is now logged out (drumate.delete_account
        // ends with this.session.logout). Reload to land on /welcome.
        location.reload();
        return;

      case "delete-account-otp-cancel":
        return this.ensurePart("overlay").then((p) => p && p.clear());

      default:
        return;
    }
  }
}

module.exports = settings_delete_account;
