/**
 * Folder chat topics — the folder window's side (Figma 867:185782,
 * 867:186725, 869:187685).
 *
 * A topic is a named sub-conversation of the folder's team chat (server:
 * channel.topic_list / topic_create; a message carries metadata._topic_id).
 * The thread menu / rail shows them under "Topics" (skeleton/thread-menu);
 * picking one scopes the chat widget (widget_chat.setScopedTopic):
 * "general" (default — without topic messages) or a topic id. Neither the
 * Chat-tab rail nor the Files-tab strip has an All row; a legacy "all" in
 * state reads as General.
 *
 * Plain functions of the window (`win`), tested with a fake
 * (tests/folder-topics.test.js); window/folder/index.js delegates. The New
 * Topic dialog lives in a "topic-dialog" slot the skeleton builds with the
 * window — never appended (see ./chat-export-overlay for why).
 */

function svc(name) {
  return (typeof SERVICE !== "undefined" && SERVICE.channel && SERVICE.channel[name]) || `channel.${name}`;
}

function hubOf(win) {
  return win.mget(_a.actual_hub_id) || win.mget(_a.hub_id);
}

function alive(part) {
  return !!(part && !(part.isDestroyed && part.isDestroyed()));
}

function canChat(win) {
  return !!win._privilegeGrantsChat(win.mget(_a.privilege));
}

/** Skeleton: the dialog's always-present, empty-until-open backdrop. */
function slot(ui) {
  return Skeletons.Wrapper.Y({
    className: "widget-topic-create__viewport-backdrop",
    name: "topic-dialog",
    partHandler: ui,
  });
}

/** The current folder's topics (channel.topic_list); [] without chat access. */
function fetchTopics(win) {
  if (!canChat(win)) {
    win._topics = [];
    return Promise.resolve([]);
  }
  const folder_nid = `${win.mget(_a.nid)}`;
  return Promise.resolve(
    win.fetchService({ service: svc("topic_list"), hub_id: hubOf(win), folder_nid }, { async: 1 }),
  )
    .then((res) => {
      const rows = Array.isArray(res) ? res : (res && (res.data || res.rows)) || [];
      // A slow answer for a folder we already left is dropped.
      if (`${win.mget(_a.nid)}` !== folder_nid) return win._topics || [];
      // ⚠️ UI-test mock topics (./topics-mock, MOCK_TOPICS) — remove before release.
      win._topics = require("./topics-mock").withMockTopics(rows);
      return win._topics;
    })
    .catch(() => win._topics || []);
}

/** The folder chat's topic scope: "general" (default) or a topic id. */
function current(win) {
  return win._topicId && win._topicId !== "all" ? `${win._topicId}` : "general";
}

/** threadMenu options for the Topics section. */
function menuOpts(win) {
  return {
    topics: Array.isArray(win._topics) ? win._topics : [],
    topicId: current(win),
    canCreateTopic: canChat(win),
  };
}

/** The chat header title for the current topic scope. */
function headerTitle(win) {
  const id = current(win);
  if (id === "general") return `# ${LOCALE.GENERAL || "General"}`;
  const t = (win._topics || []).find((x) => `${x.id}` === id);
  return t ? `# ${t.emoji ? `${t.emoji} ` : ""}${t.name}` : `# ${LOCALE.GENERAL || "General"}`;
}

/** Scope the folder chat to "general" (null) | a topic id. */
function scopeChatToTopic(win, topicId) {
  const next = topicId && topicId !== "all" ? `${topicId}` : "general";
  // A file thread in place is its own conversation: leave it first.
  if (win._scopedFileNid) win.scopeChatToFile(null);
  win._topicId = next;
  // Opening a topic reads it (server-side mark read): clear its cached badge.
  if (next !== "general" && Array.isArray(win._topics)) {
    win._topics = win._topics.map((t) => (`${t.id}` === next ? { ...t, unread: 0 } : t));
  }
  const wide = win.activeTab === _a.chat && !(win._isCompactChat && win._isCompactChat());
  win._updateChatHeader(null, "", wide);
  win._setThreadRailActive("");
  // The strip's carousel shows the page with the picked tab.
  win._topicPage = require("./skeleton/topic-strip").pageOf(win._topics, next);
  paintStrip(win);
  return win.ensurePart("folder-chat").then((chat) => {
    if (chat && typeof chat.setScopedTopic === "function") chat.setScopedTopic(next);
  });
}

/**
 * Feed the Files-tab topic strip (the chat panel's "topic-strip" part) from
 * the current topics + scope. Empty for a member without chat access or a
 * share-token window (no topics there).
 */
function paintStrip(win) {
  return win.ensurePart("topic-strip").then((part) => {
    if (!alive(part)) return;
    if (!canChat(win) || win.mget(_a.token)) {
      part.feed([]);
      return;
    }
    const { topics, canCreateTopic } = menuOpts(win);
    part.feed(
      require("./skeleton/topic-strip")(win, {
        topics,
        topicId: current(win),
        canCreateTopic,
        page: win._topicPage || 0,
      }),
    );
  });
}

/** Carousel: move the strip one page back (-1) or forward (+1), clamped. */
function stripPage(win, delta) {
  const { PAGE_SIZE } = require("./skeleton/topic-strip");
  const count = 1 + (Array.isArray(win._topics) ? win._topics.length : 0);
  const last = Math.max(0, Math.ceil(count / PAGE_SIZE) - 1);
  win._topicPage = Math.min(Math.max(0, (win._topicPage || 0) + delta), last);
  return paintStrip(win);
}

/** Fetch the folder's topics, then paint the strip. */
function refreshStrip(win) {
  return fetchTopics(win).then(() => paintStrip(win));
}

/** Entering the wide Chat tab: the scope carries over (the rail shows it). */
function onChatTabEnter() {
  return Promise.resolve();
}

/** Back on the Files tab: repaint the strip for the current scope. */
function onFilesTabEnter(win) {
  return paintStrip(win);
}

function openTopicDialog(win) {
  if (win._closeThreadMenu) win._closeThreadMenu();
  if (!canChat(win)) return Promise.resolve();
  return win.ensurePart("wrapper-topic-dialog").then((wrapper) => {
    if (!alive(wrapper)) return;
    win._topicDialog = wrapper;
    // Backdrop click (not the card) closes, as the export dialog's.
    if (wrapper.el) {
      wrapper.el.onclick = (e) => {
        if (e && e.target === wrapper.el) closeTopicDialog(win);
      };
    }
    wrapper.feed({
      kind: "widget_topic_create",
      folder_nid: `${win.mget(_a.nid)}`,
      hub_id: hubOf(win),
      host: win,
    });
  });
}

function closeTopicDialog(win) {
  const wrapper = win._topicDialog;
  if (alive(wrapper) && typeof wrapper.clear === "function") wrapper.clear();
  win._topicDialog = null;
}

/**
 * channel.topic_create; on success the new topic joins the list, becomes the
 * scope, and the menus repaint.
 * @returns {Promise<{ok: boolean, status?: string, topic?: Object}>}
 */
function createTopic(win, { name, emoji } = {}) {
  return Promise.resolve(
    win.postService({
      service: svc("topic_create"),
      hub_id: hubOf(win),
      folder_nid: `${win.mget(_a.nid)}`,
      name,
      emoji,
    }),
  )
    .then((row) => {
      if (!row || !row.id) return { ok: false, status: (row && row.status) || "ERROR" };
      win._topics = [...(win._topics || []).filter((t) => `${t.id}` !== `${row.id}`), row];
      return Promise.resolve(scopeChatToTopic(win, row.id)).then(() => ({ ok: true, topic: row }));
    })
    .catch(() => ({ ok: false, status: "ERROR" }));
}

/** Folder navigation: another folder's topics — back to # General. */
function onFolderChange(win) {
  win._topics = [];
  win._topicId = "general";
  win._topicPage = 0;
  paintStrip(win);
  return win.ensurePart("folder-chat").then((chat) => {
    if (chat && typeof chat.setScopedTopic === "function") chat.setScopedTopic("general");
  });
}

module.exports = {
  slot,
  fetchTopics,
  menuOpts,
  headerTitle,
  scopeChatToTopic,
  openTopicDialog,
  closeTopicDialog,
  createTopic,
  onFolderChange,
  paintStrip,
  refreshStrip,
  onChatTabEnter,
  onFilesTabEnter,
  stripPage,
};
