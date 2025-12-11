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
  
  // Owner info
  const ownerId = ui.mget(_a.owner_id) || ui.mget(_a.entity);
  const ownerName =
    ui.mget(_a.owner_name) ||
    ui.mget(_a.owner) ||
    ui.mget(_a.surname) ||
    ui.mget(_a.fullname) ||
    LOCALE.UNKNOWN;
  
  // Type info
  const area = ui.mget(_a.area) || "personal";
  const typeLabel =
    LOCALE[`AREA_${area.toUpperCase()}_LABEL`] || 
    (area === "private" ? "Private" : area === "public" ? "Public" : LOCALE.AREA_PERSONAL_LABEL);
  
  // Size info
  const formatSize = (sizeValue) => {
    if (!sizeValue) return "0 B";
    if (typeof sizeValue === 'string') return sizeValue;
    if (typeof sizeValue === 'object') {
      // If it's an object, try to get a string representation
      if (sizeValue.toString && sizeValue.toString() !== '[object Object]') {
        return sizeValue.toString();
      }
      // Try common size properties
      if (sizeValue.size) return formatSize(sizeValue.size);
      if (sizeValue.value) return formatSize(sizeValue.value);
      return "0 B";
    }
    if (typeof sizeValue === 'number') {
      // Format bytes to human readable
      const units = ['B', 'KB', 'MB', 'GB'];
      let unitIndex = 0;
      let size = sizeValue;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
    }
    return String(sizeValue);
  };
  
  const sizeLabel = formatSize(ui.mget(_a.size));
  const quotaValue = ui.mget(_a.quota) || ui.mget(_a.capacity);
  const quotaLabel = quotaValue ? formatSize(quotaValue) : "";
  const filesCount = ui.mget(_a.files_count) || ui.mget(_a.nodes) || "";
  
  // Date formatting
  const formatDate = (timestamp, dateStr) => {
    if (dateStr && dateStr !== "0") {
      return dateStr;
    }
    if (timestamp) {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return "0";
  };
  
  const createdAt = formatDate(ui.mget(_a.ctime), ui.mget(_a.date) || ui.mget(_a.created_at) || ui.mget(_a.created));
  const updatedAt = formatDate(ui.mget(_a.mtime), ui.mget(_a.updated_at) || ui.mget(_a.last_change));

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
                  ownerId ? Skeletons.UserProfile({
                    className: `${fig}__owner-avatar`,
                    id: ownerId,
                    auto_color: 1
                  }) : undefined,
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
