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
    
    // Get nid from various sources
    const nid = this.mget(_a.nid) || 
                this.mget(_a.node_id) || 
                this.mget(_a.actual_home_id) ||
                this.mget(_a.hub_id);
    
    // Set API configuration for List.Smart to fetch activity data
    this.mset({
      api: {
        service: SERVICE.activity.folder_log,
        nid: nid,
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
    this.debug("AAA:45", service, cmd, args)
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

