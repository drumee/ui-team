/* ============================================================= *
*   Copyright xialia.com  2011-2021
* ============================================================== */

const { xhRequest } = require("@drumee/ui-essentials");

const __player = require('player/interact');
const snap = require('builtins/window/snap');
const details = require('builtins/player/widget/details');
const share = require('builtins/player/widget/share');
const renameInline = require('builtins/player/widget/topbar/rename');
const REMINDER_ID = 'reminder_id';

// Gear-menu rows that act on the node rather than on the viewer. The MFS
// view this player was opened from implements all of them, so they are
// forwarded verbatim (see `_delegate`). Kept as an explicit allow-list: a
// catch-all would also swallow the player's own chrome events on their way
// to the base class.
const DELEGATED_SERVICES = [
  _e.copy,
  _e.remove,
  _a.chat,
  'chat-threads',
  'download-file-chat',
  'secure-share',
  'designation-link',
  'direct-url',
];

class __player_text extends __player {
  /**
   * 
   */
  async initialize(opt = {}) {
    this.size = _K.docViewer;
    super.initialize(opt);
    require('../skin');
    require('./skin');
    if (opt.maiden) { // Maiden note
      delete opt.maiden;
      this.model.unset('maiden')
      this.mset(({ content: '' }));
      let w = Wm.getActiveWindow();
      this.mset({
        hub_id: Visitor.id,
        pid: w.getCurrentNid(),
        filename: LOCALE.NOTE,
        ext: 'txt',
        filetype: _a.note
      });
    }

    this.style.set({ ...this.size, minWidth: 200, minHeight: 200 });
    this.isEditor = 1;
    this.isPlayer = 1;
  }


  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case _a.content:
        this.display({ top: 85 });
        this.setupInteract();
        let tags = _K.allowed_tag;
        tags.push(_K.tag.img);
        child.feed(Skeletons.Element({
          tagName: 'textarea',
          sys_pn: 'text-content',
          name: _a.content,
          tags,
          className: `${this.fig.family}__text-content`,
          attribute: {
            type: _a.text
          }
        }))
        break;
      case 'text-content':
        this.__textContent = child;
        this.waitElement(child.el, () => {
          child.el.value = this.mget(_a.content);
        })
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   *
   */
  _saveContent(opt, target) {
    this.postService(opt, { async: 1 }).then((data) => {
      this._changed = 0;
      const msg = `${LOCALE.SAVED} > ${data.file_path}`;
      this.ensurePart('acknowledgement').then((ack) => {
        ack.set({ content: msg });
      });
      this.ensurePart('acknowledgement-container').then((container) => {
        container.setState(1);
        setTimeout(() => container.setState(0), 1000);
      });
      let [file] = target.getItemsByAttr(_a.nid, data.nid);
      if (!file) {
        const item = {
          kind: target._getKind ? target._getKind() : undefined,
          filetype: _a.text,
          logicalParent: target,
          ...data,
        };
        delete item.replace;
        if (target.insertMedia) target.insertMedia(item, 0);
        this.mset(data);
        return;
      }
      if (file.restart) {
        file.mset(data);
        file.restart("media:modified");
      }
      this.mset(data);
    });
  }

  /**
   *
   */
  saveContent() {
    const content = this.__textContent ? this.__textContent.el.value : (this.mget(_a.content) || "");
    let target = Wm.getActiveWindow();
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
    }
    let { hub_id, nid, pid } = this.actualNode();
    let filename = this.mget(_a.filename) || LOCALE.NOTE;
    if (!nid && content) {
      const firstLine = content.split('\n')[0].trim();
      if (firstLine) {
        filename = firstLine.replace(/[/<>!$*&~#"'`^\n]/g, '-').substring(0, 50);
      }
    }
    const replace = nid ? 1 : 0;
    const opt = {
      service: SERVICE.media.save,
      hub_id: hub_id || Visitor.get(_a.id),
      nid,
      id: nid,
      replace,
      pid: pid || Visitor.get(_a.home_id),
      filename: `${filename}.txt`,
      filetype: _a.text,
      content,
      convert_to: 'txt',
    };
    if (!replace) opt.position = 0;
    this._saveContent(opt, target);
  }


  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */

  onDomRefresh() {
    this.raise();
    let url = null;
    if (this.media) {
      let { url: u, nid, hub_id, ownpath } = this.media.actualNode();
      // DMZ/secure-share: the vhost endpoint does NOT serve sub-folder paths, so an
      // HTML/text file inside a shared sub-folder fetches a 404 → "Failed to load"
      // / blank (the "HTML doesn't work when sharing" report). Route the raw content
      // through the same-origin service API by nid. Mirrors the markdown player's
      // #162 fix exactly. Desk + root-level DMZ files are byte-identical.
      const isSubfolder = ownpath && ownpath.split('/').filter(Boolean).length > 1;
      if (Visitor.inDmz && nid && isSubfolder) {
        const env = bootstrap();
        const ksel = env.keysel ? `&keysel=${env.keysel}` : '';
        u = `${env.svc}media.orig?nid=${nid}&hub_id=${hub_id}${ksel}`;
      }
      url = u;
    } else if (this.mget(REMINDER_ID)) {
      url = this.actualNode().url + `&v=${Dayjs().valueOf()}`;
    }
    if (url) {
      xhRequest(url, { responseType: _a.text }).then(async (data) => {
        this.mset(({ content: data }));
        if (this.media && this.media.wait) this.media.wait(0);
        this.feed(require('./skeleton')(this));
      }).catch((e) => {
        this.suppress();
        this.warn("Failed to load", url, e);
        let msg = e.reason || e.error || LOCALE.INTERNAL_ERROR;
        Wm.alert(msg);
      })
      return;
    }
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */

  /**
   * The Details card is a separate WM window, so closing this player would
   * otherwise leave it orphaned over the desk.
   */
  onBeforeDestroy() {
    details.close(this);
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _a.save:
        return this.saveContent();
      case "print": {
        const content = this.__textContent ? this.__textContent.el.value : (this.mget(_a.content) || "");
        const printJS = require("print-js");
        const body = `<pre>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
        printJS({ printable: body, type: "raw-html" });
        return;
      }
      case _e.close:
        return this.goodbye();

      // Move & Resize presets, from the shared topbar widget. Same snap
      // module the folder window and the other players use, so every window
      // snaps through one code path.
      case 'window-zoom':
        snap.toggleZoom(this, this._snapOpt());
        // toggleZoom is a toggle: a second call restores, which is the
        // "center" preset visually.
        return this._markSnapPreset(this._zoomed ? 'full' : 'center');

      case 'window-tile-left':
        snap.tileToSide(this, 'left', this._snapOpt());
        return this._markSnapPreset('left');

      case 'window-tile-right':
        snap.tileToSide(this, 'right', this._snapOpt());
        return this._markSnapPreset('right');

      case 'window-reframe':
        snap.reframe(this, this._defaultBounds(), this._snapOpt());
        return this._markSnapPreset('center');

      // Rename edits the title in place instead of being forwarded: the
      // MFS view opens its editor on the tile in the folder grid, behind
      // this player, where nobody can see it.
      case 'direct-rename':
        return renameInline(this);

      // Share: only an external workspace can share a file out; from an
      // internal one the user is shown what to do instead.
      case 'secure-share':
        return share.click(this, cmd);

      // Get info: the node's own properties card, docked under this
      // player's header and closed with it (widget/details).
      case 'info':
        return details.open(this);

      default:
        // Gear-menu rows that act on the node itself go to the source MFS
        // view; everything else is player chrome and belongs to the base.
        if (DELEGATED_SERVICES.includes(service) && this._delegate(cmd)) return;
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   * Forward a gear-menu row this player doesn't own to the source MFS view,
   * which implements the whole file-action vocabulary already. Returns false
   * when there's nothing to forward to — a note has no `media` at all — so
   * the caller can fall through to the base class rather than swallow it.
   */
  _delegate(cmd, args) {
    const media = this.media;
    if (!media || media.isDestroyed() || !_.isFunction(media.onUiEvent)) {
      return false;
    }
    media.onUiEvent(cmd, args);
    return true;
  }

  /** Window minimums the Move & Resize presets clamp to. */
  _snapOpt() {
    return { minWidth: 320, minHeight: 240 };
  }

  /** Geometry the "center" preset restores to. */
  _defaultBounds() {
    return this._preZoomBounds || snap.snapshotBounds(this);
  }

  /**
   * Light up the preset the window now sits in. Dragging or resizing by hand
   * doesn't clear it; tracking every geometry change to undo a highlight is
   * not worth the listener.
   */
  _markSnapPreset(preset) {
    for (const name of ['full', 'left', 'right', 'center']) {
      const part = this[`__snap${name.charAt(0).toUpperCase()}${name.slice(1)}`];
      if (part && !part.isDestroyed()) {
        part.el.dataset.active = name === preset ? 1 : 0;
      }
    }
  }


}
module.exports = __player_text;
