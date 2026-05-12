function initialsFromName(name, email) {
  const s = (name || email || "").trim();
  if (!s) return "?";
  const parts = s.split(/[\s@]+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ACTION_VARIANTS = {
  grant: "grant",
  share: "share",
  revoke: "revoke",
  policy: "policy",
  create: "neutral",
  delete: "revoke",
  update: "neutral",
};

function mapAuditRow(row) {
  const name =
    row.actor_name ||
    [row.firstname, row.lastname].filter(Boolean).join(" ").trim() ||
    row.email ||
    "—";
  const action = (row.action || row.category || "").toString();
  const variant = ACTION_VARIANTS[action.toLowerCase()] || "neutral";
  const ts = row.ctime
    ? Dayjs(row.ctime * 1000).format("MMM D, YYYY • HH:mm:ss")
    : "—";
  return {
    id: `${row.hub_id || ""}-${row.entity_id || ""}-${row.ctime || ""}`,
    uid: row.uid || null,
    hub_id: row.hub_id || null,
    entity_id: row.entity_id || null,
    category: row.category || null,
    user: {
      name,
      email: row.email || "",
      initials: initialsFromName(name, row.email),
      avatar_color: row.uid ? "dark" : "neutral",
    },
    action: { label: action || "—", variant },
    resource: {
      icon: "dock-folder",
      label: row.log || row.entity_id || "—",
    },
    timestamp: ts,
  };
}

const RANGE_OPTIONS = [
  { key: "7d", localeKey: "LAST_7_DAYS", fallback: "Last 7 Days" },
  { key: "30d", localeKey: "LAST_30_DAYS", fallback: "Last 30 Days" },
  { key: "90d", localeKey: "LAST_90_DAYS", fallback: "Last 90 Days" },
  { key: "all", localeKey: "ALL_TIME", fallback: "All time" },
];

function rangeLabel(key) {
  const opt = RANGE_OPTIONS.find((o) => o.key === key) || RANGE_OPTIONS[1];
  return LOCALE[opt.localeKey] || opt.fallback;
}

function rangeMenu(ui) {
  const pfx = ui.fig.family;
  const current = ui._auditRangeKey || "30d";
  return Skeletons.Box.Y({
    className: `${pfx}__audit-range-menu`,
    kids: RANGE_OPTIONS.map((opt) =>
      Skeletons.Box.X({
        className: `${pfx}__audit-range-item${current === opt.key ? ` ${pfx}__audit-range-item--selected` : ""}`,
        service: "apps-audit-select-range",
        uiHandler: [ui],
        range_key: opt.key,
        kids: [
          Skeletons.Note({
            className: `${pfx}__audit-range-item-label`,
            content: LOCALE[opt.localeKey] || opt.fallback,
          }),
          Skeletons.Box.X({
            className: `${pfx}__audit-range-item-radio${current === opt.key ? ` ${pfx}__audit-range-item-radio--selected` : ""}`,
            kids:
              current === opt.key
                ? [
                    Skeletons.Box.X({
                      className: `${pfx}__audit-range-item-radio-dot`,
                    }),
                  ]
                : [],
          }),
        ],
      }),
    ),
  });
}

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
                ico: "magnifying-glass",
                className: `${pfx}__audit-search-ico`,
              }),
              Skeletons.Entry({
                className: `${pfx}__audit-search-input`,
                placeholder: LOCALE.SEARCH_USERNAME || "Search username",
                name: "audit_search",
                value: ui._auditUsername || "",
                mode: _a.commit,
                service: "apps-audit-search",
                uiHandler: [ui],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__audit-range-wrap`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__audit-range${ui._auditRangeOpen ? ` ${pfx}__audit-range--open` : ""}`,
                service: "apps-audit-range",
                uiHandler: [ui],
                kids: [
                  Skeletons.Button.Svg({
                    ico: "calendar",
                    className: `${pfx}__audit-range-ico`,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__audit-range-label`,
                    content: rangeLabel(ui._auditRangeKey || "30d"),
                  }),
                  Skeletons.Button.Svg({
                    ico: "editbox_arrow--down",
                    className: `${pfx}__audit-range-chevron`,
                  }),
                ],
              }),
              ui._auditRangeOpen ? rangeMenu(ui) : null,
            ].filter(Boolean),
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
        LOCALE.USER || "User",
      ),
      headerCell(
        `${pfx}__audit-col ${pfx}__audit-col--action`,
        LOCALE.ACTION || "Action",
      ),
      headerCell(
        `${pfx}__audit-col ${pfx}__audit-col--resource`,
        LOCALE.TARGET_RESOURCE || "Target Resource",
      ),
      headerCell(
        `${pfx}__audit-col ${pfx}__audit-col--timestamp`,
        LOCALE.TIMESTAMP || "Timestamp",
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
  const page = ui._auditPage || 1;
  const rows = (ui._auditLogs || []).length;
  const total = ui._auditLogsTotal || 0;
  const pageSize = ui._auditPageSize || 20;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(total, (page - 1) * pageSize + rows);
  const summary =
    total === 0
      ? LOCALE.NO_AUDIT_LOGS || "No entries"
      : (LOCALE.SHOWING_OF || "Showing {start}-{end} of {total}")
          .replace("{start}", start)
          .replace("{end}", end)
          .replace("{total}", total.toLocaleString());
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return Skeletons.Box.X({
    className: `${pfx}__audit-pagination`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__audit-pagination-label`,
        content: summary,
      }),
      Skeletons.Box.X({
        className: `${pfx}__audit-pager`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__audit-pager-btn${page <= 1 ? ` ${pfx}__audit-pager-btn--disabled` : ""}`,
            service: page > 1 ? "apps-audit-prev" : null,
            uiHandler: [ui],
            kids: [
              Skeletons.Button.Svg({
                ico: "mini-arrow-left-new",
                className: `${pfx}__audit-pager-ico`,
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__audit-pager-btn${page >= totalPages ? ` ${pfx}__audit-pager-btn--disabled` : ""}`,
            service: page < totalPages ? "apps-audit-next" : null,
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

function bytesToHuman(b) {
  const n = parseFloat(b);
  if (!isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
}

function insights(ui) {
  const pfx = ui.fig.family;
  const stats = ui._auditStats || {};
  const security =
    stats.security_score != null ? Number(stats.security_score) : null;
  const highRisk =
    stats.high_risk_count != null
      ? parseInt(stats.high_risk_count, 10) || 0
      : null;
  const storageBytes =
    stats.storage_used_bytes != null
      ? parseFloat(stats.storage_used_bytes) || 0
      : null;
  return Skeletons.Box.X({
    className: `${pfx}__insights`,
    kids: [
      insightCard(pfx, {
        variant: "security",
        icon: "shield",
        badge_label: LOCALE.AUDIT_SECURITY_BADGE || "—",
        label: LOCALE.SECURITY_SCORE || "Security Score",
        value: security != null ? security.toFixed(1) : "—",
        progress:
          security != null ? Math.max(0, Math.min(100, security)) : null,
      }),
      insightCard(pfx, {
        variant: "risk",
        icon: "apps-warning",
        badge_label:
          highRisk != null
            ? `${highRisk} ${LOCALE.UNRESOLVED || "unresolved"}`
            : LOCALE.AUDIT_RISK_BADGE || "—",
        label: LOCALE.HIGH_RISK_ACTIONS || "High-Risk Actions",
        value: highRisk != null ? String(highRisk) : "—",
        footer:
          LOCALE.AUDIT_RISK_DESC ||
          "Tracked policy violations across the organization.",
      }),
      insightCard(pfx, {
        variant: "storage",
        icon: "storage",
        badge_label: LOCALE.AUDIT_STORAGE_BADGE || "Live",
        label: LOCALE.STORAGE_ACTIVITY || "Storage Activity",
        value: storageBytes != null ? bytesToHuman(storageBytes) : "—",
        footer:
          LOCALE.AUDIT_STORAGE_DESC || "Total bytes consumed across all hubs.",
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
          Skeletons.Image.Svg({
            ico: "cloud-pause",
            className: `${pfx}__upsell-icon`,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__upsell-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__upsell-title`,
                content:
                  LOCALE.UNLOCK_ACTIVITY_INSIGHTS || "Unlock Activity Insights",
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
              kids: (ui._auditLogs || []).map((row) =>
                auditEntry(ui, mapAuditRow(row)),
              ),
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
