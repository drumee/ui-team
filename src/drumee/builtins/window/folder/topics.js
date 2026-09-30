/**
 * Folder chat topics — the folder window's side (Figma 867:185782,
 * 867:186725, 869:187685).
 *
 * A topic is a named sub-conversation of the folder's team chat (server:
 * channel.topic_list / topic_create; a message carries metadata._topic_id).
 * The thread menu / rail shows them under "Topics" (skeleton/thread-menu);
 * picking one scopes the chat widget (widget_chat.setScopedTopic): "all"
 * (default — the whole folder chat), "general" (without topic messages) or a
 * topic id.
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
      win._topics = rows;
      return rows;
    })
    .catch(() => win._topics || []);
}

/** threadMenu options for the Topics section. */
function menuOpts(win) {
  return {
    topics: Array.isArray(win._topics) ? win._topics : [],
    topicId: win._topicId || "all",
    canCreateTopic: canChat(win),
  };
}

/** The chat header title for the current topic scope. */
function headerTitle(win) {
  const id = win._topicId || "all";
  if (id === "all") return LOCALE.FOLDER_SCOPED_CHAT || "Team Chat";
  if (id === "general") return `# ${LOCALE.GENERAL || "General"}`;
  const t = (win._topics || []).find((x) => `${x.id}` === id);
  return t ? `# ${t.emoji ? `${t.emoji} ` : ""}${t.name}` : `# ${LOCALE.GENERAL || "General"}`;
}

/** Scope the folder chat to "all" | "general" | a topic id. */
function scopeChatToTopic(win, topicId) {
  const next = topicId ? `${topicId}` : "all";
  // A file thread in place is its own conversation: leave it first.
  if (win._scopedFileNid) win.scopeChatToFile(null);
  win._topicId = next;
  // Opening a topic reads it (server-side mark read): clear its cached badge.
  if (next !== "all" && next !== "general" && Array.isArray(win._topics)) {
    win._topics = win._topics.map((t) => (`${t.id}` === next ? { ...t, unread: 0 } : t));
  }
  const wide = win.activeTab === _a.chat && !(win._isCompactChat && win._isCompactChat());
  win._updateChatHeader(null, "", wide);
  win._setThreadRailActive("");
  return win.ensurePart("folder-chat").then((chat) => {
    if (chat && typeof chat.setScopedTopic === "function") chat.setScopedTopic(next);
  });
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

/** Folder navigation: another folder's topics — back to All. */
function onFolderChange(win) {
  win._topics = [];
  win._topicId = "all";
  return win.ensurePart("folder-chat").then((chat) => {
    if (chat && typeof chat.setScopedTopic === "function") chat.setScopedTopic("all");
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
};
