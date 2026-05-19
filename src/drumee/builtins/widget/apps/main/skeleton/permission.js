const folderTemplate = require("../../../../media/grid/template/folder");

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
  const tags = Array.isArray(ws.tags) ? ws.tags : [];
  const subtitleParts = [];
  if (ws.updated) {
    subtitleParts.push(`${LOCALE.UPDATED || "Updated"} ${ws.updated}`);
  }
  if (ws.storage_size) subtitleParts.push(ws.storage_size);
  const memberCount = ws.member_count;
  const memberLabel =
    memberCount === 1
      ? LOCALE.MEMBER || "member"
      : LOCALE.MEMBERS_LOWER || "members";
  const area = ws.area || "private";
  return Skeletons.Box.X({
    className: `${pfx}__perm-card`,
    service: "apps-perm-open-workspace",
    uiHandler: [ui],
    workspace_id: ws.id || ws.hub_id,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__perm-card-body`,
        kids: [
          Skeletons.Element({
            tagName: "div",
            className: `${pfx}__perm-folder ${area}`,
            content: folderTemplate({
              area,
              filetype: _a.hub,
              role: "desk",
              widgetId: `perm-${ws.id || ws.hub_id}`,
              isAttachment: 1,
            }),
          }),
          Skeletons.Box.Y({
            className: `${pfx}__perm-meta`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}__perm-title-block`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__perm-title`,
                    content: ws.name || ws.hub_name || ws.hub_id,
                  }),
                  subtitleParts.length
                    ? Skeletons.Note({
                        className: `${pfx}__perm-subtitle`,
                        content: subtitleParts.join(" • "),
                      })
                    : null,
                  memberCount != null
                    ? Skeletons.Box.X({
                        className: `${pfx}__perm-members`,
                        kids: [
                          Skeletons.Image.Svg({
                            ico: "desktop_contact",
                            className: `${pfx}__perm-members-ico`,
                          }),
                          Skeletons.Note({
                            className: `${pfx}__perm-members-label`,
                            content: `${memberCount} ${memberLabel}`,
                          }),
                        ],
                      })
                    : null,
                ],
              }),
              tags.length
                ? Skeletons.Box.X({
                    className: `${pfx}__perm-tags`,
                    kids: tags.map((t) => tagChip(pfx, t)).filter(Boolean),
                  })
                : null,
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

function emptyState(ui, message) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__perm-empty`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__perm-empty-label`,
        content: message,
      }),
    ],
  });
}

export default function permission_view(ui) {
  const pfx = ui.fig.family;
  const workspaces = ui._permWorkspaces || [];
  let body;
  if (ui._permState === "loading") {
    body = emptyState(ui, LOCALE.LOADING || "Loading…");
  } else if (ui._permState === "error") {
    body = emptyState(
      ui,
      LOCALE.WORKSPACES_LOAD_FAILED || "Could not load workspaces."
    );
  } else if (!workspaces.length) {
    body = emptyState(ui, LOCALE.NO_WORKSPACES || "No workspaces found.");
  } else {
    body = Skeletons.Box.X({
      className: `${pfx}__perm-grid`,
      kids: workspaces.map((ws) => workspaceCard(ui, ws)),
    });
  }
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
    body,
  ];
}
