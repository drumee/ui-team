const { toggleState } = require("core/utils")
require('./skin');
class ___widget_chatItem extends LetcBox {


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);

    if (this.mget(_a.author_id) === Visitor.id) {
      this.mset({
        author: "me"
      });
    } else {
      this.mset({
        author: _a.other
      });
    }
    this._timer = {};
    this.setThreadData(); // do not remove
    this.declareHandlers({ ui: _a.multiple, part: _a.multiple });
    this.innerContent = require('./template')(this);
    this.model.unset(_a.state);
  }


  /**
 * 
 * @param {*} child
 * @returns 
 */
  buildContent(child) {
    let id = `content-${this.mget(_a.widgetId)}`;
    child.escapeContextmenu = true;
    child.append(Skeletons.Element({
      flow: _a.y,
      className: `${this.fig.family}__message-container`,
      content: this.innerContent,
      escapeContextmenu: true,
    }));
    child.onAddKid = () => {
      // Why ?
      //this.triggerHandlers({ service: "chat-item-child" });
      child.el.dataset.preattachment = '0';
    }
    this.waitElement(id, () => {
      let el = document.getElementById(id);
      this.messageEl = el;
      el.onclick = Wm.onAnchorClick.bind(Wm);
      setTimeout(() => {
        let author = this.mget(_a.author);
        let fig = this.fig.family;
        if (this.mget(_a.type) == _a.share && this.mget(_a.author) != _a.me) {
          child.append(Skeletons.UserProfile({
            className: `${fig}__profile other`,
            id: this.mget(_a.author_id)
          }))
        }

        if (!_.isEmpty(this.mget(_a.thread) && this.mget('thread_id'))) {
          let threadMsg = require('./skeleton/reply-message')(this);
          child.append(threadMsg);
        }

        if (this.mget('is_attachment') || !_.isEmpty(this.mget('attachment'))) {
          child.append(Skeletons.Wrapper.X({
            className: `${fig}__attachment-wrapper ${author}`,
            kids: [
              Skeletons.List.Smart({
                sys_pn: _a.list,
                flow: _a.none,
                axis: _a.x,
                timer: 50,
                className: `${fig}__attachment-wrapper-list`,
                uiHandler: this,
                partHandler: this,
                itemsOpt: {
                  kind: 'media_grid',
                  isAttachment: 1,
                  origin: _a.chat,
                  uiHandler: Wm,
                  logicalParent:Wm
                },
                vendorOpt: Preset.List.Orange_e,
                api: this.getAttachments.bind(this),
              })
            ]
          }));
        }
      }, 300);

    })
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.main:
        this.waitElement(child.el, () => {
          this.buildContent(child);
        })
        break;
    }
  }

  /**
   * 
   * @param {*} m 
   */
  _onDataChanged(m) {
    let { changed } = m;
    let { is_seen, is_readed } = changed;
    if (is_seen || is_readed) {
      let readstatus = document.getElementById(`${this._id}-readstatus`);
      if(readstatus){
        if(is_readed != null) readstatus.dataset.is_readed = is_readed;
        if(is_seen != null) readstatus.dataset.is_seen = is_seen;
      }
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.model.on(_e.change, this._onDataChanged.bind(this))
    this.el.onclick = this.dispatchUiEvent.bind(this);
    let author = this.mget(_a.author);
    this.$el.addClass(author);
    let html = '';
    let m = {
      fig: this.fig.family,
      widgetId: this._id,
      author,
    }
    const dod = this.showDateOfDay();
    if (dod) {
      html = require('./template/note')(m, dod, 'date-of-day');
    }
    const cb = require('./template/checkbox')(m);
    this.el.innerHTML = `${html}${cb}`;
    let preattachment = 0;
    if (this.mget('is_attachment')) preattachment = 1;
    this.feed(Skeletons.Box.Z({
      className: `${this.fig.family}__main ${author} ${this.mget(_a.type)}`,
      sys_pn: _a.main,
      flow: _a.none,
      escapeContextmenu: true,
      dataset: {
        preattachment
      }
    }));
    this.el.onmouseenter = this._mouseenter.bind(this);
    this.el.onmouseleave = this._mouseleave.bind(this);
    this.el.oncontextmenu = null;
    this.acknowledge();
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  _mouseenter(e) {
    if (e.buttons) return;
    const f = () => {
      this._hover(_a.on, e);
    };
    this._timer.hover = _.delay(f, 200);
  }

  /**
   * 
   * @param {*} e 
   */
  _mouseleave(e) {
    clearTimeout(this._timer.hover);
    this._hover(_a.off, e);
  }

  /**
   * hover without media, only mouse
   * @param {*} state 
   */
  _hover(state, e) {
    if (!e) return;
    if (this.selectable == _a.yes) return;
    if (state == _a.on) {
      if (!this.menu || this.menu.isDestroyed()) {
        this.prepend(require('./skeleton/menu')(this));
        this.menu = this.children.first();
      } else {
        this.menu.el.show();
      }
      let el = this.__main.el;
      let width = el.offsetWidth - 14;
      if (this.menu && !this.menu.isDestroyed()) {
        this.menu.el.style.left = `${el.offsetLeft + width}px`;
        this.menu.el.style.top = `${el.offsetTop}px`;
      }
    } else {
      if (this.menu && !this.menu.isDestroyed()) {
        this.menu.el.hide();
      }
    }
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  dispatchUiEvent(e) {
    const service = this.el.getService(e); //e.target.dataset.service
    switch (service) {
      case 'select-message':
        this.select();
        this.triggerHandlers({ service });
        return;
    }
    return false;
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'chat-item-menu':
        /**  DO NOT REMOVE */
        return;

      case _a.forward:
      case _a.delete:
        this.select(1);
        this.triggerHandlers({
          service: 'show-message-selector',
          type: service
        });
        return;

      case 'select-message':
        this.select();
        this.triggerHandlers({ service });
        return;

      default:
        this.source = cmd;
        this.service = service;
        args.service = service;
        this.triggerHandlers(args);
        return this.service = '';
    }
  }

  /**
   * 
   * @param {*} s 
   */
  select(s) {
    if (s == null) {
      s = toggleState(this.mget('selected')) ^ 1;
    }

    this.messageEl.dataset.selected = s;
    const el = document.getElementById(`${this.mget(_a.widgetId)}-checkbox`);
    if (el != null) {
      el.dataset.selected = s;
    }
    this.mset({ selected: s });
    this.__main.el.dataset.selected = s;
  }

  /**
   * 
   * @returns 
   */
  getAttachments() {
    let { hubId } = this.mget(_a.uiHandler);
    if ((this.mget('message_type') === _a.ticket) && this.mget('hub_id')) {
      hubId = this.mget('hub_id');
    }
    const api = {
      service: SERVICE.chat.attachment,
      message_id: this.mget('message_id'),
      hub_id: hubId
    };

    return api;
  }

  /**
   * 
   * @returns 
   */
  setThreadData() {
    if (_.isEmpty(this.mget(_a.thread) && this.mget('thread_id'))) {
      return;
    }
    if (this.mget(_a.thread).is_attachment) {
      this.fetchService({
        service: SERVICE.chat.attachment,
        message_id: this.mget(_a.thread).message_id,
        hub_id: this.mget(_a.uiHandler).hubId
      });
    }
  }

  /**
   * 
   * @returns 
   */
  nextRow() {
    let c = this.model.collection;
    if (!c) return;
    return c.at(c.indexOf(this.model) + 1);
  }

  /**
   * 
   * @returns 
   */
  prevRow() {
    let c = this.model.collection;
    if (!c) return;
    if (c.indexOf(this.model) <= 0) {
      return;
    }
    return c.at(c.indexOf(this.model) - 1);
  }

  /**
   * 
   * @returns 
   */
  showDateOfDay() {
    const ctime = this.mget(_a.ctime);
    if (!ctime) return null;
    const row = this.prevRow();
    if (row) {
      const currentDate = Dayjs.unix(ctime).format("DDMMYYYY");
      const nextDate = Dayjs.unix(row.get(_a.ctime)).format("DDMMYYYY");
      if (currentDate !== nextDate) {
        return Dayjs.unix(ctime).locale(Visitor.language()).format("DD MMMM")
      }
    }
    return null;
  }

  /**
   * 
   */
  acknowledge(data) {
    if (this.mget('is_seen')) return;
    let el;
    let id = `readstatus-${this._id}`;
    let seen = 0;
    try {
      JSON.parse(this.mget(_a.metadata))._seen_[data.entity_id] || 0;
    } catch (e) {

    }
    if (data && data.metadata && data.message_id && data.message_id == this.mget('message_id')) {
      seen = JSON.parse(data.metadata)._seen_[data.entity_id] || 0;
      //this.debug("AAA:327", data, this);
    }
    this.waitElement(id, () => {
      el = document.getElementById(id);
      this.mset('is_seen', seen);
      el.dataset.is_seen = seen;
    })

  }

  /**
   * 
   * @param {*} data 
   */
  async attachmentReponse(data) {
    const attachment = {
      kind: 'media_grid',
      className: `${this.fig.family}__attachment-wrapper`,
      isAttachment: 1,
      origin: _a.chat,
      logicalParent: this,
      uiHandler: this,
      row: data,
      filetype: data.ftype,
      nid: data.nid,
      hub_id: data.hub_id,
      filename: data.filename,
      ext: data.ext,
      filesize: data.filesize,
      vhost: data.vhost,
      mode: _a.view,
      accessibility: data.accessibility,
      capability: data.capability
    };
    await this.ensurePart('attachment-content');
    this.__attachmentContent.feed(attachment);

    this.triggerHandlers({ service: 'attachment-reponse' });

  }

  /**
   * 
   */
  onChildBubble() {
    /* DO NOT REMOVE */
  }

  /**
   * 
   */
  format() {
    /* DO NOT REMOVE */
  }


  // ===========================================================
  // 
  // ===========================================================
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.chat.attachment:
        if (!_.isEmpty(data)) {
          this.attachmentReponse(data[0]);
        }
        return;
    }
  }
}
___widget_chatItem.initClass();

module.exports = ___widget_chatItem;
