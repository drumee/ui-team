const { toggleState } = require("@drumee/ui-essentials")
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
      flow: _a.x,
      className: `${this.fig.family}__message-container ${this.mget(_a.author)}`,
      content: this.innerContent,
      escapeContextmenu: true,
    }));
    child.onAddKid = () => {
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
          child.append(threadMsg, 0);
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
    let area = this.mget(_a.area);
    this.$el.addClass(author);
    this.$el.addClass(area);
    const messageType = this.mget('message_type');
    if (messageType === 'meeting.start' || messageType === 'meeting.end') {
      this.$el.addClass('meeting-event');
    }
    let html = '';
    let m = {
      fig: this.fig.family,
      widgetId: this._id,
      author,
      area
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
      className: `${this.fig.family}__main ${author} ${area}`,
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
      const fresh = !this.menu || this.menu.isDestroyed();
      if (fresh) {
        this.prepend(require('./skeleton/menu')(this));
        this.menu = this.children.first();
      } else {
        this.menu.el.show();
      }
      const mainEl = this.__main.el;
      const bubble = mainEl.querySelector(`.${this.fig.family}__message-container`) || mainEl;
      const uiRect = this.el.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();
      const left = bubbleRect.left - uiRect.left + bubbleRect.width - 14;
      const top = bubbleRect.top - uiRect.top;
      if (this.menu && !this.menu.isDestroyed()) {
        this.menu.el.style.left = `${left}px`;
        this.menu.el.style.top = `${top}px`;
      }
      if (fresh) this._wireDropdownPositioning();
    } else {
      if (this.menu && !this.menu.isDestroyed()) {
        this.menu.el.hide();
      }
    }
  }

  // Reposition the action popup as `position: fixed` viewport coords so it
  // escapes the chat list's overflow clipping and stays inside the panel.
  _wireDropdownPositioning() {
    if (!this.menu || this.menu.isDestroyed()) return;
    const trigger = this.menu.el.querySelector('.menu-icon');
    const itemsWrapper = this.menu.el.querySelector('.menu-topic-items__wrapper');
    if (!trigger || !itemsWrapper) return;

    const reposition = () => {
      if (!this.menu || this.menu.isDestroyed()) return;
      const triggerRect = trigger.getBoundingClientRect();
      const wrapperWidth = itemsWrapper.offsetWidth || 140;
      let right = window.innerWidth - triggerRect.right - 8;
      if (right < 8) right = 8;
      const maxRight = window.innerWidth - wrapperWidth - 8;
      if (right > maxRight) right = Math.max(8, maxRight);
      itemsWrapper.style.position = 'fixed';
      itemsWrapper.style.left = 'auto';
      itemsWrapper.style.right = `${right}px`;
      itemsWrapper.style.top = `${triggerRect.bottom + 4}px`;
      itemsWrapper.style.bottom = 'auto';
      // menu_topic forces inline `overflow: hidden` for its slide animation;
      // restore visibility so all action icons stay reachable.
      itemsWrapper.style.overflow = 'visible';
    };

    const observer = new MutationObserver(() => {
      if (itemsWrapper.dataset.state === 'open') reposition();
    });
    observer.observe(itemsWrapper, { attributes: true, attributeFilter: ['data-state'] });
    this._dropdownObserver = observer;

    const onLayoutChange = () => {
      if (itemsWrapper.dataset.state === 'open') reposition();
    };
    window.addEventListener('scroll', onLayoutChange, true);
    window.addEventListener('resize', onLayoutChange);
    this._dropdownLayoutTeardown = () => {
      window.removeEventListener('scroll', onLayoutChange, true);
      window.removeEventListener('resize', onLayoutChange);
    };
  }

  onBeforeDestroy() {
    if (this._dropdownObserver) {
      this._dropdownObserver.disconnect();
      this._dropdownObserver = null;
    }
    if (this._dropdownLayoutTeardown) {
      this._dropdownLayoutTeardown();
      this._dropdownLayoutTeardown = null;
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
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

      case 'join-meeting': {
        const target = e && (e.target.closest && e.target.closest('[data-service="join-meeting"]'));
        if (!target) return;
        if (this._joiningMeeting) return;            // debounce rapid clicks
        const hub_id = target.dataset.hub_id;
        const nid = target.dataset.nid || hub_id;
        if (!hub_id) return;
        this._joiningMeeting = true;
        setTimeout(() => { this._joiningMeeting = false; }, 800);

        // Prefer to switch the tab on the folder window the user is already in.
        // Walk up to the containing window_folder; if it matches, just switch
        // to the meeting tab — no Wm.launch, no reload.
        const ownFolder = this.getParentByKind && this.getParentByKind("window_folder");
        if (ownFolder
            && ownFolder.mget(_a.hub_id) == hub_id
            && ownFolder.showFolderTab) {
          if (ownFolder.activeTab === "meeting") return;
          ownFolder.showFolderTab("meeting");
          if (ownFolder.raise) ownFolder.raise();
          return;
        }

        // Otherwise reuse any open folder window for the same hub/nid, or open
        // a new one. wm_unique_id prevents duplicates piling up on re-clicks.
        const existing = (Wm.getItemsByKind && Wm.getItemsByKind("window_folder") || [])
          .find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
        if (existing && existing.showFolderTab) {
          existing.showFolderTab("meeting");
          if (existing.raise) existing.raise();
          return;
        }

        Wm.launch({
          kind: "window_folder",
          hub_id,
          nid,
          activeTab: "meeting",
          wm_unique_id: `window_folder-${hub_id}-${nid}`,
        }, { explicit: 1, singleton: 1 });
        return;
      }
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
    if (!this.mget(_a.thread).is_attachment) return;
    // initialize() runs before LetcBox binds fetchService; defer to next tick.
    setTimeout(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      if (typeof this.fetchService !== 'function') return;
      this.fetchService({
        service: SERVICE.chat.attachment,
        message_id: this.mget(_a.thread).message_id,
        hub_id: this.mget(_a.uiHandler).hubId
      });
    }, 0);
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
