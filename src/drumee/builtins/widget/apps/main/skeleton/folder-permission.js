// Folder Permission popup. Opens when the pencil edit icon is clicked on
// any folder row inside the Permissions tab → Workspace detail view.

const SAMPLE_MEMBERS = [
  { id: "m1", name: "Marcus Thorne",   email: "marcus@drumee.io",  role: "Admin",       avatar: "dark" },
  { id: "m2", name: "Elena Rodriguez", email: "elena.r@drumee.io", role: "View & Edit", avatar: "dark" },
  { id: "m3", name: "Samir Al-Fayed",  email: "samir@drumee.io",   role: "View & Chat", avatar: "dark" },
  { id: "m4", name: "System (Bot)",    email: "automation-service",role: "Edit",        avatar: "neutral", initials: "BT" },
  { id: "m5", name: "System (Bot)",    email: "automation-service",role: "View",        avatar: "neutral", initials: "BT" },
];

const SAMPLE_DEVICES = [
  { id: "fd1", kind: "laptop", name: "Admin MBP 16",     info: "Verified • 10.0.4.1" },
  { id: "fd2", kind: "laptop", name: "Admin MBP 16",     info: "Verified • 10.0.4.1" },
  { id: "fd3", kind: "mobile", name: "Iphone 17e",       info: "Verified • 10.0.4.1" },
  { id: "fd4", kind: "mobile", name: "Iphone 17 promax", info: "Verified • 10.0.4.1" },
];

function folderHeader(ui, folder, ws) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fperm-folder-card`,
    kids: [
      Skeletons.Image.Svg({
        ico: "apps-folder-card",
        className: `${pfx}__fperm-folder-ico ${pfx}__perm-folder--${(ws && ws.color) || "purple"}`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__fperm-folder-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fperm-folder-title`,
            content: folder.name,
          }),
          Skeletons.Note({
            className: `${pfx}__fperm-folder-meta`,
            content: `${folder.updated} • ${folder.size}`,
          }),
        ],
      }),
    ],
  });
}

function sectionHeading(ui, { icon, label, addLabel, addService, removeAllService }) {
  const pfx = ui.fig.family;
  const left = Skeletons.Box.X({
    className: `${pfx}__fperm-sec-title`,
    kids: [
      Skeletons.Image.Svg({
        ico: icon,
        className: `${pfx}__fperm-sec-ico`,
      }),
      Skeletons.Note({
        className: `${pfx}__fperm-sec-label`,
        content: label,
      }),
    ],
  });

  const right = Skeletons.Box.X({
    className: `${pfx}__fperm-sec-actions`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__fperm-add-input`,
        service: addService,
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__fperm-add-placeholder`,
            content: addLabel,
          }),
          Skeletons.Box.X({
            className: `${pfx}__fperm-add-plus`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__fperm-add-plus-glyph`,
                content: "+",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fperm-remove-all`,
        service: removeAllService,
        uiHandler: [ui],
        kids: [
          Skeletons.Note({
            className: `${pfx}__fperm-remove-all-label`,
            content: LOCALE.REMOVE_ALL || "Remove all",
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}__fperm-sec-heading`,
    kids: [left, right],
  });
}

function memberAvatar(pfx, m) {
  if (m.avatar === "neutral") {
    return Skeletons.Box.X({
      className: `${pfx}__fperm-avatar ${pfx}__fperm-avatar--neutral`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__fperm-avatar-initials`,
          content: m.initials || "??",
        }),
      ],
    });
  }
  return Skeletons.Box.X({
    className: `${pfx}__fperm-avatar`,
  });
}

function memberRow(ui, m) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fperm-member-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__fperm-member-info`,
        kids: [
          memberAvatar(pfx, m),
          Skeletons.Box.Y({
            className: `${pfx}__fperm-member-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__fperm-member-name`,
                content: m.name,
              }),
              Skeletons.Note({
                className: `${pfx}__fperm-member-email`,
                content: m.email,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fperm-role-pill`,
        service: "apps-fperm-change-role",
        uiHandler: [ui],
        member_id: m.id,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fperm-role-pill-label`,
            content: m.role,
          }),
          Skeletons.Image.Svg({
            ico: "apps-caret-down",
            className: `${pfx}__fperm-role-pill-caret`,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fperm-row-remove`,
        service: "apps-fperm-remove-member",
        uiHandler: [ui],
        member_id: m.id,
        kids: [
          Skeletons.Image.Svg({
            ico: "trash",
            className: `${pfx}__fperm-row-remove-ico`,
          }),
        ],
      }),
    ],
  });
}

function deviceRow(ui, d) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fperm-device-row`,
    kids: [
      Skeletons.Image.Svg({
        ico: d.kind === "laptop" ? "apps-laptop" : "apps-mobile",
        className: `${pfx}__fperm-device-ico`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__fperm-device-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fperm-device-name`,
            content: d.name,
          }),
          Skeletons.Note({
            className: `${pfx}__fperm-device-info`,
            content: d.info,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fperm-device-remove`,
        service: "apps-fperm-remove-device",
        uiHandler: [ui],
        device_id: d.id,
        kids: [
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${pfx}__fperm-device-remove-ico`,
          }),
        ],
      }),
    ],
  });
}

function toggleSwitch(ui, { on, service }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__fperm-toggle${on ? ` ${pfx}__fperm-toggle--on` : ""}`,
    service,
    uiHandler: [ui],
    kids: [Skeletons.Box.X({ className: `${pfx}__fperm-toggle-knob` })],
  });
}

function accessLevelRow(ui, { key, icon, label }) {
  const pfx = ui.fig.family;
  const checked = !!(ui._fpermAccess && ui._fpermAccess[key]);
  return Skeletons.Box.X({
    className: `${pfx}__fperm-access-row${checked ? ` ${pfx}__fperm-access-row--checked` : ""}`,
    service: "apps-fperm-toggle-access",
    uiHandler: [ui],
    access_key: key,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__fperm-access-info`,
        kids: [
          Skeletons.Image.Svg({
            ico: icon,
            className: `${pfx}__fperm-access-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__fperm-access-label`,
            content: label,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fperm-access-check${checked ? ` ${pfx}__fperm-access-check--on` : ""}`,
        kids: checked
          ? [
              Skeletons.Image.Svg({
                ico: "editbox_checkmark",
                className: `${pfx}__fperm-access-check-mark`,
              }),
            ]
          : [],
      }),
    ],
  });
}

function accessLevelSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__fperm-section`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__fperm-sec-title`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-gear-cog",
            className: `${pfx}__fperm-sec-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__fperm-sec-label`,
            content: LOCALE.ACCESS_LEVEL || "Access level",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__fperm-access-list`,
        kids: [
          accessLevelRow(ui, {
            key: "view",
            icon: "apps-eye",
            label: LOCALE.CAN_VIEW || "Can View",
          }),
          accessLevelRow(ui, {
            key: "edit",
            icon: "apps-pencil-simple",
            label: LOCALE.CAN_EDIT || "Can Edit",
          }),
          accessLevelRow(ui, {
            key: "chat",
            icon: "apps-chat",
            label: LOCALE.CAN_CHAT || "Can Chat",
          }),
        ],
      }),
    ],
  });
}

// Always-visible variant of the one-time link section (used in shared mode):
// shows the link header + field with no toggle.
function oneTimeLinkAlways(ui) {
  const pfx = ui.fig.family;
  return [
    Skeletons.Box.X({
      className: `${pfx}__fperm-onetime-row`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__fperm-sec-title`,
          kids: [
            Skeletons.Image.Svg({
              ico: "apps-link-simple",
              className: `${pfx}__fperm-sec-ico`,
            }),
            Skeletons.Note({
              className: `${pfx}__fperm-sec-label`,
              content: LOCALE.ONE_TIME_LINK || "One-time link",
            }),
          ],
        }),
      ],
    }),
    Skeletons.Box.X({
      className: `${pfx}__fperm-link-field`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__fperm-link-text`,
          content: ui._fpermOneTimeUrl || "",
        }),
        Skeletons.Box.X({
          className: `${pfx}__fperm-link-copy`,
          service: "apps-fperm-copy-link",
          uiHandler: [ui],
          kids: [
            Skeletons.Image.Svg({
              ico: "apps-copy",
              className: `${pfx}__fperm-link-copy-ico`,
            }),
          ],
        }),
      ],
    }),
  ];
}

function autoRevocationSection(ui) {
  const pfx = ui.fig.family;
  const on = !!ui._fpermAutoRevoke;
  const mins = ui._fpermAutoRevokeMins || 30;
  const block = [
    Skeletons.Box.X({
      className: `${pfx}__fperm-auto-row`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__fperm-sec-title`,
          kids: [
            Skeletons.Image.Svg({
              ico: "apps-arrow-clockwise",
              className: `${pfx}__fperm-sec-ico`,
            }),
            Skeletons.Note({
              className: `${pfx}__fperm-sec-label`,
              content: LOCALE.AUTO_REVOCATION || "Auto Revocation",
            }),
          ],
        }),
        toggleSwitch(ui, { on, service: "apps-fperm-toggle-auto" }),
      ],
    }),
  ];
  if (on) {
    // Slider derived from a 0-120 minute scale.
    const pct = Math.max(0, Math.min(100, (mins / 120) * 100));
    block.push(
      Skeletons.Box.X({
        className: `${pfx}__fperm-slider-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__fperm-slider`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__fperm-slider-fill`,
                style: { width: `${pct}%` },
              }),
              Skeletons.Box.X({
                className: `${pfx}__fperm-slider-thumb`,
                style: { left: `${pct}%` },
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__fperm-slider-label`,
            content: `${mins} min`,
          }),
        ],
      })
    );
  }
  return block;
}

function oneTimeLinkSection(ui) {
  const pfx = ui.fig.family;
  const on = !!ui._fpermOneTimeOn;
  const block = [
    Skeletons.Box.X({
      className: `${pfx}__fperm-onetime-row`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__fperm-sec-title`,
          kids: [
            Skeletons.Image.Svg({
              ico: "apps-link-simple",
              className: `${pfx}__fperm-sec-ico`,
            }),
            Skeletons.Note({
              className: `${pfx}__fperm-sec-label`,
              content: LOCALE.ONE_TIME_LINK || "One-time link",
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__fperm-onetime-meta`,
          kids: [
            on
              ? Skeletons.Note({
                  className: `${pfx}__fperm-onetime-sub`,
                  content:
                    LOCALE.EXPIRES_AFTER_SINGLE ||
                    "Expires after single access",
                })
              : null,
            toggleSwitch(ui, { on, service: "apps-fperm-toggle-onetime" }),
          ].filter(Boolean),
        }),
      ],
    }),
  ];
  if (on) {
    block.push(
      Skeletons.Box.X({
        className: `${pfx}__fperm-link-field`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__fperm-link-text`,
            content: ui._fpermOneTimeUrl || "",
          }),
          Skeletons.Box.X({
            className: `${pfx}__fperm-link-copy`,
            service: "apps-fperm-copy-link",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-copy",
                className: `${pfx}__fperm-link-copy-ico`,
              }),
            ],
          }),
        ],
      })
    );
  }
  return block;
}

function deviceSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__fperm-section`,
    kids: [
      sectionHeading(ui, {
        icon: "apps-devices",
        label: LOCALE.DEVICE_ACCESS || "Device Access",
        addLabel: LOCALE.ADD_DEVICE || "Add device",
        addService: "apps-fperm-add-device",
        removeAllService: "apps-fperm-remove-all-devices",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__fperm-list`,
        kids: SAMPLE_DEVICES.map((d) => deviceRow(ui, d)),
      }),
    ],
  });
}

function memberSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__fperm-section`,
    kids: [
      sectionHeading(ui, {
        icon: "apps-user-circle",
        label: LOCALE.MEMBER_PERMISSIONS || "Member Permissions",
        addLabel: LOCALE.ADD_MEMBER || "Add member",
        addService: "apps-fperm-add-member",
        removeAllService: "apps-fperm-remove-all-members",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__fperm-list`,
        kids: SAMPLE_MEMBERS.map((m) => memberRow(ui, m)),
      }),
    ],
  });
}

function bodySections(ui) {
  if (ui._fpermMode === "shared") {
    return [
      ...oneTimeLinkAlways(ui),
      accessLevelSection(ui),
      deviceSection(ui),
    ];
  }
  // restricted (default)
  const sections = [
    ...autoRevocationSection(ui),
    ...oneTimeLinkSection(ui),
  ];
  if (!ui._fpermOneTimeOn) sections.push(memberSection(ui));
  sections.push(deviceSection(ui));
  return sections;
}

export default function folder_permission_overlay(ui) {
  const pfx = ui.fig.family;
  const folder = ui._editingFolder;
  if (!folder) return null;
  const ws = ui._activeWorkspace;

  return Skeletons.Box.Y({
    className: `${pfx}__fperm-overlay`,
    dataset: { state: "open" },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__fperm-card`,
        kids: [
          // Header
          Skeletons.Box.Y({
            className: `${pfx}__fperm-header`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__fperm-header-row`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__fperm-title`,
                    content: LOCALE.PERMISSIONS || "Permissions",
                  }),
                  Skeletons.Box.X({
                    className: `${pfx}__fperm-close`,
                    service: "apps-fperm-close",
                    uiHandler: [ui],
                    kids: [
                      Skeletons.Image.Svg({
                        ico: "cross",
                        className: `${pfx}__fperm-close-ico`,
                      }),
                    ],
                  }),
                ],
              }),
              folderHeader(ui, folder, ws),
            ],
          }),

          // Body — layout differs between "restricted" and "shared" workspace modes.
          //   shared:     One-time link (always) + Access level + Device Access
          //   restricted: Auto Revocation + One-time link (toggle) + Members? + Device Access
          Skeletons.Box.Y({
            className: `${pfx}__fperm-body`,
            kids: bodySections(ui),
          }),

          // Save
          Skeletons.Box.X({
            className: `${pfx}__fperm-save-btn`,
            service: "apps-fperm-save",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-floppy",
                className: `${pfx}__fperm-save-ico`,
              }),
              Skeletons.Note({
                className: `${pfx}__fperm-save-label`,
                content: LOCALE.SAVE_CHANGES || "Save Changes",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
