

/**
 * @class settings_hub
 * @extends __window_interact
 */
class settings_hub extends LetcBox {

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    if (opt.media) {
      this.mset(opt.media.toJSON ? opt.media.toJSON() : opt.media);
    }
  }

  /**
   * 
   */
  getViewMode() {
    return _a.grid;
  }

  /**
   *
   */
  onDomRefresh() {
    this._tab = 0;
    this.feed(require("./skeleton").default(this));
    // Fetch members if hub_id is available and members not already loaded
    if (this.mget(_a.hub_id) && !this.mget(_a.members) && typeof this.fetchService === 'function') {
      this.fetchService({
        service: SERVICE.hub.get_members_by_type,
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.actual_home_id),
        type: 'all'
      });
    }
  }

  /**
   * Reload the skeleton
   */
  reload() {
    this.feed(require("./skeleton").default(this));
  }

  /**
   * 
   */
  route() {
    switch (this._tab) {
      default:
        this.reload()
    }
  }
  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
    }
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug("AAA:50", service, cmd)
    switch (service) {
      case _e.close:
      case "close-popup":
        this.goodbye();
        // if (this.source && this.source.dialogWrapper && typeof this.source.dialogWrapper.clear === "function") {
        //   this.source.dialogWrapper.clear();
        // }
        return;

      case "edit-type":
        console.log("AAA:86", cmd)
        return;
      case _a.members:
        this._tab++;
        return this.feed({ kind: "settings_members_list", uiHandler: [this], media: this.mget(_a.media) });

      case _a.back:
        this._tab--;
        return this.route()
        
      default:
        this.debug("AAA:55", service, cmd)
    }
  }

  /**
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.hub.get_members_by_type:
        this.mset({ members: data });
        this.reload();
        break;
    }
  }

}


module.exports = settings_hub;
