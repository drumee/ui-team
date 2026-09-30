/**
 * Files-tab chat "File threads" bar (Figma 869:189953, 980:130345 /
 * 980:166662): a card that toggles a dropdown of the folder's file threads
 * (the rail's File Threads, as a dropdown). Rows reuse the rail's
 * "thread-menu-file" service (scope the chat to that file in place). Fed into
 * the chat panel's "ft-bar" part by window/folder/file-threads-bar.js.
 *
 * @param {Object} ui folder window
 * @param {{ items?: Array, open?: boolean, scopedNid?: string }} opt
 * @returns {Array} kids of the ft-bar part
 */
module.exports = function fileThreadsBar(ui, opt = {}) {
  const pfx = `${ui.fig.group}__ft`;
  const items = Array.isArray(opt.items) ? opt.items : [];
  const open = !!opt.open;
  const scopedNid = opt.scopedNid ? `${opt.scopedNid}` : "";

  // Real unread only (the list proc has no unread column → no badge).
  const badge = (n) =>
    n != null && Number(n) > 0
      ? Skeletons.Note({ className: `${ui.fig.group}__thread-menu__badge`, content: `${n}` })
      : null;

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
            kids: [Skeletons.Image.Svg({ className: `${pfx}-bar-clip`, ico: "app-attachment" })],
          }),
          Skeletons.Note({ className: `${pfx}-bar-label`, content: LOCALE.FILE_THREADS_BAR || "File threads" }),
        ],
      }),
      Skeletons.Image.Svg({ className: `${pfx}-bar-ico`, ico: "ph-list-magnifying-glass" }),
    ],
  });
  if (!open) return [bar];

  const rows = items.length
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

  return [bar, Skeletons.Box.Y({ className: `${pfx}-list`, kids: rows })];
};
