const __player = require("player/interact");
const { marked } = require("marked");
const { xhRequest } = require("@drumee/ui-essentials");
const printJS = require("print-js");

const REMINDER_ID = 'reminder_id';

// Keys that mean "I am trying to change this text", used by _wireDmzEditGate to
// decide whether a keystroke on a READONLY textarea is an edit attempt worth
// gating. Deliberately narrow: arrows / Home / End / PageUp / PageDown / Tab /
// Escape / F-keys / bare modifiers, and Ctrl-C / Ctrl-A / Ctrl-F, are all things a
// view-only recipient legitimately does while READING, so they must never pop a
// dialog. Ctrl/Cmd-V and Ctrl/Cmd-X are edit intent even though the key itself is
// not printable; every other Ctrl/Cmd combo is not.
const EDIT_INTENT_KEYS = new Set(['Enter', 'Backspace', 'Delete']);
function _isEditIntentKey(e) {
  if (!e) return false;
  if (e.ctrlKey || e.metaKey) return /^[vx]$/i.test(e.key || '');
  if (e.altKey) return false;
  // A one-character key is a printable insert (letter, digit, punctuation, space).
  if (typeof e.key === 'string' && e.key.length === 1) return true;
  return EDIT_INTENT_KEYS.has(e.key);
}


require("./skin");
require("./skin/viewer");
class __editor_markdown extends __player {
  /**
   *
   */
  async initialize(opt = {}) {
    super.initialize(opt);
    const renderer = require("./renderer");
    const { mangle } = require("marked-mangle");
    const { gfmHeadingId } = require("marked-gfm-heading-id");
    marked.use(mangle({ mangle: false }));
    marked.use(gfmHeadingId({
      prefix: this.fig.family + "-"
    }));
    marked.use({ renderer });
    window.onbeforeunload = this.checkUnsavedWork.bind(this);
    if (opt.media) {
      this.copyPropertiesFrom(opt.media)
    } else {
      /** If not source file, default to the owner's */
      this.mset({
        hub_id: Visitor.id,
        pid: Visitor.get(_a.home_id),
        privilege: _K.privilege.owner
      })
    }

    const now = Dayjs().format(Visitor.timeformat());
    let filename = LOCALE.NOTE_ON_DATE_X.format(now);
    filename = filename.replace(/\//g, '-')
    this.model.atLeast({
      filename: LOCALE.NOTE_ON_DATE_X.format(now),
      hub_id: Visitor.get(_a.id),
    })
    // The save target is normally the active window (the folder the note is
    // created in). The DMZ share view has no pool window to be "active", so it
    // passes its window manager explicitly as opt.target — without this the note
    // would have no target and never save. Desk callers pass no opt.target → the
    // active-window behaviour is unchanged.
    this.target = opt.target || Wm.getActiveWindow();
  }

  /**
   *
   */
  onBeforeDestroy() {
    window.removeEventListener(
      "beforeunload",
      this.checkUnsavedWork.bind(this)
    );
  }

  /**
   * 
   */
  getCurrentMedia() {
    if (this.target) {
      return {
        pid: this.target.getCurrentNid(),
        hub_id: this.target.mget(_a.hub_id),
      }
    }
    return {
      hub_id: Visitor.id,
      pid: Visitor.get(_a.home_id),
    }
  }


  /**
   *
   */
  checkUnsavedWork() {
    if (this._changed) {
      return LOCALE.CONFIRM_QUIT;
    }
  }

  /**
   * 
   */
  display() {
    // Mobile: open as a full-bleed panel under the 44px mobile topbar
    // so the editor doesn't appear as a 600×400 floating dialog that
    // overflows on a 430px phone. 650 matches the SCSS @media fallback
    // in mixins/responsive.scss so JS and CSS agree on what counts as
    // mobile. `Visitor.isMobile()` is also OR'd in to catch DevTools
    // emulator cases where data-device tags mobile but innerWidth is
    // between 651 and 800.
    const isCompactViewport =
      window.innerWidth <= 650 ||
      (typeof Visitor.isMobile === 'function' && Visitor.isMobile());
    if (isCompactViewport) {
      // The mobile-topbar is a separate 44px flex row ABOVE the WM
      // container, so WM coordinates already start below it. Place the
      // panel at top:0 within WM (= 44px from viewport top) and let
      // its height fill the WM area. Setting top:44 here offsets it
      // a second time and clips the bottom past the visible WM.
      this.size = {
        width: window.innerWidth,
        height: window.innerHeight - 44,
        left: 0,
        top: 0,
      };
      super.display(this.size, this.preview.bind(this), { scale: 0.55, opacity: 0 });
      return;
    }

    const width = 600;
    const height = 400;
    const ww = Wm.$el.width();
    const wh = Wm.$el.height();
    this.size = {
      width,
      height,
      left: Math.max(0, (ww - width) / 2),
      top: Math.max(0, (wh - height) / 2),
    };
    super.display(this.size, this.preview.bind(this), { scale: 0.55, opacity: 0 });
  }

  /**
   *
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        this.display({ top: 85 });
        this.setupInteract();
        this.raise();
        this.viewerId = `${this.mget(_a.widgetId)}-viewer`;
        this.editorId = `${this.mget(_a.widgetId)}-editor`;
        child.feed(require('./skeleton/content')(this))
        this._wireDmzEditGate();
        break;
      case 'pin':
        if (!this.media || this.mget(REMINDER_ID)) return;
        if (!this.media.canOrganize()) return;
        this.waitElement(child.el, () => {
          child.el.dataset.visibility = 1;
        })
        const opt = {
          service: SERVICE.reminder.get,
          nid: this.mget(_a.nid),
          hub_id: this.mget(_a.hub_id),
          reminder_id: this.mget(REMINDER_ID)
        }
        this.postService(opt, { async: 1 }).then((data) => {
          if (data && data.reminder_id) {
            if (_.isString(data.task)) data.task = JSON.parse(data.task);
            this.mset(REMINDER_ID, data.id);
            this.mset(_a.task, data.task);
            child.setState(1);
          }
        })
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * Share recipient who cannot actually write → gate the FIRST edit keystroke.
   *
   * skeleton/content.js renders the textarea `readonly` when !canUpload(), and a
   * readonly field never fires an input/value-change event — which is why the
   * existing `text-input` service could not see the attempt and the recipient got
   * NO feedback at all when they typed. `readonly` (unlike `disabled`) still emits
   * keydown, so gate there. Delegates the decision to the share's own gate, so the
   * outcome matches every other beyond-grant action: anonymous → sign-up overlay,
   * signed-in without the edit grant → Request Access, creator or a recipient who
   * really holds the grant → returns false and they type normally.
   *
   * Scoped to a DMZ share via this.target.isDmz (the same marker the save path
   * uses), so a desk note editor never installs the listener at all.
   *
   * Listens on the widget ROOT in the capture phase rather than on the Entry part.
   * The Entry in skeleton/content.js carries a `sys_pn` but no `partHandler`, so
   * whether onPartReady('editor') fires at all depends on the implicit handler walk
   * — a dependency this gate does not need. this.el exists by the time the content
   * part is ready, keydown from the field bubbles to it, and capture runs before any
   * handler the field itself may have.
   */
  _wireDmzEditGate() {
    if (this._dmzEditGateWired) return;
    if (!this.target || !this.target.isDmz) return;
    if (typeof this.target.mget !== 'function') return;
    const desk = this.target.mget('desk');
    if (!desk || typeof desk._gateInteraction !== 'function') return;
    if (!this.el || typeof this.el.addEventListener !== 'function') return;
    this._dmzEditGateWired = 1;
    this.el.addEventListener('keydown', (e) => {
      // Only the note's own text field — never a toolbar button or the window chrome.
      const t = e && e.target;
      if (!t || !/^(TEXTAREA|INPUT)$/.test(t.tagName || '')) return;
      // Only for keys that actually mean "I am editing" — navigation, selection and
      // copy must stay usable for a view-only recipient who is legitimately reading.
      if (!_isEditIntentKey(e)) return;
      // Re-arm every time: the recipient must get the same answer whenever they try
      // to edit, so dismissing the popup and typing again has to bring it back. What
      // we must NOT do is re-fire while it is already on screen (a burst of keys, or
      // a held key, would otherwise re-feed the overlay repeatedly), so skip while
      // the sharebox's overlay is open — it re-arms itself when they close it.
      // Compared against _a.open (what the sharebox writes) plus the literal, since
      // dataset values are always strings and _a resolves keys at runtime.
      const ov = desk.__signupOverlay;
      const ovMode = ov && ov.el && ov.el.dataset ? ov.el.dataset.mode : null;
      if (ovMode && (ovMode === _a.open || ovMode === 'open')) {
        e.preventDefault();
        return;
      }
      // Backstop for the case where that overlay cannot be inspected: never fire more
      // than once per 800ms, so a fast typist still sees exactly one dialog.
      const now = Date.now();
      if (this._dmzEditGatedAt && (now - this._dmzEditGatedAt) < 800) {
        e.preventDefault();
        return;
      }
      if (!desk._gateInteraction(
        desk.havePermission(_K.permission.write, desk.mget(_a.privilege))
      )) return;
      this._dmzEditGatedAt = now;
      e.preventDefault();
    }, true);
  }

  /**
   * 
   * @param {*} url 
   */
  _loadContent(url) {
    xhRequest(url, { responseType: _a.text }).then((content) => {
      this.feed(require("./skeleton")(this));
      this.ensurePart(_a.content).then((p) => {
        p.feed(require('./skeleton/content')(this, content))
      })
    }).catch((e) => {
      this.suppress();
      let msg = e.reason || e.error || LOCALE.INTERNAL_ERROR;
      Wm.alert(msg);
      this.warn("_loadContent Error:14x5", e);
    });
  }
  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    if (this.media) {
      let { url, nid, hub_id, ownpath } = this.media.actualNode();
      const isSubfolder = ownpath && ownpath.split('/').filter(Boolean).length > 1;
      if (Visitor.inDmz && nid && isSubfolder) {
        // The vhost endpoint does not serve subfolder paths (only root-level files
        // work via the vhost).  Route through the same-origin service API using
        // the file's nid directly — no path depth restriction applies there.
        const env = bootstrap();
        const ksel = env.keysel ? `&keysel=${env.keysel}` : '';
        // actualNode() appends ?v=<md5Hash | mtime-ctime> to bust the browser cache
        // after a save. This hand-built media.orig URL omitted it, so reopening an
        // edited note in a share served the STALE cached body — the save looked like
        // it never persisted (it did; the desk, which uses actualNode's ?v=, showed
        // the new content). Mirror that cache-buster here.
        const md5 = this.media.mget('md5Hash');
        const changed = Math.abs(this.media.mget('mtime') - this.media.mget('ctime'));
        const killCache = md5 || ((_.isNaN(changed) || changed === 0) ? '' : changed);
        const ver = killCache ? `&v=${killCache}` : '';
        url = `${env.svc}media.orig?nid=${nid}&hub_id=${hub_id}${ksel}${ver}`;
      }
      this.media.wait(0);
      this._loadContent(url)
      return
    }
    if (this.mget(_a.task)) {
      let { nid, hub_id } = this.mget(_a.task)
      this.postService(SERVICE.media.get_node_attr, { nid, hub_id }).then((data) => {
        this.mset(data);
        let { url } = this.actualNode();
        this._loadContent(url)
      })
      return
    }

    this.feed(require("./skeleton")(this));

  }

  /**
   * 
   */
  _saveContent(opt, target) {
    this.postService(opt, { async: 1 }).then((data) => {
      // A denied/failed save resolves without a saved node — guard before reading
      // it so a server error (e.g. a 403) degrades to a warning instead of an
      // uncaught `data.file_path` TypeError / unhandled rejection.
      if (!data || !data.nid) {
        this.warn("__editor_markdown: save returned no node", data);
        return;
      }
      this._changed = 0;
      let content = `${LOCALE.SAVED} > ${data.file_path}`
      this.__acknowledgement.set({ content })
      this.__acknowledgementContainer.setState(1)
      setTimeout(() => {
        this.__acknowledgementContainer.setState(0)
      }, 1000)
      let [file] = target.getItemsByAttr(_a.nid, data.nid);
      if (!file) {
        const item = {
          kind: target._getKind(),
          filetype: _a.note,
          logicalParent: target,
          ...this.getCurrentMedia(),
          ...data,
        };
        delete item.replace;
        target.insertMedia(item, 0);
        target.scrollToBottom();
        return
      }
      if (file.restart) {
        file.mset(data);
        file.restart("media:modified");
      }
      this.mset(data);
    }).catch((e) => {
      // Never leave a save rejection unhandled (it surfaced as a global
      // unhandledrejection alert). The server-error path already notifies the user.
      this.warn("__editor_markdown: save failed", e);
    });
  }

  /**
  * 
  */
  pin(cmd) {
    let task = {
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      repeat: 'onload',
      action: 'open',
      filetype: _a.node,
      kind: this.mget(_a.kind),
      style: {
        ...this.$el.offset(),
        width: this.$el.width(),
        height: this.$el.height(),
      }
    }
    if (cmd.mget(_a.state)) {
      this.postService({ service: SERVICE.reminder.create, hub_id: Visitor.id, task }, { async: 1 }).then((data) => {
        delete data.id;
        this.mset(data);
      })
    } else {
      let id = this.mget(REMINDER_ID);
      if (!id) return;
      this.postService({ service: SERVICE.reminder.remove, hub_id: Visitor.id, id }, { async: 1 }).then((data) => {
        /** */
      })
    }
  }

  /**
   *
   */
  saveContent(content = "", node, ext = 'md') {
    let filetype;
    let service = SERVICE.media.save;
    switch (ext) {
      case 'md':
        filetype = 'markdown';
        break
      case 'html':
      case 'htm':
        filetype = _a.web;
        break;
      case 'pdf':
        filetype = _a.document;
        break;
      case 'docx':
        filetype = _a.document;
        break;
      default:
        filetype = _a.text;
    }
    let target = this.target;
    let position = 0;
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
      position = this.media.index();
    }
    // The textarea Entry (this.__editor) is the live source of truth for the note
    // body — _getHTML/preview/print all read it. For an opened existing note,
    // getData().content can come back empty, which would overwrite the file with ""
    // on save (data loss). Read the editor value first; keep `content` (passed by
    // saveTo for html/pdf/docx) and getData() as fallbacks.
    content = content || (this.__editor && this.__editor.getValue()) || this.getData().content || "";
    let a = content.split(/[ +\n]/);

    let filename = this.mget(_a.filename);
    if (!this.mget(_a.nid)) {
      if (a[0]) {
        filename = (a[0] + (a[1] ? a[1] : "")).replace(/[\/<>!\$\*\&\~\#\"\'\`\^\n]/g, '-')
      } else {
        filename = this.mget(_a.filename);
      }
    }
    //let ext = this.mget(_a.ext) || 'note';
    let { hub_id, nid, pid } = node || this.actualNode();
    let replace = 0;
    if (nid) replace = 1;
    let opt = {
      service,
      hub_id: hub_id || Visitor.get(_a.id),
      nid,
      id: nid,
      replace,
      pid: pid || Visitor.get(_a.home_id),
      filename: `${filename}.${ext}`,
      filetype,
      content,
      convert_to: ext
    };
    if (!replace) opt.position = position;

    if (this.target) {
      opt.pid = this.target.mget(_a.nid);
      opt.hub_id = this.target.mget(_a.hub_id);
      if (this.target.isDmz) {
        // DMZ share recipient: a non-member recipient has write only on the shared
        // subtree (a node grant), not hub-wide. media.save's ACL authorizes the node
        // referenced by `nid` (falling back to `p`); for a NEW note `nid` is empty so
        // the ACL defaults to the hub HOME — which the recipient can't write → 403.
        // Send the destination folder as `p` so the ACL authorizes against the shared
        // folder where the grant applies (mirrors make_dir, which passes the parent as nid).
        if (!opt.nid) opt.p = opt.pid;
        // A recipient who cannot actually write must not reach the server: an anonymous
        // (creator-bound) session reports a writable CLIENT privilege — so the textarea
        // is editable and canUpload() passes — but the server's read-only ceiling blocks
        // the write and the save silently no-ops (edit → save → reopen → nothing). The
        // same silence hit a SIGNED-IN recipient without the edit grant, who got no
        // feedback at all. Route both through the share's own gate: anonymous → sign-up,
        // signed-in without the grant → Request Access, creator / granted recipient →
        // proceed (returns false). Backstop for the keydown gate wired in
        // _wireDmzEditGate, which a mouse/context-menu paste can bypass.
        const desk = this.target.mget('desk');
        if (desk && typeof desk._gateInteraction === 'function' &&
          desk._gateInteraction(desk.havePermission(_K.permission.write, desk.mget(_a.privilege)))) {
          return;
        }
        // No "save to your Deck" fallback in a share: a recipient has no deck, and the
        // creator's own folder IS the share target. The desk fallback also fired
        // spuriously for the creator (the editor's canUpload() reads the note tile's
        // owner privilege = editable, while the share-session wm's privilege can be
        // view-only) → a confusing "save to your Deck?" prompt. Save straight into the
        // shared folder; the server is the final authority on write permission and a
        // denied save degrades gracefully via _saveContent's guard.
        return this._saveContent(opt, this.target);
      }
      if (!this.target.canUpload()) {
        let msg = `
        You don't have the permission to save the file into to the folder {0}.<br>
        Do you want to save it on you Deck?`
        Wm.confirm(msg.format(this.target.mget(_a.filename))).then((r) => {
          if (r.response == 'confirm') {
            opt.hub_id = Visitor.get(_a.id);
            opt.pid = Visitor.get(_a.home_id);
            this._saveContent(opt, Wm)
          }
        }).catch((e) => { })
      } else {
        this._saveContent(opt, this.target)
      }
    }

  }

  /**
   * 
   */
  _getHTML() {
    let title = this.mget(_a.filename);

    let description = "description";
    let keywords = "keywords";
    let style = require('./template/style.css.txt').default;
    let content = this.__editor.getValue();
    let lines = content.split('\n');
    for (let line of lines) {
      if (/^\#{1,} /.test(line)) {
        title = line.trim().replace(/^\#{1,} /, '');
        break;
      }
    }
    let body = marked.parse(this.__editor.getValue());
    let template = require('./template/index.html.text').default;
    let renderer = _.template(template);
    return renderer({ title, description, keywords, style, body });
  }


  /**
   * 
   */
  saveTo(type) {
    let re = new RegExp(`.(md|${type})$`, 'i')
    let ownpath = this.mget(_a.ownpath).replace(re, `.${type}`);
    let html = this._getHTML();
    this.fetchService(SERVICE.media.get_node_stat, {
      hub_id: this.mget(_a.hub_id),
      nid: ownpath,
    }).then((data) => {
      if (data.ownpath == ownpath && data.pid == this.mget(_a.pid)) {
        this.saveContent(html, data, type);
      } else {
        delete data.nid;
        delete data.id;
        data.pid = this.mget(_a.pid);
        this.saveContent(html, data, type);
      }
    })
  }

  /**
   *
   */
  _updateView() {
    if (!this.__viewerOuter || this.__viewerOuter.isDestroyed()) return;
    let content = this.__content;
    let { width, height } = content.el.getBoundingClientRect();
    if (width <= height) {
      content.el.dataset.axis = _a.y;
      this.__viewerOuter.el.dataset.position = _a.bottom;
    } else {
      content.el.dataset.axis = _a.x;
      this.__viewerOuter.el.dataset.position = _a.right;
    }
  }

  /**
   *
   */
  _resizeStop(e, ui) {
    super._resizeStop(e, ui);
    this._updateView();
  }
  /**
   *
   * @param {*} cmd
   */
  preview(cmd) {
    if (!this.__viewer || this.__viewer.isDestroyed()) return;
    this.__viewer.el.innerHTML = marked.parse(this.__editor.getValue());
    this._updateView();
  }


  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _a.save:
        this.saveContent();
        break;
      case "save-html":
        this.saveTo('html');
        break;
      case "save-pdf":
        this.saveTo('pdf');
        break;
      case "save-docx":
        this.saveTo('docx');
        break;
      case "print": {
        if (!this.__editor) return;
        const style = require("./template/style.css.txt").default;
        const body = marked.parse(this.__editor.getValue());
        printJS({ printable: body, type: "raw-html", style });
        break;
      }
      case "preview":
        this.preview(cmd);
        break;
      case 'pin-on':
        this.pin(cmd);
        break;
      case "text-input":
        this._changed = 1;
        if (this.timer || !this.__viewer) return;
        this.timer = setTimeout(() => {
          let html = marked.parse(this.__editor.getValue());
          this.__viewer.el.innerHTML = html;
          this.timer = null;
        }, 3000);
        break;
      case _e.close:
        this.goodbye();
        return
      default:
        super.onUiEvent(cmd, args);
    }
  }
}
export default __editor_markdown;
