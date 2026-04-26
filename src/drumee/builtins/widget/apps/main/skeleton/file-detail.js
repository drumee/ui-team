// File-detail screen — opened when the user clicks any file row in the
// Admin Storage / File Versioning views.
const DATA = require("./file-detail-data").default;

function topBar(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__filed-topbar`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__filed-back`,
        service: "apps-fv-detail-back",
        uiHandler: [ui],
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-back",
            className: `${pfx}__filed-back-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__filed-back-label`,
            content: LOCALE.BACK_TO_STORAGE_CONSOLE || "Back to Storage Console",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__filed-search`,
        kids: [
          Skeletons.Image.Svg({
            ico: "editbox_search",
            className: `${pfx}__filed-search-ico`,
          }),
          Skeletons.Entry({
            className: `${pfx}__filed-search-input`,
            placeholder: LOCALE.SEARCH_FILE || "Search file",
            name: "filed_search",
            mode: _a.commit,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

function previewHeader(pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__filed-preview-header`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__fv-fileico`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-file-doc",
            className: `${pfx}__fv-fileico-svg`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__filed-preview-name`,
        content: DATA.filename,
      }),
    ],
  });
}

function bulletList(pfx, items) {
  return Skeletons.Box.Y({
    className: `${pfx}__filed-bullets`,
    kids: items.map((b) =>
      Skeletons.Note({
        className: `${pfx}__filed-bullet`,
        content: `• ${b}`,
      })
    ),
  });
}

function section(pfx, sec) {
  const kids = [
    Skeletons.Note({
      className: `${pfx}__filed-section-title`,
      content: sec.heading,
    }),
  ];
  if (sec.body) {
    kids.push(
      Skeletons.Note({
        className: `${pfx}__filed-section-body`,
        content: sec.body,
      })
    );
  }
  if (sec.bullets) kids.push(bulletList(pfx, sec.bullets));
  if (sec.subsections) {
    sec.subsections.forEach((sub) => {
      kids.push(
        Skeletons.Note({
          className: `${pfx}__filed-subsection-title`,
          content: sub.title,
        })
      );
      if (sub.bullets) kids.push(bulletList(pfx, sub.bullets));
    });
  }
  return Skeletons.Box.Y({
    className: `${pfx}__filed-section`,
    kids,
  });
}

function previewBody(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__filed-preview-body`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__filed-doc-title`,
        content: DATA.title,
      }),
      ...DATA.sections.map((sec) => section(pfx, sec)),
    ],
  });
}

function previewPane(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__filed-preview`,
    kids: [
      previewHeader(pfx),
      Skeletons.Box.Y({
        className: `${pfx}__filed-preview-card`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__filed-preview-scroll`,
            kids: [previewBody(ui)],
          }),
          Skeletons.Box.X({
            className: `${pfx}__filed-show-folder`,
            service: "apps-fv-show-in-folder",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__filed-show-folder-label`,
                content: LOCALE.SHOW_FILE_IN_FOLDER || "Show file in folder →",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function statCard(pfx, { icon, label, value }) {
  return Skeletons.Box.X({
    className: `${pfx}__filed-stat`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__filed-stat-iconwrap`,
        kids: [
          Skeletons.Image.Svg({
            ico: icon,
            className: `${pfx}__filed-stat-ico`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__filed-stat-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__filed-stat-label`,
            content: label,
          }),
          Skeletons.Note({
            className: `${pfx}__filed-stat-value`,
            content: value,
          }),
        ],
      }),
    ],
  });
}

function statsRow(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__filed-stats`,
    kids: [
      statCard(pfx, {
        icon: "apps-database",
        label: LOCALE.TOTAL_STORAGE || "TOTAL STORAGE",
        value: DATA.size,
      }),
      statCard(pfx, {
        icon: "apps-clock",
        label: LOCALE.RETENTION || "RETENTION",
        value: DATA.retention,
      }),
    ],
  });
}

function avatarDot(pfx) {
  return Skeletons.Box.X({ className: `${pfx}__filed-edit-avatar` });
}

function versionEntry(ui, version) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__filed-version${version.active ? ` ${pfx}__filed-version--active` : ""}`,
    kids: [
      // Top row: timestamp + version label
      Skeletons.Box.X({
        className: `${pfx}__filed-version-meta`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__filed-version-time`,
            content: version.timestamp,
          }),
          Skeletons.Note({
            className: `${pfx}__filed-version-tag`,
            content: version.version,
          }),
        ],
      }),
      // Middle row: file pill (icon + name) + optional trash
      Skeletons.Box.X({
        className: `${pfx}__filed-version-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__filed-version-file`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__fv-fileico`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "apps-file-doc",
                    className: `${pfx}__fv-fileico-svg`,
                  }),
                ],
              }),
              Skeletons.Note({
                className: `${pfx}__filed-version-filename`,
                content: version.file,
              }),
            ],
          }),
          version.active
            ? null
            : Skeletons.Button.Svg({
                ico: "trash",
                className: `${pfx}__filed-version-delete`,
                service: "apps-fv-delete-version",
                uiHandler: [ui],
                version_id: version.id,
              }),
        ].filter(Boolean),
      }),
      // Bottom: editor info
      Skeletons.Box.X({
        className: `${pfx}__filed-version-editor`,
        kids: [
          avatarDot(pfx),
          Skeletons.Note({
            className: `${pfx}__filed-version-editor-by`,
            content: LOCALE.EDITED_BY || "Edited by",
          }),
          Skeletons.Note({
            className: `${pfx}__filed-version-editor-name`,
            content: version.editor,
          }),
        ],
      }),
    ],
  });
}

function versionHistoryCard(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__filed-history`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__filed-history-header`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__filed-history-title-block`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__filed-history-title`,
                content: LOCALE.VERSION_HISTORY || "Version History",
              }),
              Skeletons.Note({
                className: `${pfx}__filed-history-sub`,
                content:
                  LOCALE.VERSION_HISTORY_SUB ||
                  "Revert or manage file snapshots",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__filed-history-close`,
            service: "apps-fv-detail-back",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({
                ico: "cross",
                className: `${pfx}__filed-history-close-ico`,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__filed-version-list`,
        kids: DATA.versions.map((v) => versionEntry(ui, v)),
      }),
      Skeletons.Box.Y({
        className: `${pfx}__filed-history-actions`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__filed-action-btn ${pfx}__filed-action-btn--primary`,
            service: "apps-fv-download-all",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "download",
                className: `${pfx}__filed-action-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__filed-action-label`,
                content:
                  LOCALE.DOWNLOAD_ALL_VERSIONS || "Download  all versions",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__filed-action-btn ${pfx}__filed-action-btn--danger`,
            service: "apps-fv-delete-old",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "trash",
                className: `${pfx}__filed-action-ico ${pfx}__filed-action-ico--danger`,
              }),
              Skeletons.Note({
                className: `${pfx}__filed-action-label ${pfx}__filed-action-label--danger`,
                content:
                  LOCALE.DELETE_ALL_OLD_VERSIONS || "Delete all old versions",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function rightColumn(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__filed-right`,
    kids: [statsRow(ui), versionHistoryCard(ui)],
  });
}

export default function file_detail_view(ui) {
  const pfx = ui.fig.family;
  return [
    topBar(ui),
    Skeletons.Box.X({
      className: `${pfx}__filed-body`,
      kids: [previewPane(ui), rightColumn(ui)],
    }),
  ];
}
