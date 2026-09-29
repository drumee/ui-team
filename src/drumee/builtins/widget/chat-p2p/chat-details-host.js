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

function open(inbox) {
  const d = descriptor(inbox);
  if (!d) return Promise.resolve();
  return inbox.ensurePart(SLOT).then((slot) => {
    if (!slot) return;
    inbox._cdSlot = slot;
    slot.feed({ ...d, host: inbox });
    inbox.el.dataset.details = "open";
    // Narrow screens show one pane at a time (skin: ≤1024px); harmless wider.
    inbox.el.dataset.mview = "details";
    setButton(inbox, true);
  });
}

function close(inbox) {
  if (!inbox.el) return;
  inbox.el.dataset.details = "closed";
  if (inbox.el.dataset.mview === "details") inbox.el.dataset.mview = "chat";
  // Emptying the slot destroys the widget: nothing in flight can paint.
  const slot = inbox._cdSlot;
  if (slot && !(slot.isDestroyed && slot.isDestroyed())) slot.clear();
  setButton(inbox, false);
}

function toggle(inbox) {
  return inbox.el && inbox.el.dataset.details === "open" ? close(inbox) : open(inbox);
}

// A different conversation (or none): the panel described the previous one.
function onConversationChange(inbox) {
  if (inbox.el && inbox.el.dataset.details === "open") close(inbox);
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
      close(inbox);
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
