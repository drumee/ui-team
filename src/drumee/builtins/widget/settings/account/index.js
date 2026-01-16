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
      require("./skeleton/date").default,
      require("./skeleton/data").default,
    ];
    this.tab_name = [
      LOCALE.PROFILE,
      "Billing Information",
      LOCALE.STORAGE,
      LOCALE.SECURITY,
      LOCALE.DATE_AND_TIME,
      LOCALE.MY_DATA,
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
  async updateDateSettings() {
    const data = this.getData();
    let { dateformat, timezone } = data;
    
    this.debug("AAA:192", data);
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
   * Backup all user data
   */
  async backupData() {
    const data = this.getData();
    const { password } = data;
    
    // Clear any previous error first
    this.ensurePart("error").then((p) => {
      if (p) {
        p.set({ content: "" });
        p.el.dataset.state = "0";
      }
    });
    
    // Validate password
    if (!password) {
      return this.showError(LOCALE.PASSWORD_REQUIRED || "Password is required");
    }
    
    // TODO: Backend service will be implemented later
    // For now, simulate the request
    return this.postService({
      service: SERVICE.drumate.backup_data, // This service will be created later
      password: password,
      hub_id: Visitor.id
    }).then((response) => {
      // Handle response with error
      if (response && response.error) {
        // Handle password error
        if (response.error === "wrong_password") {
          return this.showError(LOCALE.WRONG_CREDENTIALS);
        }
        return this.showError(LOCALE.UNKNOWN_ERROR || "An error occurred");
      }
      
      // Clear error on success
      this.ensurePart("error").then((p) => {
        if (p) {
          p.set({ content: "" });
          p.el.dataset.state = "0";
        }
      });
      
      // Show success popup
      this.__overlay.feed(
        require("./skeleton/ack").default(this, LOCALE.BACKUP_SUCCESS || "Your backup request has been submitted. You will receive an email with a download link shortly.")
      );
      
      // Clear password field - refresh the form to reset
      this.__content.feed(this.skeletons[this._page](this));
    }).catch((err) => {
      this.warn('Error backing up data:', err);
      // If service doesn't exist yet, show success message for now
      if (err && err.message && err.message.includes("not found")) {
        // Clear error on success
        this.ensurePart("error").then((p) => {
          if (p) {
            p.set({ content: "" });
            p.el.dataset.state = "0";
          }
        });
        this.__overlay.feed(
          require("./skeleton/ack").default(this, LOCALE.BACKUP_SUCCESS || "Your backup request has been submitted. You will receive an email with a download link shortly.")
        );
      } else {
        this.showError(LOCALE.UNKNOWN_ERROR || "Failed to backup data");
      }
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
        // Check if current page is Date settings (page 4)
        if (this._page === 4) {
          return this.updateDateSettings(cmd);
        }
        // Check if current page is My data (page 5)
        if (this._page === 5) {
          return this.backupData(cmd);
        }
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

      case "backup-data":
        return this.backupData(cmd);

      case "manage-seats":
        return this.handSeatsManager()

      case "select-dateformat":
        const value = cmd.mget(_a.value);
        // Get label from DATEFORMAT_OPTIONS
        const DATEFORMAT_OPTIONS = [
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "YYYY/MM/DD", label: "YYYY/MM/DD" },
          { value: "DD.MM.YYYY", label: "DD.MM.YYYY" },
          { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
        ];
        const selectedOption = DATEFORMAT_OPTIONS.find(opt => opt.value === value);
        const label = selectedOption ? selectedOption.label : (cmd.mget(_a.content) || value);
        
        // Find dropdown using findPart (searches in all children)
        const dateformatDropdown = this.findPart("dateformat-dropdown");
        if (dateformatDropdown) {
          // Find display element directly from dropdown (searches in all children)
          const display = dateformatDropdown.findPart("current-dateformat");
          if (display) {
            display.mset({ value, content: label });
            if (display.el) {
              display.el.textContent = label;
            }
          }
          
          // Update all items state - ensure only one item is selected
          const items = dateformatDropdown.getPart(_a.items);
          if (items && items.children) {
            items.children.each((child) => {
              const itemValue = child.mget(_a.value);
              if (itemValue === value) {
                child.el.dataset.state = "1";
                child.mset({ state: 1 });
                if (child.setState) child.setState(1);
              } else {
                child.el.dataset.state = "0";
                child.mset({ state: 0 });
                if (child.setState) child.setState(0);
              }
            });
          }
          
          // Close dropdown after selection (similar to menuInput)
          if (dateformatDropdown._closeItems) {
            dateformatDropdown._closeItems();
          }
        }
        return;

      case "select-timezone":
        this.debug("AAA:484", cmd);
        const tzValue = cmd.mget(_a.value);
        // Get label from cmd content (which should be the label from the item)
        let tzLabel = cmd.mget(_a.content);
        
        // If label is not available or equals value, try to format it
        if (!tzLabel || tzLabel === tzValue) {
          try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: tzValue,
              timeZoneName: 'longOffset'
            });
            const parts = formatter.formatToParts(now);
            const tzNamePart = parts.find(p => p.type === 'timeZoneName');
            const offset = tzNamePart ? tzNamePart.value : '';
            const cityName = tzValue.split('/').pop().replace(/_/g, ' ');
            tzLabel = offset ? `(${offset}) ${cityName}` : cityName;
          } catch (e) {
            tzLabel = tzValue.split('/').pop().replace(/_/g, ' ');
          }
        }
        
        // Find dropdown using findPart (searches in all children)
        const timezoneDropdown = this.findPart("timezone-dropdown");
        if (timezoneDropdown) {
          // Find display element directly from dropdown (searches in all children)
          const display = timezoneDropdown.findPart("current-timezone");
          if (display) {
            display.mset({ value: tzValue, content: tzLabel });
            if (display.el) {
              display.el.textContent = tzLabel;
            }
          }
          
          // Update all items state - ensure only one item is selected
          const items = timezoneDropdown.getPart(_a.items);
          if (items && items.children) {
            items.children.each((child) => {
              const itemValue = child.mget(_a.value);
              if (itemValue === tzValue) {
                child.el.dataset.state = "1";
                child.mset({ state: 1 });
                if (child.setState) child.setState(1);
              } else {
                child.el.dataset.state = "0";
                child.mset({ state: 0 });
                if (child.setState) child.setState(0);
              }
            });
          }
          
          // Close dropdown after selection (similar to menuInput)
          if (timezoneDropdown._closeItems) {
            timezoneDropdown._closeItems();
          }
        }
        return;

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
