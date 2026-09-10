
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
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
    /** Prevent updating on reload */
    if (this.__content) {
      this.__content.onRemoveChild = null;
    }
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
    // Stamp BEFORE the append, not only in saveAttachment: that one shapes what
    // goes to sessionStorage, while this is the list actually rendered now. The
    // two call sites in the chat widget (`_pickDeskFile`, the upload branch)
    // build their own `{kind: 'media_grid', isAttachment: 1}` item and hand it
    // straight here, so a flag added only on the persisted copy would not reach
    // the card until a reload re-read it.
    items.forEach((i) => this._markIconOnly(i));
    const result = this.__content.append(items);
    // Opening is part of ADDING. updateAttachment() sets this too, but that only
    // runs when a card is REMOVED — so a strip filled by upload or by a
    // workspace pick stayed `closed`, and the global
    // `[data-state="closed"] { visibility: hidden !important; height: 0 }` rule
    // (skin/lib/utils.scss) hid every card in it. The symptom was chips that
    // looked EMPTY rather than absent — the markup was all there, sized to
    // nothing — and removing one made the rest appear, because that was the
    // first thing to call updateAttachment().
    this._openStrip();
    // Notify listeners (chat widget's checkPendingContent) so the
    // attachment-wrapper data-state flips to "has attachment" and CSS
    // expands the preview slot. Matches the trigger in clearAttachment().
    this.trigger(_e.update);
    return result;
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
    // Notify listeners (chat widget's checkPendingContent) so the
    // attachment-wrapper data-state can flip back to "no attachment"
    // and CSS collapses the preview slot.
    this.trigger(_e.update);
  }

  /**
   * Mark one queued item as a composer chip.
   *
   * The chip shows a file-TYPE glyph where the card used to show a thumbnail,
   * and `media/grid/template` reads this flag to decide that (it forces
   * `imgCapable` off, which routes images down the icon branch `preview.js`
   * already has for documents).
   *
   * Deliberately NOT keyed off `isAttachment`, which is the obvious-looking
   * choice and is wrong: chat-item's sent-message cards and media/form's
   * picker both set `isAttachment: 1` and both want the real thumbnail. Only
   * the pre-send composer strip wants a glyph, and this wrapper is what owns
   * it, so the flag is set here rather than inferred downstream.
   *
   * @param {Object} item  a media_grid descriptor, mutated in place
   * @returns {Object} the same item, for use in a map()
   */
  /**
   * Show the strip, and call off any close that was already scheduled.
   *
   * onPartReady arms a 1s timer to close an empty strip. A file that arrives
   * inside that second would otherwise be hidden by a timer that fired after
   * it landed — a race that reads as "the first attachment never shows, later
   * ones do", which is worse to diagnose than a plain failure.
   */
  _openStrip() {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
    if (this.el) this.el.dataset.state = _a.open;
  }

  _markIconOnly(item) {
    if (item) item.iconOnly = 1;
    return item;
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
        item = { ...row, kind: 'media_grid', isAttachment: 1, iconOnly: 1 };
      } else if (_.isFunction(row.toJSON)) {
        item = { ...row.toJSON(), kind: 'media_grid', isAttachment: 1, iconOnly: 1 };
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
   * Attachments uploaded from the user's device (as opposed to picked from
   * the workspace). channel.post moves these into the scoped folder on send.
   */
  getDeviceAttachmentIds() {
    return this.__content.collection
      .filter((model) => model.get("from_device"))
      .map((model) => model.get(_a.nid));
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
    if (pointerDragged) {
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
          this._closeTimer = setTimeout(() => {
            this._closeTimer = null;
            if (this.el) this.el.dataset.state = _a.closed;
          }, 1000)
        } else {
          this.addNewMedia(attachment);
          this._openStrip();
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
      // Restored from sessionStorage, which may predate the flag — an entry
      // queued before this shipped would otherwise come back as a thumbnail.
      return this._markIconOnly(r);
    });
    this.mset({ items });
  }

}
module.exports = __media_wrapper;
