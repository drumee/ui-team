// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /ui/src/drumee/builtins/window/addressbook/widget/tag-item/index.coffee
//   TYPE : Component
// ==================================================================== *


//########################################

class __addressbook_widget_tag_item extends LetcBox {
  // ===========================================================
  //
  // ===========================================================
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._createTag = this._createTag.bind(this);
    this._renameTag = this._renameTag.bind(this);
    this._destroyTag = this._destroyTag.bind(this);
    this._tagManagerResponse = this._tagManagerResponse.bind(this);
    this._deleteTagResponse = this._deleteTagResponse.bind(this);
    this._emitServiceToParent = this._emitServiceToParent.bind(this);
    this.bindNotificationCenterEvent = this.bindNotificationCenterEvent.bind(this);
    this.updateNotificationCount = this.updateNotificationCount.bind(this);
  }
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize();
    require('./skin');
    this.declareHandlers();

    this.currentCount = 0;
    RADIO_CLICK.on(_e.click, this._onOutsideClick.bind(this));

  }

  // ===========================================================
  //
  // ===========================================================
  onDestroy(e, origin) {
    RADIO_CLICK.off(_e.click, this._onOutsideClick.bind(this));
    RADIO_BROADCAST.off('notification:counts', this.updateNotificationCount.bind(this));
  }

  /**
    * 
    */
  bindNotificationCenterEvent() {
    RADIO_BROADCAST.on('notification:counts', this.updateNotificationCount.bind(this));
  }


  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _onOutsideClick(e) {
    if (mouseDragged) {
      return;
    }
    if ((e != null) && !this.el.contains(e.currentTarget)) {
      const type = this.mget(_a.type);
      if (type === 'addTag') {
        this._createTag();
      }

      if (type === 'editTag') {
        return this._renameTag();
      }
    }
  };



  // ===========================================================
  // 
  // ===========================================================
  onDomRefresh() {
    if (this.mget(_a.service) === 'addTag') {
      this.mset(_a.type, 'addTag');
      this.feed(require('./skeleton/form')(this));
      return;
    }

    this.mset(_a.type, _a.tag);
    this.feed(require('./skeleton')(this));
    return this.$el.attr('tag-id', this.mget('tag_id'));
  }

  // ===========================================================
  // 
  // ===========================================================
  onUiEvent(cmd) {
    const type = this.mget(_a.type);
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
      case 'edit-tag':
        this.mset(_a.type, 'editTag');
        this.el.dataset.form = _a.on;
        return this.feed(require('./skeleton/form')(this));

      case 'save-tag':
        if (type === 'addTag') {
          this._createTag();
        }

        if (type === 'editTag') {
          return this._renameTag();
        }
        break;

      case _e.destroy:
        if (type === 'addTag') {
          this.goodbye();
          this._emitServiceToParent('trigger-all-contacts');
        }

        if (type === 'editTag') {
          return this._destroyTag();
        }
        break;

      default:
        this._emitServiceToParent(service, cmd);
        return this.service = '';
    }
  }

  // ===========================================================
  // 
  // ===========================================================
  _createTag() {
    const data = this.getData();
    if (!data || !data.name || data.name.trim() === '') {
      return;
    }

    return this.postService({
      service: SERVICE.tagcontact.add,
      name: data.name,
      hub_id: Visitor.get(_a.id)
    });
  }

  // ===========================================================
  // 
  // ===========================================================
  _renameTag() {
    const data = this.getData();
    if (data.name.trim() === '') {
      return;
    }

    return this.postService({
      service: SERVICE.tagcontact.rename,
      tag_id: this.mget('tag_id'),
      name: data.name,
      hub_id: Visitor.get(_a.id)
    });
  }

  // ===========================================================
  // 
  // ===========================================================
  _destroyTag() {
    return this.postService({
      service: SERVICE.tagcontact.remove,
      tag_id: this.mget('tag_id'),
      hub_id: Visitor.get(_a.id)
    });
  }

  // ===========================================================
  // 
  // ===========================================================
  _tagManagerResponse(data) {
    this.mset(data);
    this.mset(_a.type, _a.tag);
    this.$el.attr('tag-id', data.tag_id);
    this.el.dataset.form = _a.off;
    this.feed(require('./skeleton')(this));

    return this._emitServiceToParent('show-contact-list', data);
  }

  // ===========================================================
  // 
  // ===========================================================
  _deleteTagResponse(data) {
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    this.goodbye();
    return this._emitServiceToParent('trigger-all-contacts', data);
  }

  // ===========================================================
  // 
  // ===========================================================
  _emitServiceToParent(service, data = null) {
    this.source = data || this;
    this.service = service;
    return this.triggerHandlers();
  }




  // ===========================================================
  //
  // ===========================================================
  updateNotificationCount(data) {
    if (!(window.NotificationCenter && window.NotificationCenter.data)) {
      return;
    }

    this.tagNotificationList = data.tags;
    if (this.__notify && this.tagNotificationList && (this.tagNotificationList[this.mget('tag_id')] > 0)) {
      return this.__notify.el.dataset.state = 1;
    } else if (this.__notify) {
      return this.__notify.el.dataset.state = 0;
    }
  }




  // ===========================================================
  // 
  // ===========================================================
  __dispatchRest(method, data, socket) {
    //@debug " __dispatchRest method = #{method}", data, socket, @

    switch (method) {
      case SERVICE.tagcontact.remove:
        return this._deleteTagResponse(data);

      default:
        return this._tagManagerResponse(data);
    }
  }
}

module.exports = __addressbook_widget_tag_item;

