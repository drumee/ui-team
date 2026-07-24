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
      require("./skeleton/date").default,
    ];
    this.tab_name = [
      LOCALE.PROFILE,
      "Billing Information",
      LOCALE.STORAGE,
      LOCALE.SECURITY,
      LOCALE.DATE_AND_TIME,
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
    // Any paid tier can manage members. Resolved through libs/billing so the
    // retired 'pro' code and the hand-granted legacy names still map onto Team
    // rather than silently failing a literal match and hiding this tab from
    // people who own an org.
    if (!require("libs/billing").isPaidPlan()) return false;
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
        this.el.dataset.position = "1"
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
  async updateDateSettings() {
    const data = this.getData();
    let { dateformat, timezone } = data;
    
    // Build settings object
    const settings = {};
    if (dateformat) {
      settings.dateformat = dateformat;
    }
    if (timezone) {
      settings.timezone = timezone;
    }
    
    // If timeformat is not set, derive it from dateformat
    if (dateformat && !data.timeformat) {
      settings.timeformat = `${dateformat} - HH:mm:ss`;
    }
    
    return this.postService({
      service: SERVICE.drumate.update_settings,
      settings: settings,
      hub_id: Visitor.id
    }).then((response) => {
      // Update Visitor settings - response should contain updated settings
      let updatedSettings = {};
      if (response && response.settings) {
        try {
          updatedSettings = JSON.parse(response.settings);
        } catch (e) {
          updatedSettings = { ...Visitor.settings() || {}, ...settings };
        }
      } else {
        updatedSettings = { ...Visitor.settings() || {}, ...settings };
      }
      Visitor.set({ settings: updatedSettings });
      
      this.__overlay.feed(
        require("./skeleton/ack").default(this, "Date & Time settings updated successfully")
      );
    }).catch((err) => {
      this.warn('Error updating date settings:', err);
      this.showError("Failed to update date settings");
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
  async changeMFA(cmd) {
    let MFA = [LOCALE.OFF, LOCALE.ON];
    let { email } = Visitor.profile();
    const result = await this.postService(SERVICE.otp.send, { hub_id: Visitor.id, email });
    if (!result || !result.sent || !result.secret) return;
    const { secret } = result;
    const payload = {
      hub_id: Visitor.id,
      mfa: cmd.mget('mfa'),
      secret,
    };
    // exists() (not get()) avoids a "Failed to find kind" warning before the
    // addon is registered.
    if (!Kind.exists('dtk_otp')) {
      Kind.registerAddons({ dtk_otp: import("@drumee/ui-toolkit/widgets/otp") });
    }
    await Kind.waitFor('dtk_otp');
    this.ensurePart("current-mfa").then((p) => {
      p.mset({ value: cmd.mget('mfa'), content: MFA[cmd.mget('mfa')] });
    });
    this.__overlay.feed({
      payload,
      dataset: { fit: "parent" },
      kind: 'dtk_otp',
      api: SERVICE.desk.set_mfa,
      title: LOCALE.MULTI_FACTOR_AUTH || "Multi factor authentication",
      message: (LOCALE.VALIDATION_SENT_TO || "We have sent a code to {0}").format(email),
      service: 'otp-signined',
      uiHandler: [this],
    });
  }

  /**
   * Update auto-lock timeout setting
   * @param {*} cmd 
   */
  async updateAutoLockTimeout(cmd) {
    // menuInput widget automatically updates its value when item is selected
    // Get value from getData() (widget's current value) or from cmd (item element)
    const data = this.getData();
    let timeout = data.auto_lock_timeout || "0";
    
    // If not found in getData(), try to get from cmd (item element from menuInput widget)
    if (!timeout || timeout === "0") {
      if (cmd && typeof cmd.mget === 'function') {
        timeout = cmd.mget('value') || cmd.mget('auto_lock_timeout') || "0";
      } else if (cmd && cmd.model && typeof cmd.model.get === 'function') {
        timeout = cmd.model.get('value') || cmd.model.get('auto_lock_timeout') || "0";
      }
    }
    
    // Handle custom value: if user typed a number directly in input field
    // Get the actual input value from the entry widget
    if (timeout === "custom" || timeout === "") {
      // Try to get value from input field directly
      const autoLockWidget = this.getPart("auto-lock-timeout") || this.el.querySelector(`[name="auto_lock_timeout"]`);
      if (autoLockWidget) {
        const entryPart = autoLockWidget.getPart ? await autoLockWidget.getPart("entry") : null;
        if (entryPart && entryPart._input) {
          const inputValue = entryPart._input.value;
          if (inputValue && inputValue !== "" && inputValue !== "custom") {
            // Validate it's a valid number (can be negative)
            const numValue = parseInt(inputValue);
            if (!isNaN(numValue)) {
              timeout = inputValue;
            }
          }
        }
      }
      // If still "custom" or empty, default to "0"
      if (timeout === "custom" || timeout === "") {
        timeout = "0";
      }
    }
    
    
    const settings = {
      auto_lock_timeout: timeout
    };
    
    return this.postService({
      service: SERVICE.drumate.update_settings,
      settings: settings,
      hub_id: Visitor.id
    }).then((response) => {
      let updatedSettings = {};
      if (response && response.settings) {
        try {
          updatedSettings = JSON.parse(response.settings);
        } catch (e) {
          updatedSettings = { ...Visitor.settings() || {}, ...settings };
        }
      } else {
        updatedSettings = { ...Visitor.settings() || {}, ...settings };
      }
      Visitor.set({ settings: updatedSettings });
    }).catch((err) => {
      this.warn('Error updating auto-lock timeout:', err);
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
    // Try multiple ways to get service
    let service = args.service;
    if (!service && cmd) {
      if (typeof cmd.mget === 'function') {
        service = cmd.mget(_a.service) || cmd.mget(_a.name);
      } else if (cmd.service) {
        service = cmd.service;
      } else if (cmd.model && typeof cmd.model.get === 'function') {
        service = cmd.model.get(_a.service) || cmd.model.get(_a.name);
      } else if (cmd.target) {
        // Try to get from DOM element
        const el = cmd.target.closest('[data-service]') || cmd.target;
        if (el && el.dataset && el.dataset.service) {
          service = el.dataset.service;
        }
      } else if (cmd.el) {
        // Try to get from cmd.el dataset
        if (cmd.el.dataset && cmd.el.dataset.service) {
          service = cmd.el.dataset.service;
        }
      }
    }
    
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
        // Check if current page is Date settings (page 4)
        if (this._page === 4) {
          return this.updateDateSettings(cmd);
        }
        return this.updateProfile(cmd);

      case "load-page":
        return this.load_page(cmd);

      case "change-mfa":
        return this.changeMFA(cmd);

      case "select-auto-lock-timeout":
        // menuInput widget automatically updates its value when item is selected
        // We can get the value from getData() or from cmd (item element)
        return this.updateAutoLockTimeout(cmd);

      case "prompt-password":
        return this.__overlay.feed(
          require("./skeleton/form-password").default(this, "change-password")
        );

      case "change-password":
        return this.updatePassword(cmd);

      case "export-data":
        Kind.waitFor("settings_export_data").then(() => {
          this.__overlay.feed({ kind: "settings_export_data", uiHandler: [this] });
        });
        return;

      case "export-data-cancel":
        return this.__overlay.clear();

      case "manage-seats":
        return this.handSeatsManager()

      // Note: select-dateformat and select-timezone are now handled by menu_input widget
      // The widget automatically updates its value when an item is selected

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
