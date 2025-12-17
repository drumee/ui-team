const { filesize } = require("core/utils")

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 */
function item(ui, label, content, action) {
  return Skeletons.Box.G({
    className: `${ui.fig.family}__item ${ui.fig.group}__item`,
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__item-label ${ui.fig.group}__item-label`,
        content: label,
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__item-body`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.family}__item-content`,
            kids: [content],
          }),
          action
            ? Skeletons.Box.X({
              className: `${ui.fig.family}__item-action`,
              kids: [action],
            })
            : undefined,
        ],
      }),
    ],
  });
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
  
  // Owner info
  const ownerFromList =
    members.find(
      (m) =>
        (m[_a.privilege] && (m[_a.privilege] & _K.permission.owner)) ||
        (m.privilege && (m.privilege & _K.permission.owner))
    ) || {};

  const ownerId =
    ownerFromList[_a.entity] ||
    ownerFromList[_a.id] ||
    ui.mget(_a.owner_id) ||
    ui.mget(_a.entity) ||
    ui.mget(_a.id);

  const ownerName =
    ownerFromList[_a.fullname] ||
    ownerFromList[_a.surname] ||
    ui.mget(_a.owner_name) ||
    ui.mget(_a.owner) ||
    ui.mget(_a.fullname) ||
    ui.mget(_a.surname) ||
    ui.mget(_a.firstname) ||
    ui.mget(_a.email) ||
    LOCALE.UNKNOWN;
  
  // Type info
  const area = ui.mget(_a.area) || "personal";
  const typeLabel =
    LOCALE[`AREA_${area.toUpperCase()}_LABEL`] || 
    (area === "private" ? "Private" : area === "public" ? "Public" : LOCALE.AREA_PERSONAL_LABEL);
  
  const sizeLabel = filesize(ui.mget(_a.filesize));
  const quotaValue = ui.mget(_a.quota) || ui.mget(_a.capacity);
  const quotaLabel = quotaValue ? filesize(quotaValue) : "";
  const filesCount = ui.mget(_a.files_count) || ui.mget(_a.nodes) || "";

  
  const createdAt = Dayjs.unix(Number(ui.mget(_a.ctime) || 0)).format(Visitor.timeformat());
  const updatedAt = Dayjs.unix(Number(ui.mget(_a.mtime) || 0)).format(Visitor.timeformat());

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
              item(
                ui,
                LOCALE.OWNER,
                Skeletons.Box.X({
                  className: `${fig}__row ${fig}__owner`,
                  kids: [
                    Skeletons.UserProfile({
                      className: `${fig}__owner-avatar`,
                      id: ownerId,
                      auto_color: 1,
                    }),
                    Skeletons.Note({
                      className: `${fig}__item-text`,
                      content: ownerName,
                    }),
                  ],
                }),
                Skeletons.Note({
                })
              ),
              item(
                ui,
                LOCALE.TYPE,
                Skeletons.Box.X({
                  className: `${fig}__row`,
                  kids: [
                    Skeletons.Note({
                      className: `${fig}__item-text`,
                      content: typeLabel,
                    }),
                  ],
                }),
                Skeletons.Note ({
                  className: `${fig}__edit`,
                  label: LOCALE.EDIT,
                  uiHandler: [ui],
                  service: "edit-type",
                })
              ),

              item(
                ui,
                LOCALE.SIZE,
                Skeletons.Box.X({
                  className: `${fig}__row`,
                  kids: [
                    Skeletons.Note({
                      className: `${fig}__item-text`,
                      content: `${sizeLabel}${quotaLabel ? ` / ${quotaLabel}` : ""}`,
                    }),
                    filesCount
                      ? Skeletons.Note({
                        className: `${fig}__item-meta`,
                        content: filesCount,
                      })
                      : undefined,
                  ],
                }),
                Skeletons.Note({
                })
              ),
              item(
                ui,
                LOCALE.MEMBERS,
                Skeletons.Box.X({
                  className: `${fig}__row`,
                  kids: [
                    Skeletons.Note({
                      className: `${fig}__item-meta`,
                      content: membersCount.toString(),
                    }),
                    memberIcons,
                  ],
                }),
                Skeletons.Button.Svg({
                  ico: "arrow--pages",
                  className: `${fig}__arrow-next`,
                  service: _a.members,
                  uiHandler: [ui],
                })
              ),
              item(
                ui,
                LOCALE.CREATED,
                Skeletons.Note({
                  className: `${fig}__item-date`,
                  content: createdAt,
                }),
                Skeletons.Note({
                })
              ),
              item(
                ui,
                LOCALE.LAST_CHANGE,
                Skeletons.Note({
                  className: `${fig}__item-date`,
                  content: updatedAt,
                }),
                Skeletons.Button.Svg({
                  ico: "arrow--pages",
                  className: `${fig}__arrow-next`,
                  service: "activity-hub",
                  uiHandler: [ui],
                })
              ),
            ]
          })
        ]
      }),
    ],
  });
}

export default settings_body;
