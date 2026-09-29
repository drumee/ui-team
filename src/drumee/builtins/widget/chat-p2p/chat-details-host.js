/**
 * The Inbox (chat_p2p) as host of widget_chat_details.
 *
 * The header's ⋮ (menu_expand, skeleton/chat-header) toggles the panel for the
 * open conversation: `direct` for a private room (the peer), `workspace` for a
 * share room (the hub). Support threads never get one. The panel sits in its
 * own `chat-details` slot beside the conversation (a side column on desktop,
 * the whole pane on narrow screens: data-mview="details").
 *
 * Plain functions of the Inbox widget, so tests drive them with a fake
 * (tests/chat-p2p-chat-details.test.js); chat-p2p/index.js delegates.
 */
const { isSupportEntity } = require("libs/support");

const SLOT = "chat-details";

function descriptor(inbox) {
  const peer = inbox.activePeer;
  const type = inbox.activePeerType;
  if (!peer || peer.is_support || isSupportEntity(peer.entity_id)) return null;
  if (type === _a.share) {
    return {
      kind: "widget_chat_details",
      mode: "workspace",
      hub_id: peer.entity_id,
      nid: peer.nid,
      // Inbox rows carry no privilege; they only list chats the viewer can
      // read, and the endpoints check access themselves — so the chat bit.
      privilege: peer.privilege != null ? peer.privilege : _K.permission.download,
      sys_pn: "chat-details-widget",
    };
  }
  if (type === _a.privateRoom) {
    return {
      kind: "widget_chat_details",
      mode: "direct",
      peer_id: peer.drumate_id || peer.entity_id,
      peer,
      sys_pn: "chat-details-widget",
    };
  }
  return null;
}

function setButton(inbox, open) {
  const btn = inbox.getPart && inbox.getPart("details-btn");
  if (btn && btn.el) btn.el.dataset.open = open ? "1" : "0";
}

// The slide-out (skin: chat-p2p-details-out) — the slot is emptied after it.
const CLOSE_MS = 180;

function reducedMotion() {
  try {
    return !!(
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch (e) {
    return false;
  }
}

/**
 * What the slot shows while widget_chat_details (a lazy kind) loads: the
 * widget's own loading overview on its card, with this conversation kind's
 * tiles, so the widget — which opens on the same skeleton — swaps in without
 * a jump. Only its ✕ does anything (the Inbox answers close-chat-details).
 */
function placeholder(inbox, mode) {
  require("../chat-details/skin");
  const { chatDetailsOverview } = require("../chat-details/skeleton");
  const { MODES } = require("../chat-details/modes");
  const ui = {
    cdPrefix: "widget-chat-details",
    fig: { group: "widget", family: "widget-chat-details" },
    mget: () => undefined,
  };
  const kids = chatDetailsOverview(ui, { loading: true, sections: MODES[mode].sections });
  const retarget = (n) => {
    if (Array.isArray(n)) return n.forEach(retarget);
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n.uiHandler)) n.uiHandler = n.uiHandler.map((h) => (h === ui ? inbox : h));
    retarget(n.kids);
  };
  retarget(kids);
  return Skeletons.Box.Y({
    className: "widget-chat-details widget-chat-details__ui",
    kids,
  });
}

// Every open / close bumps it: a widget chunk or a slide-out timer that
// belongs to an earlier one does nothing.
function bump(inbox) {
  inbox._cdToken = (inbox._cdToken || 0) + 1;
  return inbox._cdToken;
}

function open(inbox, deps = {}) {
  const d = descriptor(inbox);
  if (!d) return Promise.resolve();
  const Kind_ = deps.Kind !== undefined ? deps.Kind : typeof Kind !== "undefined" ? Kind : null;
  // The ⋮ during a slide-out: drop it and open afresh.
  if (inbox.el && inbox.el.dataset.details === "closing") finishClose(inbox);
  const token = bump(inbox);
  return inbox.ensurePart(SLOT).then((slot) => {
    if (!slot || inbox._cdToken !== token) return;
    inbox._cdSlot = slot;
    slot.feed(placeholder(inbox, d.mode));
    inbox.el.dataset.details = "open";
    // Narrow screens show one pane at a time (skin: ≤1024px); harmless wider.
    inbox.el.dataset.mview = "details";
    setButton(inbox, true);
    const ready = Kind_ && typeof Kind_.waitFor === "function" ? Kind_.waitFor(d.kind) : null;
    return Promise.resolve(ready)
      .catch(() => null)
      .then(() => {
        if (inbox._cdToken !== token || inbox.el.dataset.details !== "open") return;
        if (slot.isDestroyed && slot.isDestroyed()) return;
        slot.feed({ ...d, host: inbox });
      });
  });
}

function finishClose(inbox) {
  bump(inbox);
  inbox.el.dataset.details = "closed";
  if (inbox.el.dataset.mview === "details") inbox.el.dataset.mview = "chat";
  // Emptying the slot destroys the widget: nothing in flight can paint.
  const slot = inbox._cdSlot;
  if (slot && !(slot.isDestroyed && slot.isDestroyed())) slot.clear();
  setButton(inbox, false);
}

/**
 * Close the panel. It slides out first (data-details="closing" keeps it laid
 * out while skin/chat-p2p-details-out plays) unless `instant` — a
 * conversation switch, leaving the Inbox — or the viewer asked for reduced
 * motion.
 * @returns {Promise} settles once the panel is gone
 */
function close(inbox, { instant = false } = {}) {
  if (!inbox.el) return Promise.resolve();
  const state = inbox.el.dataset.details;
  if (state !== "open" && state !== "closing") return Promise.resolve();
  if (instant || reducedMotion()) {
    finishClose(inbox);
    return Promise.resolve();
  }
  if (state === "closing") return inbox._cdClosing || Promise.resolve();
  const token = bump(inbox);
  inbox.el.dataset.details = "closing";
  setButton(inbox, false);
  inbox._cdClosing = new Promise((resolve) => {
    setTimeout(() => {
      if (inbox._cdToken === token && inbox.el.dataset.details === "closing") finishClose(inbox);
      resolve();
    }, CLOSE_MS);
  });
  return inbox._cdClosing;
}

function toggle(inbox) {
  return inbox.el && inbox.el.dataset.details === "open" ? close(inbox) : open(inbox);
}

// A different conversation (or none): the panel described the previous one.
function onConversationChange(inbox) {
  const st = inbox.el && inbox.el.dataset.details;
  if (st === "open" || st === "closing") close(inbox, { instant: true });
}

/**
 * The part of a media view the Inbox lightbox reads (previewMedia →
 * _renderLightbox), for a Chat details row that has no view: addressed the
 * way ui-core's actualNode addresses a file.
 */
function lightboxMedia({ nid, hub_id, filetype, filename }) {
  const attrs = { nid, hub_id, filetype, filename: filename || "" };
  return {
    mget: (k) => attrs[k],
    fullname: () => attrs.filename,
    actualNode(format = _a.orig) {
      const { endpoint = "", keysel } = (typeof bootstrap === "function" && bootstrap()) || {};
      const url = `${endpoint}file/${format}/${nid}/${hub_id}`;
      return { nid, hub_id, url: keysel ? `${url}?keysel=${keysel}` : url };
    },
  };
}

// widget_chat_details → host.chatDetailsAction(name, payload)
function hostAction(inbox, name, payload = {}, deps = {}) {
  const Wm_ = deps.Wm !== undefined ? deps.Wm : typeof Wm !== "undefined" ? Wm : null;
  const Kind_ = deps.Kind !== undefined ? deps.Kind : typeof Kind !== "undefined" ? Kind : null;
  const peer = inbox.activePeer || {};
  switch (name) {
    case "close":
      return close(inbox);
    case "meeting":
      // The header's own video call: window_connect for a contact,
      // window_meeting for a workspace.
      return inbox._startCall(true);
    case "download":
      // The export dialog in the Inbox's overlay (as its forward dialog is);
      // it closes itself with "close-export".
      return inbox
        .ensurePart("overlay-wrapper")
        .then((overlay) => {
          overlay.el.dataset.mode = _a.open;
          return inbox.ensurePart("wrapper-chat-overlay");
        })
        .then((wrapper) => {
          // close-overlay leaves data-state=closed, which the global
          // [data-state="closed"] rule hides: a second export would be blank.
          wrapper.el.dataset.state = _a.open;
          wrapper.feed({
            kind: "widget_chat_export",
            hub_id: peer.entity_id,
            nid: peer.nid,
            name: peer.display || peer.fullname || peer.name || "",
            area: peer.area,
            uiHandler: [inbox],
          });
          return Kind_ && Kind_.waitFor ? Kind_.waitFor("widget_chat_export") : null;
        });
    case "thread": {
      // A workspace file thread lives in the workspace: land on its Chat tab
      // (the notification route — mounts the pane, leaves this section screen,
      // lights the rail) and scope that chat to the thread.
      // Leaving the Inbox: no slide-out to watch.
      close(inbox, { instant: true });
      const hub_id = peer.entity_id;
      if (!Wm_ || !hub_id || !payload.file_nid) return;
      return Promise.resolve(Wm_.openNotificationLocation({ hub_id, activeTab: "chat" }))
        .then(() => Wm_._awaitWorkspaceWindow(hub_id))
        .then((pane) => {
          if (pane && typeof pane.scopeChatToFile === "function") {
            pane.scopeChatToFile(payload.file_nid, payload.filename || "");
          }
        });
    }
    case "open-media": {
      // The Inbox covers every window-manager layer, so a viewer Wm launches
      // would open invisibly behind it (see Wm.openContent). Pictures and
      // videos use the Inbox's own lightbox; anything else leaves the Inbox.
      if (
        (payload.filetype === _a.image || payload.filetype === _a.video) &&
        typeof inbox.previewMedia === "function"
      ) {
        return inbox.previewMedia(lightboxMedia(payload));
      }
      const Desk_ = deps.Desk !== undefined ? deps.Desk : typeof Desk !== "undefined" ? Desk : null;
      if (Desk_ && typeof Desk_.closeSectionScreen === "function") Desk_.closeSectionScreen();
      const openMedia = deps.openMedia || require("libs/open-media").openMedia;
      return openMedia(payload, { fetchService: inbox.fetchService });
    }
  }
}

function threads(inbox) {
  const peer = inbox.activePeer || {};
  const service =
    (SERVICE.channel && SERVICE.channel.file_thread_list_by_folder) ||
    "channel.file_thread_list_by_folder";
  return Promise.resolve(
    inbox.fetchService({ service, hub_id: peer.entity_id, folder_nid: peer.nid, page: 1 }, { async: 1 }),
  )
    .then((res) => (Array.isArray(res) ? res : (res && (res.data || res.rows)) || []))
    .catch(() => []);
}

module.exports = { descriptor, open, close, toggle, onConversationChange, hostAction, threads };
