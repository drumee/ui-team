// Shared building blocks for the Storage console UIs (regular Storage tab
// and Admin Storage tab). Both views render the same Total-Capacity card,
// Low-Storage Alert card, and Optimization card; only the bottom table
// differs (User Storage Distribution vs File Versioning).

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

// Reserved BEM slots cycled across the top hubs so each gets a distinct color.
const LEGEND_KEYS = ["documents", "media", "available", "other"];

export function capacityCard(ui) {
  const pfx = ui.fig.family;
  const hubs = Array.isArray(ui._orgStorageStats) ? ui._orgStorageStats : [];
  const totalUsed = hubs.reduce(
    (s, h) => s + (parseFloat(h.used_bytes) || 0),
    0,
  );
  const hasData = hubs.length > 0;

  const usedHuman = hasData ? bytesToHuman(totalUsed) : "—";
  const [usedNum, usedUnit] = usedHuman.split(" ");

  // Top-3 hubs + "Other" bucket stand in for the documents/media split
  // until BE exposes per-category bytes.
  const sorted = [...hubs].sort(
    (a, b) => (parseFloat(b.used_bytes) || 0) - (parseFloat(a.used_bytes) || 0),
  );
  const top = sorted.slice(0, 3);
  const rest = sorted
    .slice(3)
    .reduce((s, h) => s + (parseFloat(h.used_bytes) || 0), 0);
  const legendItems = top.map((h, i) => ({
    key: LEGEND_KEYS[i] || "other",
    title: h.hub_name || `Hub ${h.hub_id}`,
    bytes: parseFloat(h.used_bytes) || 0,
  }));
  if (rest > 0) {
    legendItems.push({
      key: "other",
      title: LOCALE.OTHER || "Other",
      bytes: rest,
    });
  }

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
                content: LOCALE.TOTAL_HUB_STORAGE || "TOTAL HUB STORAGE",
              }),
              Skeletons.Box.X({
                className: `${pfx}__capacity-amount`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__capacity-amount-num`,
                    content: usedNum || "—",
                  }),
                  Skeletons.Note({
                    className: `${pfx}__capacity-amount-unit`,
                    content: usedUnit || "",
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
                content: LOCALE.HUB_BREAKDOWN || "HUB BREAKDOWN",
              }),
              Skeletons.Note({
                className: `${pfx}__capacity-trend-value`,
                content: hasData
                  ? `${hubs.length} ${LOCALE.HUBS || "hubs"}`
                  : "—",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__capacity-bar`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__capacity-bar-fill`,
                kids: legendItems.map((item) =>
                  Skeletons.Box.X({
                    className: `${pfx}__capacity-bar-seg ${pfx}__capacity-bar-seg--${item.key}`,
                    style: {
                      width:
                        totalUsed > 0
                          ? `${(item.bytes / totalUsed) * 100}%`
                          : "0%",
                    },
                  }),
                ),
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__capacity-legend`,
            kids: legendItems.map((item) => {
              const pct =
                totalUsed > 0 ? Math.round((item.bytes / totalUsed) * 100) : 0;
              return Skeletons.Box.X({
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
                        content: `${bytesToHuman(item.bytes)} (${pct}%)`,
                      }),
                    ],
                  }),
                ],
              });
            }),
          }),
        ],
      }),
    ],
  });
}

export function alertCard(ui) {
  const pfx = ui.fig.family;
  const hubs = Array.isArray(ui._orgStorageStats) ? ui._orgStorageStats : [];
  const top = hubs.reduce(
    (best, h) =>
      (parseFloat(h.used_bytes) || 0) > (parseFloat(best.used_bytes) || 0)
        ? h
        : best,
    hubs[0] || {},
  );
  const body =
    top && top.hub_name
      ? `${top.hub_name} — ${bytesToHuman(parseFloat(top.used_bytes) || 0)}`
      : LOCALE.NO_STORAGE_DATA || "No storage data available.";
  return Skeletons.Box.X({
    className: `${pfx}__alert-card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__alert-iconwrap`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-warning",
            className: `${pfx}__alert-ico`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__alert-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__alert-title`,
            content: LOCALE.HEAVIEST_HUB || "Heaviest Hub",
          }),
          Skeletons.Note({
            className: `${pfx}__alert-body`,
            content: body,
          }),
          Skeletons.Note({
            className: `${pfx}__alert-action`,
            content: LOCALE.MONITOR_USAGE || "Monitor usage to plan capacity.",
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
      icon: "app-clean-cache",
      label: LOCALE.CLEAR_CACHE_FILES || "Clear Cache Files",
      value: "12 GB",
      service: "apps-storage-clear-cache",
    },
    {
      icon: "app-archive",
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
          }),
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

// Hub-scoped variants — consume `_hubStorageStats` (single row from
// get_hub_storage_stats) instead of the org-wide hub list.

const HUB_LEGEND = [
  {
    key: "documents",
    field: "documents_bytes",
    label: () => LOCALE.DOCUMENTS || "Documents",
  },
  {
    key: "media",
    field: "media_bytes",
    label: () => LOCALE.MEDIA_ASSETS || "Media",
  },
  { key: "other", field: "other_bytes", label: () => LOCALE.OTHER || "Other" },
  {
    key: "available",
    field: "available_bytes",
    label: () => LOCALE.AVAILABLE || "Available",
  },
];

function activeHubName(ui) {
  const list = ui._adminHubs || [];
  const active = list.find((h) => h.hub_id === ui._activeAdminHub) || list[0];
  return (active && (active.hub_name || active.hub_id)) || "—";
}

export function hubCapacityCard(ui) {
  const pfx = ui.fig.family;
  const stats = ui._hubStorageStats || {};
  const used = parseFloat(stats.hub_used_bytes) || 0;
  const quota = parseFloat(stats.quota_bytes) || 0;
  const denom = quota > 0 ? quota : used;
  const usedHuman = bytesToHuman(used);
  const [usedNum, usedUnit] = usedHuman.split(" ");

  const legendItems = HUB_LEGEND.map((spec) => ({
    key: spec.key,
    title: spec.label(),
    bytes: parseFloat(stats[spec.field]) || 0,
  })).filter((it) => it.bytes > 0 || it.key !== "available");

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
                content: LOCALE.HUB_USED_STORAGE || "HUB USED STORAGE",
              }),
              Skeletons.Box.X({
                className: `${pfx}__capacity-amount`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__capacity-amount-num`,
                    content: usedNum || "—",
                  }),
                  Skeletons.Note({
                    className: `${pfx}__capacity-amount-unit`,
                    content: usedUnit || "",
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
                content: LOCALE.HUB_BREAKDOWN || "HUB BREAKDOWN",
              }),
              Skeletons.Note({
                className: `${pfx}__capacity-trend-value`,
                content: activeHubName(ui),
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__capacity-bar`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__capacity-bar-fill`,
                kids: legendItems.map((item) =>
                  Skeletons.Box.X({
                    className: `${pfx}__capacity-bar-seg ${pfx}__capacity-bar-seg--${item.key}`,
                    style: {
                      width:
                        denom > 0 ? `${(item.bytes / denom) * 100}%` : "0%",
                    },
                  }),
                ),
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__capacity-legend`,
            kids: legendItems.map((item) => {
              const pct =
                denom > 0 ? Math.round((item.bytes / denom) * 100) : 0;
              return Skeletons.Box.X({
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
                        content: `${bytesToHuman(item.bytes)} (${pct}%)`,
                      }),
                    ],
                  }),
                ],
              });
            }),
          }),
        ],
      }),
    ],
  });
}

export function hubAlertCard(ui) {
  const pfx = ui.fig.family;
  const stats = ui._hubStorageStats || {};
  const low = parseInt(stats.low_storage_alert, 10) === 1;
  const used = parseFloat(stats.hub_used_bytes) || 0;
  const available = parseFloat(stats.available_bytes) || 0;
  const title = low
    ? LOCALE.LOW_STORAGE_ALERT || "Low storage alert"
    : LOCALE.HUB_USAGE || "Hub usage";
  const body =
    `${activeHubName(ui)} — ${bytesToHuman(used)}` +
    (available > 0
      ? ` / ${bytesToHuman(available)} ${LOCALE.AVAILABLE_LC || "available"}`
      : "");
  return Skeletons.Box.X({
    className: `${pfx}__alert-card${low ? ` ${pfx}__alert-card--low` : ""}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__alert-iconwrap`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-warning",
            className: `${pfx}__alert-ico`,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__alert-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__alert-title`,
            content: title,
          }),
          Skeletons.Note({
            className: `${pfx}__alert-body`,
            content: body,
          }),
          Skeletons.Note({
            className: `${pfx}__alert-action`,
            content: low
              ? LOCALE.UPGRADE_TO_INCREASE_CAPACITY ||
                "Upgrade to increase capacity."
              : LOCALE.MONITOR_USAGE || "Monitor usage to plan capacity.",
          }),
        ],
      }),
    ],
  });
}

export function hubStorageBodyRow(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__storage-body-row`,
    kids: [
      hubCapacityCard(ui),
      Skeletons.Box.Y({
        className: `${pfx}__storage-side-col`,
        kids: [hubAlertCard(ui), optimizationCard(ui)],
      }),
    ],
  });
}
