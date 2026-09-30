/**
 * Inbox (chat_p2p) Workspace chat: the folder window's Files-tab topic strip
 * and File threads bar (Figma 869:189953 / 869:191968) above a workspace
 * conversation. The Inbox counterpart of window/folder/topics.js +
 * file-threads-bar.js: the same skeletons (built with the window__ classes),
 * the same services, a workspace's ROOT folder (media.home home_id, kept on
 * peer.nid) as the folder.
 *
 * State lives on the workspace pane (`win._panes.workspace.topicState`):
 * a parked pane keeps its topic and page, a replaced one forgets them. Only
 * the pane on screen under Workspace chat is ever painted; anything else
 * empties the parts and unstamps the chat area (data-topics="0").
 *
 * Plain functions of the Inbox (`win`), tested with a fake
 * (tests/inbox-workspace-topics.test.js); chat-p2p/index.js delegates.
 */
const topicStrip = require("../../window/folder/skeleton/topic-strip");
const fileThreadsBar = require("../../window/folder/skeleton/file-threads-bar");

const GROUP = "window";
// Tabs per carousel page here (the folder's Files tab keeps 3).
const PAGE_SIZE = 4;

function svc(name) {
  return (typeof SERVICE !== "undefined" && SERVICE.channel && SERVICE.channel[name]) || `channel.${name}`;
}

function alive(v) {
  return !!(v && !(v.isDestroyed && v.isDestroyed()));
}

function rowsOf(res) {
  return Array.isArray(res) ? res : (res && (res.data || res.rows)) || [];
}

/** The workspace pane when it is the one on screen, else null. */
function pane(win) {
  if (win._scopeKey() !== "workspace") return null;
  const p = win._panes && win._panes.workspace;
  return p && p.type === _a.share && p.peer && alive(p.widget) ? p : null;
}

function state(p) {
  if (!p.topicState) {
    p.topicState = { topics: [], topicId: "general", page: 0, slide: null, ftOpen: false, ftItems: [] };
  }
  return p.topicState;
}

function where(p) {
  const home = p.peer.home;
  return {
    hub_id: `${p.peer.entity_id}`,
    folder_nid: `${p.peer.nid || (home && home.home_id) || ""}`,
  };
}

function unbind(win) {
  const l = win._wtBarListeners;
  if (!l || typeof document === "undefined") return;
  document.removeEventListener("pointerdown", l.down, true);
  document.removeEventListener("keydown", l.key, true);
  win._wtBarListeners = null;
}

function bind(win, bar) {
  unbind(win);
  if (typeof document === "undefined") return;
  const down = (e) => {
    if (bar.el && typeof bar.el.contains === "function" && bar.el.contains(e && e.target)) return;
    closeBar(win);
  };
  const key = (e) => {
    if (e && e.key === "Escape") closeBar(win);
  };
  document.addEventListener("pointerdown", down, true);
  document.addEventListener("keydown", key, true);
  win._wtBarListeners = { down, key };
}

/**
 * Feed the strip + bar for the pane on screen (or empty them). `bar: true`
 * repaints the bar alone: opening / closing the dropdown must not re-feed the
 * strip, or a tab pressed while it is open loses its click (the outside
 * pointerdown closes the bar before the click lands on the pressed node).
 */
function paint(win, { bar: barOnly = false } = {}) {
  const p = pane(win);
  return Promise.all([win.ensurePart("chat-area"), win.ensurePart("topic-strip"), win.ensurePart("ft-bar")]).then(
    ([area, strip, bar]) => {
      // Superseded while the parts resolved: the newer call paints.
      if (pane(win) !== p) return;
      if (area && area.el) area.el.dataset.topics = p ? "1" : "0";
      if (!p) {
        unbind(win);
        if (alive(strip)) strip.feed([]);
        if (alive(bar)) {
          bar.feed([]);
          if (bar.el) bar.el.dataset.open = "0";
        }
        return;
      }
      const s = state(p);
      // The slide plays once, for the page change that asked for it.
      const slide = s.slide || "none";
      s.slide = null;
      if (!barOnly && alive(strip)) {
        strip.feed(
          topicStrip(win, { group: GROUP, topics: s.topics, topicId: s.topicId, canCreateTopic: 1, page: s.page, pageSize: PAGE_SIZE, slide }),
        );
      }
      if (alive(bar)) {
        bar.feed(
          fileThreadsBar(win, { group: GROUP, items: s.ftItems, open: s.ftOpen, scopedNid: p.widget.scopedFileNid || "" }),
        );
        if (bar.el) bar.el.dataset.open = s.ftOpen ? "1" : "0";
        if (s.ftOpen) bind(win, bar);
        else unbind(win);
      }
    },
  );
}

/** Fetch the pane's topics (channel.topic_list on its root folder), then paint. */
function refresh(win) {
  const p = pane(win);
  if (!p) return paint(win);
  const s = state(p);
  const { hub_id, folder_nid } = where(p);
  if (!folder_nid) return paint(win);
  return Promise.resolve(win.fetchService(svc("topic_list"), { hub_id, folder_nid }, { async: 1 }))
    .then(rowsOf)
    .catch(() => null)
    .then((rows) => {
      if (rows) {
        s.topics = rows;
        s.page = topicStrip.pageOf(s.topics, s.topicId, PAGE_SIZE);
      }
      // Left for another conversation meanwhile: its own sync paints it.
      if (pane(win) !== p) return undefined;
      return paint(win);
    });
}

/** The conversation on screen changed (open, tab switch): fetch once per pane, else repaint. */
function sync(win) {
  const p = pane(win);
  if (p && !p.topicState) {
    // A new workspace: # General, page 0, bar closed on screen at once — not
    // the previous workspace's strip until its topics arrive.
    // The fetch starts alongside; its paint comes after this one.
    state(p);
    return Promise.all([paint(win), refresh(win)]).then(() => undefined);
  }
  if (p) state(p).ftOpen = false;
  return paint(win);
}

/** Scope the workspace chat to "general" | a topic id (leaving a file thread first). */
function scopeTopic(win, topicId) {
  const p = pane(win);
  if (!p) return Promise.resolve();
  const s = state(p);
  const next = topicId && topicId !== "all" ? `${topicId}` : "general";
  if (p.widget.scopedFileNid && typeof p.widget.setScopedFileNid === "function") {
    p.widget.setScopedFileNid(null, null);
  }
  s.topicId = next;
  // Opening a topic reads it (server-side): clear its cached badge.
  if (next !== "general") s.topics = s.topics.map((t) => (`${t.id}` === next ? { ...t, unread: 0 } : t));
  const page = topicStrip.pageOf(s.topics, next, PAGE_SIZE);
  if (page !== s.page) s.slide = page > s.page ? "next" : "prev";
  s.page = page;
  s.ftOpen = false;
  if (typeof p.widget.setScopedTopic === "function") p.widget.setScopedTopic(next);
  return paint(win);
}

/** Carousel: one page back (-1) or forward (+1), clamped. */
function stripPage(win, delta) {
  const p = pane(win);
  if (!p) return Promise.resolve();
  const s = state(p);
  const last = Math.max(0, Math.ceil((1 + s.topics.length) / PAGE_SIZE) - 1);
  const was = s.page || 0;
  s.page = Math.min(Math.max(0, was + delta), last);
  if (s.page !== was) s.slide = s.page > was ? "next" : "prev";
  return paint(win);
}

/** Open (fetching the root folder's file threads) or close the bar's dropdown. */
function toggleBar(win) {
  const p = pane(win);
  if (!p) return Promise.resolve();
  const s = state(p);
  if (s.ftOpen) return closeBar(win);
  const { hub_id, folder_nid } = where(p);
  return Promise.resolve(
    win.fetchService(svc("file_thread_list_by_folder"), { hub_id, folder_nid, page: 1 }, { async: 1 }),
  )
    .then(rowsOf)
    .catch(() => [])
    .then((items) => {
      if (pane(win) !== p) return undefined;
      s.ftItems = items;
      s.ftOpen = true;
      return paint(win, { bar: true });
    });
}

function closeBar(win) {
  const p = pane(win);
  if (p) state(p).ftOpen = false;
  unbind(win);
  return paint(win, { bar: true });
}

/** A dropdown row: the conversation shows that file's thread in place. */
function pickFile(win, fileNid, filename) {
  const p = pane(win);
  if (!p || !fileNid) return closeBar(win);
  state(p).ftOpen = false;
  // widget_chat's own scope chip (filename + ✕) is the way back; the strip
  // keeps the topic the chat returns to.
  if (typeof p.widget.setScopedFileNid === "function") p.widget.setScopedFileNid(`${fileNid}`, filename || "");
  return paint(win, { bar: true });
}

function openDialog(win) {
  const p = pane(win);
  if (!p) return Promise.resolve();
  const { hub_id, folder_nid } = where(p);
  return win.ensurePart("wrapper-topic-dialog").then((wrapper) => {
    if (!alive(wrapper)) return;
    win._topicDialog = wrapper;
    // Backdrop click (not the card) closes, as the folder's.
    if (wrapper.el) {
      wrapper.el.onclick = (e) => {
        if (e && e.target === wrapper.el) closeDialog(win);
      };
    }
    wrapper.feed({ kind: "widget_topic_create", folder_nid, hub_id, host: win });
  });
}

function closeDialog(win) {
  const wrapper = win._topicDialog;
  if (alive(wrapper) && typeof wrapper.clear === "function") wrapper.clear();
  win._topicDialog = null;
}

/** channel.topic_create; on success the topic joins the strip and becomes the scope. */
function createTopic(win, { name, emoji } = {}) {
  const p = pane(win);
  if (!p) return Promise.resolve({ ok: false, status: "ERROR" });
  const { hub_id, folder_nid } = where(p);
  return Promise.resolve(win.postService(svc("topic_create"), { hub_id, folder_nid, name, emoji }))
    .then((row) => {
      if (!row || !row.id) return { ok: false, status: (row && row.status) || "ERROR" };
      const s = state(p);
      s.topics = [...s.topics.filter((t) => `${t.id}` !== `${row.id}`), row];
      return Promise.resolve(scopeTopic(win, row.id)).then(() => ({ ok: true, topic: row }));
    })
    .catch(() => ({ ok: false, status: "ERROR" }));
}

/** Inbox teardown: no document listener outlives it. */
function detach(win) {
  unbind(win);
}

module.exports = {
  sync,
  paint,
  refresh,
  scopeTopic,
  stripPage,
  toggleBar,
  closeBar,
  pickFile,
  openDialog,
  closeDialog,
  createTopic,
  detach,
};
