/**
 * widget_topic_create — the New Topic dialog of a folder's team chat (Figma
 * 867:186725). Mounted by the folder window in its "topic-dialog" slot
 * (window/folder/topics.js), never appended to the window.
 *
 * Host contract:
 *   host.topicCreate({ name, emoji }) → Promise<{ ok, status, topic }>
 *   host.topicDialogClose()
 *
 * Typing keeps focus: the card is fed once; the preview, error, tabs, search
 * row, grid and Create button are updated in place through their parts.
 */
const sk = require("./skeleton");
const { DEFAULT_TOPIC_EMOJI } = require("../../../libs/topic-emojis");

class __widget_topic_create extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.host = opt.host || (this.mget && this.mget("host")) || null;
    this._name = "";
    this._emoji = DEFAULT_TOPIC_EMOJI;
    this._tab = "smileys";
    this._query = "";
    this._busy = false;
    this._error = "";
    this.declareHandlers();
  }

  onDomRefresh() {
    if (this._fed) return;
    this._fed = 1;
    this.feed(sk(this));
  }

  _part(pn) {
    const p = this.getPart && this.getPart(pn);
    return p && !(p.isDestroyed && p.isDestroyed()) ? p : null;
  }

  _setError(msg) {
    this._error = msg || "";
    const p = this._part("topic-error");
    if (!p) return;
    if (typeof p.set === "function") p.set({ content: this._error });
    if (p.el) p.el.dataset.state = this._error ? "1" : "0";
  }

  _syncButton() {
    const p = this._part("topic-create-btn");
    if (!p || !p.el) return;
    p.el.dataset.disabled = sk.nameOk(this._name) ? "0" : "1";
    p.el.dataset.busy = this._busy ? "1" : "0";
  }

  _refeed(pn, kids) {
    const p = this._part(pn);
    if (p && typeof p.feed === "function") p.feed(kids);
  }

  _close() {
    const h = this.host;
    if (h && typeof h.topicDialogClose === "function") h.topicDialogClose();
  }

  _create() {
    if (this._busy || !sk.nameOk(this._name)) return Promise.resolve();
    const h = this.host;
    if (!h || typeof h.topicCreate !== "function") return Promise.resolve();
    this._busy = true;
    this._syncButton();
    return Promise.resolve(h.topicCreate({ name: this._name.trim(), emoji: this._emoji }))
      .then((r) => {
        if (r && r.ok) return this._close();
        this._setError(r && r.status === "TOPIC_EXISTS" ? LOCALE.TOPIC_EXISTS : LOCALE.AN_ERROR_OCCURRED);
      })
      .catch(() => this._setError(LOCALE.AN_ERROR_OCCURRED))
      .finally(() => {
        this._busy = false;
        this._syncButton();
      });
  }

  onUiEvent(cmd, args = {}) {
    const get = (k) => (cmd && cmd.mget ? cmd.mget(k) : undefined);
    const service = args.service || get("service");
    const status = args.__inputStatus;
    switch (service) {
      case "topic-name":
        if (status === _e.cancel) return this._close();
        this._name = `${cmd.getValue ? cmd.getValue() : ""}`;
        if (this._error) this._setError("");
        this._syncButton();
        if (status === _e.Enter) return this._create();
        return undefined;
      case "topic-search":
        if (status === _e.cancel) return this._close();
        this._query = `${cmd.getValue ? cmd.getValue() : ""}`;
        return this._refeed("topic-grid", sk.grid(this));
      case "topic-tab":
        this._tab = get("tab") || "smileys";
        if (this._tab !== "search") this._query = "";
        this._refeed("topic-tabs", sk.tabs(this));
        this._refeed("topic-search-row", sk.searchRow(this));
        {
          const row = this._part("topic-search-row");
          if (row && row.el) row.el.dataset.tab = this._tab;
        }
        return this._refeed("topic-grid", sk.grid(this));
      case "topic-emoji": {
        const e = get("emoji");
        if (!e) return undefined;
        this._emoji = e;
        const p = this._part("topic-preview");
        if (p && typeof p.set === "function") p.set({ content: e });
        return this._refeed("topic-grid", sk.grid(this));
      }
      case "topic-create":
        return this._create();
      case "topic-cancel":
      case "topic-close":
        return this._close();
    }
    return undefined;
  }
}

module.exports = __widget_topic_create;
