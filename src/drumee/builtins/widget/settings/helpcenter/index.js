/**
 *
 *
 */
class settings_helpcenter extends LetcBox {
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
      require("./skeleton/welcome").default,
      require("./skeleton/user-guide").default,
      require("./skeleton/documentations").default,
      require("./skeleton/community").default,
      require("./skeleton/term-of-service").default,
      require("./skeleton/privacy-policy").default,
      // require("./skeleton/security").default,
    ];
    // this.tab_name = [LOCALE.PROFILE, LOCALE.STORAGE, LOCALE.SECURITY];
    this.tab_name = [
      "Welcome",
      "User Guide",
      "Documentations",
      "Community",
      "Terms of Service",
      "Privacy Policy",
    ];
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
        child.feed(this.skeletons[this._page](this));
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
    this._page = cmd.mget(_a.page);
    this.__content.feed(this.skeletons[this._page](this));
    this.ensurePart("tab-name").then((p) => {
      p.set({ content: this.tab_name[this._page] });
    });
    this.ensurePart(_a.footer).then((p) => {
      p.el.dataset.page = this._page;
    });
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
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service =
      args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();
      case "upload-avatar":
        this.ensurePart("avatar-widget").then((p) => {
          p.selectFile();
        });
        break;
      case "avatar-progress":
        this.ensurePart("avatar-progress").then((p) => {
          p.el.style.width = `${args.progress}%`;
        });
        break;
      case "avatar-reloaded":
        setTimeout(async () => {
          this.ensurePart("user-profile").then((p) => {
            p.restart(1);
          });
          RADIO_BROADCAST.trigger("avatar-changed");
          this.ensurePart("avatar-progress").then((p) => {
            p.el.style.opacity = `0`;
            p.el.style.width = `0`;
          });
        }, 1000);
        break;
      case _e.save:
        this.postService(SERVICE.drumate.update_profile, {
          hub_id: Visitor.id,
          profile: this.getData(),
        }).then((profile) => {
          if (!profile || !profile.email) return;
          Visitor.set({ profile });
          this.__content.feed(this.skeletons[this._page](this));
        });
        break;
      case "load-page":
        this.load_page(cmd);
        break;
      case "change-mfa":
        this.ensurePart("current-mfa").then((p) => {
          p.restart(1);
        });
        break;
      case _e.sort:
        this._category = cmd.mget(_a.type);
        this.ensurePart(_a.list).then((p) => {
          p.restart();
        });
        break;
      default:
        this.triggerHandlers({ service });
    }
  }
}

module.exports = settings_helpcenter;
