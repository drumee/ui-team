const { toggleState, colorFromName, copyToClipboard } = require("@drumee/ui-essentials");
const { isSupportEntity, supportMarkup } = require("libs/support");
require("./skin");
class ___widget_chatItem extends LetcBox {
  /**
   *
   * @param {*} opt
   */
  initialize(opt = {}) {
    super.initialize(opt);

    this.mset({ author: this._resolveAuthor() });
    this._timer = {};
    this.setThreadData(); // do not remove
    this.declareHandlers({ ui: _a.multiple, part: _a.multiple });
    this.innerContent = require("./template")(this);
    this.model.unset(_a.state);
  }

  /**
   * Resolve which side this message renders on: "me" (right-aligned bubble) for
   * the viewer's own messages, "other" (left) for everyone else. The returned
   * value becomes the `author` model field that drives positioning across the
   * templates and skin. Overridable by subclasses that pin every message to a
   * single side — see the chat-item-other variant used by the DMZ share chat.
   * @returns {String} "me" | "other"
   */
  _resolveAuthor() {
    return this.mget(_a.author_id) === Visitor.id ? _a.me : _a.other;
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

  // The folder-visible "file thread started" system card. Like meeting cards it
  // is a centred notice with no hover reply/reaction menu; its only action is
  // "Open" → switches the folder window to that file's chat thread.
  _isFileThreadCard() {
    return this.mget("message_type") === "file.thread";
  }

  // Any non-conversational system card (meeting OR file.thread) — used to gate
  // the hover action bar.
  _isSystemMessage() {
    return this._isMeeting() || this._isFileThreadCard();
  }

  // Hydrate the file-thread card with the CURRENT filename + availability from
  // file_thread_info (rename/delete/move are reflected live, not from a stored
  // snapshot). Best-effort: a failed fetch just leaves the card as rendered.
  async _hydrateFileThreadCard() {
    let md = this.mget("metadata") || {};
    if (typeof md === "string") {
      try {
        md = JSON.parse(md);
      } catch (e) {
        md = {};
      }
    }
    const ftId = md._file_thread_id || this.mget("file_thread_id");
    const fileNid = md._file_nid || this.mget("file_nid");
    if (!ftId && !fileNid) return;
    // The server already resolved this card as unreachable (file trashed, moved
    // out of the hub, or not readable by this viewer) and kept it in the
    // conversation as a history marker. Render it inert from the stored
    // snapshot: asking file_thread_info again can only fail the same way, and
    // its failure would leave the card nameless.
    if (Number(md._file_thread_unavailable) === 1) {
      return this._applyUnavailableFileThreadCard(
        md._file_thread_last_filename,
      );
    }
    // The chat-item model has no hub_id of its own — without it the request
    // goes out as hub_id=undefined and the server answers 403. Resolve it
    // robustly: uiHandler may be a single widget OR an array ([ui]); the
    // containing folder window carries the authoritative hub_id; Host is the
    // last resort.
    let uh = this.mget(_a.uiHandler);
    if (_.isArray(uh)) uh = uh[0];
    const folderWin =
      this.getParentByKind && this.getParentByKind("window_folder");
    const hubId =
      this.mget(_a.hub_id) ||
      (folderWin && folderWin.mget && folderWin.mget(_a.hub_id)) ||
      (uh && uh.hubId) ||
      (typeof Host !== "undefined" && Host.get && Host.get(_a.id)) ||
      "";
    let info;
    try {
      const svc =
        (SERVICE.channel && SERVICE.channel.file_thread_info) ||
        "channel.file_thread_info";
      info = await this.fetchService(svc, {
        hub_id: hubId,
        file_thread_id: ftId || "",
        file_nid: fileNid || "",
      });
    } catch (e) {
      // Best-effort hydration — but the card stays disabled. A failed fetch is
      // NOT proof of access, and NOT_FOUND / NO_PERMISSION arrive this way too.
      return;
    }
    if (!info) return;
    // The card body renders asynchronously (feed → message-content), so the
    // name/badge slots may not be in the DOM yet when this fetch resolves —
    // retry briefly until they exist.
    const apply = (tries) => {
      const nameEl = this.el && this.el.querySelector(`#ftc-name-${this._id}`);
      if (!nameEl) {
        if (tries > 0) setTimeout(() => apply(tries - 1), 60);
        return;
      }
      // Filename is the card's primary text (Figma 2216-170414) — no leading
      // middot (that belonged to the old "X started a file chat ·").
      nameEl.textContent = info.user_filename || info.filename || "";
      const unavailable =
        Number(info.exists_thread) !== 1 ||
        (info.media_status && info.media_status !== "active");
      if (unavailable) {
        this.$el.addClass("ftc-unavailable");
        this._setFileThreadCardAvailable(0);
      } else {
        // Authoritative confirmation: the thread exists and the file is still
        // readable by this viewer, so the card becomes clickable. A later
        // revocation flips this back to "0" (window/folder/file-thread-access).
        //
        // Drop the unavailable styling too: this method re-runs after a
        // restore, and leaving the class behind kept the filename struck
        // through on a card that was working again — it only cleared on a full
        // reload, because nothing else ever removed it.
        this.$el.removeClass("ftc-unavailable");
        this._setFileThreadCardAvailable(1);
      }
      // Swap the paperclip badge for the file's vignette thumbnail (image/
      // vector files only; others keep the icon).
      const type = info.filetype || info.category;
      const nid = fileNid || info.file_nid;
      if ((type === _a.image || type === _a.vector) && nid) {
        const badge = this.el.querySelector(`#ftc-badge-${this._id}`);
        if (badge) {
          const { mfs_base, keysel } = bootstrap();
          let url = `${mfs_base}file/vignette/${nid}/${hubId}`;
          if (keysel) url += `?keysel=${keysel}`;
          badge.style.backgroundImage = `url("${url}")`;
          badge.classList.add(`${this.fig.family}__ftc-badge--image`);
        }
      }
    };
    apply(20);
  }

  // Paint a card the server flagged unavailable: the file's last known name (or
  // a generic label when the server had none to give — e.g. a file that is
  // still live but unreadable to this viewer, which leaves no trash row), and
  // the greyed-out, non-clickable state. Shares the same retry-until-mounted
  // approach as the normal hydrate: the card body feeds asynchronously.
  _applyUnavailableFileThreadCard(lastFilename) {
    const label = `${lastFilename || ""}`.trim();
    const apply = (tries) => {
      const nameEl = this.el && this.el.querySelector(`#ftc-name-${this._id}`);
      if (!nameEl) {
        if (tries > 0) setTimeout(() => apply(tries - 1), 60);
        return;
      }
      nameEl.textContent = label || LOCALE.FILE_NO_LONGER_AVAILABLE;
      this.$el.addClass("ftc-unavailable");
      this._setFileThreadCardAvailable(0);
    };
    apply(20);
  }

  // Flip the card's availability flag. The flag — not a CSS class — is what
  // _openFileThread checks, so a disabled card cannot be opened by a click that
  // slips past styling.
  _setFileThreadCardAvailable(available) {
    const card =
      this.el &&
      this.el.querySelector('[data-service="open-file-thread"]');
    // dataset keeps the underscore as-is (only `-x` is camel-cased), so this is
    // the same attribute the template rendered — same convention as the
    // neighbouring data-file_nid reads.
    if (card) card.dataset.ft_available = available ? "1" : "0";
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
        messageType === "file.thread" ||
        this.mget("is_ticket");
      const hasMessageText = !_.isEmpty((this.mget("message") || "").trim());
      // Attachments now render as a card inside the bubble (Figma), so a
      // file-only message still needs the bubble shell to host the card.
      const showBubble = hasMessageText || isSpecialType || hasAttachment;

      if (hasAttachment) {
        child.append(
          Skeletons.Wrapper.Y({
            // `no-text`: file-only message → drop the gap above the card so the
            // bubble doesn't get a stray top inset with no text to separate from.
            className: `${fig}__attachment-wrapper ${author}${
              hasMessageText ? "" : " no-text"
            }`,
            kids: [
              Skeletons.List.Smart({
                sys_pn: _a.list,
                flow: _a.none,
                axis: _a.y,
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
        // Figma: the reply quote sits *inside* the message bubble, above the
        // text. The quote was prepended as a sibling of the bubble; move its DOM
        // into the colored bubble once both exist. No text bubble (e.g. an
        // attachment-only reply) → leave the quote as the prepended sibling.
        if (hasThread) {
          const bubble = el.querySelector(
            `.${this.fig.family}__conversation-content`,
          );
          const quote =
            child.el &&
            child.el.querySelector(`.${this.fig.family}-reply__main`);
          if (bubble && quote && quote.parentNode !== bubble) {
            bubble.insertBefore(quote, bubble.firstChild);
          }
        }
        // Figma: the file card sits inside the bubble, below the text. The
        // attachment was appended as a sibling of the bubble; move it in as the
        // last child so it stacks under the text (and the reply quote).
        if (hasAttachment) {
          const bubble = el.querySelector(
            `.${this.fig.family}__conversation-content`,
          );
          const card =
            child.el &&
            child.el.querySelector(`.${this.fig.family}__attachment-wrapper`);
          if (bubble && card && card.parentNode !== bubble) {
            bubble.appendChild(card);
          }
          // "Show in folder" → reveal the file in the folder window's Files tab.
          // Capture phase so it beats the card's open-on-click + Wm anchor click.
          if (!this._revealBound) {
            this._revealBound = true;
            el.addEventListener(
              "click",
              (ev) => {
                const t =
                  ev.target.closest &&
                  ev.target.closest('[data-service="show-in-folder"]');
                if (!t) return;
                ev.preventDefault();
                ev.stopPropagation();
                this._showInFolder();
              },
              true,
            );
          }
        }
        // Open the action bar only while hovering the message bubble (the
        // conversation content), mirroring the time reveal — not the whole row.
        // System messages (meeting / file-thread cards) are centred notices with
        // no actions, so they get no hover menu.
        if (!this._isSystemMessage()) {
          // Hovering the bubble reveals the action menu (CSS). The emoji
          // quick-bar is opened by CLICKING the smiley in that menu (not by
          // hover), so the hover target is the bubble body, as before.
          const hoverTarget =
            el.querySelector(`.${this.fig.family}__conversation-content`) || el;
          hoverTarget.addEventListener("mouseenter", this._mouseenter.bind(this));
          hoverTarget.addEventListener("mouseleave", this._mouseleave.bind(this));
        }
        // Render persisted reaction chips HERE — the bubble (and the
        // reactions-<id> container inside it) is now confirmed in the DOM.
        // Doing this from onDomRefresh raced the nested setTimeout: under a heavy
        // folder-window (re)open, ensureElement's ~1s poll window expired before
        // the container mounted, so saved reactions silently never showed.
        this._renderReactions();
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
      case _a.list:
        // Attachment file list — a separate List.Smart that fetches its card(s)
        // asynchronously AFTER this message row is already mounted. When the card
        // is appended the row grows taller. Notify the chat so it can re-pin to
        // the bottom if the user is parked there: the message list only
        // auto-scrolls on its OWN collection updates, never on an attachment
        // growing inside an existing row.
        child.onAddKid = () => {
          this.triggerHandlers({ service: "attachment-grown" });
        };
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
    // Re-render reaction chips whenever metadata changes (reactions live inside it).
    if (changed[_a.metadata] !== undefined) {
      // A meeting card has no reactions; its metadata change is the live→ended
      // flip, so re-render its body instead ("Join meeting" → "Meeting ended").
      if (this._isMeeting()) this._reRenderMeetingCard();
      else this._renderReactions();
    }
  }

  /**
   * Re-render the meeting system card in place after its status flips to ended.
   * Safe to replace innerHTML: system cards hold no reaction/reader DOM state.
   */
  _reRenderMeetingCard() {
    if (!this.el) return;
    const container = this.el.querySelector(
      `.${this.fig.family}__message-container`,
    );
    if (!container) return;
    this.innerContent = require("./template")(this);
    container.innerHTML = this.innerContent;
  }

  /**
   * Parse `metadata._reactions_` into a sorted array of chip descriptors.
   * Shape from server: `{ "<emoji>": ["uid", ...] }`
   * Returns: `[{ emoji, count, mine, uids }]` sorted by count descending.
   * Returns an empty array when there are no reactions or the field is absent.
   */
  _parseReactions() {
    const raw = this._metadataObject()._reactions_;
    if (!raw || typeof raw !== "object") return [];
    const myId = `${Visitor.id}`;
    return Object.keys(raw)
      .map((emoji) => {
        const uids = (raw[emoji] || []).map(String);
        return { emoji, count: uids.length, mine: uids.includes(myId), uids };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Render (or clear) the reaction chip row below the footer line.
   * Mirrors the imperative DOM pattern used by renderReaders() — finds the
   * container by id, clears it, and rebuilds chips from _parseReactions().
   * No reactions → hides the container (data-empty="1", display:none via CSS).
   */
  _renderReactions() {
    const id = `reactions-${this._id}`;
    // The reaction container is created asynchronously inside buildContent's
    // setTimeout, AFTER onDomRefresh runs — so on (re)open the element does not
    // exist yet when this is first called. waitElement defers until it mounts
    // (and resolves immediately on later metadata-change re-renders), mirroring
    // renderReaders(). This is what makes PERSISTED reactions show on reopen,
    // not only after a live toggle.
    this.waitElement(id, () => {
      const el = document.getElementById(id);
      if (!el) return;
      const reactions = this._parseReactions();
      // The quick-bar lives in the message line (replacing the action menu), NOT
      // in this chip container — so we can safely wipe and rebuild chips here.
      el.innerHTML = "";
      if (!reactions.length) {
        el.dataset.empty = "1";
        return;
      }
      el.dataset.empty = "0";
      const fig = this.fig.family;
      for (const { emoji, count, mine } of reactions) {
        const chip = document.createElement("span");
        chip.className = `${fig}__reaction-chip${mine ? " mine" : ""}`;
        chip.dataset.emoji = emoji;
        // data-service makes dispatchUiEvent pick up chip clicks as "react"
        chip.dataset.service = "react";
        chip.setAttribute("aria-label", `${emoji} ${count}`);

        const emojiSpan = document.createElement("span");
        emojiSpan.className = `${fig}__reaction-emoji`;
        emojiSpan.textContent = emoji;

        const countSpan = document.createElement("span");
        countSpan.className = `${fig}__reaction-count`;
        countSpan.textContent = count;

        chip.appendChild(emojiSpan);
        chip.appendChild(countSpan);
        el.appendChild(chip);
      }
    });
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
    const author_id = this.mget(_a.author_id);
    const profile = img.parentElement;

    // Support is the product, not a person. The account has no photo, so the
    // fallback below drew initials from its username — a bare "S" on a
    // generated colour, next to a message signed "Drumee Support Center".
    // Give it the same mark the inbox row and the header show instead.
    if (profile && isSupportEntity(author_id)) {
      const mark = `${this.fig.family}__profile-mark`;
      img.style.display = "none";
      if (!profile.querySelector(`.${mark}`)) {
        profile.insertAdjacentHTML("beforeend", supportMarkup(mark));
      }
      return;
    }

    const url = Visitor.avatar(author_id, _a.vignette);
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
    if (this._isFileThreadCard()) {
      this.$el.addClass("file-thread-event");
      this._hydrateFileThreadCard();
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
    // Reaction chips render from buildContent once the bubble's reactions-<id>
    // container is confirmed mounted — avoids an ensureElement timeout race that
    // left them blank on folder-window reopen. _onDataChanged covers live updates.
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
    // Cancel any pending lazy build. The action menu auto-hides via CSS :hover.
    // The emoji bar is click-triggered and dismissed by outside-click, so it must
    // NOT close on mouse-leave (the cursor moves onto it to pick an emoji).
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
    // While the emoji bar (or full picker) stands in for the action menu, don't
    // build the menu on top of it — it rebuilds on the next hover after the bar
    // closes (the bar destroys the menu on open; see _toggleReactionBar).
    if (this._reactionBar && !this._reactionBar.isDestroyed()) return;
    // Build the action menu lazily on each hover when absent, then drop it INTO
    // the message line so CSS lays it out on one vertically-centred row beside
    // the bubble (time on the opposite side). Placement + reveal are pure CSS —
    // see skin/index.scss (&-line / &-footer) and skin/menu.scss (&__dropdown).
    const fresh = !this.menu || this.menu.isDestroyed();
    if (fresh) {
      this.prepend(require("./skeleton/menu")(this));
      this.menu = this.children.first();
      const fig = this.fig.family;
      const line = this.__main.el.querySelector(`.${fig}__message-line`);
      if (line && this.menu && this.menu.el) {
        line.appendChild(this.menu.el);
      }
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

  // ===========================================================
  // Emoji reaction helpers
  // ===========================================================

  /**
   * Optimistically toggle an emoji reaction in local metadata, re-render
   * chips immediately, then propagate upward so the parent chat widget can
   * route to postService(channel.react / chat.react).
   * Guards against rapid double-fires with a 300 ms debounce per emoji.
   *
   * One-reaction-per-user rule (#5): picking emoji X removes the user from ALL
   * other emoji arrays first, then adds to X. Picking the user's current emoji
   * again simply removes (toggle off). This mirrors the backend rule.
   * @param {String} emoji
   */
  _toggleReaction(emoji) {
    if (!emoji) return;
    const now = Date.now();
    this._reactionGuard = this._reactionGuard || {};
    if (now - (this._reactionGuard[emoji] || 0) < 300) return;
    this._reactionGuard[emoji] = now;

    // Optimistic update — mutate local metadata and re-render chips.
    const md = this._metadataObject();
    const reactions = md._reactions_ || {};
    const myId = `${Visitor.id}`;

    // One-per-user: remove myId from EVERY emoji array (mirrors the SP, which
    // also normalises any legacy state where a user sat on multiple emojis).
    // Do NOT break early — legacy rows may have the user on more than one emoji.
    let wasOnChosen = false;
    for (const key of Object.keys(reactions)) {
      const uids = (reactions[key] || []).map(String);
      if (!uids.includes(myId)) continue;
      if (key === emoji) wasOnChosen = true;
      const next = uids.filter((u) => u !== myId);
      if (next.length === 0) {
        delete reactions[key];
      } else {
        reactions[key] = next;
      }
    }

    // Re-add to the chosen emoji unless the user just toggled that same one off.
    if (!wasOnChosen) {
      const uids = (reactions[emoji] || []).map(String);
      reactions[emoji] = [...uids, myId];
    }

    md._reactions_ = reactions;
    // mset triggers _onDataChanged → _renderReactions via change event
    this.mset(_a.metadata, JSON.stringify(md));

    // Propagate to parent (chat/index.js) which routes to postService
    this.triggerHandlers({
      service: "react",
      message_id: this.mget("message_id"),
      emoji,
      socket_id: Visitor.get(_a.socket_id) || "",
    });
  }

  /**
   * Replace the local reactions map with the authoritative version from the
   * server broadcast (channel.react / chat.react). Reconciles any optimistic
   * state — no merge, just replace.
   * @param {Object} reactionsMap  { "<emoji>": ["uid", ...] }
   */
  _patchReactions(reactionsMap) {
    if (!reactionsMap || typeof reactionsMap !== "object") return;
    const md = this._metadataObject();
    md._reactions_ = reactionsMap;
    this.mset(_a.metadata, JSON.stringify(md));
    // _onDataChanged will call _renderReactions via the change event
  }

  /**
   * Toggle the quick-bar (6 common emojis + "+" for full picker) that appears
   * below the message bubble when the smiley action button is clicked.
   * Inserts the bar into the reactions container DOM element so it sits
   * visually below the bubble and above (or replacing) any existing chips.
   */
  _toggleReactionBar() {
    // Toggle: if the bar already exists as a child widget, remove it.
    if (this._reactionBar && !this._reactionBar.isDestroyed()) {
      this._closeReactionBar();
      return;
    }
    // The emoji bar REPLACES the action menu in the same spot (floating above the
    // bubble). DESTROY the menu outright rather than hide it: a hidden/cached menu
    // proved fragile and stayed invisible after reacting. With it gone, the next
    // hover rebuilds a fresh menu (see _hover), which reliably re-appears.
    const fig = this.fig.family;
    const line =
      this.__main && this.__main.el.querySelector(`.${fig}__message-line`);
    if (!line) return;
    if (this.menu && !this.menu.isDestroyed()) this.menu.goodbye();
    this.menu = null;

    this.append(require("./skeleton/reactions")(this));
    this._reactionBar = this.children.last();
    if (this._reactionBar && this._reactionBar.el) {
      line.appendChild(this._reactionBar.el);
    }

    // Close the bar (and restore the menu) when the user clicks outside the item.
    const closeOnOutside = (ev) => {
      if (!this.el || this.el.contains(ev.target)) return;
      this._closeReactionBar();
      document.removeEventListener("click", closeOnOutside, true);
    };
    // Delay so the current click that opened the bar doesn't immediately close it.
    setTimeout(() => {
      document.addEventListener("click", closeOnOutside, true);
      this._reactionBarOutsideHandler = closeOnOutside;
    }, 0);
  }

  /**
   * Tear down the quick-bar (and any open picker) and restore the reaction
   * row's empty-hidden state so it does not linger as an empty strip.
   */
  _closeReactionBar() {
    this._closeEmojiPicker();
    if (this._reactionBar && !this._reactionBar.isDestroyed()) {
      this._reactionBar.goodbye();
    }
    this._reactionBar = null;
    if (this._reactionBarOutsideHandler) {
      document.removeEventListener("click", this._reactionBarOutsideHandler, true);
      this._reactionBarOutsideHandler = null;
    }
    // The action menu was destroyed when the bar opened; the next hover rebuilds
    // it fresh (see _hover), so there is nothing to restore here.
  }

  /**
   * Open the full emoji picker popover, anchored in the message line next to the
   * quick-bar it opened from. Toggle: calling again while open destroys it.
   */
  _openEmojiPicker() {
    // Toggle off if already open → restore the quick-bar it replaced.
    if (this._emojiPicker && !this._emojiPicker.isDestroyed()) {
      this._emojiPicker.goodbye();
      this._emojiPicker = null;
      if (this._reactionBar && this._reactionBar.el) {
        this._reactionBar.el.style.display = "";
      }
      return;
    }

    const fig = this.fig.family;
    const container =
      this.__main && this.__main.el.querySelector(`.${fig}__message-line`);
    if (!container) return;

    // The picker REPLACES the quick-bar in the SAME spot: hide the 6-emoji bar
    // while the picker is open (skin positions __popover exactly where __bar sat).
    if (this._reactionBar && this._reactionBar.el) {
      this._reactionBar.el.style.display = "none";
    }

    this.append(require("./skeleton/emoji-picker-popover")(this));
    this._emojiPicker = this.children.last();

    // Anchor the picker in the message line, where the quick-bar it opened from sat.
    if (this._emojiPicker && this._emojiPicker.el) {
      container.appendChild(this._emojiPicker.el);
    }

    // Close when clicking outside the entire message item.
    const closeOnOutside = (ev) => {
      if (!this.el || this.el.contains(ev.target)) return;
      this._closeEmojiPicker();
      document.removeEventListener("click", closeOnOutside, true);
    };
    setTimeout(() => {
      document.addEventListener("click", closeOnOutside, true);
      this._pickerOutsideHandler = closeOnOutside;
    }, 0);
  }

  /**
   * Close the emoji picker if open, and remove its outside-click listener.
   */
  _closeEmojiPicker() {
    if (this._emojiPicker && !this._emojiPicker.isDestroyed()) {
      this._emojiPicker.goodbye();
    }
    this._emojiPicker = null;
    if (this._pickerOutsideHandler) {
      document.removeEventListener("click", this._pickerOutsideHandler, true);
      this._pickerOutsideHandler = null;
    }
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
    this._closeEmojiPicker();
    if (this._reactionBar && !this._reactionBar.isDestroyed()) {
      this._reactionBar.goodbye();
      this._reactionBar = null;
    }
    if (this._reactionBarOutsideHandler) {
      document.removeEventListener("click", this._reactionBarOutsideHandler, true);
      this._reactionBarOutsideHandler = null;
    }
    if (this._pickerOutsideHandler) {
      document.removeEventListener("click", this._pickerOutsideHandler, true);
      this._pickerOutsideHandler = null;
    }
    this._closeThreadPicker();
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  /**
   * Capture-phase click handler. Runs BEFORE inner Box widgets' bubble-phase
   * onclick so we never lose the first click to e.stopPropagation() from the
   * framework's __handleClick on inner widgets. Handles two things:
   *   1. Reaction-chip clicks (toggle / switch / remove) — caught here so a
   *      SINGLE tap registers; the bubble path was swallowed by inner Box
   *      onclick, which is why a chip "needed several taps".
   *   2. Selection-mode: toggle selection on the whole row.
   *
   * Selection step skips when:
   *   - chat is not in selection mode
   *   - target is an interactive element (link/input/button)
   *   - target sits inside a node with its own data-service (checkbox etc.)
   */
  _handleSelectionClick(e) {
    const target = e && e.target;
    if (!target) return;

    // (1) Reaction chip — handle on capture so inner Box onclick can't swallow
    // it. _toggleReaction's 300ms guard dedupes any later bubble re-fire. Scoped
    // to the chip class so the quick-bar emoji buttons (which need their own
    // onUiEvent → _closeReactionBar) are left to the framework.
    const chip =
      target.closest && target.closest(".widget-chatItem__reaction-chip");
    if (chip) {
      const emoji = chip.dataset.emoji;
      if (emoji) this._toggleReaction(emoji);
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // (1.5) File-thread card — open on capture. The card HTML lives inside a
    // framework Skeletons.Element bubble whose onclick (__handleClick →
    // getService) stopImmediatePropagation's, so a bubble-phase click dies at
    // the Element and never reaches our outer onclick (dispatchUiEvent) — the
    // exact "needed several taps" trap. Capture beats it; _openFileThread's
    // guard dedupes the rare bubble re-fire (see dispatchUiEvent fallback).
    const ftCard =
      target.closest &&
      target.closest('[data-service="open-file-thread"]');
    if (ftCard) {
      this._openFileThread(ftCard);
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // (1.6) Meeting-start card "Join meeting" — same trap as the file-thread
    // card above: the button lives in raw markup inside a framework
    // Skeletons.Element bubble whose bubble-phase onclick (__handleClick →
    // getService) stopImmediatePropagation's AND debounces for ~300ms, so most
    // clicks never reached the outer onclick (dispatchUiEvent). That is the
    // "have to click Join several times" report. Capture beats it;
    // _joinMeeting's guard dedupes the rare bubble re-fire.
    const joinBtn =
      target.closest && target.closest('[data-service="join-meeting"]');
    if (joinBtn) {
      this._joinMeeting(joinBtn);
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // (2) Selection mode.
    const chatRoot =
      this.el.closest &&
      this.el.closest('.widget-chat__main[data-selected="1"]');
    if (!chatRoot) return;
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
      case "react": {
        // Chip clicked directly in the DOM — find the chip element to read
        // the emoji (the target might be an inner span).
        const chip =
          e &&
          e.target &&
          e.target.closest &&
          e.target.closest("[data-service='react']");
        if (!chip) return;
        const emoji = chip.dataset.emoji;
        if (!emoji) return;
        this._toggleReaction(emoji);
        return;
      }

      case "select-message":
        this.select();
        this.triggerHandlers({ service });
        return;

      case "join-meeting": {
        // Fallback only — the reliable path is the capture handler
        // (_handleSelectionClick → _joinMeeting). _joinMeeting's guard makes a
        // double-fire a no-op.
        const target =
          e &&
          e.target.closest &&
          e.target.closest('[data-service="join-meeting"]');
        this._joinMeeting(target);
        return;
      }

      case "open-file-thread": {
        // Fallback only — the reliable path is the capture handler
        // (_handleSelectionClick → _openFileThread). This bubble case rarely
        // runs because the inner Element swallows the bubble; _openFileThread's
        // guard makes a double-fire a no-op.
        const target =
          e &&
          e.target.closest &&
          e.target.closest('[data-service="open-file-thread"]');
        this._openFileThread(target);
        return;
      }
    }
    return false;
  }

  /**
   * Join the live meeting advertised by a meeting-start card. Called from the
   * capture-phase click handler (primary, click-reliable) and the bubble
   * dispatchUiEvent case (fallback) — the guard dedupes the two firing for one
   * click, and blocks the burst of re-clicks the old dead-click behaviour
   * trained users into.
   *
   * The button is painted as busy on the spot: joining a room takes seconds
   * (folder window + media devices + conference bind), and with no feedback the
   * card looked broken, so people clicked it again and again.
   * @param {HTMLElement} target the [data-service="join-meeting"] button
   */
  _joinMeeting(target) {
    if (!target || !target.dataset) return;
    if (this._joiningMeeting) return; // dedupe capture + bubble, and rapid clicks
    const hub_id = target.dataset.hub_id;
    const nid = target.dataset.nid || hub_id;
    if (!hub_id) return;
    this._joiningMeeting = true;
    // Long enough to cover a cold folder-window boot, short enough that leaving
    // and rejoining straight away still works.
    setTimeout(() => {
      this._joiningMeeting = false;
      if (target.isConnected) target.dataset.joining = "0";
    }, 2500);
    target.dataset.joining = "1";

    // Reuse the folder window the user is already in (or any open one for
    // the same hub) — but actually JOIN the live room. showFolderTab
    // ("meeting") only renders the schedule calendar, so members of a
    // shared folder who clicked Join with the folder open got a tab
    // switch instead of the call — and a dead click once already on the
    // meeting tab. _launchMeetingInPanel is re-click safe: it raises the
    // existing call window (with an "already in a call" alert) when one
    // is open, and debounces via _launchingMeeting.
    const joinVia = (folder) => {
      if (folder.raise) folder.raise();
      if (typeof folder._launchMeetingInPanel === "function") {
        folder._launchMeetingInPanel();
      } else if (folder.showFolderTab) {
        folder.showFolderTab("meeting"); // legacy fallback
      }
    };
    const ownFolder =
      this.getParentByKind && this.getParentByKind("window_folder");
    if (ownFolder && ownFolder.mget(_a.hub_id) == hub_id) {
      joinVia(ownFolder);
      return;
    }

    // Otherwise reuse any open folder window for the same hub/nid, or open
    // a new one. wm_unique_id prevents duplicates piling up on re-clicks.
    const existing = (
      (Wm.getItemsByKind && Wm.getItemsByKind("window_folder")) ||
      []
    ).find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
    if (existing) {
      joinVia(existing);
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
  }

  /**
   * Open the per-file chat thread for a clicked file-thread card. Called from
   * the capture-phase click handler (primary, click-reliable) and the bubble
   * dispatchUiEvent case (fallback). A short guard dedupes the two firing for
   * one click. Switches the containing folder window to the file-scoped Chat
   * tab, or reuses/launches one when clicked outside a folder window.
   * @param {HTMLElement} target the [data-service="open-file-thread"] card
   */
  _openFileThread(target) {
    if (!target || !target.dataset) return;
    // The card is pending/disabled until file_thread_info authoritatively
    // confirms the thread exists AND this viewer may still read the file, and
    // it is flipped back off the moment access is revoked. Enforced here — in
    // the capture-phase path every click funnels through — because CSS cannot
    // stop a click, and a stale card would otherwise mount a dead thread.
    if (target.dataset.ft_available !== "1") return;
    if (this._openingFileThread) return; // dedupe capture + bubble for one click
    const file_nid = target.dataset.file_nid;
    if (!file_nid) return;
    this._openingFileThread = true;
    setTimeout(() => {
      this._openingFileThread = false;
    }, 600);
    const filename = target.dataset.filename || "";
    const ownFolder =
      this.getParentByKind && this.getParentByKind("window_folder");
    if (ownFolder && _.isFunction(ownFolder.scopeChatToFile)) {
      // Scope the (already-visible) chat to the file IN PLACE — no auto-switch
      // to the full Chat tab.
      if (ownFolder.raise) ownFolder.raise();
      ownFolder.scopeChatToFile(file_nid, filename);
      return;
    }
    // Outside a folder window (e.g. workspace/bigchat root chat): reuse an open
    // folder window for this hub, or launch one scoped to the file. Mirrors
    // _showInFolder + join-meeting window reuse. The file chat keys off
    // file_nid, so the hub root folder window suffices. No forced Chat tab — the
    // window opens on its default tab with the embedded chat scoped.
    const hub_id =
      this.mget(_a.hub_id) ||
      (this.mget(_a.uiHandler) && this.mget(_a.uiHandler).hubId);
    if (hub_id && Wm.launch) {
      const existing = (
        (Wm.getItemsByKind && Wm.getItemsByKind("window_folder")) ||
        []
      ).find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
      if (existing && _.isFunction(existing.scopeChatToFile)) {
        if (existing.raise) existing.raise();
        existing.scopeChatToFile(file_nid, filename);
        return;
      }
      Wm.launch(
        {
          kind: "window_folder",
          hub_id,
          scopedFileNid: file_nid,
          scopedFileLabel: filename,
          wm_unique_id: `window_folder-${hub_id}`,
        },
        { explicit: 1, singleton: 1 },
      );
      return;
    }
    // Last resort: bubble to the containing chat widget's uiHandler chain.
    this.triggerHandlers({
      service: "open-file-thread",
      file_nid,
      filename,
    });
  }

  // ===========================================================
  // Reply-in-thread (team chat only)
  // ===========================================================

  /**
   * True when this message row lives inside a folder window — i.e. the team
   * chat. The per-file thread feature exists only there, so reply-in-thread is
   * gated on it (p2p / share / desk chats keep the normal reply).
   */
  _isTeamChat() {
    return !!(this.getParentByKind && this.getParentByKind("window_folder"));
  }

  /**
   * True when this row is rendered INSIDE a chat already scoped to a file thread
   * (the side panel or in-place Files-tab thread view). There the reply-in-thread
   * action is meaningless (you're already in the thread), so the toolbar icon is
   * suppressed — normal reply still applies. Detected via the parent chat
   * widget's isFileThreadMode() (scopedFileNid set).
   */
  _isInFileThread() {
    const chat = this.getParentByKind && this.getParentByKind("widget_chat");
    return !!(chat && typeof chat.isFileThreadMode === "function" && chat.isFileThreadMode());
  }

  /**
   * Fast sync check: does this message reference a file? Either an uploaded
   * attachment (is_attachment / non-empty attachment) or an inline file-mention
   * anchor in the rendered bubble. Avoids the async attachment fetch for plain
   * text messages.
   */
  _hasThreadableFile() {
    if (this.mget("is_attachment") || !_.isEmpty(this.mget("attachment"))) return true;
    return !!(this.messageEl && this.messageEl.querySelector(".file-mention"));
  }

  /**
   * True when the message carries an uploaded attachment (image or any file).
   * Gates the "copy attachment" menu icon. A plain file-mention (no upload
   * record) is excluded — there is nothing to fetch a blob/link for.
   */
  _hasAttachment() {
    return !!(this.mget("is_attachment") || !_.isEmpty(this.mget("attachment")));
  }

  /**
   * Copy this message's attachment(s) OUT to the OS clipboard. Fetches the
   * attachment records (same SERVICE.chat.attachment api the cards use), then
   * for the first image writes an image blob via the async Clipboard API so it
   * pastes into Files / another browser / an image editor; a non-image file
   * falls back to copying its direct link as text. Clipboard image write needs
   * a secure context (stage is https) and a real image blob, so we fetch the
   * original then normalise to PNG on a canvas (Chrome only accepts image/png
   * in ClipboardItem).
   */
  async copyAttachment() {
    let files;
    try {
      files = await this.fetchService(this.getAttachments());
    } catch (e) {
      this.warn && this.warn("[chat-item] copyAttachment fetch failed", e);
      return;
    }
    files = (_.isArray(files) ? files : [files]).filter(Boolean);
    if (_.isEmpty(files)) return;

    const { mfs_base, keysel, protocol } = bootstrap();
    const { hubId } = this.mget(_a.uiHandler) || {};
    const isImage = (f) =>
      (f.ftype || f.filetype || f.category) === _a.image ||
      /^image\//.test(f.mimetype || "");

    const image = files.find(isImage);
    if (image && navigator.clipboard && window.ClipboardItem) {
      const nid = image.nid || image.file_nid;
      const hub = image.hub_id || hubId;
      let url = `${mfs_base}file/orig/${nid}/${hub}`;
      if (keysel) url += `?keysel=${keysel}`;
      try {
        const blob = await fetch(url).then((r) => r.blob());
        const png = await this._toPngBlob(blob);
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": png }),
        ]);
        this.triggerHandlers({ service: "attachment-copied", copied: "image" });
        return;
      } catch (e) {
        this.warn && this.warn("[chat-item] copy image failed, falling back to link", e);
      }
    }

    // No image (or image copy unsupported/failed) → copy the first file's link.
    const f = files[0];
    const nid = f.nid || f.file_nid;
    const hub = f.hub_id || hubId;
    const host = f.vhost ? `${protocol}://${f.vhost}` : "";
    const link = f.ownpath
      ? `${host}${f.ownpath}`
      : `${mfs_base}file/orig/${nid}/${hub}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        copyToClipboard(link);
      }
      this.triggerHandlers({ service: "attachment-copied", copied: "link" });
    } catch (e) {
      this.warn && this.warn("[chat-item] copy link failed", e);
    }
  }

  /**
   * Re-encode any image blob to PNG via a canvas. ClipboardItem in Chrome only
   * reliably accepts image/png; a jpeg/webp/gif blob would otherwise be
   * rejected. Returns the original blob unchanged if it is already PNG.
   */
  _toPngBlob(blob) {
    if (blob.type === "image/png") return Promise.resolve(blob);
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (out) => (out ? resolve(out) : reject(new Error("toBlob null"))),
          "image/png",
        );
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  /**
   * Resolve the file(s) this message references → [{ file_nid, filename }].
   * Mentions are read from the DOM (inline anchors carry data-nid/data-filename).
   * Uploaded attachments are fetched via the same SERVICE.chat.attachment api
   * used to render the cards (the records carry the folder file nid). Deduped.
   */
  async _resolveThreadFiles() {
    const out = [];
    const seen = new Set();
    const push = (nid, filename) => {
      const id = `${nid || ""}`;
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push({ file_nid: id, filename: filename || "" });
    };

    // Inline file-mentions (synchronous, already in the DOM).
    if (this.messageEl) {
      this.messageEl.querySelectorAll(".file-mention").forEach((a) => {
        if (a.dataset) push(a.dataset.nid, a.dataset.filename);
      });
    }

    // Uploaded attachments (fetched — the message model holds no file nid).
    if (this.mget("is_attachment") || !_.isEmpty(this.mget("attachment"))) {
      try {
        const data = await this.fetchService(this.getAttachments());
        (_.isArray(data) ? data : [data]).filter(Boolean).forEach((f) => {
          // A device-uploaded attachment is a per-message sbox COPY (its own
          // nid), but its chat thread is keyed by the FOLDER file. channel.post
          // exposes that as folder_nid — use it so reply-in-thread opens the SAME
          // thread as the folder's "View Chat Threads" (avoids two threads per
          // uploaded file). Mentions already carry the folder nid directly.
          push(f.folder_nid || f.nid, f.filename || f.user_filename);
        });
      } catch (e) {
        this.warn("reply-in-thread: attachment fetch failed", e);
      }
    }
    return out;
  }

  /**
   * Entry from the reply action when the message is a file message in team chat.
   * 1 file → reply straight into its thread; many → show a picker; none (race) →
   * fall back to a normal reply.
   */
  async _startFileThreadReply(cmd, args) {
    let files = [];
    try {
      files = await this._resolveThreadFiles();
    } catch (e) {
      files = [];
    }
    if (this.isDestroyed && this.isDestroyed()) return;
    if (!files.length) {
      // Not actually a file message → normal reply (mirror default bubble).
      this.source = cmd;
      this.service = _e.reply;
      args = args || {};
      args.service = _e.reply;
      this.triggerHandlers(args);
      this.service = "";
      return;
    }
    if (files.length === 1) return this._emitReplyInThread(files[0]);
    return this._openFileThreadReplyPicker(files);
  }

  /**
   * Pull the chat into `file`'s thread (same routing as clicking the file-thread
   * card — in-place on the Files tab, docked side panel on the full Chat tab),
   * carrying a snapshot of THIS message so the thread composer shows the reply
   * quote ("Reply to X in thread"). The quote is captured first because the
   * scope reload destroys this row.
   */
  _emitReplyInThread(file) {
    this._closeThreadPicker();
    const replyData = this._captureQuoteForThread();
    const folder =
      this.getParentByKind && this.getParentByKind("window_folder");
    if (folder && _.isFunction(folder.scopeChatToFile)) {
      if (folder.raise) folder.raise();
      folder.scopeChatToFile(file.file_nid, file.filename, { replyData });
      return;
    }
    // Defensive: outside a folder window — open the thread without a quote.
    this.triggerHandlers({
      service: "open-file-thread",
      file_nid: file.file_nid,
      filename: file.filename || "",
    });
  }

  /**
   * Snapshot this message for the reply quote BEFORE a scope reload destroys the
   * row. Mirrors chat/index.js#replyMessage's capture (model snapshot + each
   * rendered attachment card's getAttr) so the thread composer's quote renders
   * identically to a normal reply.
   */
  _captureQuoteForThread() {
    const snapshot = this.model ? this.model.toJSON() : {};
    if (snapshot) delete snapshot.is_attachment;
    const attachments = [];
    if (
      (this.mget("is_attachment") || !_.isEmpty(this.mget("attachment"))) &&
      this.__list &&
      this.__list.children
    ) {
      this.__list.children.each((view) => {
        if (view && typeof view.getAttr === "function") {
          attachments.push(view.getAttr());
        }
      });
    }
    return { message_id: this.mget("message_id"), snapshot, attachments };
  }

  /**
   * Multi-file message: float a small picker beside the bubble (same lazy-append
   * + click-outside pattern as the reaction quick-bar) so the user chooses which
   * file's thread to reply into.
   */
  _openFileThreadReplyPicker(files) {
    this._closeThreadPicker();
    const fig = this.fig.family;
    const line =
      this.__main && this.__main.el.querySelector(`.${fig}__message-line`);
    if (!line) return this._emitReplyInThread(files[0]);

    this.append(require("./skeleton/file-thread-reply-picker")(this, files));
    this._threadPicker = this.children.last();
    if (this._threadPicker && this._threadPicker.el) {
      line.appendChild(this._threadPicker.el);
    }

    const closeOnOutside = (ev) => {
      if (!this.el || this.el.contains(ev.target)) return;
      this._closeThreadPicker();
      document.removeEventListener("click", closeOnOutside, true);
    };
    setTimeout(() => {
      document.addEventListener("click", closeOnOutside, true);
      this._threadPickerOutsideHandler = closeOnOutside;
    }, 0);
  }

  _closeThreadPicker() {
    if (this._threadPicker && !this._threadPicker.isDestroyed()) {
      this._threadPicker.goodbye();
    }
    this._threadPicker = null;
    if (this._threadPickerOutsideHandler) {
      document.removeEventListener("click", this._threadPickerOutsideHandler, true);
      this._threadPickerOutsideHandler = null;
    }
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
      case "react": {
        // Skeleton button (quick-bar emoji or chip) — emoji is in cmd model.
        const emoji = cmd.mget("emoji") || cmd.mget("dataset")?.emoji || cmd.el?.dataset?.emoji;
        if (emoji) this._toggleReaction(emoji);
        // A pick from the quick-bar closes it (also clears data-bar-open so the
        // row doesn't linger empty after _renderReactions wipes its contents).
        this._closeReactionBar();
        return;
      }

      case "open-reaction-bar":
        this._toggleReactionBar();
        return;

      case "open-emoji-picker":
        this._openEmojiPicker();
        return;

      case "emoji-picked": {
        // Full picker emitted a selection — same path as quick-bar.
        const pickedEmoji =
          (args && args.emoji) ||
          cmd.mget("dataset")?.emoji ||
          cmd.el?.dataset?.emoji;
        if (pickedEmoji) this._toggleReaction(pickedEmoji);
        this._closeReactionBar();
        return;
      }

      case "picker-group": {
        // Tab clicked — scroll the emoji group into view inside the picker.
        const groupIdx = cmd.mget("dataset")?.groupIdx ?? cmd.el?.dataset?.groupIdx;
        if (groupIdx == null || !this._emojiPicker) return;
        const pickerEl = this._emojiPicker.el;
        if (!pickerEl) return;
        const groupEl = pickerEl.querySelector(`[data-group-idx="${groupIdx}"]`);
        if (groupEl) groupEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }

      case "chat-item-menu":
        /**  DO NOT REMOVE */
        return;

      case _a.forward:
      case "chat-item-delete":
      case "select-mode":
        console.log("[chat-item] delete/forward/select", {
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

      case _e.reply: {
        // Always a NORMAL reply — bubble to the chat widget (mirrors `default`).
        // Reply-in-thread is now a separate toolbar icon (case below), shown
        // only on file messages in team chat, so this icon never auto-routes.
        this.source = cmd;
        this.service = service;
        args = args || {};
        args.service = service;
        this.triggerHandlers(args);
        return (this.service = "");
      }

      case "reply-in-thread": {
        // Dedicated reply-in-thread icon (file messages, team chat only — the
        // skeleton only renders it there). Posts the reply INTO the referenced
        // file's chat thread, keeping the reply quote: 1 file → straight in,
        // several → file picker, none (race) → normal reply fallback.
        this._startFileThreadReply(cmd, args);
        return;
      }

      case "copy-attachment": {
        // Copy this message's attachment(s) to the OS clipboard so they can be
        // pasted into Files / another browser: images go in as an image blob,
        // other files fall back to copying their link text.
        this.copyAttachment();
        return;
      }

      case "pick-thread-file": {
        // A row in the multi-file reply picker — open that file's thread.
        const file_nid = `${cmd.mget("file_nid") || (cmd.el && cmd.el.dataset && cmd.el.dataset.file_nid) || ""}`;
        const filename = cmd.mget("filename") || (cmd.el && cmd.el.dataset && cmd.el.dataset.filename) || "";
        if (file_nid) this._emitReplyInThread({ file_nid, filename });
        return;
      }

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
    const thread = this.mget("thread");
    // A quoted file shows up as is_attachment OR a non-empty attachment field
    // (the sent reply snapshot carries `attachment` but has is_attachment
    // stripped — see chat/index.js#replyMessage), so check both before fetching.
    if (!thread.is_attachment && _.isEmpty(thread.attachment)) return;
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
    // Mark the model directly. The read-status node is optional in the footer
    // template, so the seen flag must not depend on the element existing —
    // otherwise the ack waits forever on a missing node and never short-circuits
    // subsequent acknowledge events. Update the DOM only when the node is present.
    this.mset("is_seen", seen);
    const el = document.getElementById(`readstatus-${this._id}`);
    if (el) el.dataset.is_seen = seen;
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
   * Always excludes the current viewer and the message author. The author has
   * already seen their own message and is already represented by the message row,
   * so rendering them again as a reader avatar duplicates their presence.
   * Other readers still show at their last-read message.
   * @returns {String[]}
   */
  _readerUids() {
    const seen = this._metadataObject()._seen_ || {};
    const me = `${Visitor.id}`;
    const author = this.mget(_a.author_id);
    const authorId = author == null ? null : `${author}`;
    const next = this.nextRow();
    const nextSeen = next ? this._seenOf(next) : {};
    return Object.keys(seen).filter(
      (uid) =>
        uid &&
        `${uid}` !== me &&
        (!authorId || `${uid}` !== authorId) &&
        nextSeen[uid] == null,
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
    // File-thread cards are navigational summaries, not real messages — keep
    // their read-receipt avatar row empty (template ships data-empty="1", which
    // the skin hides) so no "seen" avatars hang under the card.
    if (this._isFileThreadCard()) return;
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
   * "Show in folder" on a chat file card → reveal the file's location. Prefer
   * switching the folder window the user is already in to its Files tab; fall
   * back to opening (or focusing) a folder window for the file's hub.
   */
  _showInFolder() {
    const ownFolder =
      this.getParentByKind && this.getParentByKind("window_folder");
    if (ownFolder && ownFolder.showFolderTab) {
      ownFolder.showFolderTab("files");
      if (ownFolder.raise) ownFolder.raise();
      return;
    }

    const hub_id =
      this.mget(_a.hub_id) ||
      (this.mget(_a.uiHandler) && this.mget(_a.uiHandler).hubId);
    if (!hub_id || !Wm.launch) return;
    const existing = (
      (Wm.getItemsByKind && Wm.getItemsByKind("window_folder")) ||
      []
    ).find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
    if (existing && existing.showFolderTab) {
      existing.showFolderTab("files");
      if (existing.raise) existing.raise();
      return;
    }
    Wm.launch(
      {
        kind: "window_folder",
        hub_id,
        activeTab: "files",
        wm_unique_id: `window_folder-${hub_id}`,
      },
      { explicit: 1, singleton: 1 },
    );
  }

  /**
   * Render the quoted file list — one card per attached file (Figma 2306-36705:
   * [thumbnail] name / extension). `data` is the full SERVICE.chat.attachment
   * response (an array for a multi-file message).
   * @param {*} data
   */
  async attachmentReponse(data) {
    const files = (_.isArray(data) ? data : [data]).filter(Boolean);
    if (_.isEmpty(files)) return;
    const replyFig = `${this.fig.family}-reply`;

    const cards = files.map((f) => {
      const infoKids = [
        Skeletons.Note({ className: `${replyFig}__note filename`, content: f.filename || "" }),
      ];
      if (f.ext) {
        infoKids.push(
          Skeletons.Note({ className: `${replyFig}__note fileext`, content: f.ext }),
        );
      }
      return Skeletons.Box.X({
        className: `${replyFig}__file`,
        kids: [
          Skeletons.Box.Y({
            className: `${replyFig}__media-attachment`,
            flow: _a.none,
            kids: [
              {
                // Spread the FULL file record — the media grid resolves its
                // preview URL from vhost + ownpath/filepath, not just a subset,
                // so a hand-picked field list left the thumbnail blank.
                ...f,
                kind: "media_grid",
                className: `${this.fig.family}__attachment-wrapper`,
                isAttachment: 1,
                origin: _a.chat,
                uiHandler: Wm,
                logicalParent: Wm,
                filetype: f.ftype || f.filetype,
              },
            ],
          }),
          Skeletons.Box.Y({ className: `${replyFig}__file-info`, kids: infoKids }),
        ],
      });
    });

    await this.ensurePart("attachment-files");
    this.__attachmentFiles.feed(cards);

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
          // Pass the whole array so a reply to a multi-file message renders
          // every file (not just the first).
          this.attachmentReponse(data);
        }
        return;
    }
  }
}
___widget_chatItem.initClass();

module.exports = ___widget_chatItem;
