
const __recipient = require('../core');
const { copyToClipboard, openLink } = require("core/utils")

class __invitation_publiclink extends __recipient {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  /**
   * 
   */
  initialize() {
    require("./skin");
    super.initialize();
    this.declareHandlers({ part: _a.multiple, ui: _a.multiple });

    this.model.atLeast({
      limit: 0,
      days: 0,
      hours: 0,
      flow: _a.y
    });
    const handler = this.getHandlers(_a.ui)[0];
    this.mset({
      permission: handler.mget(_a.default_privilege) || _K.privilege.write
    });
  }

  /**
   * 
   * @param {*} item 
   * @returns 
   */
  onDestroy(item) {
    return RADIO_BROADCAST.trigger("remove:sharee", this);
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "options-content":
        return this._options = child;
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.postService({
      service: SERVICE.sharebox.create_link,
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nodeId),
      permission: this.mget(_a.permission) || _K.permission.download
    });
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "link-wrapper":
        return this._linkWrapper = child;

      case "wrapper-dialog":
        return this.dialoWrapper = child;
    }
  }

  /**
   * 
   * @returns 
   */
  reload() {
    this.declareHandlers(); //s { part: @, ui: @}
    return this.feed(require("./skeleton/main")(this));
  }

  /**
   * 
   * @returns 
   */
  goodbye() {
    this.service = "close-public-link";
    this.triggerHandlers();
    this.softDestroy();
    try {
      return this.mget(_a.source).setState(1);
    } catch (error) { }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.model.get(_a.service);
    switch (service) {
      case _e.close:
        return this.goodbye();

      case _e.copy:
        copyToClipboard(this.mget(_a.link));
        this.feed(require('libs/preset/ack')(this, LOCALE.ACK_COPY_LINK, {
          height: this.$el.height()
        })
        );
        var f = () => {
          return this.suppress();
        };
        return _.delay(f, Visitor.timeout());

      case "remove-link":
        return this.removeOrrevoke();

      case _a.back:
        this.service = _e.restart;
        this.triggerHandlers();
        return this.suppress();

      case "view-link":
        return openLink(this.mget(_a.link));

      case _e.update:
        this.debug("AAAA", cmd.getData());
        if (this.mget(_a.share_id)) {
          return this.debug("CHANGE PERMISSION", cmd.getData(), this);
        }
        break;

      case _e.settings:
        if (this.dialoWrapper.isEmpty()) {
          this.dialoWrapper.feed({
            kind: 'invitation_permission',
            trigger: cmd,
            signal: _e.ui.event,
            service: _a.commit,
            permission: this.mget(_a.permission),
            days: this.mget(_a.days),
            hours: this.mget(_a.hours),
            limit: this.mget(_a.limit),
            modify: _a.off,
            uiHandler: this
          });
          const c = this.dialoWrapper.children.last();
          return c.once(_e.destroy, () => {
            return this.findPart("ref-settings").setState(0);
          });
        } else {
          return this.dialoWrapper.clear();
        }
    }
  }

  /**
   * 
   * @returns 
   */
  getData() {
    const a =
      { link: this.mget(_a.link) };
    return a;
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
      case SERVICE.sharebox.create_link:
        var row = data[0];
        if ((row == null)) {
          return;
        }
        const { protocol, endpointPath } = bootstrap()
        row.link = `${protocol}://${row.vhost}${endpointPath}#/dmz/${row.share_id}`;
        this.model.set(row);
        this.reload();
        this.service = "public-link-created";
        return this.triggerHandlers();

      case SERVICE.sharebox.remove_link:
        this.model.set({
          link: null,
          share_id: null
        });
        this.feed(require('libs/preset/ack')(this, LOCALE.ACK_DELETE_PUBLIC_LINK, {
          height: this.$el.height()
        })
        );
        var f = () => {
          this.service = "public-link-removed";
          this.triggerHandlers();
          return this.suppress();
        };
        return _.delay(f, Visitor.timeout());

      case SERVICE.sharebox.update_link:
        this.service = "close-public-link";
        return this.triggerHandlers();
    }
  }
}

module.exports = __invitation_publiclink;
