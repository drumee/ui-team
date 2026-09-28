/**
 * Chat details panel behaviour (Figma 775:131699), for the folder window.
 *
 * The window only delegates here (window/folder/index.js _openChatDetails …),
 * so the whole panel can be driven against a fake window in
 * tests/chat-details-controller.test.js.
 *
 * Shown IN PLACE of the team chat: `data-details="open"` on the split body
 * (skin/chat-details.scss) hides .window__chat-panel and reveals the
 * "chat-details" part in the same grid cell. The chat widget is never re-fed,
 * so its scroll and draft survive a round trip.
 *
 * Every response is checked against a generation token: closing, re-opening or
 * switching page while a fetch is in flight bumps it, and the late response
 * is dropped instead of painting over what the user is now looking at.
 */
const M = require("./model");
const {
  chatDetailsOverview,
  chatDetailsPage,
  meetingTileState,
} = require("../skeleton/chat-details");
const Mute = require("../../../panel/activity/mute");

function hubId(win) {
  return win.mget(_a.actual_hub_id) || win.mget(_a.hub_id);
}

function gen(win) {
  if (!win.__cdGen) win.__cdGen = M.generation();
  return win.__cdGen;
}

function alive(part) {
  return !!(part && part.el && !(part.isDestroyed && part.isDestroyed()));
}

function service(name) {
  return (SERVICE.channel && SERVICE.channel[name]) || `channel.${name}`;
}

function rowsOf(res) {
  if (Array.isArray(res)) return res;
  return (res && (res.data || res.rows)) || [];
}

function setOpen(win, state) {
  const v = win.__folderView;
  if (alive(v)) v.el.dataset.details = state;
}

function open(win) {
  if (!win._privilegeGrantsChat(win.mget(_a.privilege))) return Promise.resolve();
  if (win._closeThreadMenu) win._closeThreadMenu();
  const token = gen(win).next();
  const hub_id = hubId(win);
  return win.ensurePart("chat-details").then((panel) => {
    if (!alive(panel) || !gen(win).isCurrent(token)) return;
    win._chatDetailsPart = panel;
    panel.el.dataset.page = "overview";
    panel.feed(
      chatDetailsOverview(win, {
        stats: {},
        threads: [],
        members: [],
        muted: Mute.isPopupMuted({ hub_id }),
      }),
    );
    setOpen(win, "open");
    return Promise.all([
      win.fetchService({ service: service("details"), hub_id }, { async: 1 }).catch(() => ({})),
      win._fetchThreadList(),
      Mute.loadMuteState(win),
    ]).then(([details, threads]) => {
      if (!gen(win).isCurrent(token) || !alive(panel)) return;
      const d = details || {};
      win.__cdOverview = {
        stats: d.stats || {},
        threads: threads || [],
        members: d.members || [],
        muted: Mute.isPopupMuted({ hub_id }),
      };
      panel.feed(chatDetailsOverview(win, win.__cdOverview));
    });
  });
}

// The panel is its own scroll container and outlives every feed: without
// this, a user who scrolled the overview down to reach a count landed on the
// page still scrolled down, back arrow out of view.
function toTop(panel) {
  panel.el.scrollTop = 0;
}

function showPage(win, page) {
  const panel = win._chatDetailsPart;
  if (!alive(panel)) return Promise.resolve();
  const token = gen(win).next();
  toTop(panel);
  if (!M.PAGES.includes(page)) {
    panel.el.dataset.page = "overview";
    if (win.__cdOverview) {
      panel.feed(chatDetailsOverview(win, win.__cdOverview));
      return Promise.resolve();
    }
    return open(win);
  }
  panel.el.dataset.page = page;
  panel.feed(chatDetailsPage(win, page, [], { loading: true }));
  return win
    .fetchService({ service: service("media_list"), hub_id: hubId(win), kind: page, page: 1 }, { async: 1 })
    .catch(() => [])
    .then((res) => {
      if (!gen(win).isCurrent(token) || !alive(panel)) return;
      panel.feed(chatDetailsPage(win, page, rowsOf(res)));
      toTop(panel);
    });
}

function close(win) {
  // Invalidate anything in flight, then drop the content so a hidden panel
  // holds no media tiles while the chat is on screen.
  gen(win).next();
  setOpen(win, "closed");
  const panel = win._chatDetailsPart;
  if (alive(panel)) {
    panel.el.dataset.page = "overview";
    panel.feed([]);
  }
}

async function toggleMute(win) {
  const hub_id = hubId(win);
  const { ok } = await Mute.setMute(win, hub_id, !Mute.isPopupMuted({ hub_id }));
  // Repaint only from what the server confirmed (setMute folds the response
  // into the cache), never from what we asked for.
  if (!ok || !win.__cdOverview) return;
  win.__cdOverview.muted = Mute.isPopupMuted({ hub_id });
  const panel = win._chatDetailsPart;
  if (alive(panel) && panel.el.dataset.page === "overview") {
    panel.feed(chatDetailsOverview(win, win.__cdOverview));
  }
}

/**
 * Open one item of a page (photo / video tile, file row, link row) with a
 * loading state on THAT item: data-loading="1" (skin: spinner) while `run`
 * settles. openFileLocation awaits a fetch and the player launch, so a click
 * otherwise looked dead for a moment.
 *
 * - A repeat click while loading is ignored (no double launch).
 * - Cleared on success, rejection or a synchronous throw.
 * - Kept at least `minMs` so a fast open does not just flicker.
 * - `maxMs` safety net: an open that never settles releases the item anyway.
 */
function openItem(win, cmd, run, { minMs = 350, maxMs = 15000 } = {}) {
  const el = cmd && cmd.el;
  if (!el || !el.dataset) return Promise.resolve();
  if (el.dataset.loading === "1") return Promise.resolve();
  el.dataset.loading = "1";
  const started = Date.now();
  let task;
  try {
    task = Promise.resolve(run());
  } catch (e) {
    task = Promise.reject(e);
  }
  let safety;
  const timeout = new Promise((resolve) => {
    safety = setTimeout(resolve, maxMs);
  });
  return Promise.race([task, timeout])
    .catch(() => {})
    .then(() => {
      clearTimeout(safety);
      const wait = Math.max(0, minMs - (Date.now() - started));
      return new Promise((resolve) => setTimeout(resolve, wait));
    })
    .then(() => {
      if (el.dataset) el.dataset.loading = "0";
    });
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

module.exports = { open, close, showPage, toggleMute, setOpen, openItem, startMeeting };
