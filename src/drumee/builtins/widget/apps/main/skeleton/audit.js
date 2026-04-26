const auditLogs = require("./audit-data").default;

function auditHeader(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__audit-header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__audit-title`,
        content: LOCALE.AUDIT_LOGS || "Audit Logs",
      }),
      Skeletons.Box.X({
        className: `${pfx}__audit-actions`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__audit-search`,
            kids: [
              Skeletons.Button.Svg({
                ico: "editbox_search",
                className: `${pfx}__audit-search-ico`,
              }),
              Skeletons.Entry({
                className: `${pfx}__audit-search-input`,
                placeholder:
                  LOCALE.SEARCH_USERNAME || "Search username",
                name: "audit_search",
                mode: _a.commit,
                uiHandler: [ui],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__audit-range`,
            service: "apps-audit-range",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "calendar",
                className: `${pfx}__audit-range-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__audit-range-label`,
                content: LOCALE.LAST_30_DAYS || "Last 30 Days",
              }),
              Skeletons.Button.Svg({
                ico: "editbox_arrow--down",
                className: `${pfx}__audit-range-chevron`,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__audit-export`,
            service: "apps-audit-export",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "download",
                className: `${pfx}__audit-export-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__audit-export-label`,
                content: LOCALE.EXPORT_CSV || "Export CSV",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function auditTableHeader(pfx) {
  const headerCell = (className, content) =>
    Skeletons.Box.X({
      className,
      kids: [
        Skeletons.Note({
          className: `${pfx}__audit-col-label`,
          content,
        }),
      ],
    });
  return Skeletons.Box.X({
    className: `${pfx}__audit-thead`,
    kids: [
      headerCell(
        `${pfx}__audit-col ${pfx}__audit-col--user`,
        LOCALE.USER || "User"
      ),
      headerCell(
        `${pfx}__audit-col ${pfx}__audit-col--action`,
        LOCALE.ACTION || "Action"
      ),
      headerCell(
        `${pfx}__audit-col ${pfx}__audit-col--resource`,
        LOCALE.TARGET_RESOURCE || "Target Resource"
      ),
      headerCell(
        `${pfx}__audit-col ${pfx}__audit-col--timestamp`,
        LOCALE.TIMESTAMP || "Timestamp"
      ),
    ],
  });
}

function auditAvatar(pfx, user) {
  if (user.avatar_color === "neutral") {
    return Skeletons.Box.X({
      className: `${pfx}__audit-avatar ${pfx}__audit-avatar--neutral`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__audit-avatar-initials`,
          content: user.initials,
        }),
      ],
    });
  }
  return Skeletons.Box.X({
    className: `${pfx}__audit-avatar`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__audit-avatar-initials ${pfx}__audit-avatar-initials--light`,
        content: user.initials,
      }),
    ],
  });
}

function auditEntry(ui, log) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__audit-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__audit-cell ${pfx}__audit-col--user`,
        kids: [
          auditAvatar(pfx, log.user),
          Skeletons.Box.Y({
            className: `${pfx}__audit-user-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__audit-user-name`,
                content: log.user.name,
              }),
              Skeletons.Note({
                className: `${pfx}__audit-user-email`,
                content: log.user.email,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__audit-cell ${pfx}__audit-col--action`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__audit-action ${pfx}__audit-action--${log.action.variant}`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__audit-action-label`,
                content: log.action.label,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__audit-cell ${pfx}__audit-col--resource`,
        kids: [
          Skeletons.Button.Svg({
            ico: log.resource.icon,
            className: `${pfx}__audit-resource-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__audit-resource-label`,
            content: log.resource.label,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__audit-cell ${pfx}__audit-col--timestamp`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__audit-timestamp`,
            content: log.timestamp,
          }),
        ],
      }),
    ],
  });
}

function auditPagination(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__audit-pagination`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__audit-pagination-label`,
        content:
          LOCALE.SHOWING_ENTRIES || "Showing 1-25 of 1,492 entries",
      }),
      Skeletons.Box.X({
        className: `${pfx}__audit-pager`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__audit-pager-btn`,
            service: "apps-audit-prev",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "mini-arrow-left-new",
                className: `${pfx}__audit-pager-ico`,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__audit-pager-btn`,
            service: "apps-audit-next",
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "mini-arrow-right-new",
                className: `${pfx}__audit-pager-ico`,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function insightCard(pfx, opt) {
  const { variant, badge_label, label, value, footer, progress, icon } = opt;
  return Skeletons.Box.Y({
    className: `${pfx}__insight ${pfx}__insight--${variant}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__insight-top`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__insight-iconwrap`,
            kids: [
              Skeletons.Button.Svg({
                ico: icon,
                className: `${pfx}__insight-ico`,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__insight-badge`,
            content: badge_label,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__insight-content`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__insight-label`,
            content: label,
          }),
          Skeletons.Note({
            className: `${pfx}__insight-value`,
            content: value,
          }),
        ],
      }),
      progress != null
        ? Skeletons.Box.X({
            className: `${pfx}__insight-bar`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__insight-bar-fill`,
                style: { width: `${progress}%` },
              }),
            ],
          })
        : Skeletons.Note({
            className: `${pfx}__insight-footer`,
            content: footer,
          }),
    ],
  });
}

function insights(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__insights`,
    kids: [
      insightCard(pfx, {
        variant: "security",
        icon: "shield",
        badge_label:
          LOCALE.AUDIT_SECURITY_BADGE || "+12% vs last week",
        label: LOCALE.SECURITY_SCORE || "Security Score",
        value: "94.2",
        progress: 87,
      }),
      insightCard(pfx, {
        variant: "risk",
        icon: "editbox_triangle",
        badge_label: LOCALE.AUDIT_RISK_BADGE || "3 unresolved",
        label: LOCALE.HIGH_RISK_ACTIONS || "High-Risk Actions",
        value: "14",
        footer:
          LOCALE.AUDIT_RISK_DESC ||
          "Mainly involving external folder sharing.",
      }),
      insightCard(pfx, {
        variant: "storage",
        icon: "storage",
        badge_label: LOCALE.AUDIT_STORAGE_BADGE || "Optimized",
        label: LOCALE.STORAGE_ACTIVITY || "Storage Activity",
        value: "2.4 TB",
        footer:
          LOCALE.AUDIT_STORAGE_DESC ||
          "Total data logged in last 30 days.",
      }),
    ],
  });
}

function upsellOverlay(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__upsell`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__upsell-card`,
        kids: [
          Skeletons.Image.Svg({ ico: "cloud-pause", className: `${pfx}__upsell-icon` }),
          Skeletons.Box.Y({
            className: `${pfx}__upsell-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__upsell-title`,
                content:
                  LOCALE.UNLOCK_ACTIVITY_INSIGHTS ||
                  "Unlock Activity Insights",
              }),
              Skeletons.Note({
                className: `${pfx}__upsell-desc`,
                content:
                  LOCALE.UNLOCK_ACTIVITY_DESC ||
                  "Detailed tracking, login forensics, and system-wide event streams are only available on the Enterprise Premium tier. Gain full transparency into your workspace history.",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__upsell-btn`,
            service: "apps-audit-upgrade",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__upsell-btn-label`,
                content: LOCALE.UPGRADE_YOUR_PLAN || "Upgrade your plan",
              }),
              Skeletons.Note({
                className: `${pfx}__upsell-btn-arrow`,
                content: "→",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export default function audit_view(ui) {
  const pfx = ui.fig.family;
  const locked = !ui._auditUnlocked;
  return [
    auditHeader(ui),
    Skeletons.Box.Y({
      className: `${pfx}__audit-locked-wrap${locked ? ` ${pfx}__audit-locked-wrap--locked` : ""}`,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__audit-window`,
          kids: [
            auditTableHeader(pfx),
            Skeletons.Box.Y({
              className: `${pfx}__audit-list`,
              kids: auditLogs.map((log) => auditEntry(ui, log)),
            }),
            auditPagination(ui),
          ],
        }),
        insights(ui),
        locked ? upsellOverlay(ui) : null,
      ].filter(Boolean),
    }),
  ];
}
