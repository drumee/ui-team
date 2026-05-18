const folderTemplate = require("../../../../media/grid/template/folder");
const { filesize } = require("@drumee/ui-essentials");

const TAG_DEFS = {
  "ip-geo": { icon: "apps-globe",          variant: "purple",  label: () => LOCALE.PERM_IP_GEO || "IP/GEO" },
  vpn:      { icon: "apps-lock-simple",    variant: "magenta", label: () => LOCALE.PERM_VPN_REQUIRED || "VPN Required" },
  "one-time": { icon: "apps-clock-countdown", variant: "green",   label: () => LOCALE.PERM_ONE_TIME || "One-time" },
  managed:  { icon: "apps-desktop",        variant: "neutral", label: () => LOCALE.PERM_MANAGED || "Managed" },
};

function tagChip(pfx, tagKey) {
  const def = TAG_DEFS[tagKey];
  if (!def) return null;
  return Skeletons.Box.X({
    className: `${pfx}__perm-tag ${pfx}__perm-tag--${def.variant}`,
    kids: [
      Skeletons.Image.Svg({ ico: def.icon, className: `${pfx}__perm-tag-ico` }),
      Skeletons.Note({ className: `${pfx}__perm-tag-label`, content: def.label() }),
    ],
  });
}

function topBar(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__wsdetail-topbar`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-back`,
        service: "apps-perm-back",
        uiHandler: [ui],
        kids: [
          Skeletons.Image.Svg({ ico: "apps-back", className: `${pfx}__wsdetail-back-ico` }),
          Skeletons.Note({
            className: `${pfx}__wsdetail-back-label`,
            content: LOCALE.BACK || "Back",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-search`,
        kids: [
          Skeletons.Image.Svg({
            ico: "magnifying-glass",
            className: `${pfx}__wsdetail-search-ico`,
          }),
          Skeletons.Entry({
            className: `${pfx}__wsdetail-search-input`,
            placeholder: LOCALE.SEARCH_WORKSPACE || "Search workspace",
            name: "ws_search",
            value: ui._wsFolderQuery || "",
            mode: _a.commit,
            service: "apps-ws-search",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

function workspaceHeading(ui, ws) {
  const pfx = ui.fig.family;
  const area = ws.area || "private";
  return Skeletons.Box.X({
    className: `${pfx}__wsdetail-heading`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-heading-left`,
        kids: [
          Skeletons.Element({
            tagName: "div",
            className: `${pfx}__wsdetail-folder ${area}`,
            content: folderTemplate({
              area,
              filetype: _a.hub,
              role: "desk",
              widgetId: `wsdetail-${ws.id}`,
              isAttachment: 1,
            }),
          }),
          Skeletons.Note({
            className: `${pfx}__wsdetail-title`,
            content: ws.name,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__perm-tags`,
        kids: (ws.tags || []).map((t) => tagChip(pfx, t)).filter(Boolean),
      }),
    ],
  });
}

function folderItem(ui, ws, folder) {
  const pfx = ui.fig.family;
  const area = folder.area || ws.area || "private";
  const id = folder.id || folder.nid;
  const name = folder.name || folder.filename;
  const ts = folder.updated || folder.mtime;
  const bytes = folder.filesize != null ? folder.filesize : folder.size;
  const updated = ts ? Dayjs.unix(ts).fromNow() : "";
  const size = bytes != null ? filesize(bytes) : "";
  const meta = [updated, size].filter(Boolean).join(" • ");
  return Skeletons.Box.X({
    className: `${pfx}__wsdetail-row`,
    service: "apps-perm-open-folder",
    uiHandler: [ui],
    folder_id: id,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-row-body`,
        kids: [
          Skeletons.Element({
            tagName: "div",
            className: `${pfx}__wsdetail-row-folder ${area}`,
            content: folderTemplate({
              area,
              filetype: _a.folder,
              role: "folder",
              widgetId: `folder-${id}`,
              isAttachment: 1,
            }),
          }),
          Skeletons.Box.Y({
            className: `${pfx}__wsdetail-row-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__wsdetail-row-title`,
                content: name,
              }),
              Skeletons.Note({
                className: `${pfx}__wsdetail-row-meta`,
                content: meta,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Svg({
        ico: "editbox_pencil",
        className: `${pfx}__wsdetail-row-edit`,
        service: "apps-perm-edit-folder",
        uiHandler: [ui],
        folder_id: id,
      }),
    ],
  });
}

function buildPageList(current, total) {
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

function pagination(ui) {
  const pfx = ui.fig.family;
  const pageSize = 14;
  const total = ui._wsFoldersTotal || (ui._wsFolders || []).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(ui._wsDetailPage || 1, totalPages);
  const pages = buildPageList(current, totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(total, current * pageSize);
  const pageBtn = (n) =>
    Skeletons.Box.X({
      className: `${pfx}__wsdetail-page-btn${current === n ? ` ${pfx}__wsdetail-page-btn--active` : ""}`,
      service: "apps-perm-page",
      uiHandler: [ui],
      page_num: n,
      kids: [
        Skeletons.Note({
          className: `${pfx}__wsdetail-page-num`,
          content: String(n),
        }),
      ],
    });
  const summary = total === 0
    ? LOCALE.NO_FOLDERS || "No folders"
    : (LOCALE.SHOWING_FOLDERS_OF || "Showing {start}-{end} of {total} folders")
        .replace("{start}", start)
        .replace("{end}", end)
        .replace("{total}", total.toLocaleString());
  return Skeletons.Box.X({
    className: `${pfx}__wsdetail-footer`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__wsdetail-footer-label`,
        content: summary,
      }),
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-pager`,
        kids: [
          Skeletons.Button.Svg({
            ico: "mini-arrow-left-new",
            className: `${pfx}__wsdetail-page-arrow`,
            service: current > 1 ? "apps-perm-page" : null,
            uiHandler: [ui],
            page_num: Math.max(1, current - 1),
          }),
          ...pages.map((p) =>
            p === "…"
              ? Skeletons.Note({
                  className: `${pfx}__wsdetail-page-ellipsis`,
                  content: "…",
                })
              : pageBtn(p)
          ),
          Skeletons.Button.Svg({
            ico: "mini-arrow-right-new",
            className: `${pfx}__wsdetail-page-arrow`,
            service: current < totalPages ? "apps-perm-page" : null,
            uiHandler: [ui],
            page_num: Math.min(totalPages, current + 1),
          }),
        ],
      }),
    ],
  });
}

export default function permission_detail_view(ui) {
  const pfx = ui.fig.family;
  const ws = ui._activeWorkspace;
  if (!ws) return null;
  const folders = ui._wsFolders || [];
  let body;
  if (ui._wsFoldersState === "loading") {
    body = Skeletons.Box.X({
      className: `${pfx}__wsdetail-empty`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__wsdetail-empty-label`,
          content: LOCALE.LOADING || "Loading…",
        }),
      ],
    });
  } else if (ui._wsFoldersState === "error") {
    body = Skeletons.Box.X({
      className: `${pfx}__wsdetail-empty`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__wsdetail-empty-label`,
          content:
            LOCALE.FOLDERS_LOAD_FAILED || "Could not load folders.",
        }),
      ],
    });
  } else if (!folders.length) {
    body = Skeletons.Box.X({
      className: `${pfx}__wsdetail-empty`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__wsdetail-empty-label`,
          content: LOCALE.NO_FOLDERS || "No folders found.",
        }),
      ],
    });
  } else {
    body = Skeletons.Box.X({
      className: `${pfx}__wsdetail-grid`,
      kids: folders.map((f) => folderItem(ui, ws, f)),
    });
  }
  return [
    topBar(ui),
    Skeletons.Box.Y({
      className: `${pfx}__wsdetail-window`,
      kids: [workspaceHeading(ui, ws), body, pagination(ui)],
    }),
  ];
}
