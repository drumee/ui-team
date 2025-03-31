
require('./skin');
const chatInteract = require('window/interact/chat');
class __window_channel extends chatInteract {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.viewMode = _a.chat;
    this.bindEvent(_a.live);
    this.declareHandlers();
    this.skeleton = require("./skeleton");
    this.media = opt.media;
    this.initSize()
    this.acceptMedia = 1;
    this.copyPropertiesFrom(this.media);
  }

  /**
   * 
   */
  initSize() {
    let offsetData;
    let width = Math.min(_K.docViewer.width, 400, window.innerWidth / 3);
    const h = Math.max(_K.docViewer.height, window.innerHeight / 1.6);

    const p = Wm.getActiveWindow();
    if (p !== Wm) {
      offsetData = p.$el.offset();
    } else {
      offsetData = {
        left: lastClick.pageX,
        top: lastClick.pageY
      };
    }

    let left = Math.min(offsetData.left, window.innerWidth - (width + 20));
    let top = Math.min(offsetData.top - 85, window.innerHeight - (h + 100));

    if (left < 0) {
      left = 0;
    }
    if ((left + width) > window.innerWidth) {
      left = window.innerWidth - width - 20;
    }
    if (top < 0) {
      top = 0;
    }
    const dy = Wm.$el.height() - (top + h);

    if (dy < 0) {
      top = top + dy;
    }
    if (Visitor.isMobile()) {
      top = 0;
      left = 0;
      width = window.innerWidt;
      h = window.innerHeight;
    }

    this.size = {
      height: h,
      left,
      margin: 0,
      top,
      width,
      minWidth: width,
      minHeight: h - 50
    };
    this.style.set(this.size);
  }

  /**
   * 
   * @param {*} mkdir 
   * @returns 
   */
  getActiveWindow(mkdir) {
    if (mkdir == null) { mkdir = 0; }
    return this;
  }
  /**
   * 
   */
  onDomRefresh() {
    this._fetchHomeData();
    super.onDomRefresh();
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
      case 'load_channel_content':
        this.waitElement(child.el, this.loadContent());
        this.setupInteract();
        return this.raise();
      default:
        return super.onPartReady(child, pn, section);
    }
  }

  /**
   * 
   * @returns 
   */
  loadContent() {
    let widget_chat;
    const content = this.getPart('load_channel_content');
    if (this.mget(_a.area) === _a.private) {
      widget_chat = {
        kind: 'widget_chat',
        className: 'share-room-widget__chat',
        type: _a.share,
        area: this.mget(_a.area),
        view: 'quickChat',
        hub_id: this.mget(_a.hub_id)
      };
    } else {
      widget_chat = {
        kind: 'widget_chat',
        className: 'share-room-widget__chat',
        type: this.get(_a.area),
        nid: this.mget(_a.nid),
        view: 'quickChat',
        hub_id: this.mget(_a.hub_id)
      };
    }

    return content.feed(widget_chat);
  }

  /**
   * 
   * @returns 
   */
  _fetchHomeData() {
    let api = {
      service: SERVICE.media.home,
      hub_id: this.model.get(_a.hub_id)
    };
    if (this.mget(_a.area) === _a.dmz) {
      api = {
        service: SERVICE.media.show_node_by,
        hub_id: this.model.get(_a.hub_id),
        nid: this.mget(_a.nid)
      };
    }
    this.fetchService(api).then((data) => {
      if (!data || !data.chat_upload_id) return;
      this.mset(_a.home, data);
      let content = data.filename || data.name;
      this.mset(_a.nid, data.chat_upload_id);
      if (this.__refWindowName != null) {
        this.__refWindowName.set({ content });
      }
    })
  }
}

module.exports = __window_channel;
