

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
      role: _a.search,
    });
    this.declareHandlers();
    this.skeletons = [
      require("./skeleton/profile").default,
      require("./skeleton/storage").default
    ]
    this.tab_name = [LOCALE.PROFILE, LOCALE.STORAGE, LOCALE.SECURITY]
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
    this.feed(require("./skeleton").default(this));
  }

  /**
   * 
   */
  load_page(cmd) {
    this._page = cmd.mget(_a.page);
    this.__content.feed(this.skeletons[this._page](this));
    this.ensurePart("tab-name").then((p) => { p.set({ content: this.tab_name[this._page] }) })
    this.ensurePart(_a.footer).then((p) => { p.el.dataset.page = this._page })
  }

  /**
   * 
   */
  load_avatar(args) {
    this.ensurePart("avatar-progress").then((p) => { p.el.style.width = `${args.progress}%` })
    if (args.progress >= 100) {
      setTimeout(async () => {
        this.ensurePart("user-profile").then((p) => { p.respawn() });
        RADIO_BROADCAST.trigger("avatar-changed")
        this.ensurePart("avatar-progress").then((p) => { p.el.style.opacity = `0`; p.el.style.width = `0` });
      }, 1000)
    }
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug("onUiEvent:65", service)
    switch (service) {
      case _e.close:
      case "close-popup":
        return this.goodbye();
      case "upload-avatar":
        this.ensurePart("avatar-widget").then((p) => { p.selectFile() })
        break;
      case "avatar-progress":
        this.load_avatar(args)
        break
      case _e.save:
        this.postService(SERVICE.drumate.update_profile, { hub_id: Visitor.id, profile: this.getData() })
          .then((profile) => {
            if (!profile || !profile.email) return
            Visitor.set({ profile })
            this.__content.feed(this.skeletons[this._page](this));
          })
        break

      case 'load-page':
        this.load_page(cmd);
      default:
        this.triggerHandlers({ service })
    }
  }


}


module.exports = settings_account
