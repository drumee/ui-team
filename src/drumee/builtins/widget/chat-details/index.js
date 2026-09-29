/**
 * widget_chat_details — the Chat details panel (Figma 775:131699), reusable.
 *
 * Owns everything that is the same wherever the panel lives: the overview and
 * its four pages (./skeleton), loading skeletons, paging, the generation
 * token and the per-item spinner (./engine), workspace mute, opening links.
 * What a conversation kind talks to comes from ./modes (`mode`:
 * "workspace" | "direct").
 *
 * Everything that depends on WHERE the panel lives goes to the host:
 *   host.chatDetailsAction(name, payload) → Promise | void
 *     close      {}
 *     meeting    {}
 *     download   {}
 *     thread     { file_nid, filename }
 *     open-media { nid, hub_id, filetype, filename }
 *   host.chatDetailsThreads() → Promise<rows>   (workspace: File Threads)
 *   host.chatDetailsMeetingState() → {label, joined, hidden}   (optional)
 *
 * Options: mode, host; workspace: hub_id, nid, privilege; direct: peer_id,
 * peer.
 */
const Engine = require("./engine");
const { MODES, modeOf } = require("./modes");
const { extractUrl } = require("./model");

class __widget_chat_details extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.cdPrefix = "widget-chat-details";
    this.cdMode = MODES[opt.mode] ? opt.mode : "workspace";
    this.host = opt.host || null;
    this.declareHandlers();
  }

  onDomRefresh() {
    this.open();
  }

  // ── public API (hosts) ────────────────────────────────────────────────
  open() {
    return Engine.open(this);
  }

  showPage(page) {
    return Engine.showPage(this, page);
  }

  loadMore() {
    return Engine.loadMore(this);
  }

  onBodyScroll(body) {
    return Engine.onBodyScroll(this, body);
  }

  // Re-read the host's call state into the Meeting tile, in place (the host
  // calls this when its call starts / ends / is joined).
  refreshMeetingState() {
    const tile =
      this.el && this.el.querySelector(`.${this.cdPrefix}-action--meeting`);
    if (!tile) return;
    const st = this.chatDetailsMeetingState();
    tile.dataset.joined = st.joined ? "1" : "0";
    const label =
      tile.querySelector(`.${this.cdPrefix}-action-label .note-content`) ||
      tile.querySelector(`.${this.cdPrefix}-action-label`);
    if (label) label.textContent = st.label;
  }

  setMeetingLoading(on) {
    const tile =
      this.el && this.el.querySelector(`.${this.cdPrefix}-action--meeting`);
    if (tile) tile.dataset.loading = on ? "1" : "0";
  }

  // ── engine adapter ────────────────────────────────────────────────────
  // The engine feeds the panel it is given; the widget feeds itself.
  chatDetailsPanel() {
    return Promise.resolve(this);
  }

  _privilegeGrantsChat(priv) {
    return modeOf(this).gate(priv);
  }

  _fetchThreadList() {
    const h = this.host;
    return h && typeof h.chatDetailsThreads === "function"
      ? Promise.resolve(h.chatDetailsThreads()).catch(() => [])
      : Promise.resolve([]);
  }

  chatDetailsMeetingState() {
    const h = this.host;
    const st = h && typeof h.chatDetailsMeetingState === "function" ? h.chatDetailsMeetingState() : null;
    return st || { label: LOCALE.MEETING, joined: false, hidden: false };
  }

  _act(name, payload = {}) {
    const h = this.host;
    if (!h || typeof h.chatDetailsAction !== "function") return undefined;
    return h.chatDetailsAction(name, payload);
  }

  // ── clicks inside the panel ──────────────────────────────────────────
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.service) || (cmd && cmd.mget && cmd.mget(_a.service));
    const get = (k) => (cmd && cmd.mget ? cmd.mget(k) : undefined);
    switch (service) {
      case "close-chat-details":
        return this._act("close");
      case "chat-details-back":
        return this.showPage("overview");
      case "chat-details-page":
        return this.showPage(get("page"));
      case "chat-details-mute":
        return Engine.openItem(this, cmd, () => Engine.toggleMute(this));
      case "chat-details-meeting":
        return this._act("meeting");
      case "chat-details-download":
        return Engine.openItem(this, cmd, () => this._act("download"));
      case "chat-details-thread":
        return this._act("thread", { file_nid: get("file_nid"), filename: get("filename") || "" });
      case "chat-details-open-media":
        return Engine.openItem(this, cmd, () =>
          this._act("open-media", {
            nid: get("nid"),
            hub_id: get("hub_id") || modeOf(this).hub(this),
            filetype: get("filetype"),
            filename: get("filename") || "",
          }),
        );
      case "chat-details-open-link": {
        // Re-extracted, never trusted as given: only an http(s) URL opens.
        const url = extractUrl(get("url"));
        if (!url) return;
        return Engine.openItem(this, cmd, () => {
          window.open(url, "_blank", "noopener,noreferrer");
        });
      }
    }
  }
}

module.exports = __widget_chat_details;
