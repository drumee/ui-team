/**
 * Thread-switch dropdown for the folder team-chat header (Figma 2216-170337).
 * Opened by the header 3-dot button; populated live by folder._toggleThreadMenu
 * from channel.file_thread_list_by_folder.
 *
 *   This Folder
 *     # General                         → service "thread-menu-general" (folder chat)
 *   File Threads
 *     📎 <filename>  [unread?]           → service "thread-menu-file" (file chat)
 *   ──────────────
 *   Download Chat history   ⤓            → service "download-chat-history" (no-op UI)
 *
 * The active row (current chat scope) is marked `is-active`. Per-thread unread is
 * NOT in the list proc (it returns reply_count, not unread), so the badge renders
 * only when a real unread field is present — never a fabricated count.
 *
 * The same builder feeds two surfaces (identical rows/data, different chrome):
 *   • dropdown  — the floating header card (default).
 *   • rail      — the persistent left panel of the full Chat tab (Figma
 *                 2328-115485), opt.variant === "rail" → adds a `--rail`
 *                 modifier so SCSS drops the floating card chrome and pins
 *                 Download to the bottom. Rows, badges and is-active are shared.
 *
 * @param {Object} ui folder window
 * @param {{ items?: Array, scopedNid?: string, variant?: "rail" }} opt
 */
module.exports = function threadMenu(ui, opt = {}) {
  const pfx = `${ui.fig.group}__thread-menu`;
  const items = Array.isArray(opt.items) ? opt.items : [];
  const scopedNid = opt.scopedNid ? `${opt.scopedNid}` : "";
  const railModifier = opt.variant === "rail" ? ` ${pfx}__card--rail` : "";

  // Real unread only — proc has no unread column, so absent → no badge.
  const badge = (n) =>
    n != null && Number(n) > 0
      ? Skeletons.Note({ className: `${pfx}__badge`, content: `${n}` })
      : null;

  const sectionLabel = (content) =>
    Skeletons.Note({ className: `${pfx}__section-label`, content });

  const divider = () => Skeletons.Note({ className: `${pfx}__divider` });

  // This Folder → # General (folder-wide chat). Active when nothing file-scoped.
  const generalRow = Skeletons.Box.X({
    className: `${pfx}__row${scopedNid === "" ? " is-active" : ""}`,
    service: "thread-menu-general",
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${pfx}__row-name`,
        content: `# ${LOCALE.GENERAL || "General"}`,
      }),
    ],
  });

  // File Threads — one row per current-folder file that has a thread.
  const fileRows = items.map((it) => {
    const fileNid = `${it.file_nid || ""}`;
    const name = it.user_filename || it.filename || "";
    const unread = it.unread != null ? it.unread : it.unread_count;
    return Skeletons.Box.X({
      className: `${pfx}__row${
        scopedNid && scopedNid === fileNid ? " is-active" : ""
      }`,
      service: "thread-menu-file",
      file_nid: fileNid,
      filename: name,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__row-ico` }),
        Skeletons.Note({ className: `${pfx}__row-name`, content: name }),
        badge(unread),
      ].filter(Boolean),
    });
  });

  const kids = [
    Skeletons.Box.Y({
      className: `${pfx}__section`,
      kids: [sectionLabel(LOCALE.THIS_FOLDER || "This Folder"), generalRow],
    }),
  ];

  if (fileRows.length) {
    kids.push(
      Skeletons.Box.Y({
        className: `${pfx}__section`,
        kids: [
          divider(),
          sectionLabel(LOCALE.FILE_THREADS || "File Threads"),
          Skeletons.Box.Y({ className: `${pfx}__rows`, kids: fileRows }),
        ],
      }),
    );
  }

  // Download chat history — UI only for now (no export backend wired yet).
  kids.push(
    Skeletons.Box.Y({
      className: `${pfx}__section`,
      kids: [
        divider(),
        Skeletons.Box.X({
          className: `${pfx}__download`,
          service: "download-chat-history",
          uiHandler: [ui],
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Note({
              className: `${pfx}__download-label`,
              content: LOCALE.DOWNLOAD_CHAT_HISTORY || "Download Chat history",
            }),
            Skeletons.Image.Svg({
              ico: "app-download",
              className: `${pfx}__download-ico`,
            }),
          ],
        }),
      ],
    }),
  );

  return Skeletons.Box.Y({ className: `${pfx}__card${railModifier}`, kids });
};
