const folders = require("./permission-detail-data").default;

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
            ico: "editbox_search",
            className: `${pfx}__wsdetail-search-ico`,
          }),
          Skeletons.Entry({
            className: `${pfx}__wsdetail-search-input`,
            placeholder: LOCALE.SEARCH_WORKSPACE || "Search workspace",
            name: "ws_search",
            mode: _a.commit,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

function workspaceHeading(ui, ws) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__wsdetail-heading`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-heading-left`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-folder-card",
            className: `${pfx}__wsdetail-folder ${pfx}__perm-folder--${ws.color}`,
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
  return Skeletons.Box.X({
    className: `${pfx}__wsdetail-row`,
    service: "apps-perm-open-folder",
    uiHandler: [ui],
    folder_id: folder.id,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-row-body`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-folder-card",
            className: `${pfx}__wsdetail-row-folder ${pfx}__perm-folder--${ws.color}`,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__wsdetail-row-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__wsdetail-row-title`,
                content: folder.name,
              }),
              Skeletons.Note({
                className: `${pfx}__wsdetail-row-meta`,
                content: `${folder.updated} • ${folder.size}`,
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
        folder_id: folder.id,
      }),
    ],
  });
}

function pagination(ui) {
  const pfx = ui.fig.family;
  const pages = [1, 2, 3];
  const current = ui._wsDetailPage || 1;
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
  return Skeletons.Box.X({
    className: `${pfx}__wsdetail-footer`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__wsdetail-footer-label`,
        content:
          LOCALE.SHOWING_FOLDERS ||
          "Showing 1-14 of 251 folders",
      }),
      Skeletons.Box.X({
        className: `${pfx}__wsdetail-pager`,
        kids: [
          Skeletons.Button.Svg({
            ico: "mini-arrow-left-new",
            className: `${pfx}__wsdetail-page-arrow`,
            service: "apps-perm-page",
            uiHandler: [ui],
            page_num: Math.max(1, current - 1),
          }),
          ...pages.map(pageBtn),
          Skeletons.Note({
            className: `${pfx}__wsdetail-page-ellipsis`,
            content: "…",
          }),
          pageBtn(22),
          Skeletons.Button.Svg({
            ico: "mini-arrow-right-new",
            className: `${pfx}__wsdetail-page-arrow`,
            service: "apps-perm-page",
            uiHandler: [ui],
            page_num: current + 1,
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
  return [
    topBar(ui),
    Skeletons.Box.Y({
      className: `${pfx}__wsdetail-window`,
      kids: [
        workspaceHeading(ui, ws),
        Skeletons.Box.X({
          className: `${pfx}__wsdetail-grid`,
          kids: folders.map((f) => folderItem(ui, ws, f)),
        }),
        pagination(ui),
      ],
    }),
  ];
}
