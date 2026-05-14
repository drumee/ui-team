require("./skin");
class settings_members_list extends DrumeeMFS {
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
        service: SERVICE.hub.get_members_by_type,
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.actual_home_id),
        type: "all",
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
        // Feed settings_hub back to replace current members_list
        if (this.mget(_a.media)) {
          // const media = this.mget(_a.media);
          // Feed settings_hub to replace current content

          // this.feed({ kind: "settings_hub", media: media });
          /** This widget is a child of settings_hub. This is nesting parent in side the child */
          this.triggerHandlers({
            service,
          }); /** Tell the parent we are done and wnt ot go back */

          return;
        }
        return this.goodbye();

      case "update-member-permission":
        const memberId = cmd.memberId || args.memberId;
        const privilege = cmd.privilege || args.privilege;

        if (memberId && privilege !== undefined) {
          this.fetchService({
            service: SERVICE.hub.set_privilege,
            hub_id: this.mget(_a.hub_id),
            users: [memberId],
            privilege: privilege,
          });
        }
        break;
        
      case "prompt-permission":
        this.triggerHandlers({
          service, member: cmd
        })
        return
    }

    if (super.onUiEvent) {
      return super.onUiEvent(cmd, args);
    }
  }

  /**
   * @param {*} method
   * @param {*} data
   * @param {*} socket
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.hub.set_privilege:
        // Reload members list after permission update
        this.reload();
        break;
    }
  }

  /**
   * Reload the skeleton
   */
  reload() {
    this.feed(require("./skeleton").default(this));
  }
}

module.exports = settings_members_list;
