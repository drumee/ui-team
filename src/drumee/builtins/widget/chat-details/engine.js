/**
 * Chat details panel behaviour (Figma 775:131699): the engine behind
 * widget_chat_details (./index.js), which passes itself as `win`. It needs
 * only a small surface — mget, fetchService, the panel it feeds
 * (win.chatDetailsPanel() or the "chat-details" part), the access gate and,
 * for workspace mode, the thread list — so it is driven against fakes in
 * tests/chat-details-controller.test.js and tests/chat-details-widget.test.js.
 * What it asks for per conversation kind comes from ./modes.
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
const { chatDetailsOverview, chatDetailsPage } = require("./skeleton");
const Mute = require("../../panel/activity/mute");
const { modeOf } = require("./modes");

function hubId(win) {
  return modeOf(win).hub(win);
}

function panelOf(win) {
  return win.chatDetailsPanel ? win.chatDetailsPanel() : win.ensurePart("chat-details");
}

function gen(win) {
  if (!win.__cdGen) win.__cdGen = M.generation();
  return win.__cdGen;
}

function alive(part) {
  return !!(part && part.el && !(part.isDestroyed && part.isDestroyed()));
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
  const mode = modeOf(win);
  const { sections, participants } = mode;
  const hub_id = hubId(win);
  const muted = () => (sections.mute ? Mute.isPopupMuted({ hub_id }) : false);
  win.__cdList = null;
  return panelOf(win).then((panel) => {
    if (!alive(panel) || !gen(win).isCurrent(token)) return;
    win._chatDetailsPart = panel;
    panel.el.dataset.page = "overview";
    // Loading skeleton first (real header + actions, placeholder sections).
    panel.feed(chatDetailsOverview(win, { loading: true, muted: muted(), sections, participants }));
    setOpen(win, "open");
    return Promise.all([
      win.fetchService(mode.details(win), { async: 1 }).catch(() => ({})),
      sections.threads ? win._fetchThreadList() : Promise.resolve([]),
      sections.mute ? Mute.loadMuteState(win) : null,
    ]).then(([details, threads]) => {
      if (!gen(win).isCurrent(token) || !alive(panel)) return;
      const d = details || {};
      win.__cdOverview = {
        stats: d.stats || {},
        threads: threads || [],
        members: d.members || [],
        muted: muted(),
        sections,
        participants,
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

// The page body scrolls itself (the panel does not); arm load-more on it
// after every feed, since a feed replaces it.
function armBodyScroll(win, panel) {
  const pfx = win.cdPrefix || `${win.fig && win.fig.group}__chat-details`;
  const body = panel.el && panel.el.querySelector && panel.el.querySelector(`.${pfx}-body`);
  if (!body || body.__cdScrollArmed) return body || null;
  body.__cdScrollArmed = 1;
  body.addEventListener("scroll", () => onBodyScroll(win, body), { passive: true });
  return body;
}

function showPage(win, page) {
  const panel = win._chatDetailsPart;
  if (!alive(panel)) return Promise.resolve();
  const token = gen(win).next();
  win.__cdList = null;
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
    .fetchService(modeOf(win).mediaList(win, page, 1), { async: 1 })
    .catch(() => [])
    .then((res) => {
      if (!gen(win).isCurrent(token) || !alive(panel)) return;
      const rows = rowsOf(res);
      win.__cdList = {
        kind: page,
        page: 1,
        rows,
        done: rows.length < (M.PAGE_SIZE[page] || 60),
        loading: false,
        token,
      };
      panel.feed(chatDetailsPage(win, page, rows));
      toTop(panel);
      armBodyScroll(win, panel);
    });
}

/**
 * Next page of the open Photos / Videos / Files / Links list. A count can be
 * in the hundreds while one page holds 60 (links 30); without this the page
 * silently stopped at the first batch. Ignored while one is in flight or once
 * a short page has ended the list; a page that lands after the user left
 * (generation bumped, list replaced) never paints.
 */
function loadMore(win) {
  const panel = win._chatDetailsPart;
  const list = win.__cdList;
  if (!alive(panel) || !list || list.done || list.loading) return Promise.resolve();
  if (!gen(win).isCurrent(list.token)) return Promise.resolve();
  list.loading = true;
  const next = list.page + 1;
  return win
    .fetchService(modeOf(win).mediaList(win, list.kind, next), { async: 1 })
    .catch(() => [])
    .then((res) => {
      if (win.__cdList !== list || !gen(win).isCurrent(list.token) || !alive(panel)) return;
      const more = rowsOf(res);
      list.loading = false;
      list.page = next;
      list.rows = list.rows.concat(more);
      list.done = more.length < (M.PAGE_SIZE[list.kind] || 60);
      const before = armBodyScroll(win, panel);
      const top = before ? before.scrollTop : 0;
      panel.feed(chatDetailsPage(win, list.kind, list.rows));
      const body = armBodyScroll(win, panel);
      if (body) body.scrollTop = top;
    });
}

// Load more once the body is scrolled to within 200px of its end.
function onBodyScroll(win, body) {
  if (!body) return;
  if (body.scrollTop + body.clientHeight >= body.scrollHeight - 200) loadMore(win);
}

function close(win) {
  // Invalidate anything in flight, then drop the content so a hidden panel
  // holds no media tiles while the chat is on screen.
  gen(win).next();
  win.__cdList = null;
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

module.exports = {
  open,
  close,
  showPage,
  loadMore,
  onBodyScroll,
  toggleMute,
  setOpen,
  openItem,
};
