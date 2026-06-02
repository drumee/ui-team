const { toggleState, colorFromName } = require("@drumee/ui-essentials");
require("./skin");
class ___widget_chatItem extends LetcBox {
  /**
   *
   * @param {*} opt
   */
  initialize(opt = {}) {
    super.initialize(opt);

    if (this.mget(_a.author_id) === Visitor.id) {
      this.mset({
        author: "me",
      });
    } else {
      this.mset({
        author: _a.other,
      });
    }
    this._timer = {};
    this.setThreadData(); // do not remove
    this.declareHandlers({ ui: _a.multiple, part: _a.multiple });
    this.innerContent = require("./template")(this);
    this.model.unset(_a.state);
  }

  /**
   * A meeting system message — either via an explicit message_type or the
   * `[[MEETING:start|end:...]]` sentinel embedded in the message body. These
   * render as centred notices with no hover actions.
   * @returns {Boolean}
   */
  _isMeeting() {
    const t = this.mget("message_type");
    if (t === "meeting.start" || t === "meeting.end") return true;
    const msg = this.mget("message");
    return typeof msg === "string" && /^\[\[MEETING:(start|end):/.test(msg);
  }

  /**
   *
   * @param {*} child
   * @returns
   */
  buildContent(child) {
    let id = `content-${this.mget(_a.widgetId)}`;
    child.escapeContextmenu = true;
    child.onAddKid = () => {
      child.el.dataset.preattachment = "0";
    };
    // Defer body appends so we can control order:
    //   1) Reply quote (if any)   — prepend
    //   2) Media attachment (if any)
    //   3) Message bubble (only if message text or special message type)
    setTimeout(() => {
      const fig = this.fig.family;
      const author = this.mget(_a.author);
      const hasThread =
        !_.isEmpty(this.mget("thread")) && this.mget("thread_id");
      const hasAttachment =
        this.mget("is_attachment") || !_.isEmpty(this.mget("attachment"));
      const messageType = this.mget("message_type");
      const isSpecialType =
        messageType === _a.call ||
        messageType === "meeting.start" ||
        messageType === "meeting.end" ||
        this.mget("is_ticket");
      const hasMessageText = !_.isEmpty((this.mget("message") || "").trim());
      const showBubble = hasMessageText || isSpecialType;

      if (hasAttachment) {
        child.append(
          Skeletons.Wrapper.X({
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
                  kind: "media_grid",
                  isAttachment: 1,
                  origin: _a.chat,
                  uiHandler: Wm,
                  logicalParent: Wm,
                },
                vendorOpt: Preset.List.Orange_e,
                api: this.getAttachments.bind(this),
              }),
            ],
          }),
        );
      }

      if (showBubble) {
        child.append(
          Skeletons.Element({
            flow: _a.x,
            className: `${fig}__message-container ${author}`,
            content: this.innerContent,
            escapeContextmenu: true,
          }),
        );
      }

      if (this.mget(_a.type) == _a.share && author != _a.me) {
        child.append(
          Skeletons.UserProfile({
            className: `${fig}__profile other`,
            id: this.mget(_a.author_id),
          }),
        );
      }

      // Prepend reply quote last so it sits above attachment + bubble.
      if (hasThread) {
        const threadMsg = require("./skeleton/reply-message")(this);
        child.prepend(threadMsg);
      }

      this.waitElement(id, () => {
        const el = document.getElementById(id);
        if (!el) return;
        this.messageEl = el;
        el.onclick = Wm.onAnchorClick.bind(Wm);
        // Open the action bar only while hovering the message bubble (the
        // conversation content), mirroring the time reveal — not the whole row.
        // Meeting system messages are centred notices with no actions, so they
        // get no hover menu.
        if (!this._isMeeting()) {
          const bubble =
            el.querySelector(`.${this.fig.family}__conversation-content`) || el;
          bubble.addEventListener("mouseenter", this._mouseenter.bind(this));
          bubble.addEventListener("mouseleave", this._mouseleave.bind(this));
        }
      });
    }, 0);
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
        });
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
      if (readstatus) {
        if (is_readed != null) readstatus.dataset.is_readed = is_readed;
        if (is_seen != null) readstatus.dataset.is_seen = is_seen;
      }
    }
  }

  /**
   *
   */
  _initiales() {
    const m = this.model.toJSON();
    const e = m.entity || m;
    let firstname = "";
    let lastname = "";
    try {
      firstname = (e.firstname || m.firstname || "")[0] || "";
    } catch (_) {}
    try {
      lastname = (e.lastname || m.lastname || "")[0] || "";
    } catch (_) {}
    if (!firstname && !lastname) {
      try {
        const parts = (e.surname || m.surname || "").split(" ");
        firstname = (parts[0] || "")[0] || "";
        lastname = (parts[1] || "")[0] || "";
      } catch (_) {}
    }
    return (firstname + lastname).toUpperCase() || "?";
  }

  /**
   *
   */
  _loadAvatar(img) {
    if (!img) return;
    const url = Visitor.avatar(this.mget(_a.author_id), _a.vignette);
    const profile = img.parentElement;
    img.style.display = "none";
    img.onerror = () => {
      if (!profile) return;
      profile.dataset.default = 1;
      const initiales = this._initiales();
      const span = document.createElement("span");
      span.className = `${this.fig.family}__profile-initiales`;
      span.textContent = initiales;
      span.style.backgroundColor = colorFromName(initiales || "??");
      profile.appendChild(span);
    };
    img.onload = () => {
      img.style.display = "";
      if (profile) {
        profile.dataset.quality = _a.high;
        profile.dataset.default = 0;
      }
    };
    img.src = url;
  }

  /**
   *
   */
  onDomRefresh() {
    this.model.on(_e.change, this._onDataChanged.bind(this));
    this.el.onclick = this.dispatchUiEvent.bind(this);
    // Selection-mode whole-row click — captured BEFORE inner Box widgets'
    // bubble-phase onclick (which calls e.stopPropagation in framework's
    // __handleClick). Without capture, clicks on the bubble body die at
    // the nearest Box ancestor and the first click never reaches our outer
    // onclick — the user had to double-click to bypass the framework's
    // 300ms click debounce. See letc.js __handleClick.
    this._selectClickCapture = this._handleSelectionClick.bind(this);
    this.el.addEventListener("click", this._selectClickCapture, true);
    let author = this.mget(_a.author);
    let area = this.mget(_a.area);
    this.$el.addClass(author);
    this.$el.addClass(area);
    if (this._isMeeting()) {
      this.$el.addClass("meeting-event");
    }
    let html = "";
    let m = {
      fig: this.fig.family,
      widgetId: this._id,
      author,
      area,
    };
    const dod = this.showDateOfDay();
    if (dod) {
      html = require("./template/note")(m, dod, "date-of-day");
    }
    const cb = require("./template/checkbox")(m);
    this.el.innerHTML = `${html}${cb}`;
    let preattachment = 0;
    if (this.mget("is_attachment")) preattachment = 1;
    this.feed(
      Skeletons.Box.Z({
        className: `${this.fig.family}__main ${author} ${area}`,
        sys_pn: _a.main,
        flow: _a.none,
        escapeContextmenu: true,
        dataset: {
          preattachment,
        },
      }),
    );
    // Hover handlers are bound to the message bubble (conversation content) in
    // buildContent — not the whole row — so the action bar opens on the same
    // target as the time reveal.
    this.el.oncontextmenu = null;
    this.acknowledge();
    this.renderReaders();
    let img_id = `${this.mget(_a.widgetId)}-avatar`;
    this.ensureElement(img_id)
      .then((img) => {
        this._loadAvatar(img);
      })
      .catch((e) => {
        this.ensureElement(img_id)
          .then((img) => {
            this._loadAvatar(img);
          })
          .catch((e) => {
            this._loadAvatar();
          });
      });
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  _mouseenter(e) {
    if (e.buttons) return;
    clearTimeout(this._timer.hide);
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
    // The action menu lives inside the message line and reveals via CSS :hover,
    // so there is no floating-bar gap to bridge — just cancel a pending lazy
    // build if the cursor leaves before it fires. (The time now sits in flow
    // below the bubble, always visible — not hover-gated.)
    clearTimeout(this._timer.hover);
  }

  /**
   * hover without media, only mouse
   * @param {*} state
   */
  _hover(state, e) {
    if (!e) return;
    if (this.selectable == _a.yes) return;
    if (state != _a.on) return;
    // Build the action menu lazily on first hover, then drop it INTO the
    // message line so CSS lays it out on one vertically-centred row beside the
    // bubble (time on the opposite side). Placement + reveal are pure CSS —
    // see skin/index.scss (&-line / &-footer) and skin/menu.scss (&__dropdown).
    const fresh = !this.menu || this.menu.isDestroyed();
    if (!fresh) return;
    this.prepend(require("./skeleton/menu")(this));
    this.menu = this.children.first();
    const fig = this.fig.family;
    const line = this.__main.el.querySelector(`.${fig}__message-line`);
    if (line && this.menu && this.menu.el) {
      line.appendChild(this.menu.el);
    }
  }

  // Reposition the action popup as `position: fixed` viewport coords so it
  // escapes the chat list's overflow clipping and stays inside the panel.
  _wireDropdownPositioning() {
    if (!this.menu || this.menu.isDestroyed()) return;
    const trigger = this.menu.el.querySelector(".menu-icon");
    const itemsWrapper = this.menu.el.querySelector(
      ".menu-topic-items__wrapper",
    );
    if (!trigger || !itemsWrapper) return;

    const reposition = () => {
      if (!this.menu || this.menu.isDestroyed()) return;
      const triggerRect = trigger.getBoundingClientRect();
      const wrapperWidth = itemsWrapper.offsetWidth || 140;
      let right = window.innerWidth - triggerRect.right - 8;
      if (right < 8) right = 8;
      const maxRight = window.innerWidth - wrapperWidth - 8;
      if (right > maxRight) right = Math.max(8, maxRight);
      itemsWrapper.style.position = "fixed";
      itemsWrapper.style.left = "auto";
      itemsWrapper.style.right = `${right}px`;
      itemsWrapper.style.top = `${triggerRect.bottom + 4}px`;
      itemsWrapper.style.bottom = "auto";
      // menu_topic forces inline `overflow: hidden` for its slide animation;
      // restore visibility so all action icons stay reachable.
      itemsWrapper.style.overflow = "visible";
    };

    const observer = new MutationObserver(() => {
      if (itemsWrapper.dataset.state === "open") reposition();
    });
    observer.observe(itemsWrapper, {
      attributes: true,
      attributeFilter: ["data-state"],
    });
    this._dropdownObserver = observer;

    const onLayoutChange = () => {
      if (itemsWrapper.dataset.state === "open") reposition();
    };
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);
    this._dropdownLayoutTeardown = () => {
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
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
    if (this._selectClickCapture && this.el) {
      this.el.removeEventListener("click", this._selectClickCapture, true);
      this._selectClickCapture = null;
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  /**
   * Capture-phase click handler — toggles selection on the whole row when
   * chat is in selection mode. Runs BEFORE inner Box widgets' bubble-phase
   * onclick so we never lose the first click to e.stopPropagation() from
   * the framework's __handleClick on inner widgets.
   *
   * Skips when:
   *   - chat is not in selection mode
   *   - target is an interactive element (link/input/button)
   *   - target sits inside a node with its own data-service (checkbox etc.)
   */
  _handleSelectionClick(e) {
    const chatRoot =
      this.el.closest &&
      this.el.closest('.widget-chat__main[data-selected="1"]');
    if (!chatRoot) return;

    const target = e && e.target;
    if (!target) return;
    const tag = (target.tagName || "").toUpperCase();
    if (tag === "A" || tag === "INPUT" || tag === "BUTTON") return;
    if (target.closest && target.closest("[data-service]")) return;

    this.select();
    this.triggerHandlers({ service: "select-message" });
    e.stopPropagation();
    e.preventDefault();
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  dispatchUiEvent(e) {
    const service = this.el.getService(e); //e.target.dataset.service
    switch (service) {
      case "select-message":
        this.select();
        this.triggerHandlers({ service });
        return;

      case "join-meeting": {
        const target =
          e &&
          e.target.closest &&
          e.target.closest('[data-service="join-meeting"]');
        if (!target) return;
        if (this._joiningMeeting) return; // debounce rapid clicks
        const hub_id = target.dataset.hub_id;
        const nid = target.dataset.nid || hub_id;
        if (!hub_id) return;
        this._joiningMeeting = true;
        setTimeout(() => {
          this._joiningMeeting = false;
        }, 800);

        // Prefer to switch the tab on the folder window the user is already in.
        // Walk up to the containing window_folder; if it matches, just switch
        // to the meeting tab — no Wm.launch, no reload.
        const ownFolder =
          this.getParentByKind && this.getParentByKind("window_folder");
        if (
          ownFolder &&
          ownFolder.mget(_a.hub_id) == hub_id &&
          ownFolder.showFolderTab
        ) {
          if (ownFolder.activeTab === "meeting") return;
          ownFolder.showFolderTab("meeting");
          if (ownFolder.raise) ownFolder.raise();
          return;
        }

        // Otherwise reuse any open folder window for the same hub/nid, or open
        // a new one. wm_unique_id prevents duplicates piling up on re-clicks.
        const existing = (
          (Wm.getItemsByKind && Wm.getItemsByKind("window_folder")) ||
          []
        ).find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
        if (existing && existing.showFolderTab) {
          existing.showFolderTab("meeting");
          if (existing.raise) existing.raise();
          return;
        }

        Wm.launch(
          {
            kind: "window_folder",
            hub_id,
            nid,
            activeTab: "meeting",
            wm_unique_id: `window_folder-${hub_id}-${nid}`,
          },
          { explicit: 1, singleton: 1 },
        );
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
    console.log("[chat-item] onUiEvent", service);
    switch (service) {
      case "chat-item-menu":
        /**  DO NOT REMOVE */
        return;

      case _a.forward:
      case "chat-item-delete":
        console.log("[chat-item] delete/forward", {
          service,
          hasMain: !!this.__main,
          hasMessageEl: !!this.messageEl,
        });
        try {
          this.select(1);
        } catch (e) {
          console.error("[chat-item] select(1) threw:", e);
        }
        this.triggerHandlers({
          service: "show-message-selector",
          type: service,
        });
        return;

      case "select-message":
        this.select();
        this.triggerHandlers({ service });
        return;

      default:
        this.source = cmd;
        this.service = service;
        args.service = service;
        this.triggerHandlers(args);
        return (this.service = "");
    }
  }

  /**
   *
   * @param {*} s
   */
  select(s) {
    if (s == null) {
      s = toggleState(this.mget("selected")) ^ 1;
    }

    if (this.messageEl) this.messageEl.dataset.selected = s;
    const el = document.getElementById(`${this.mget(_a.widgetId)}-checkbox`);
    if (el != null) {
      el.dataset.selected = s;
    }
    this.mset({ selected: s });
    this.__main.el.dataset.selected = s;
    // Mirror state to the chat-item root so the highlight (background tint)
    // spans the full row (incl. checkbox), regardless of "me"/"other" bubble width.
    this.el.dataset.selected = s;
  }

  /**
   *
   * @returns
   */
  getAttachments() {
    let { hubId, peerId } = this.mget(_a.uiHandler);
    if (this.mget("message_type") === _a.ticket && this.mget("hub_id")) {
      hubId = this.mget("hub_id");
    }
    const api = {
      service: SERVICE.chat.attachment,
      message_id: this.mget("message_id"),
      hub_id: hubId,
    };
    // P2P: message stored in sender's DB — pass peer_id so server can do cross-DB lookup
    if (peerId) api.peer_id = peerId;

    return api;
  }

  /**
   *
   * @returns
   */
  setThreadData() {
    if (_.isEmpty(this.mget("thread")) || !this.mget("thread_id")) {
      return;
    }
    if (!this.mget("thread").is_attachment) return;
    // initialize() runs before LetcBox binds fetchService; defer to next tick.
    setTimeout(() => {
      if (this.isDestroyed && this.isDestroyed()) return;
      if (typeof this.fetchService !== "function") return;
      this.fetchService({
        service: SERVICE.chat.attachment,
        message_id: this.mget("thread").message_id,
        hub_id: this.mget(_a.uiHandler).hubId,
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
        return Dayjs.unix(ctime).locale(Visitor.language()).format("DD MMMM");
      }
    }
    return null;
  }

  /**
   *
   */
  acknowledge(data) {
    if (this.mget("is_seen")) return;
    let el;
    let id = `readstatus-${this._id}`;
    let seen = 0;
    if (
      data &&
      data.metadata &&
      data.message_id &&
      data.message_id == this.mget("message_id")
    ) {
      try {
        seen = JSON.parse(data.metadata)._seen_[data.entity_id] || 0;
      } catch (e) {
        /* ignore */
      }
    }
    this.waitElement(id, () => {
      el = document.getElementById(id);
      this.mset("is_seen", seen);
      if (el) el.dataset.is_seen = seen;
    });
  }

  /**
   * Parse the model's metadata field into an object (it arrives as a JSON
   * string from the server).
   * @returns {Object}
   */
  _metadataObject() {
    const md = this.mget(_a.metadata);
    if (!md) return {};
    if (typeof md === "object") return Object.assign({}, md);
    try {
      return JSON.parse(md) || {};
    } catch (e) {
      return {};
    }
  }

  /**
   * _seen_ map ({uid: ts}) of a sibling message model.
   * @param {Backbone.Model} model
   * @returns {Object}
   */
  _seenOf(model) {
    if (!model || !model.get) return {};
    const md = model.get(_a.metadata);
    if (!md) return {};
    if (typeof md === "object") return (md && md._seen_) || {};
    try {
      return JSON.parse(md)._seen_ || {};
    } catch (e) {
      return {};
    }
  }

  /**
   * UIDs whose LAST read message is this one — Messenger-style placement. A
   * reader's avatar shows only on the most recent message they have read, i.e.
   * they have seen THIS message (uid in _seen_) but NOT the next (newer) one.
   * Since _seen_ accumulates downward, that pins each reader to their cursor.
   *
   * Excludes the current viewer (you don't see your own seen-marker, as in
   * Messenger) AND the message's own author (the sender trivially "saw" their
   * own message — showing their avatar below it is wrong, and on a teammate's
   * view the author = you would otherwise appear under your own sent message).
   * Other readers still show at their last-read message.
   * @returns {String[]}
   */
  _readerUids() {
    const seen = this._metadataObject()._seen_ || {};
    const me = `${Visitor.id}`;
    const author = `${this.mget(_a.author_id)}`;
    const next = this.nextRow();
    const nextSeen = next ? this._seenOf(next) : {};
    return Object.keys(seen).filter(
      (uid) =>
        uid && `${uid}` !== me && `${uid}` !== author && nextSeen[uid] == null,
    );
  }

  /**
   * Add/remove a reader uid in this message's local _seen_ map without
   * re-rendering — used by the parent chat widget to apply a read cursor
   * across the whole list before re-rendering all rows in one pass.
   * @param {String} uid
   * @param {Boolean} seen whether uid has read this message
   */
  updateReaderSeen(uid, seen) {
    if (!uid) return;
    const md = this._metadataObject();
    md._seen_ = md._seen_ || {};
    const has = md._seen_[uid] != null;
    if (seen && !has) {
      md._seen_[uid] = Math.floor(Date.now() / 1000);
      this.mset(_a.metadata, JSON.stringify(md));
    } else if (!seen && has) {
      delete md._seen_[uid];
      this.mset(_a.metadata, JSON.stringify(md));
    }
  }

  /**
   * Render the read-receipt avatar row below the message: up to 3 reader
   * avatars, then an "and more …" label when there are more than 3.
   */
  renderReaders() {
    const id = `readers-${this._id}`;
    this.waitElement(id, () => {
      const el = document.getElementById(id);
      if (!el) return;
      const readers = this._readerUids();
      el.innerHTML = "";
      if (!readers.length) {
        el.dataset.empty = "1";
        return;
      }
      el.dataset.empty = "0";
      const max = 3;
      for (const uid of readers.slice(0, max)) {
        const img = document.createElement("img");
        img.className = `${this.fig.family}__reader-avatar`;
        img.onerror = () => {
          img.style.visibility = "hidden";
        };
        img.src = Visitor.avatar(uid, _a.vignette);
        el.appendChild(img);
      }
      if (readers.length > max) {
        const more = document.createElement("span");
        more.className = `${this.fig.family}__reader-more`;
        more.textContent = LOCALE.AND_MORE || "and more …";
        el.appendChild(more);
      }
    });
  }

  /**
   *
   * @param {*} data
   */
  async attachmentReponse(data) {
    const attachment = {
      kind: "media_grid",
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
      capability: data.capability,
    };
    await this.ensurePart("attachment-content");
    this.__attachmentContent.feed(attachment);

    this.triggerHandlers({ service: "attachment-reponse" });
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
