// File-detail screen — opened when the user clicks any file row in the
// Admin Storage / File Versioning views. Metadata and versions come from
// admin.get_file_version_detail; the document body preview is intentionally
// not rendered (no preview pipeline yet — tracked separately).

function resolve(ui) {
  const live = ui._fileDetail || {};
  const active = ui._fvActiveFile || {};
  const versions = Array.isArray(live.versions) ? live.versions : [];
  const selected =
    versions.find((v) => v.id === ui._fvSelectedVersionId) ||
    versions.find((v) => v.active) ||
    versions[0] ||
    null;
  return {
    title: live.title || live.filename || active.name || "",
    filename: live.filename || active.name || "",
    size: live.size || active.size || "",
    retention: live.retention || LOCALE.RETENTION_NONE || "—",
    versions,
    selected,
  };
}

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
            ico: "magnifying-glass",
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

function previewHeader(pfx, data) {
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
        content: data.filename,
      }),
    ],
  });
}

function metaRow(pfx, label, value) {
  return Skeletons.Box.X({
    className: `${pfx}__filed-meta-row`,
    kids: [
      Skeletons.Note({ className: `${pfx}__filed-meta-label`, content: label }),
      Skeletons.Note({ className: `${pfx}__filed-meta-value`, content: value || "—" }),
    ],
  });
}

function previewBody(ui, data) {
  const pfx = ui.fig.family;
  const v = data.selected;
  const kids = [
    Skeletons.Note({
      className: `${pfx}__filed-doc-title`,
      content: data.title || data.filename,
    }),
  ];
  if (!data.versions.length) {
    kids.push(
      Skeletons.Note({
        className: `${pfx}__filed-preview-empty`,
        content: LOCALE.FILE_PREVIEW_UNAVAILABLE,
      })
    );
  } else if (!v) {
    kids.push(
      Skeletons.Note({
        className: `${pfx}__filed-preview-empty`,
        content: LOCALE.SELECT_VERSION_TO_PREVIEW,
      })
    );
  } else {
    kids.push(
      Skeletons.Note({
        className: `${pfx}__filed-meta-heading`,
        content: v.active
          ? `${LOCALE.VERSION_INFO} (${LOCALE.ACTIVE_VERSION})`
          : LOCALE.VERSION_INFO,
      }),
      metaRow(pfx, LOCALE.VERSIONS, v.version || ""),
      metaRow(pfx, LOCALE.EDITED_BY, v.editor || ""),
      metaRow(pfx, LOCALE.VERSION_SAVED, v.timestamp || ""),
      metaRow(pfx, LOCALE.SIZE, v.size || ""),
      metaRow(pfx, LOCALE.FILE, v.file || data.filename),
      Skeletons.Note({
        className: `${pfx}__filed-preview-empty`,
        content: LOCALE.FILE_PREVIEW_UNAVAILABLE,
      })
    );
  }
  return Skeletons.Box.Y({
    className: `${pfx}__filed-preview-body`,
    kids,
  });
}

function previewPane(ui, data) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__filed-preview`,
    kids: [
      previewHeader(pfx, data),
      Skeletons.Box.Y({
        className: `${pfx}__filed-preview-card`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__filed-preview-scroll`,
            kids: [previewBody(ui, data)],
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

function statsRow(ui, data) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__filed-stats`,
    kids: [
      statCard(pfx, {
        icon: "apps-database",
        label: LOCALE.TOTAL_STORAGE || "TOTAL STORAGE",
        value: data.size,
      }),
      statCard(pfx, {
        icon: "apps-clock",
        label: LOCALE.RETENTION || "RETENTION",
        value: data.retention,
      }),
    ],
  });
}

function avatarDot(pfx) {
  return Skeletons.Box.X({ className: `${pfx}__filed-edit-avatar` });
}

function versionEntry(ui, version) {
  const pfx = ui.fig.family;
  const isSelected = version.id === ui._fvSelectedVersionId;
  const cn = [
    `${pfx}__filed-version`,
    version.active ? `${pfx}__filed-version--active` : "",
    isSelected ? `${pfx}__filed-version--selected` : "",
  ].filter(Boolean).join(" ");
  return Skeletons.Box.Y({
    className: cn,
    service: "apps-fv-select-version",
    uiHandler: [ui],
    version_id: version.id,
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
      // Middle row: file pill (icon + name)
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
        ],
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

function versionHistoryCard(ui, data) {
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
        kids: (data.versions || []).length
          ? data.versions.map((v) => versionEntry(ui, v))
          : [
              Skeletons.Note({
                className: `${pfx}__filed-version-empty`,
                content: LOCALE.NO_VERSIONS_YET || "No prior versions for this file.",
              }),
            ],
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

function rightColumn(ui, data) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__filed-right`,
    kids: [statsRow(ui, data), versionHistoryCard(ui, data)],
  });
}

export default function file_detail_view(ui) {
  const pfx = ui.fig.family;
  if (ui._fileDetailLoading && !ui._fileDetail) {
    return [
      topBar(ui),
      Skeletons.Box.Y({
        className: `${pfx}__filed-loading`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__filed-loading-label`,
            content: LOCALE.LOADING_FILE_DETAIL,
          }),
        ],
      }),
    ];
  }
  const data = resolve(ui);
  return [
    topBar(ui),
    Skeletons.Box.X({
      className: `${pfx}__filed-body`,
      kids: [previewPane(ui, data), rightColumn(ui, data)],
    }),
  ];
}
