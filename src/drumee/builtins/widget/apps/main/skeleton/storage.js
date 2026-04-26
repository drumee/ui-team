const storageUsers = require("./storage-data").default;

function storageHeader(ui) {
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
      Skeletons.Box.X({
        className: `${pfx}__retention-card`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__retention-info`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__retention-iconwrap`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "apps-clock",
                    className: `${pfx}__retention-ico`,
                  }),
                ],
              }),
              Skeletons.Box.Y({
                className: `${pfx}__retention-text`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__retention-label`,
                    content: LOCALE.RETENTION || "RETENTION",
                  }),
                  Skeletons.Note({
                    className: `${pfx}__retention-value`,
                    content: LOCALE.RETENTION_30_DAYS || "30 Days",
                  }),
                ],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__retention-btn`,
            service: "apps-storage-retention",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-gear",
                className: `${pfx}__retention-btn-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__retention-btn-label`,
                content: LOCALE.RETENTION_POLICY || "Retention Policy",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function capacityCard(ui) {
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
              {
                key: "documents",
                title: LOCALE.DOCUMENTS || "Documents",
                value: "1.8 TB (18%)",
              },
              {
                key: "media",
                title: LOCALE.MEDIA_ASSETS || "Media Assets",
                value: "2.1 TB (21%)",
              },
              {
                key: "available",
                title: LOCALE.AVAILABLE || "Available",
                value: "5.8 TB (58%)",
              },
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

function alertCard(ui) {
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

function optimizationCard(ui) {
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

function storageBodyRow(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__storage-body-row`,
    kids: [capacityCard(ui), Skeletons.Box.Y({
      className: `${pfx}__storage-side-col`,
      kids: [alertCard(ui), optimizationCard(ui)],
    })],
  });
}

function storageAvatar(pfx, user) {
  if (user.avatar_color === "cyan") {
    return Skeletons.Box.X({
      className: `${pfx}__storage-avatar ${pfx}__storage-avatar--cyan`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__storage-avatar-initials ${pfx}__storage-avatar-initials--cyan`,
          content: user.initials,
        }),
      ],
    });
  }
  return Skeletons.Box.X({
    className: `${pfx}__storage-avatar`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__storage-avatar-initials ${pfx}__storage-avatar-initials--light`,
        content: user.initials,
      }),
    ],
  });
}

function storageRow(ui, u) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__storage-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__storage-cell ${pfx}__storage-col--user`,
        kids: [
          storageAvatar(pfx, u),
          Skeletons.Box.Y({
            className: `${pfx}__storage-user-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__storage-user-name`,
                content: u.name,
              }),
              Skeletons.Note({
                className: `${pfx}__storage-user-email`,
                content: u.email,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__storage-cell ${pfx}__storage-col--role`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__storage-pill ${pfx}__storage-pill--${u.role.variant}`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__storage-pill-label`,
                content: u.role.label,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__storage-cell ${pfx}__storage-col--usage`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__usage-bar`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__usage-bar-fill ${pfx}__usage-bar-fill--${u.bar_color}`,
                style: { width: `${u.percent}%` },
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__usage-percent`,
            content: `${u.percent}%`,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__storage-cell ${pfx}__storage-col--storage`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__storage-amount`,
            content: u.storage,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__storage-cell ${pfx}__storage-col--action`,
        kids: [
          Skeletons.Button.Svg({
            ico: "editbox_cog",
            className: `${pfx}__storage-row-action`,
            service: "apps-storage-row-settings",
            uiHandler: [ui],
            user_id: u.id,
          }),
        ],
      }),
    ],
  });
}

function storageTableHeader(pfx) {
  const cols = [
    { className: `${pfx}__storage-col--user`, label: LOCALE.USER || "User" },
    { className: `${pfx}__storage-col--role`, label: LOCALE.ROLE || "Role" },
    { className: `${pfx}__storage-col--usage`, label: LOCALE.USAGE_PERCENTAGE || "Usage Percentage" },
    { className: `${pfx}__storage-col--storage`, label: LOCALE.STORAGE_GB || "Storage (GB)" },
    { className: `${pfx}__storage-col--action`, label: LOCALE.ACTION || "Action" },
  ];
  return Skeletons.Box.X({
    className: `${pfx}__storage-thead`,
    kids: cols.map((c) =>
      Skeletons.Box.X({
        className: `${pfx}__storage-cell ${c.className}`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__storage-col-label`,
            content: c.label,
          }),
        ],
      })
    ),
  });
}

function storageTablePagination(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__storage-pagination`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__storage-pagination-label`,
        content:
          LOCALE.SHOWING_ENTRIES_SHORT || "Showing 1-25 of 1,492 entries",
      }),
      Skeletons.Box.X({
        className: `${pfx}__storage-pager`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__storage-pager-btn`,
            service: "apps-storage-prev",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "mini-arrow-left-new",
                className: `${pfx}__storage-pager-ico`,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__storage-pager-btn`,
            service: "apps-storage-next",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "mini-arrow-right-new",
                className: `${pfx}__storage-pager-ico`,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function userTable(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__storage-table-wrap`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__storage-table-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__storage-table-title`,
            content:
              LOCALE.USER_STORAGE_DISTRIBUTION ||
              "User Storage Distribution",
          }),
          Skeletons.Box.X({
            className: `${pfx}__storage-sort`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__storage-sort-label`,
                content: LOCALE.SORT_BY || "Sort by:",
              }),
              Skeletons.Box.X({
                className: `${pfx}__storage-sort-trigger`,
                service: "apps-storage-sort",
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__storage-sort-value`,
                    content:
                      LOCALE.USAGE_HIGH_TO_LOW || "Usage High to Low",
                  }),
                  Skeletons.Button.Svg({
                    ico: "editbox_arrow--down",
                    className: `${pfx}__storage-sort-chevron`,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      storageTableHeader(pfx),
      Skeletons.Box.Y({
        className: `${pfx}__storage-tbody`,
        kids: storageUsers.map((u) => storageRow(ui, u)),
      }),
      storageTablePagination(ui),
    ],
  });
}

export default function storage_view(ui) {
  return [storageHeader(ui), storageBodyRow(ui), userTable(ui)];
}
