/**
 * Files-tab chat "File threads" bar (Figma 869:189953, 980:130345 /
 * 980:166662): a card that toggles a dropdown of the folder's file threads
 * (the rail's File Threads, as a dropdown). Rows reuse the rail's
 * "thread-menu-file" service (scope the chat to that file in place). Fed into
 * the chat panel's "ft-bar" part by window/folder/file-threads-bar.js.
 *
 * @param {Object} ui folder window
 * With `topics` (the folder window) the dropdown lists the chat threads
 * (# General + topics, the rail's rows and services) above the file threads.
 *
 * @param {{ items?: Array, open?: boolean, scopedNid?: string, group?: string,
 *           topics?: Array, topicId?: string }} opt
 * @returns {Array} kids of the ft-bar part
 */
module.exports = function fileThreadsBar(ui, opt = {}) {
  // `group`: the class family — the Inbox builds the folder's window__ bar.
  const grp = opt.group || ui.fig.group;
  const pfx = `${grp}__ft`;
  const items = Array.isArray(opt.items) ? opt.items : [];
  const open = !!opt.open;
  const scopedNid = opt.scopedNid ? `${opt.scopedNid}` : "";

  // Real unread only (the list proc has no unread column → no badge).
  const badge = (n) =>
    n != null && Number(n) > 0
      ? Skeletons.Note({ className: `${grp}__thread-menu__badge`, content: `${n}` })
      : null;

  // With topics the list holds chat and file threads: "Threads", a chat
  // glyph. The Inbox bar (file threads only) keeps "File threads", the clip.
  const both = Array.isArray(opt.topics);
  const bar = Skeletons.Box.X({
    className: `${pfx}-bar-card`,
    service: "ft-bar-toggle",
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    dataset: { open: open ? "1" : "0" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-bar-left`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-bar-badge`,
            kids: [Skeletons.Image.Svg({ className: `${pfx}-bar-clip`, ico: both ? "ctxmenu-chat-thread" : "app-attachment" })],
          }),
          Skeletons.Note({ className: `${pfx}-bar-label`, content: both ? LOCALE.THREADS : LOCALE.FILE_THREADS_BAR || "File threads" }),
        ],
      }),
      Skeletons.Image.Svg({ className: `${pfx}-bar-ico`, ico: "ph-list-magnifying-glass" }),
    ],
  });
  if (!open) return [bar];

  const fileRows = items.length
    ? items.map((it) => {
        const fileNid = `${it.file_nid || ""}`;
        const name = it.user_filename || it.filename || "";
        const unread = it.unread != null ? it.unread : it.unread_count;
        return Skeletons.Box.X({
          className: `${pfx}-row${scopedNid && scopedNid === fileNid ? " is-active" : ""}`,
          service: "thread-menu-file",
          file_nid: fileNid,
          filename: name,
          uiHandler: [ui],
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Image.Svg({ className: `${pfx}-row-ico`, ico: "app-attachment" }),
            Skeletons.Note({ className: `${pfx}-row-name`, content: name }),
            badge(unread),
          ].filter(Boolean),
        });
      })
    : [Skeletons.Note({ className: `${pfx}-empty`, content: LOCALE.NO_FILE_THREADS || "No file threads yet" })];

  // Without `topics` (the Inbox bar) the list is the file threads alone.
  if (!both) {
    return [bar, Skeletons.Box.Y({ className: `${pfx}-list`, kids: fileRows })];
  }

  // Chat threads: # General + the folder's topics, the rail's Topics rows
  // (same services). Nothing is active while a file thread is the scope.
  const topicId = opt.topicId && opt.topicId !== "all" ? `${opt.topicId}` : "general";
  const active = (id) => (!scopedNid && topicId === id ? " is-active" : "");
  const topicRow = ({ id, label, emoji, unread, ...model }) =>
    Skeletons.Box.X({
      className: `${pfx}-row${active(id)}`,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      ...model,
      kids: [
        Skeletons.Note({ className: `${pfx}-row-emoji`, content: emoji || "#" }),
        Skeletons.Note({ className: `${pfx}-row-name`, content: label }),
        badge(unread),
      ].filter(Boolean),
    });
  const chatRows = [
    topicRow({
      id: "general",
      label: LOCALE.GENERAL || "General",
      service: "thread-menu-general",
      topic_scope: "general",
    }),
    ...opt.topics.map((tp) =>
      topicRow({
        id: `${tp.id || ""}`,
        label: tp.name || "",
        emoji: tp.emoji,
        unread: tp.unread,
        service: "topic-menu-topic",
        topic_id: `${tp.id || ""}`,
      }),
    ),
  ];
  const head = (content) => Skeletons.Note({ className: `${pfx}-section`, content });

  return [
    bar,
    Skeletons.Box.Y({
      className: `${pfx}-list`,
      kids: [
        head(LOCALE.CHAT_THREADS || "Chat threads"),
        ...chatRows,
        head(LOCALE.FILE_THREADS || "File threads"),
        ...fileRows,
      ],
    }),
  ];
};
