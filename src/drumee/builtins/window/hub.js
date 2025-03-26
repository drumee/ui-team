const mfsInteract = require('./interact');

class __window_hub extends mfsInteract {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.openSettings = this.openSettings.bind(this);
    this._showNodeAttr = this._showNodeAttr.bind(this);
    this.leave_hub = this.leave_hub.bind(this);
    this.delete_hub = this.delete_hub.bind(this);
    this.closeDialog = this.closeDialog.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.settings = false;
    this.isHub = 1;
    this.isMfs = 1;
    this.model.atLeast({
      value: _a.normal,
      filetype: _a.hub
    });

    this.owner = new Backbone.Model();
    this.visitor = new Backbone.Model();
    if (this.mget(_a.permission)) {
      this.mset(_a.privilege, this.mget(_a.permission));
      return;
    }

    this.media = opt.media || opt.trigger;
    if (this.media) {
      opt = this.media.model.toJSON();
      for (let k of [_a.privilege, 'new_chat', 'new_media', _a.nodes]) {
        this.mset(k, opt[k]);
      }
    }

    if (!this.mget(_a.nid) && this.mget(_a.actual_home_id)) {
      this.mset({ nid: this.mget(_a.actual_home_id) });
    }

    // if (this.mget(_a.start)) {
    //   const f = `${this.mget(_a.start)}`;

    //   if (_.isFunction(this[f])) {
    //     return this._count = _.after(21, this[f].bind(this));
    //   }
    // }
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'wrapper-dialog':
        this.dialogWrapper = child;
        break;
      case "wrapper-context":
        this.contextWrapper = child;
        break;

      default:
        super.onPartReady(child, pn);
    }
    // if (this._count) {
    //   return this._count();
    // }
  }

  /**
 * 
 * @returns 
 */
  onDomRefresh() {
    super.onDomRefresh();
    this.fetchService(SERVICE.hub.get_attributes, {
      hub_id: this.mget(_a.hub_id)
    }).then((data) => {
      this.el.dataset.name = this.mget(_a.filename) || data.name;
      data.root_id = data.hub_id;
      this.mset(data);
      this.feed(this.defaultSkeleton(this));
      RADIO_BROADCAST.trigger('notification:request');
    }).catch((e) => {
      this.warn("GOT ERROR", e);
    });
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  async openSettings(cmd) {
    if (!this.dialogWrapper.isEmpty()) {
      this.dialogWrapper.clear();
      return;
    }
    let kind = 'hub_settings';
    if (this.mget(_a.area) == _a.share) {
      kind = 'widget_sharebox_setting';
    } else {

    }
    await Kind.waitFor(kind);
    this.dialogWrapper.feed({
      kind,
      label: this.settingsLabel,
      className: "px-25 pt-25 pb-10",
      uiHandler: [this],
      media: this.mget(_a.media),
      source: this,
      persistence: _a.once
    });
    const c = this.dialogWrapper.children.last();
    c.once(_e.destroy, () => {
      return this.unselect();
    });
    return c.on(_e.show, () => {
      return this.on(_e.unselect, () => {
        return this.dialogWrapper.clear();
      });
    });
  }

  /**
   * 
   * @returns 
   */
  _showNodeAttr() {
    const cmd = this.media;
    const doff = this.dialogWrapper.$el.offset();
    const ioff = this.media.$el.offset();
    const x = (ioff.left - doff.left) + 80;
    const y = (ioff.top - doff.top) + 20;

    const invitation = {
      kind: 'invitation',
      signal: _e.ui.event,
      media: cmd,
      trigger: cmd,
      hub_id: cmd.mget(_a.hub_id),
      authority: cmd.mget(_a.privilege),
      api: {
        service: SERVICE.media.get_node_attr,
        nid: cmd.mget(_a.nid),
        hub_id: cmd.mget(_a.hub_id)
      },
      mode: _a.projects,
      topLabel: LOCALE.DOCUMENTS_ACCESS,
      sharees: this.mget(_a.sharees),
      closeButton: 1,
      persistence: _a.once,
      styleOpt: {
        left: x,
        top: y
      },
      uiHandler: [this]
    };
    return this.dialogWrapper.feed(invitation);
  }

  /**
   * 
   * @returns 
   */
  leave_hub() {
    return this.postService({
      service: SERVICE.desk.leave_hub,
      nid: this.mget(_a.hub_id),
      hub_id: Visitor.id
    });
  }

  /**
   * 
   * @returns 
   */
  delete_hub() {
    return this.postService({
      service: SERVICE.hub.delete_hub,
      hub_id: this.mget(_a.hub_id)
    });
  }

  /**
   * 
   * @returns 
   */
  closeDialog() {
    return this.__wrapperOverlay.clear();
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case _e.access:
        if (!this.dialogWrapper.isEmpty()) {
          this.dialogWrapper.clear();
          return;
        }

        this.media = cmd;
        return this.fetchService({
          service: SERVICE.hub.get_pr_node_attr,
          nid: this.media.mget(_a.nodeId),
          hub_id: this.media.mget(_a.hub_id)
        });

      case "show-settings":
        return this.openSettings(cmd);

      case "leave-hub":
        return this.dialogWrapper.feed({
          kind: 'window_confirm',
          mode: "bhfx",
          maxsize: 2,
          title: LOCALE.LEAVE,
          message: LOCALE.MSG_LEAVE_HUB.format(this.mget(_a.filename)),
          confirm: LOCALE.LEAVE
        }).ask().then(this.leave_hub.bind(this));

      case "delete-hub":
        return this.dialogWrapper.feed({
          kind: 'window_confirm',
          maxsize: 2,
          title: LOCALE.DELETE,
          message: LOCALE.MSG_DELETE_HUB.format(this.mget(_a.filename)),
          confirm: LOCALE.DELETE,
          confirm_action: 'delete-team-room'
        }).ask().then(this.delete_hub.bind(this));

      default:
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.media.reorder:
        return this.syncBounds();

      case SERVICE.hub.get_pr_node_attr:
        this.mset(_a.sharees, data);
        return this._showNodeAttr();


      case SERVICE.desk.leave_hub:
      case SERVICE.hub.delete_hub:
        this.goodbye();
        if (this.media) this.media.goodbye();
        return super.__dispatchRest(method, data, socket);

      default:
        return this.warn(WARNING.method.unprocessed.format(method), data);
    }
  }
}


module.exports = __window_hub;

