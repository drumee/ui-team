// Admin Storage tab. Shares header chrome (capacity card + alert + optimization)
// with the regular Storage tab via storage-shared.js, and renders a
// "File Versioning" table instead of "User Storage Distribution".
const { storageBodyRow } = require("./storage-shared");

// We currently use a single doc-style file icon for all rows;
// CSS modifier classes can later swap colour by extension.
function fileIco() {
  return "apps-file-doc";
}

function adminHeader(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__storage-header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__storage-heading`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__storage-title`,
            content: LOCALE.STORAGE_CONSOLE || "Storage Console",
          }),
          Skeletons.Note({
            className: `${pfx}__storage-subtitle`,
            content:
              LOCALE.STORAGE_CONSOLE_DESC ||
              "Manage workspace capacity, monitor user consumption, and optimize data distribution across your secure network.",
          }),
        ],
      }),
    ],
  });
}

function checkbox(ui, { checked, service, file_id }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fv-checkbox${checked ? ` ${pfx}__fv-checkbox--checked` : ""}`,
    service,
    uiHandler: [ui],
    file_id,
    kids: checked
      ? [
          Skeletons.Image.Svg({
            ico: "editbox_checkmark",
            className: `${pfx}__fv-checkbox-mark`,
          }),
        ]
      : [],
  });
}

function tableHeader(ui) {
  const pfx = ui.fig.family;
  const rows = ui._fileVersions || [];
  const allChecked =
    ui._fvSelected && ui._fvSelected.size === rows.length && rows.length > 0;
  const cols = [
    { className: `${pfx}__fv-col--check`, kids: [
      checkbox(ui, { checked: allChecked, service: "apps-fv-toggle-all" }),
    ] },
    { className: `${pfx}__fv-col--file`,      label: LOCALE.FILE || "File" },
    { className: `${pfx}__fv-col--folder`,    label: LOCALE.FOLDER || "Folder" },
    { className: `${pfx}__fv-col--workspace`, label: LOCALE.WORKSPACE || "Workspace" },
    { className: `${pfx}__fv-col--size`,      label: LOCALE.SIZE || "Size" },
    { className: `${pfx}__fv-col--versions`,  label: LOCALE.VERSIONS || "Versions" },
    { className: `${pfx}__fv-col--actions`,   label: LOCALE.ACTIONS || "Actions" },
  ];
  return Skeletons.Box.X({
    className: `${pfx}__fv-row ${pfx}__fv-row--header`,
    kids: cols.map((c) =>
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${c.className}`,
        kids: c.kids || [
          Skeletons.Note({
            className: `${pfx}__fv-col-label`,
            content: c.label,
          }),
        ],
      })
    ),
  });
}

function fileRow(ui, file) {
  const pfx = ui.fig.family;
  const checked = ui._fvSelected && ui._fvSelected.has(file.id);
  return Skeletons.Box.X({
    className: `${pfx}__fv-row${checked ? ` ${pfx}__fv-row--checked` : ""}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${pfx}__fv-col--check`,
        kids: [
          checkbox(ui, {
            checked,
            service: "apps-fv-toggle-row",
            file_id: file.id,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${pfx}__fv-col--file ${pfx}__fv-cell--clickable`,
        service: "apps-fv-open-detail",
        uiHandler: [ui],
        file_id: file.id,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__fv-fileico ${pfx}__fv-fileico--${file.ext || "file"}`,
            kids: [
              Skeletons.Image.Svg({
                ico: fileIco(file.ext),
                className: `${pfx}__fv-fileico-svg`,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__fv-filename`,
            content: file.name,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${pfx}__fv-col--folder`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__fv-pill`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__fv-pill-label`,
                content: file.folder,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${pfx}__fv-col--workspace`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__fv-pill`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__fv-pill-label`,
                content: file.workspace,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${pfx}__fv-col--size`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fv-size`,
            content: file.size,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${pfx}__fv-col--versions`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fv-versions`,
            content: String(file.versions),
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-cell ${pfx}__fv-col--actions`,
        kids: [
          Skeletons.Button.Svg({
            ico: "apps-dots-vertical",
            className: `${pfx}__fv-action ${pfx}__fv-action--more`,
            service: "apps-fv-row-menu",
            uiHandler: [ui],
            file_id: file.id,
          }),
          Skeletons.Button.Svg({
            ico: "trash",
            className: `${pfx}__fv-action ${pfx}__fv-action--delete`,
            service: "apps-fv-delete-row",
            uiHandler: [ui],
            file_id: file.id,
          }),
        ],
      }),
    ],
  });
}

function workspaceFilter(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__storage-sort-trigger`,
    service: "apps-fv-filter-workspace",
    uiHandler: [ui],
    kids: [
      Skeletons.Note({
        className: `${pfx}__storage-sort-value`,
        content: LOCALE.ALL_WORKSPACE || "All workspace",
      }),
      Skeletons.Button.Svg({
        ico: "editbox_arrow--down",
        className: `${pfx}__storage-sort-chevron`,
      }),
    ],
  });
}

function searchBox(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fv-search`,
    kids: [
      Skeletons.Image.Svg({
        ico: "magnifying-glass",
        className: `${pfx}__fv-search-ico`,
      }),
      Skeletons.Entry({
        className: `${pfx}__fv-search-input`,
        placeholder: LOCALE.SEARCH_FILE || "Search file",
        name: "fv_search",
        mode: _a.commit,
        uiHandler: [ui],
      }),
    ],
  });
}

function tableFilter(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fv-table-actions`,
    kids: [workspaceFilter(ui), searchBox(ui)],
  });
}

// Same as tableFilter, but with the soft-red "Delete all old versions" button
// appended (used in the View-all variant).
function tableFilterAll(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fv-table-actions`,
    kids: [
      workspaceFilter(ui),
      searchBox(ui),
      Skeletons.Box.X({
        className: `${pfx}__fv-delete-all-btn`,
        service: "apps-fv-delete-all",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__fv-delete-all-label`,
            content:
              LOCALE.DELETE_ALL_OLD_VERSIONS || "Delete all old versions",
          }),
        ],
      }),
    ],
  });
}

function fvHeader(ui, { extras }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fv-table-header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__fv-heading`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fv-heading-title`,
            content: LOCALE.FILE_VERSIONING || "File Versioning",
          }),
          Skeletons.Note({
            className: `${pfx}__fv-heading-sub`,
            content:
              LOCALE.FILE_VERSIONING_SUB ||
              "Click any document to view its version history.",
          }),
        ],
      }),
      extras,
    ],
  });
}

function buildFvPageList(current, total) {
  if (total <= 7) {
    const out = [];
    for (let i = 1; i <= total; i++) out.push(i);
    return out;
  }
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  const list = [1];
  if (start > 2) list.push("…");
  for (let i = start; i <= end; i++) list.push(i);
  if (end < total - 1) list.push("…");
  list.push(total);
  return list;
}

function fvFooterPagination(ui) {
  const pfx = ui.fig.family;
  const pageSize = 13;
  const total = ui._fileVersionsTotal || (ui._fileVersions || []).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(ui._fvAllPage || 1, totalPages);
  const pages = buildFvPageList(current, totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(total, current * pageSize);
  const summary = total === 0
    ? LOCALE.NO_FILES_FOUND || "No files"
    : (LOCALE.SHOWING_FILES_OF || "Showing {start}-{end} of {total} files")
        .replace("{start}", start)
        .replace("{end}", end)
        .replace("{total}", total.toLocaleString());
  const pageBtn = (n) =>
    Skeletons.Box.X({
      className: `${pfx}__fv-page-btn${current === n ? ` ${pfx}__fv-page-btn--active` : ""}`,
      service: "apps-fv-page",
      uiHandler: [ui],
      page_num: n,
      kids: [
        Skeletons.Note({
          className: `${pfx}__fv-page-num`,
          content: String(n),
        }),
      ],
    });
  return Skeletons.Box.X({
    className: `${pfx}__fv-pagination`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__fv-pagination-label`,
        content: summary,
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-pager`,
        kids: [
          Skeletons.Button.Svg({
            ico: "mini-arrow-left-new",
            className: `${pfx}__fv-page-arrow`,
            service: current > 1 ? "apps-fv-page" : null,
            uiHandler: [ui],
            page_num: Math.max(1, current - 1),
          }),
          ...pages.map((p) =>
            p === "…"
              ? Skeletons.Note({
                  className: `${pfx}__fv-page-ellipsis`,
                  content: "…",
                })
              : pageBtn(p)
          ),
          Skeletons.Button.Svg({
            ico: "mini-arrow-right-new",
            className: `${pfx}__fv-page-arrow`,
            service: current < totalPages ? "apps-fv-page" : null,
            uiHandler: [ui],
            page_num: Math.min(totalPages, current + 1),
          }),
        ],
      }),
    ],
  });
}

function fileVersioningTable(ui) {
  const pfx = ui.fig.family;
  const rows = ui._fileVersions || [];
  let tableBody;
  if (ui._adminStorageState === "loading") {
    tableBody = [
      tableHeader(ui),
      Skeletons.Box.X({
        className: `${pfx}__fv-empty`,
        kids: [Skeletons.Note({ className: `${pfx}__fv-empty-label`, content: LOCALE.LOADING || "Loading…" })],
      }),
    ];
  } else if (ui._adminStorageState === "error") {
    tableBody = [
      tableHeader(ui),
      Skeletons.Box.X({
        className: `${pfx}__fv-empty`,
        kids: [Skeletons.Note({ className: `${pfx}__fv-empty-label`, content: LOCALE.FILES_LOAD_FAILED || "Could not load files." })],
      }),
    ];
  } else if (!rows.length) {
    tableBody = [
      tableHeader(ui),
      Skeletons.Box.X({
        className: `${pfx}__fv-empty`,
        kids: [Skeletons.Note({ className: `${pfx}__fv-empty-label`, content: LOCALE.NO_FILES_FOUND || "No files found." })],
      }),
    ];
  } else {
    tableBody = [tableHeader(ui), ...rows.map((f) => fileRow(ui, f))];
  }
  return Skeletons.Box.Y({
    className: `${pfx}__fv-card`,
    kids: [
      fvHeader(ui, { extras: tableFilter(ui) }),
      Skeletons.Box.Y({
        className: `${pfx}__fv-table`,
        kids: tableBody,
      }),
      Skeletons.Box.X({
        className: `${pfx}__fv-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fv-view-all`,
            content: LOCALE.VIEW_ALL_ARROW || "View all →",
            service: "apps-fv-view-all",
            uiHandler: [ui],
          }),
          ui._fvSelected && ui._fvSelected.size
            ? Skeletons.Box.X({
                className: `${pfx}__fv-delete-selected`,
                service: "apps-fv-delete-selected",
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__fv-delete-selected-label`,
                    content: LOCALE.DELETE_SELECTED || "Delete selected",
                  }),
                ],
              })
            : Skeletons.Box.X({
                className: `${pfx}__fv-delete-selected ${pfx}__fv-delete-selected--off`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__fv-delete-selected-label`,
                    content: LOCALE.DELETE_SELECTED || "Delete selected",
                  }),
                ],
              }),
        ],
      }),
    ],
  });
}

// Full-page File Versioning view shown when the user clicks "View all".
// Same table chrome as the compact view, but with: a back link at top,
// a "Delete all old versions" button in the header, and a paginated
// footer (Showing 1-13 of 1,284 files / 1 2 3 ... 321).
function fileVersioningAll(ui) {
  const pfx = ui.fig.family;
  const rows = ui._fileVersions || [];
  let body;
  if (ui._adminStorageState === "loading") {
    body = [
      tableHeader(ui),
      Skeletons.Box.X({
        className: `${pfx}__fv-empty`,
        kids: [Skeletons.Note({ className: `${pfx}__fv-empty-label`, content: LOCALE.LOADING || "Loading…" })],
      }),
    ];
  } else if (ui._adminStorageState === "error") {
    body = [
      tableHeader(ui),
      Skeletons.Box.X({
        className: `${pfx}__fv-empty`,
        kids: [Skeletons.Note({ className: `${pfx}__fv-empty-label`, content: LOCALE.FILES_LOAD_FAILED || "Could not load files." })],
      }),
    ];
  } else if (!rows.length) {
    body = [
      tableHeader(ui),
      Skeletons.Box.X({
        className: `${pfx}__fv-empty`,
        kids: [Skeletons.Note({ className: `${pfx}__fv-empty-label`, content: LOCALE.NO_FILES_FOUND || "No files found." })],
      }),
    ];
  } else {
    body = [tableHeader(ui), ...rows.map((f) => fileRow(ui, f))];
  }
  return Skeletons.Box.Y({
    className: `${pfx}__fv-card ${pfx}__fv-card--all`,
    kids: [
      fvHeader(ui, { extras: tableFilterAll(ui) }),
      Skeletons.Box.Y({
        className: `${pfx}__fv-table`,
        kids: body,
      }),
      fvFooterPagination(ui),
    ],
  });
}

function backLink(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fv-back`,
    service: "apps-fv-back",
    uiHandler: [ui],
    kids: [
      Skeletons.Image.Svg({
        ico: "apps-back",
        className: `${pfx}__fv-back-ico`,
      }),
      Skeletons.Note({
        className: `${pfx}__fv-back-label`,
        content: LOCALE.BACK || "Back",
      }),
    ],
  });
}

export default function admin_storage_view(ui) {
  if (ui._adminStorageView === "detail") {
    return require("./file-detail").default(ui);
  }
  if (ui._adminStorageView === "all") {
    return [backLink(ui), fileVersioningAll(ui)];
  }
  return [adminHeader(ui), storageBodyRow(ui), fileVersioningTable(ui)];
}
