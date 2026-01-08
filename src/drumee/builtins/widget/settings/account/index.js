require("@drumee/ui-toolkit");
const PRICES = {
  startups: 3059,
  pro: 1444
}
/**
 *
 *
 */
class settings_account extends LetcBox {
  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
    });
    this.declareHandlers();
    this.getApi = this.getApi.bind(this);
    this.skeletons = [
      require("./skeleton/profile").default,
      function (ui) { return { kind: "settings_billing", uiHandler: [ui] } },
      require("./skeleton/storage").default,
      require("./skeleton/security").default,
    ];
    this.tab_name = [
      LOCALE.PROFILE,
      "Billing Information",
      LOCALE.STORAGE,
      LOCALE.SECURITY,
    ];
    if (this.canAdmin()) {
      this.tab_name.push("My seats");
      this.skeletons.push(require("./skeleton/seats").default)
    }
  }

  /**
   * 
   */
  canAdmin() {
    if (!/^pro$/i.test(Visitor.quota()?.plan)) return false;
    return Visitor.domainCan(_K.permission.admin_member) || Visitor.get("domain_id") == 1
  }
  /**
   *
   */
  getViewMode() {
    return _a.grid;
  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        // Validate _page exists and is within bounds
        if (this._page != null && this._page >= 0 && this._page < this.skeletons.length) {
          const skeletonFn = this.skeletons[this._page];
          if (typeof skeletonFn === 'function') {
            child.feed(skeletonFn(this));
          }
        }
        break;
    }
  }

  /**
   *
   */
  onDomRefresh() {
    this._page = 0;
    this._category = "*";
    this.feed(require("./skeleton").default(this));
  }

  /**
   *
   */
  load_page(cmd) {
    if (cmd) this._page = cmd.mget(_a.page);
    this.__content.feed(this.skeletons[this._page](this));
    this.ensurePart("tab-name").then((p) => {
      p.set({ content: this.tab_name[this._page] });
    });
    this.ensurePart(_a.footer).then((p) => {
      p.el.dataset.page = this._page;
    });
    if (this._page == 1) {
      this.el.dataset.tab = "billing"
    } else {
      this.el.dataset.tab = "other"
    }
  }

  /**
   *
   */
  getApi() {
    return {
      service: SERVICE.desk.disk_usage,
      hub_id: Visitor.id,
      category: this._category || "*",
      list: 1,
    };
  }

  /**
   *
   * @returns
   */
  showError(content) {
    return this.ensurePart("error").then((p) => {
      p.set({ content });
      p.el.dataset.state = "1";
    });
  }

  /**  
   * 
  */
  handSeatsManager() {
    let kind = "window_adminpanel";
    let e = Wm.getItemByKind(kind);
    if (e && !e.isDestroyed()) {
      e.raise();
      return;
    }
    Wm.changeModalState(_a.closed); /** Hide the modal that contain this widget */
    Wm.launch({ kind, source: this }, { explicit: 1, singleton: 1 });
    let timer = setInterval(() => {
      e = Wm.getItemByKind(kind);
      if (e) {
        clearInterval(timer)
        e.once(_e.destroy, () => {
          Wm.changeModalState(_a.open);
        })
      }
    }, 1000)

  }

  /**
   *
   */
  async updatePassword() {
    let { old_password, password: new_password, password2 } = this.getData();
    this.debug("AAA:83", old_password, new_password);
    if (!new_password) {
      return this.showError(LOCALE.UNCOMPLIANT_PASSWORD);
    }
    if (password2 != new_password) {
      return this.showError(LOCALE.MISMATCHED_PASSWORD);
    }
    this.postService(SERVICE.drumate.change_password, {
      old_password,
      new_password,
      hub_id: Visitor.id,
    }).then((data) => {
      this.debug("AAA:101", data);
      if (!data || data.error) {
        switch (data.error) {
          case "wrong_password":
            return this.showError(LOCALE.WRONG_CREDENTIALS);
          case "uncompliant_password":
            return this.showError(LOCALE.UNCOMPLIANT_PASSWORD);
          default:
            return this.showError(LOCALE.UNKNOWN_ERROR);
        }
      }
      this.__overlay.feed(
        require("./skeleton/ack").default(this, LOCALE.PASS_PHRASE_UPDATED)
      );
      // this.__content.feed(this.skeletons[this._page](this));
    });
  }

  /**
   *
   */
  async updateProfile() {
    let { code, email: new_email } = this.getData();
    const { email } = Visitor.profile();
    this._secret = "";
    if (new_email && new_email != email && !code) {
      let { email: exists } = await this.postService(SERVICE.yp.email_exists, {
        value: new_email,
        hub_id: Visitor.id,
      });
      if (exists)
        return this.showError(LOCALE.ALREADY_EXISTS.format(new_email));
      let { sent, secret } = await this.postService(SERVICE.otp.send, {
        email,
        hub_id: Visitor.id,
      });
      this.debug("AAAA:194", secret)
      this._secret = secret;
      return this.__overlay.feed(
        require("./skeleton/form-otp").default(this, "update-profile")
      );
    }

    this.postService(SERVICE.drumate.update_profile, {
      secret: this._secret,
      code,
      hub_id: Visitor.id,
      profile: this.getData(),
    }).then((profile) => {
      if (!profile || !profile.email) return;
      Visitor.set({ profile });

      this.__overlay.feed(
        require("./skeleton/ack").default(this, LOCALE.ACK_PROFILE_UPDATED)
      );
      // this.__content.feed(this.skeletons[this._page](this));
    });
  }

  /**
   * 
   * @param {*} cmd 
   */
  changeMFA(cmd) {
    this.debug("AAAA:264", cmd, this.getData())
    let MFA = [LOCALE.OFF, LOCALE.ON];
    let { email } = Visitor.profile();
    return this.ensurePart("current-mfa").then(async (p) => {
      let { secret } = await this.postService(SERVICE.otp.send, { id: Visitor.id, email })
      p.mset({ value: cmd.mget('mfa'), content: MFA[cmd.mget('mfa')] })
      let payload = {
        hub_id: Visitor.id,
        mfa: cmd.mget('mfa'),
        secret
      }
      this.debug("AAA:133", payload, p);
      await Kind.waitFor('dtk_otp');
      this.__overlay.feed({
        payload,
        dataset: {
          fit: "parent"
        },
        kind: 'dtk_otp',
        api: SERVICE.desk.set_mfa,
        title: "Multi factor athentication",
        message: "We have sent a code to {0} validate you new settings".format(),
        service: 'otp-signined'
      });
    });

  }

  /**
* 
*/
  _openLink(url) {
    this.__overlay.softClear()
    if (Visitor.device() == _a.mobile) {
      window.open(url, "_blank", "noopener; noreferrer");
    } else {
      let w = Math.min(900, screen.availWidth - 100);
      let h = Math.min(700, screen.availHeight - 100);
      let x = screen.availWidth / 2 - w / 2;
      let y = 0;
      window.open(url, "_blank", `noopener, noreferrer, width=${w}, height=${h}, left=${x}, top=${y}`);
    }
  }

  /**
   * 
   */
  _onPlanChanged() {
    this._page = 4;
    if (!this.skeletons[this._page]) {
      this.skeletons[this._page] = (require("./skeleton/seats").default);
      this.tab_name[this._page] = "My seats";
    }
    // Switch to billing page (index 1) when plan is updated
    // Only set to seats page (index 4) if user has admin rights and seats page exists
    if (this.skeletons.length > 4 && this.canAdmin()) {
      this._page = 4;
    } else {
      this._page = 1; // Billing page
    }
    this.__overlay.softClear()
    this.feed(require("./skeleton").default(this));
    clearInterval(this.timer)

  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service =
      args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug("AAA:191", cmd, args, service);
    switch (service) {
      case "close-overlay":
        return this.__overlay.clear();

      case _e.close:
        return this.goodbye();

      case "upload-avatar":
        return this.ensurePart("avatar-widget").then((p) => {
          p.selectFile();
        });
      case "open-payment-link":
        this._openLink(cmd.mget(_a.value))
        const onVisibilityChange = () => {
          if (document.hidden) return
          this._onPlanChanged()
          document.removeEventListener("visibilitychange", onVisibilityChange);
        }
        document.addEventListener("visibilitychange", onVisibilityChange)
        return;
      case "avatar-progress":
        return this.ensurePart("avatar-progress").then((p) => {
          p.el.style.width = `${args.progress}%`;
        });
      case "proceed-to-payment":
        return this.__overlay.feed(
          require("./skeleton/payment").default(this, args.url)
        );
        break;
      case 'plan_updated':
        this._onPlanChanged(cmd)
        break;
      case "otp-signined":
        this.debug("AAA:282", args);
        if (args.data) Visitor.respawn(args.data);
        this.__overlay.softClear()
        setTimeout(() => {
          this._page = 3;
          this.feed(require("./skeleton").default(this));
        }, 500)
        break;
      case "avatar-reloaded":
        return setTimeout(async () => {
          this.ensurePart("user-profile").then((p) => {
            p.restart(1);
          });
          RADIO_BROADCAST.trigger("avatar-changed");
          this.ensurePart("avatar-progress").then((p) => {
            p.el.style.opacity = `0`;
            p.el.style.width = `0`;
          });
        }, 1000);

      case "update-profile":
      case _e.save:
        return this.updateProfile(cmd);

      case "load-page":
        return this.load_page(cmd);

      case "change-mfa":
        return this.changeMFA(cmd);

      case "prompt-password":
        return this.__overlay.feed(
          require("./skeleton/form-password").default(this, "change-password")
        );

      case "change-password":
        return this.updatePassword(cmd);

      case "manage-seats":
        return this.handSeatsManager()

      case _e.sort:
        this._category = cmd.mget(_a.type);
        return this.ensurePart(_a.list).then((p) => {
          p.restart();
        });
      default:
        // Tab trigger events (select-plan, checkout) are handled by child widget (settings_billing)
        // They will be passed down via triggerHandlers and handled in billing/index.js
        this.triggerHandlers({ service });
    }
  }
}

module.exports = settings_account;
