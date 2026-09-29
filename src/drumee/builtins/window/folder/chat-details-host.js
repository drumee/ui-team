/**
 * The folder window as host of widget_chat_details (the Chat details panel).
 *
 * The widget owns the panel; the window owns what only it can do. Plain
 * functions of the window (`win`), so tests drive them with a fake
 * (tests/folder-chat-details-host.test.js); window/folder/index.js delegates.
 *
 * Shown IN PLACE of the team chat: `data-details="open"` on the split body
 * (skin/chat-details.scss) hides .window__chat-panel and reveals the
 * "chat-details" slot in the same grid cell. The chat widget is never re-fed,
 * so its scroll and draft survive a round trip.
 */
const { meetingTileState } = require("../../widget/chat-details/skeleton");

function alive(part) {
  return !!(part && part.el && !(part.isDestroyed && part.isDestroyed()));
}

function setOpen(win, state) {
  const v = win.__folderView;
  if (alive(v)) v.el.dataset.details = state;
}

function openDetails(win) {
  // A chat-gated viewer gets no panel (its data is conversation content).
  if (!win._privilegeGrantsChat(win.mget(_a.privilege))) return Promise.resolve();
  if (win._closeThreadMenu) win._closeThreadMenu();
  return win.ensurePart("chat-details").then((panel) => {
    if (!alive(panel)) return;
    win._chatDetailsPart = panel;
    panel.feed({
      kind: "widget_chat_details",
      mode: "workspace",
      host: win,
      hub_id: win.mget(_a.actual_hub_id) || win.mget(_a.hub_id),
      nid: win.mget(_a.nid),
      privilege: win.mget(_a.privilege),
      sys_pn: "chat-details-widget",
      partHandler: win,
    });
    setOpen(win, "open");
  });
}

function closeDetails(win) {
  setOpen(win, "closed");
  const panel = win._chatDetailsPart;
  // Emptying the slot destroys the widget: nothing in flight can paint.
  if (alive(panel)) panel.feed([]);
  win.__cdWidget = null;
}

// The header ⋮. On the Chat tab the chat stays beside the panel, so the ⋮
// can be clicked again: then it closes.
function toggleDetails(win) {
  const v = win.__folderView;
  if (alive(v) && v.el.dataset.details === "open") {
    closeDetails(win);
    return Promise.resolve();
  }
  return openDetails(win);
}

/**
 * "Meeting" tile: start / join this room's call — the Meet schedule start
 * button's launch — and light the desk rail's Meet row the way a rail click
 * would (Desk._railHighlight, the radio broadcast; a bare setState would not
 * put the other row out).
 *
 * The rail only moves when the launch went ahead (_launchMeetingStandalone
 * returns Wm.launch's truthy result; nothing when another call blocks it) and
 * only for the docked workspace pane — a floating folder window is not what
 * the rail stands for. No desk (DMZ / share) → launch only.
 *
 * @returns {Boolean} whether a launch went ahead
 */
function startMeeting(win, desk = typeof Desk !== "undefined" ? Desk : undefined) {
  if (meetingTileState(win).joined) return false;
  const launched = win._launchMeetingInPanel();
  if (
    launched &&
    win.mget(_a.headless) &&
    desk &&
    typeof desk._railHighlight === "function"
  ) {
    desk._railHighlight("meeting");
  }
  return !!launched;
}

// widget_chat_details → host.chatDetailsAction(name, payload)
function hostAction(win, name, payload = {}, desk) {
  switch (name) {
    case "close":
      return closeDetails(win);
    case "meeting":
      return startMeeting(win, desk);
    case "download":
      return win._openChatExportModal();
    case "thread":
      // Back on the chat, scoped in place to that file's thread.
      closeDetails(win);
      if (!payload.file_nid) return;
      return win.scopeChatToFile(payload.file_nid, payload.filename || "");
    case "open-media":
      return win.openFileLocation({
        nid: `${payload.nid}`,
        hub_id: payload.hub_id || win.mget(_a.actual_hub_id) || win.mget(_a.hub_id),
        pid: win.mget(_a.nid),
        area: win.mget(_a.area),
        filetype: payload.filetype || undefined,
      });
  }
}

function threads(win) {
  return win._fetchThreadList();
}

function meetingState(win) {
  return meetingTileState(win);
}

module.exports = { openDetails, closeDetails, toggleDetails, hostAction, startMeeting, threads, meetingState };
