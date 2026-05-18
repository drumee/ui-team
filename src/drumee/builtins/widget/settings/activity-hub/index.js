require("./skin");

class settings_activity_hub extends DrumeeMFS {
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    if (opt.media) {
      this.copyPropertiesFrom(opt.media);
    }
    
    this.mset({
      api: {
        service: SERVICE.activity.folder_log,
        nid: this.mget(_a.actual_home_id) ,
        hub_id: this.mget(_a.hub_id),
      },
    });
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   * @returns
   */
  onUiEvent(cmd, args = {}) {
    const service =
      args.service ||
      cmd.service ||
      (cmd.mget && (cmd.mget(_a.service) || cmd.mget(_a.name))) ||
      (cmd.get && (cmd.get(_a.service) || cmd.get(_a.name))) ||
      cmd.name;
    switch (service) {
      case _a.back:
      case _e.close:
        // Feed settings_hub back to replace current activity_hub
        if (this.mget(_a.media)) {
          this.triggerHandlers({
            service,
          });
          return;
        }
        return this.goodbye();
    }

    if (super.onUiEvent) {
      return super.onUiEvent(cmd, args);
    }
  }

  /**
   * Reload the skeleton
   */
  reload() {
    this.feed(require("./skeleton").default(this));
  }
}

module.exports = settings_activity_hub;

