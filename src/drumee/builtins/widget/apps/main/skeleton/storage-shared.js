// Shared building blocks for the Storage console UIs (regular Storage tab
// and Admin Storage tab). Both views render the same Total-Capacity card,
// Low-Storage Alert card, and Optimization card; only the bottom table
// differs (User Storage Distribution vs File Versioning).

export function capacityCard(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__capacity-card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__capacity-top`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__capacity-stat`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__capacity-label`,
                content: LOCALE.TOTAL_HUB_CAPACITY || "TOTAL HUB CAPACITY",
              }),
              Skeletons.Box.X({
                className: `${pfx}__capacity-amount`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__capacity-amount-num`,
                    content: "4.2",
                  }),
                  Skeletons.Note({
                    className: `${pfx}__capacity-amount-unit`,
                    content: LOCALE.STORAGE_OF_QUOTA || "TB / 10 TB",
                  }),
                ],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__upgrade-plan-btn`,
            service: "apps-storage-upgrade",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__upgrade-plan-label`,
                content: LOCALE.UPGRADE_PLAN || "UPGRADE PLAN",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__capacity-trend`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__capacity-trend-row`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__capacity-trend-label`,
                content: LOCALE.CONSUMPTION_TREND || "CONSUMPTION TREND",
              }),
              Skeletons.Note({
                className: `${pfx}__capacity-trend-value`,
                content: LOCALE.UTILIZED_42 || "42% UTILIZED",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__capacity-bar`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__capacity-bar-fill`,
                kids: [
                  Skeletons.Box.X({ className: `${pfx}__capacity-bar-seg ${pfx}__capacity-bar-seg--documents` }),
                  Skeletons.Box.X({ className: `${pfx}__capacity-bar-seg ${pfx}__capacity-bar-seg--media` }),
                  Skeletons.Box.X({ className: `${pfx}__capacity-bar-seg ${pfx}__capacity-bar-seg--available` }),
                ],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__capacity-legend`,
            kids: [
              { key: "documents", title: LOCALE.DOCUMENTS || "Documents",      value: "1.8 TB (18%)" },
              { key: "media",     title: LOCALE.MEDIA_ASSETS || "Media Assets", value: "2.1 TB (21%)" },
              { key: "available", title: LOCALE.AVAILABLE || "Available",       value: "5.8 TB (58%)" },
            ].map((item) =>
              Skeletons.Box.X({
                className: `${pfx}__capacity-legend-item`,
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}__capacity-legend-dot ${pfx}__capacity-legend-dot--${item.key}`,
                  }),
                  Skeletons.Box.Y({
                    className: `${pfx}__capacity-legend-text`,
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}__capacity-legend-title`,
                        content: item.title,
                      }),
                      Skeletons.Note({
                        className: `${pfx}__capacity-legend-value`,
                        content: item.value,
                      }),
                    ],
                  }),
                ],
              })
            ),
          }),
        ],
      }),
    ],
  });
}

export function alertCard(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__alert-card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__alert-iconwrap`,
        kids: [Skeletons.Image.Svg({ ico: "apps-warning", className: `${pfx}__alert-ico` })],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__alert-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__alert-title`,
            content: LOCALE.LOW_STORAGE_ALERT || "Low Storage Alert",
          }),
          Skeletons.Note({
            className: `${pfx}__alert-body`,
            content:
              LOCALE.LOW_STORAGE_BODY ||
              "Marketing Workspace is at 94% capacity.",
          }),
          Skeletons.Note({
            className: `${pfx}__alert-action`,
            content: LOCALE.ACTION_REQUIRED || "Action required.",
          }),
        ],
      }),
    ],
  });
}

export function optimizationCard(ui) {
  const pfx = ui.fig.family;
  const items = [
    {
      icon: "desktop_memory",
      label: LOCALE.CLEAR_CACHE_FILES || "Clear Cache Files",
      value: "12 GB",
      service: "apps-storage-clear-cache",
    },
    {
      icon: "dock-folder",
      label: LOCALE.ARCHIVE_OLD_PROJECTS || "Archive Old Projects",
      value: LOCALE.BROWSE || "Browse",
      service: "apps-storage-archive",
    },
  ];
  return Skeletons.Box.Y({
    className: `${pfx}__optim-card`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__optim-title`,
        content: LOCALE.OPTIMIZATION || "OPTIMIZATION",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__optim-list`,
        kids: items.map((item) =>
          Skeletons.Box.X({
            className: `${pfx}__optim-item`,
            service: item.service,
            uiHandler: [ui],
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__optim-item-left`,
                kids: [
                  Skeletons.Button.Svg({
                    ico: item.icon,
                    className: `${pfx}__optim-item-ico`,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__optim-item-label`,
                    content: item.label,
                  }),
                ],
              }),
              Skeletons.Note({
                className: `${pfx}__optim-item-value`,
                content: item.value,
              }),
            ],
          })
        ),
      }),
    ],
  });
}

export function storageBodyRow(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__storage-body-row`,
    kids: [
      capacityCard(ui),
      Skeletons.Box.Y({
        className: `${pfx}__storage-side-col`,
        kids: [alertCard(ui), optimizationCard(ui)],
      }),
    ],
  });
}
