const workspaces = require("./permission-data").default;

const TAG_DEFS = {
  "ip-geo": {
    icon: "apps-globe",
    label: () => LOCALE.PERM_IP_GEO || "IP/GEO",
    variant: "purple",
  },
  vpn: {
    icon: "apps-lock-simple",
    label: () => LOCALE.PERM_VPN_REQUIRED || "VPN Required",
    variant: "magenta",
  },
  "one-time": {
    icon: "apps-clock-countdown",
    label: () => LOCALE.PERM_ONE_TIME || "One-time",
    variant: "green",
  },
  managed: {
    icon: "apps-desktop",
    label: () => LOCALE.PERM_MANAGED || "Managed",
    variant: "neutral",
  },
};

function tagChip(pfx, tagKey) {
  const def = TAG_DEFS[tagKey];
  if (!def) return null;
  return Skeletons.Box.X({
    className: `${pfx}__perm-tag ${pfx}__perm-tag--${def.variant}`,
    kids: [
      Skeletons.Image.Svg({
        ico: def.icon,
        className: `${pfx}__perm-tag-ico`,
      }),
      Skeletons.Note({
        className: `${pfx}__perm-tag-label`,
        content: def.label(),
      }),
    ],
  });
}

function workspaceCard(ui, ws) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__perm-card`,
    service: "apps-perm-open-workspace",
    uiHandler: [ui],
    workspace_id: ws.id,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__perm-card-body`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-folder-card",
            className: `${pfx}__perm-folder ${pfx}__perm-folder--${ws.color}`,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__perm-meta`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__perm-title-block`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__perm-title`,
                    content: ws.name,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__perm-subtitle`,
                    content: `${ws.updated} • ${ws.size}`,
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${pfx}__perm-tags`,
                kids: ws.tags.map((t) => tagChip(pfx, t)).filter(Boolean),
              }),
            ],
          }),
        ],
      }),
      Skeletons.Image.Svg({
        ico: "apps-arrow-down-right",
        className: `${pfx}__perm-open-ico`,
      }),
    ],
  });
}

export default function permission_view(ui) {
  const pfx = ui.fig.family;
  return [
    Skeletons.Box.X({
      className: `${pfx}__perm-header`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__perm-page-title`,
          content: LOCALE.WORKSPACE_OVERVIEW || "Workspace Overview",
        }),
      ],
    }),
    Skeletons.Box.X({
      className: `${pfx}__perm-grid`,
      kids: workspaces.map((ws) => workspaceCard(ui, ws)),
    }),
  ];
}
