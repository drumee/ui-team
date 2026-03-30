const { filesize } = require("@drumee/ui-essentials")

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
 */
function type(ui, label) {
  const icons = {
    share: "desktop_public",
    dmz: "desktop_public",
    private: 'lock'
  }
  let mimetype = ''
  if (ui.media) {
    mimetype = ui.media.mget(_a.mimetype) || ""
  }
  if (mimetype) {
    mimetype = `${ui.mget(_a.ext)} (${mimetype})`
  } else {
    mimetype = ui.mget(_a.ext)
  }
  const family = `${ui.fig.family}`;
  const figType = `${ui.fig.family}__item-type`;
  return Skeletons.Box.G({
    className: `${family}__item ${ui.fig.group}__item`,
    uiHandler: ui,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${family}__item-label ${ui.fig.group}__item-label`,
        content: label,
      }),
      Skeletons.Box.G({
        className: figType,
        kidsOpt: {
          active: 0
        },
        kids: [
          Skeletons.Button.Svg({
            ico: icons[ui.mget(_a.area)] || 'settings',
            className: `${figType}__icon`,
          }),
          Skeletons.Note({
            content: mimetype,
            className: `${figType}__label`,
          }),
        ],
      })
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
  const { owner = {} } = ui.model.toJSON()
  if (owner.id == Visitor.id) {
    owner.firstname = "Me"
  }

  const sizeLabel = filesize(ui.mget(_a.filesize));
  const quotaValue = ui.mget(_a.quota) || ui.mget(_a.capacity);
  const quotaLabel = quotaValue ? filesize(quotaValue) : "";
  const filesCount = ui.mget(_a.files_count) || ui.mget(_a.nodes) || "";

  const createdAt = Dayjs.unix(Number(ui.mget(_a.ctime) || 0)).format(Visitor.timeformat());
  const updatedAt = Dayjs.unix(Number(ui.mget(_a.mtime) || 0)).format(Visitor.timeformat());


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
              type(ui, LOCALE.TYPE),
              item(
                ui,
                LOCALE.OWNER,
                Skeletons.Box.X({
                  className: `${fig}__row ${fig}__owner`,
                  kids: [
                    Skeletons.UserProfile({
                      className: `${fig}__owner-avatar`,
                      id: owner.id,
                      auto_color: 1,
                    }),
                    Skeletons.Note({
                      className: `${fig}__item-text`,
                      content: owner.firstname,
                    }),
                  ],
                }),
                Skeletons.Note({
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
                Skeletons.Note({})
              ),
              item(
                ui,
                LOCALE.CREATED,
                Skeletons.Note({
                  className: `${fig}__item-date`,
                  content: createdAt,
                }),
                Skeletons.Note({})
              ),
              item(
                ui,
                LOCALE.LAST_CHANGE,
                Skeletons.Note({
                  className: `${fig}__item-date`,
                  content: updatedAt,
                }),
                Skeletons.Note({})
              ),
            ]
          }),
        ]
      }),
    ],
  });
}

export default settings_body;
