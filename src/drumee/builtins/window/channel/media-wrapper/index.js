
class __media_wrapper extends LetcBox {
  constructor(...args) {
    super(...args);
    this.addNewMedia = this.addNewMedia.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
  }

  /**
   * 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.skeleton = require('./skeleton');
    this.declareHandlers();
    this.initAttachment();
    this.loadAttachment();
  }

  /**
  * 
  */
  onBeforeDestroy() {
    /** Prevent updating on reload */
    this.__content.onRemoveChild = null;
  }

  /**
   * 
   */
  addNewMedia(items) {
    let attachment = []
    for (let item of items) {
      let data = { ...item };
      delete data.uiHandler;
      delete data.logicalParent;
      attachment.push(data);
      this.saveAttachment(attachment);
    }
    if (_.isEmpty(items)) return;
    return this.__content.append(items);
  }

  /**
   * 
   */
  initAttachment() {
    this._pendingUpload = 0;
    const storageKey = this.mget('storageKey');
    if (!sessionStorage.getItem(storageKey)) {
      const data = {
        message: "",
        attachment: []
      };
      sessionStorage.setItem(storageKey, JSON.stringify(data));
    }
  }

  /**
   * 
   * @returns 
   */
  getAttachment() {
    const storageKey = this.mget('storageKey');
    const data = sessionStorage.getItem(storageKey);
    if (_.isEmpty(data)) {
      return [];
    }
    let { attachment } = JSON.parse(data) || {};
    if (_.isEmpty(attachment)) {
      return [];
    }

    return attachment.filter((e) => {
      return e.nid && e.hub_id;
    })
  }

  /**
   * 
   * @returns 
   */
  clearAttachment() {
    const storageKey = this.mget('storageKey');
    const data = {
      attachment: [],
      message: ""
    };
    sessionStorage.setItem(storageKey, JSON.stringify(data));
    this._pendingUpload = 0;
    this.__content.clear();
  }

  /**
   * 
   * @returns 
   */
  saveAttachment(attachment) {
    if (!_.isArray(attachment)) return;
    const items = attachment.map((row) => {
      let item;
      if (row.nid || row.destination) {
        item = { ...row, kind: 'media_grid', isAttachment: 1 };
      } else if (_.isFunction(row.toJSON)) {
        item = { ...row.toJSON(), kind: 'media_grid', isAttachment: 1 };
      }
      delete item.uiHandler;
      delete item.logicalParent;
      return item;
    }).filter((r) => {
      return r.nid;
    });
    const storageKey = this.mget('storageKey');
    let data = JSON.parse(sessionStorage.getItem(storageKey));
    if (_.isEmpty(items)) return;
    if (_.isEmpty(data.attachment)) {
      data.attachment = items;
    } else {
      let attachment = data.attachment.concat(items);
      let nodes = {};
      for (let item of attachment) {
        nodes[item.nid] = item;
      }
      data.attachment = _.values(nodes);
    }
    sessionStorage.setItem(storageKey, JSON.stringify(data));
  }

  /**
   * 
   */
  updateAttachment() {
    let items = [];
    for (let c of this.__content.collection.toArray()) {
      let m = c.toJSON();
      delete m.uiHandler;
      delete m.partHandler;
      delete m.logicalParent;
      items.push(m)
    }
    const storageKey = this.mget('storageKey');
    let data = JSON.parse(sessionStorage.getItem(storageKey)) || {};
    data.attachment = items;
    sessionStorage.setItem(storageKey, JSON.stringify(data));
    if (items.length) {
      this.el.dataset.state = _a.open;
    } else {
      this.el.dataset.state = _a.closed;
    }
    this.trigger(_e.update)
  }

  /**
   * 
   */
  container() {
    return this.__content;
  }

  /**
   * 
   */
  getAttachmentIds() {
    return this.__content.collection.map((model) => {
      return model.get(_a.nid);
    });
  }

  /**
   * 
   */
  hasPendingUpload() {
    for (let media of this.__content.children.toArray()) {
      if (media.isUploading) return true;
    }
    return false;
  }

  /**
   * 
   */
  hasAttachment() {
    let attachment = this.getAttachment();
    if (_.isEmpty(attachment) || !_.isArray(attachment)) return false;
    return true;
  }

  /**
   * 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    const {
      status
    } = cmd;
    if (mouseDragged) {
      return;
    }

    switch (service) {
      case _e.upload:
        return this.upload(cmd.sourceEvent);
    }
  }

  /**
   * 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        let attachment = this.getAttachment();
        if (_.isEmpty(attachment)) {
          setTimeout(() => {
            this.el.dataset.state = _a.closed;
          }, 1000)
        } else {
          this.addNewMedia(attachment);
          this.el.dataset.state = _a.open;
        }
        /**  */
        child.onRemoveChild = (parent, c) => {
          if (c.isLazyClass) return;
          this.updateAttachment();
        }
        child.onAddKid = c => {
          if (c.isLazyClass) return;
          c.once(_e.restart, () => {
            this.updateAttachment();
          });
        };
        break;
    }
  }


  /**
 * 
 */
  loadAttachment() {
    if (!this.hasAttachment()) {
      this.el.dataset.state = _a.closed;
      return;
    }
    this.el.dataset.state = _a.open;
    let attachment = this.getAttachment();
    let items = attachment.map(r => {
      let uiHandler = this.mget(_a.uiHandler);
      if (_.isArray(uiHandler)) {
        r.uiHandler = uiHandler
      } else {
        r.uiHandler = [uiHandler];
      }
      return r;
    });
    this.mset({ items });
  }

}
module.exports = __media_wrapper;
