/* ============================================================ *
 * Skeleton: chat-export modal
 * Figma node 2216-257014 — "Export chat history"
 * ============================================================ */

// Folder icon glyph colour = the workspace's access level. Maps the node's
// `area` to the fg-* access palette (public/restricted/private), which are
// global compiled classes with hardcoded hex — unlike the theme --*-main vars
// which do NOT resolve inside the appended overlay (rendered the icon invisible).
const AREA_ACCESS = {
  private: "private",
  share: "restricted",
  dmz: "public",
  public: "public",
};

/**
 * Returns the full modal card layout.
 * @param {__widget_chat_export} ui
 */
module.exports = {
  default: function chatExportSkeleton(ui) {
    const pfx = ui.fig.family; // "widget-chat-export"

    // File-scope mode (single file's thread): show the file card and hide the
    // scope picker — the scope is fixed to this file's thread.
    const fileScope = !!ui._fileScope;

    return Skeletons.Box.Y({
      className: `${pfx}__card`,
      kids: [
        _header(pfx, ui),
        fileScope ? _fileCard(pfx, ui) : _folderCard(pfx, ui),
        _formatSection(pfx, ui),
        fileScope ? null : _scopeSection(pfx, ui),
        _dateRangeSection(pfx, ui),
        _footer(pfx, ui),
        _downloadButton(pfx, ui),
        // Progress area (hidden until PDF export starts)
        Skeletons.Box.Y({
          className: `${pfx}__progress-area`,
          sys_pn: "progress-area",
          partHandler: ui,
          kids: [],
        }),
      ],
    });
  },
};

// ------------------------------------------------------------------ header

function _header(pfx, ui) {
  return Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      // Left: download icon + title
      Skeletons.Box.X({
        className: `${pfx}__header-left`,
        kids: [
          Skeletons.Image.Svg({
            ico: "app-download",
            className: `${pfx}__header-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__header-title`,
            content: LOCALE.EXPORT_CHAT_HISTORY,
          }),
        ],
      }),
      // Right: close button
      Skeletons.Button.Svg({
        ico: "cross",
        className: `${pfx}__header-close`,
        service: "close-export",
        uiHandler: [ui],
      }),
    ],
  });
}

// ------------------------------------------------------------------ folder card
// Fix #2: remove "Open thread" link; color icon box with folder's real color.

function _folderCard(pfx, ui) {
  // Prefer the real folder name from the model (the folder the user opened);
  // backend hub.name may resolve to the hub_id hash until export_scope is fixed.
  const hubName = ui.mget(_a.name) || ui._hubName || LOCALE.LOADING || "…";
  // #3: folder icon glyph coloured by access level via the fg-* class (reliable
  // global hex); the box keeps its light tint so the icon is always visible.
  const access = AREA_ACCESS[ui.mget(_a.area)] || "private";
  // #4: message count is hidden entirely when 0/unavailable (per user request).
  const msgCount = ui._messageCount || 0;
  // mtime is epoch SECONDS (INT) — use Dayjs.unix; Dayjs(seconds) treats it as
  // milliseconds and renders "56 years ago" (1970).
  const mtime = ui._hubMtime ? Dayjs.unix(ui._hubMtime).fromNow() : "";

  // Meta row: chat-dots + "N messages" only when count > 0; then relative time.
  // Separator only between two present items.
  const metaKids = [];
  if (msgCount > 0) {
    metaKids.push(
      Skeletons.Image.Svg({
        ico: "chat-teardrop-dots",
        className: `${pfx}__folder-meta-ico`,
      }),
      Skeletons.Note({
        className: `${pfx}__folder-meta-text`,
        content: `${msgCount} ${LOCALE.MESSAGES}`,
      }),
    );
  }
  if (mtime) {
    if (metaKids.length) {
      metaKids.push(
        Skeletons.Note({ className: `${pfx}__folder-meta-sep`, content: "•" }),
      );
    }
    metaKids.push(
      Skeletons.Note({ className: `${pfx}__folder-meta-text`, content: mtime }),
    );
  }

  return Skeletons.Box.X({
    className: `${pfx}__folder-card`,
    kids: [
      // Left: icon box + info column
      Skeletons.Box.X({
        className: `${pfx}__folder-left`,
        kids: [
          // Folder icon: glyph coloured by access level (#3, fg-* class), on the
          // default light box so it's always visible.
          Skeletons.Box.Y({
            className: `${pfx}__folder-icon-box`,
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-folder-card",
                className: `${pfx}__folder-icon fg-${access}`,
              }),
            ],
          }),
          // Info column
          Skeletons.Box.Y({
            className: `${pfx}__folder-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__folder-name`,
                content: hubName,
              }),
              Skeletons.Box.X({
                className: `${pfx}__folder-meta`,
                kids: metaKids,
              }),
            ],
          }),
        ],
      }),
      // Fix #2: "Open thread →" link removed per user request.
    ],
  });
}

// ------------------------------------------------------------------ file card
// File-scope mode: shows the single file (instead of the folder). Reuses the
// __folder-* classes so the layout/styling is identical — only the icon and
// the meta source (the matched thread's reply_count) differ.

function _fileCard(pfx, ui) {
  const filename = ui.mget(_a.filename) || ui.mget(_a.name) || LOCALE.LOADING || "…";
  const access = AREA_ACCESS[ui.mget(_a.area)] || "private";
  const thread = ui._matchedThread;
  const replyCount = thread ? thread.reply_count || 0 : 0;

  const metaKids = [];
  if (replyCount > 0) {
    metaKids.push(
      Skeletons.Image.Svg({
        ico: "chat-teardrop-dots",
        className: `${pfx}__folder-meta-ico`,
      }),
      Skeletons.Note({
        className: `${pfx}__folder-meta-text`,
        content: `${replyCount} ${LOCALE.MESSAGES}`,
      }),
    );
  }

  return Skeletons.Box.X({
    className: `${pfx}__folder-card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__folder-left`,
        kids: [
          // File-thread icon (app-attachment), coloured by access level — same
          // light icon box as the folder card so it's always visible.
          Skeletons.Box.Y({
            className: `${pfx}__folder-icon-box`,
            kids: [
              Skeletons.Image.Svg({
                ico: "app-attachment",
                className: `${pfx}__folder-icon fg-${access}`,
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__folder-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__folder-name`,
                content: filename,
              }),
              Skeletons.Box.X({
                className: `${pfx}__folder-meta`,
                kids: metaKids,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ------------------------------------------------------------------ format section
// Fix #3: format-title weight bumped to 700.

function _formatSection(pfx, ui) {
  const isPdf = ui._format === "pdf";

  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__section-label`,
        content: LOCALE.FORMAT,
      }),
      Skeletons.Box.X({
        className: `${pfx}__format-row`,
        kids: [
          _formatCard(pfx, ui, "pdf", isPdf),
          _formatCard(pfx, ui, "json", !isPdf),
        ],
      }),
    ],
  });
}

function _formatCard(pfx, ui, fmt, active) {
  const isPdf = fmt === "pdf";
  const ico = isPdf ? "app-pdf-file" : "code-js";
  const title = isPdf ? "PDF" : "JSON";
  const subtitle = isPdf ? LOCALE.HUMAN_READABLE : LOCALE.RAW_DATA;

  // Fix #6: Use Button.Label for the whole card so the entire card is a
  // proper interactive element (full-width tap area, reliable single-click).
  // The existing set-format service + uiHandler wire is preserved.
  return Skeletons.Box.Y({
    className: `${pfx}__format-card${active ? " is-active" : ""}`,
    service: "set-format",
    format: fmt,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__format-card-top`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__format-icon-box${active ? " is-active" : ""}`,
            kids: [
              Skeletons.Image.Svg({
                ico,
                className: `${pfx}__format-icon`,
              }),
            ],
          }),
        ],
      }),
      // Fix #3: weight 700 applied via __format-title--bold modifier class.
      Skeletons.Note({
        className: `${pfx}__format-title${active ? " is-active" : ""} ${pfx}__format-title--bold`,
        content: title,
      }),
      Skeletons.Note({
        className: `${pfx}__format-subtitle`,
        content: subtitle,
      }),
    ],
  });
}

// ------------------------------------------------------------------ scope section
// Fix #4: redesigned checkbox state machine.
function _scopeSection(pfx, ui) {
  // Each checkbox reflects real independent state:
  //   _allChecked           = every folder AND every thread checked (derived).
  //   folder checked        = _checkedFolderNids.has(nid).
  //   thread checked        = _checkedThreadIds.has(id).
  const allChecked = ui._allChecked;
  const hasFolders = ui._folders && ui._folders.length > 0;
  const foldersExpanded = ui._foldersExpanded;
  const hasThreads = ui._fileThreads && ui._fileThreads.length > 0;
  const expanded = ui._threadsExpanded;

  // Rows use Box.X with service + uiHandler on the container so the entire row
  // is clickable. kidsOpt active:0 prevents inner child nodes from intercepting
  // the click before it bubbles to the row's uiHandler.
  const rows = [
    // "All" row
    Skeletons.Box.X({
      className: `${pfx}__scope-row`,
      service: "scope-all",
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        _checkbox(pfx, allChecked),
        Skeletons.Note({
          className: `${pfx}__scope-label`,
          content: LOCALE.ALL_HUB_AND_THREADS,
        }),
      ],
    }),
  ];

  // "Folders" parent row (collapsible) + per-folder child checkboxes. Replaces
  // the old single "this folder only" row so each subfolder can be picked.
  if (hasFolders) {
    rows.push(
      Skeletons.Box.X({
        className: `${pfx}__scope-row`,
        service: "toggle-folders",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "dock-folder",
            className: `${pfx}__scope-thread-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__scope-label`,
            content: LOCALE.FOLDERS,
          }),
          Skeletons.Image.Svg({
            ico: "apps-caret-down",
            className: `${pfx}__scope-caret${foldersExpanded ? " is-expanded" : ""}`,
          }),
        ],
      }),
    );

    if (foldersExpanded) {
      ui._folders.forEach((folder) => {
        const nidStr = String(folder.nid);
        const checked = ui._checkedFolderNids.has(nidStr);
        rows.push(
          Skeletons.Box.X({
            className: `${pfx}__scope-row ${pfx}__scope-row--child`,
            service: "scope-folder-toggle",
            folder_nid: nidStr,
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              _checkbox(pfx, checked),
              Skeletons.Note({
                className: `${pfx}__scope-label`,
                content: folder.path || folder.name || nidStr,
              }),
            ],
          }),
        );
      });
    }
  }

  if (hasThreads) {
    // "File Threads" parent row (collapsible)
    rows.push(
      Skeletons.Box.X({
        className: `${pfx}__scope-row`,
        service: "toggle-file-threads",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: "app-attachment",
            className: `${pfx}__scope-thread-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__scope-label`,
            content: LOCALE.FILE_THREADS,
          }),
          Skeletons.Image.Svg({
            ico: "apps-caret-down",
            className: `${pfx}__scope-caret${expanded ? " is-expanded" : ""}`,
          }),
        ],
      }),
    );

    // Child thread rows (visible when expanded)
    if (expanded) {
      ui._fileThreads.forEach((thread) => {
        // Normalize to string — Set always holds string keys (see index.js).
        const threadIdStr = String(thread.file_thread_id);
        const checked = ui._checkedThreadIds.has(threadIdStr);
        const replyCount = thread.reply_count || 0;
        rows.push(
          Skeletons.Box.X({
            className: `${pfx}__scope-row ${pfx}__scope-row--child`,
            service: "scope-thread-toggle",
            file_thread_id: threadIdStr,
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              _checkbox(pfx, checked),
              Skeletons.Note({
                className: `${pfx}__scope-label`,
                content: `${thread.filename} (${replyCount} ${LOCALE.REPLIES})`,
              }),
            ],
          }),
        );
      });
    }
  }

  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__section-label`,
        content: LOCALE.CHAT_SCOPE,
      }),
      Skeletons.List.Scroll({
        className: `${pfx}__scope-list`,
        flow: "y",
        kids: rows,
      }),
    ],
  });
}

/**
 * Renders a visual checkbox state indicator.
 * Fix #5: uses "chat-tick" (plain checkmark, no circle) instead of "app-check".
 */
function _checkbox(pfx, checked) {
  return Skeletons.Box.Y({
    className: `${pfx}__checkbox${checked ? " is-checked" : ""}`,
    kids: checked
      ? [Skeletons.Image.Svg({ ico: "chat-tick", className: `${pfx}__checkbox-ico` })]
      : [],
  });
}

// ------------------------------------------------------------------ date range section
// Fix #6: date-switch uses Button.Label for reliable single-tap.
// Fix #7: date-input-wrap gets a service so clicking the wrap opens the picker.

function _dateRangeSection(pfx, ui) {
  const enabled = ui._dateEnabled;

  const inputs = enabled
    ? [
        Skeletons.Box.X({
          className: `${pfx}__date-row`,
          kids: [
            _dateInput(pfx, ui, "start"),
            Skeletons.Image.Svg({
              ico: "arrow-right",
              className: `${pfx}__date-arrow`,
            }),
            _dateInput(pfx, ui, "end"),
          ],
        }),
      ]
    : [];

  return Skeletons.Box.Y({
    className: `${pfx}__section`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__date-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__section-label`,
            content: LOCALE.DATE_RANGE,
          }),
          // Fix #6: service + uiHandler on the Box.X track ensures a single tap
          // reliably fires toggle-date-range regardless of DOM rebuild timing.
          Skeletons.Box.X({
            className: `${pfx}__date-switch`,
            state: enabled ? 1 : 0,
            service: "toggle-date-range",
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Box.X({ className: `${pfx}__date-switch-knob` }),
            ],
          }),
        ],
      }),
      ...inputs,
    ],
  });
}

function _dateInput(pfx, ui, which) {
  const pn = `date-${which}`;
  // Native <input type=date>; the skin stretches its calendar-picker-indicator
  // over the field so a click opens the OS picker every time. Change event is
  // wired in onPartReady via sys_pn.
  return Skeletons.Box.X({
    className: `${pfx}__date-input-wrap`,
    kids: [
      Skeletons.Image.Svg({
        ico: "calendar",
        className: `${pfx}__date-icon`,
      }),
      Skeletons.Element({
        tagName: "input",
        className: `${pfx}__date-input`,
        attrOpt: { type: "date", placeholder: "dd/mm/yyyy" },
        sys_pn: pn,
        partHandler: ui,
      }),
    ],
  });
}

// ------------------------------------------------------------------ footer

function _footer(pfx, ui) {
  return Skeletons.Box.Y({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Note({ className: `${pfx}__footer-divider` }),
      Skeletons.Note({
        className: `${pfx}__footer-hint`,
        content: LOCALE.EXPORT_FILE_SECTIONS_HINT,
      }),
      Skeletons.Note({
        className: `${pfx}__footer-filename-hint`,
        content: LOCALE.EXPORT_FILENAME_HINT,
      }),
    ],
  });
}

// ------------------------------------------------------------------ download button

function _downloadButton(pfx, ui) {
  // While a PDF export is generating on the server, the button becomes a
  // non-interactive "Generating" state — an outlined pill with a rotating
  // spinner (replaces the old thin progress bar). No `service` so clicks are
  // ignored until generation completes; the widget flips ui._generating back
  // off (WS "done" / poll success / error) and re-feeds to restore Download.
  if (ui._generating) {
    return Skeletons.Box.X({
      className: `${pfx}__download-btn is-generating`,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Box.Y({ className: `${pfx}__download-spinner` }),
        Skeletons.Note({
          className: `${pfx}__download-btn-label`,
          content: LOCALE.GENERATING,
        }),
      ],
    });
  }

  return Skeletons.Box.Y({
    className: `${pfx}__download-btn`,
    service: "do-export",
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${pfx}__download-btn-label`,
        content: LOCALE.DOWNLOAD,
      }),
    ],
  });
}
