const storageUsers = require("./storage-data").default;
const { storageBodyRow } = require("./storage-shared");

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
