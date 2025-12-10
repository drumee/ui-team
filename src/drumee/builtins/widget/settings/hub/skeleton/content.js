const { folder_logo } = require("../../../../skeleton/toolkit/logo");

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 */
function item(ui, label, ...widget) {
  return Skeletons.Box.G({
    className: `${ui.fig.family}__item ${ui.fig.group}__item`,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__item-label ${ui.fig.group}__item-label`,
        content: label,
      }),
      ...widget,
    ],
  });
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 */
function text(ui, label) {
  return Skeletons.Note({
    className: `${ui.fig.family}__item-text ${ui.fig.group}__item-text`,
    content: label,
  })
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
function settings_body(ui, opt) {
  const fig = `${ui.fig.family}`;
  const members = ui.mget(_a.members) || ui.mget(_a.users) || [];
  const membersCount = members.length || 0;
  const ownerName =
    ui.mget(_a.owner_name) ||
    ui.mget(_a.owner) ||
    ui.mget(_a.surname) ||
    ui.mget(_a.fullname) ||
    LOCALE.UNKNOWN;
  const typeLabel =
    ui.mget(_a.area) && LOCALE[`AREA_${ui.mget(_a.area).toUpperCase()}_LABEL`]
      ? LOCALE[`AREA_${ui.mget(_a.area).toUpperCase()}_LABEL`]
      : LOCALE.AREA_PERSONAL_LABEL;
  const sizeLabel = ui.mget(_a.size) || "0";
  const quotaLabel = ui.mget(_a.quota) || ui.mget(_a.capacity) || "";
  const filesCount = ui.mget(_a.files_count) || ui.mget(_a.nodes) || "";
  const createdAt = ui.mget(_a.created_at) || ui.mget(_a.created) || "0";
  const updatedAt = ui.mget(_a.updated_at) || ui.mget(_a.last_change) || "0";

  const memberIcons = Skeletons.Box.X({
    className: `${fig}__member-icons`,
    kids: members.slice(0, 6).map((m) =>
      Skeletons.UserProfile({
        className: `${fig}__member-avatar`,
        id: m[_a.entity] || m[_a.id],
        firstname: m[_a.firstname] || m[_a.surname] || "",
        lastname: m[_a.lastname] || "",
        fullname: m[_a.fullname],
        online: m[_a.online],
        live_status: 1,
      })
    ),
  });

  return Skeletons.Box.Y({
    className: `${fig}__container`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__content`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.group}__vignette ${fig}__vignette`,
            kids: [{
              kind: 'media_grid',
              className: `${ui.fig.group}__vignette-media ${fig}__vignette-media`,
              filetype: ui.mget(_a.filetype),
              area: ui.mget(_a.area),
              mode: _a.vignette,
              service: "nop"
            }]
          }),
          Skeletons.Box.Y({
            className: `${ui.fig.group}__items ${fig}__items`,
            kids: [
              item(ui, LOCALE.OWNER, Skeletons.Box.X({
                className: `${fig}__owner`,
                kids: [
                  Skeletons.UserProfile({
                    className: `${fig}__owner-avatar`,
                    id: ui.mget(_a.owner_id) || ui.mget(_a.entity),
                    firstname: ownerName,
                    auto_color: 1
                  }),
                  Skeletons.Note({
                    className: `${fig}__owner-name`,
                    content: ownerName,
                  }),
                ],
              })),
              item(ui, LOCALE.TYPE, Skeletons.Box.X({
                className: `${fig}__row`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__item-text`,
                    content: typeLabel,
                  }),
                  Skeletons.Button.Label({
                    ico: "desktop_pen",
                    className: `${fig}__edit`,
                    label: LOCALE.EDIT || "Edit",
                    uiHandler: [ui],
                    service: "edit-type",
                  }),
                ],
              })),
              item(ui, LOCALE.SIZE, Skeletons.Box.X({
                className: `${fig}__row`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__item-text`,
                    content: `${sizeLabel}${quotaLabel ? ` / ${quotaLabel}` : ""}`,
                  }),
                  filesCount ? Skeletons.Note({
                    className: `${fig}__item-meta`,
                    content: filesCount,
                  }) : undefined,
                ],
              })),
              item(ui, LOCALE.MEMBERS, Skeletons.Box.X({
                className: `${fig}__row`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__item-meta`,
                    content: membersCount.toString(),
                  }),
                  memberIcons,
                  Skeletons.Button.Svg({
                    ico: "carret-right",
                    className: `${fig}__chevron`,
                    service: _a.members,
                    uiHandler: [ui],
                  }),
                ],
              })),
              item(ui, LOCALE.CREATED, Skeletons.Box.X({
                className: `${fig}__row`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__item-text`,
                    content: createdAt,
                  }),
                  Skeletons.Button.Svg({
                    ico: "carret-right",
                    className: `${fig}__chevron`,
                    active: 0,
                  }),
                ],
              })),
              item(ui, LOCALE.LAST_CHANGE, Skeletons.Box.X({
                className: `${fig}__row`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__item-text`,
                    content: updatedAt,
                  }),
                  Skeletons.Button.Svg({
                    ico: "carret-right",
                    className: `${fig}__chevron`,
                    active: 0,
                  }),
                ],
              })),
            ]
          })
        ]
      }),
    ],
  });
}

export default settings_body;
