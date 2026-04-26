function tabs(ui) {
  const pfx = ui.fig.family;
  const tabList = [
    { key: "member", label: LOCALE.MEMBER || "Member" },
    { key: "permissions", label: LOCALE.PERMISSIONS || "Permissions" },
    { key: "security", label: LOCALE.SECURITY || "Security" },
    { key: "audit", label: LOCALE.AUDIT_LOGS || "Audit Logs" },
    { key: "storage", label: LOCALE.STORAGE || "Storage" },
    { key: "admin-storage", label: LOCALE.ADMIN_STORAGE || "Admin Storage" },
  ];
  return Skeletons.Box.X({
    className: `${pfx}__tabs`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__tabs-list`,
        kids: tabList.map((t) =>
          Skeletons.Box.X({
            className: `${pfx}__tab${ui._tab === t.key ? ` ${pfx}__tab--active` : ""}`,
            service: "apps-switch-tab",
            uiHandler: [ui],
            tab: t.key,
            kids: [
              Skeletons.Note({ className: `${pfx}__tab-label`, content: t.label }),
            ],
          })
        ),
      }),
      Skeletons.Box.X({
        className: `${pfx}__reward`,
        service: "apps-reward",
        uiHandler: [ui],
        kids: [
          Skeletons.Note({ className: `${pfx}__reward-emoji`, content: "🏆" }),
          Skeletons.Note({
            className: `${pfx}__reward-label`,
            content: LOCALE.REWARD_HUB || "Reward Hub",
          }),
        ],
      }),
    ],
  });
}

function pageHeader(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__page-header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__page-heading`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__page-title`,
            content: LOCALE.MEMBERS || "Members",
          }),
          Skeletons.Note({
            className: `${pfx}__page-subtitle`,
            content:
              LOCALE.MEMBERS_SUBTITLE ||
              "Manage organization access and define custom roles.",
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__search`,
        kids: [
          Skeletons.Button.Svg({
            ico: "editbox_search",
            className: `${pfx}__search-ico`,
          }),
          Skeletons.Entry({
            className: `${pfx}__search-input`,
            placeholder: LOCALE.SEARCH || "Search...",
            name: "apps_search",
            mode: _a.commit,
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

function statCard(pfx, opt) {
  const { label, value, valueClass = "" } = opt;
  return Skeletons.Box.Y({
    className: `${pfx}__stat`,
    kids: [
      Skeletons.Note({ className: `${pfx}__stat-label`, content: label }),
      Skeletons.Note({
        className: `${pfx}__stat-value ${valueClass}`,
        content: value,
      }),
    ],
  });
}

function fmtNum(n) {
  if (n == null) return "—";
  const v = parseInt(n, 10);
  if (isNaN(v)) return String(n);
  return v.toLocaleString();
}

function statsRow(ui) {
  const pfx = ui.fig.family;
  const s = ui._memberStats || {};
  const total = s.total != null ? s.total : s.total_members;
  const admins = s.admins != null ? s.admins : s.admin_count;
  const guests = s.external_guests != null ? s.external_guests : s.guests;
  const pending = s.pending_invites != null ? s.pending_invites : s.pending;
  return Skeletons.Box.X({
    className: `${pfx}__stats`,
    kids: [
      statCard(pfx, {
        label: LOCALE.TOTAL_MEMBERS || "Total Members",
        value: fmtNum(total),
      }),
      statCard(pfx, {
        label: LOCALE.ADMINS || "Admins",
        value: fmtNum(admins),
        valueClass: `${pfx}__stat-value--admins`,
      }),
      statCard(pfx, {
        label: LOCALE.EXTERNAL_GUESTS || "External Guests",
        value: fmtNum(guests),
        valueClass: `${pfx}__stat-value--guests`,
      }),
      statCard(pfx, {
        label: LOCALE.PENDING_INVITES || "Pending Invites",
        value: fmtNum(pending),
        valueClass: `${pfx}__stat-value--pending`,
      }),
    ],
  });
}

function checkbox(ui, { id, checked, service, member_id }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__checkbox${checked ? ` ${pfx}__checkbox--checked` : ""}`,
    service,
    uiHandler: [ui],
    member_id,
    kids: checked
      ? [
          Skeletons.Image.Svg({
            ico: "editbox_checkmark",
            className: `${pfx}__checkbox-mark`,
          }),
        ]
      : [],
  });
}

function pillBadge(pfx, { label, variant }) {
  return Skeletons.Box.X({
    className: `${pfx}__pill ${pfx}__pill--${variant || "default"}`,
    kids: [
      Skeletons.Note({ className: `${pfx}__pill-label`, content: label }),
    ],
  });
}

function workspacePill(pfx, { label }) {
  return Skeletons.Box.X({
    className: `${pfx}__workspace`,
    kids: [
      Skeletons.Note({ className: `${pfx}__workspace-label`, content: label }),
    ],
  });
}

function memberRow(ui, member) {
  const pfx = ui.fig.family;
  const checked = ui._selected.has(member.id);
  return Skeletons.Box.X({
    className: `${pfx}__row${checked ? ` ${pfx}__row--checked` : ""}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__cell ${pfx}__cell--check`,
        kids: [
          checkbox(ui, {
            checked,
            service: "apps-toggle-member",
            member_id: member.id,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__cell ${pfx}__cell--member`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__avatar ${pfx}__avatar--${member.avatar_color || "cyan"}`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__avatar-initials`,
                content: member.initials,
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__member-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__member-name`,
                content: member.name,
              }),
              Skeletons.Note({
                className: `${pfx}__member-email`,
                content: member.email,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__cell ${pfx}__cell--role`,
        kids: [pillBadge(pfx, member.role)],
      }),
      Skeletons.Box.X({
        className: `${pfx}__cell ${pfx}__cell--workspaces`,
        kids: member.workspaces.map((w) => workspacePill(pfx, w)),
      }),
      Skeletons.Box.X({
        className: `${pfx}__cell ${pfx}__cell--status`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__status ${pfx}__status--${member.status}`,
            kids: [
              Skeletons.Box.X({ className: `${pfx}__status-dot` }),
              Skeletons.Note({
                className: `${pfx}__status-label`,
                content:
                  member.status === "online"
                    ? LOCALE.ONLINE || "Online"
                    : member.status === "away"
                    ? LOCALE.AWAY || "Away"
                    : member.status,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__cell ${pfx}__cell--last-active`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__last-active`,
            content: member.last_active,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__cell ${pfx}__cell--actions`,
        kids: [
          Skeletons.Button.Svg({
            ico: "editbox_pencil",
            className: `${pfx}__action ${pfx}__action--edit`,
            service: "apps-edit-member",
            uiHandler: [ui],
            member_id: member.id,
          }),
          Skeletons.Button.Svg({
            ico: "trash",
            className: `${pfx}__action ${pfx}__action--delete`,
            service: "apps-delete-member",
            uiHandler: [ui],
            member_id: member.id,
          }),
        ],
      }),
    ],
  });
}

function tableHeader(ui) {
  const pfx = ui.fig.family;
  const allChecked =
    ui._selected.size === ui._members.length && ui._members.length > 0;
  const cols = [
    { className: `${pfx}__cell--check`, kids: [
      checkbox(ui, { checked: allChecked, service: "apps-toggle-all" }),
    ] },
    { className: `${pfx}__cell--member`, label: LOCALE.MEMBER || "Member" },
    { className: `${pfx}__cell--role`, label: LOCALE.ROLE || "Role" },
    { className: `${pfx}__cell--workspaces`, label: LOCALE.WORKSPACES || "Workspaces" },
    { className: `${pfx}__cell--status`, label: LOCALE.STATUS || "Status" },
    { className: `${pfx}__cell--last-active`, label: LOCALE.LAST_ACTIVE || "Last Active" },
    { className: `${pfx}__cell--actions`, label: LOCALE.ACTIONS || "Actions" },
  ];
  return Skeletons.Box.X({
    className: `${pfx}__row ${pfx}__row--header`,
    kids: cols.map((c) =>
      Skeletons.Box.X({
        className: `${pfx}__cell ${c.className}`,
        kids: c.kids || [
          Skeletons.Note({
            className: `${pfx}__col-label`,
            content: c.label,
          }),
        ],
      })
    ),
  });
}

function filterMenu(ui) {
  const pfx = ui.fig.family;
  const items = [
    { key: "all", label: LOCALE.ALL_ROLES || "All roles" },
    { key: "owner", label: LOCALE.ORGANIZATION_OWNER || "Organization Owner" },
    { key: "admin", label: LOCALE.WORKSPACE_ADMIN || "Workspace Admin" },
    { key: "member", label: LOCALE.MEMBER || "Member" },
  ];
  return Skeletons.Box.Y({
    className: `${pfx}__filter-menu`,
    kids: items.map((item) =>
      Skeletons.Box.X({
        className: `${pfx}__filter-item${ui._roleFilter === item.key ? ` ${pfx}__filter-item--selected` : ""}`,
        service: "apps-select-role",
        uiHandler: [ui],
        role_key: item.key,
        kids: [
          Skeletons.Note({
            className: `${pfx}__filter-item-label`,
            content: item.label,
          }),
          Skeletons.Box.X({
            className: `${pfx}__filter-item-radio${ui._roleFilter === item.key ? ` ${pfx}__filter-item-radio--selected` : ""}`,
            kids: ui._roleFilter === item.key
              ? [Skeletons.Box.X({ className: `${pfx}__filter-item-radio-dot` })]
              : [],
          }),
        ],
      })
    ),
  });
}

const FILTER_LABELS = {
  all: "All roles",
  owner: "Organization Owner",
  admin: "Workspace Admin",
  member: "Member",
};

function table(ui) {
  const pfx = ui.fig.family;
  const currentLabel =
    (LOCALE[`FILTER_${ui._roleFilter.toUpperCase()}`]) ||
    FILTER_LABELS[ui._roleFilter] ||
    FILTER_LABELS.all;

  return Skeletons.Box.Y({
    className: `${pfx}__table-wrap`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__table-header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__table-title`,
            content: LOCALE.ACTIVE_DIRECTORY || "Active Directory",
          }),
          Skeletons.Box.X({
            className: `${pfx}__table-filter-wrap`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__table-filter${ui._filterOpen ? ` ${pfx}__table-filter--open` : ""}`,
                service: "apps-filter-roles",
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__table-filter-label`,
                    content: currentLabel,
                  }),
                  Skeletons.Box.X({
                    className: `${pfx}__table-filter-btn`,
                    kids: [
                      Skeletons.Button.Svg({
                        ico: "desktop_filter",
                        className: `${pfx}__table-filter-ico`,
                      }),
                    ],
                  }),
                ],
              }),
              ui._filterOpen ? filterMenu(ui) : null,
            ].filter(Boolean),
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__table`,
        kids: tableBodyKids(ui),
      }),
    ],
  });
}

function tableBodyKids(ui) {
  const pfx = ui.fig.family;
  const kids = [tableHeader(ui)];
  if (ui._membersState === "loading") {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__table-empty`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__table-empty-label`,
            content: LOCALE.LOADING || "Loading…",
          }),
        ],
      })
    );
  } else if (ui._membersState === "error") {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__table-empty`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__table-empty-label`,
            content:
              LOCALE.MEMBERS_LOAD_FAILED || "Could not load members.",
          }),
        ],
      })
    );
  } else if (!ui._members.length) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__table-empty`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__table-empty-label`,
            content: LOCALE.NO_MEMBERS_FOUND || "No members found.",
          }),
        ],
      })
    );
  } else {
    ui._members.forEach((m) => kids.push(memberRow(ui, m)));
  }
  return kids;
}

function pagination(ui) {
  const pfx = ui.fig.family;
  const pages = [1, 2, 3];
  const pageBtn = (n, active) =>
    Skeletons.Box.X({
      className: `${pfx}__page-btn${active ? ` ${pfx}__page-btn--active` : ""}`,
      service: "apps-page",
      uiHandler: [ui],
      page_num: n,
      kids: [
        Skeletons.Note({
          className: `${pfx}__page-num`,
          content: String(n),
        }),
      ],
    });

  return Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      ui._selected.size
        ? Skeletons.Box.X({
            className: `${pfx}__remove-btn`,
            service: "apps-remove-selected",
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__remove-label`,
                content: LOCALE.REMOVE_SELECTED || "Remove selected",
              }),
            ],
          })
        : Skeletons.Box.X({ className: `${pfx}__remove-spacer` }),
      Skeletons.Box.X({
        className: `${pfx}__pager`,
        kids: [
          Skeletons.Button.Svg({
            ico: "mini-arrow-left-new",
            className: `${pfx}__pager-arrow`,
            service: "apps-page",
            uiHandler: [ui],
            page_num: Math.max(1, ui._page - 1),
          }),
          ...pages.map((p) => pageBtn(p, p === ui._page)),
          Skeletons.Note({ className: `${pfx}__pager-ellipsis`, content: "..." }),
          pageBtn(321, ui._page === 321),
          Skeletons.Button.Svg({
            ico: "mini-arrow-right-new",
            className: `${pfx}__pager-arrow`,
            service: "apps-page",
            uiHandler: [ui],
            page_num: ui._page + 1,
          }),
        ],
      }),
    ],
  });
}

function memberView(ui) {
  return [pageHeader(ui), statsRow(ui), table(ui), pagination(ui)];
}

export default function apps_main_skeleton(ui) {
  const pfx = ui.fig.family;
  let content;
  switch (ui._tab) {
    case "permissions":
      content = ui._activeWorkspace
        ? require("./permission-detail").default(ui)
        : require("./permission").default(ui);
      break;
    case "audit":
      content = require("./audit").default(ui);
      break;
    case "storage":
      content =
        ui._storageView === "retention"
          ? require("./retention").default(ui)
          : require("./storage").default(ui);
      break;
    case "admin-storage":
      content = require("./admin-storage").default(ui);
      break;
    case "member":
    default:
      content = memberView(ui);
  }
  const root = [
    tabs(ui),
    Skeletons.Box.Y({
      className: `${pfx}__content ${pfx}__content--${ui._tab || "member"}`,
      kids: content,
    }),
  ];
  if (ui._showApplyConfirm) {
    root.push(require("./apply-confirm").default(ui));
  }
  if (ui._editingMember) {
    const editOverlay = require("./edit-member").default(ui);
    if (editOverlay) root.push(editOverlay);
  }
  if (ui._editingFolder) {
    const fpermOverlay = require("./folder-permission").default(ui);
    if (fpermOverlay) root.push(fpermOverlay);
  }
  return root;
}
