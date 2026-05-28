/**
 * Manage Access panel — public link toggle, access level, link expiry, apply.
 * @param {Object} ui
 */
// Preset link-expiry durations (in days). 0 = no expiration.
const EXPIRY_PRESETS = [0, 1, 7, 30, 90];

// Shared formatter for the expiry-row label and each preset menu option.
// Accepts both days and hours — the server returns a remaining duration that
// decays, so a "1 day" expiry reads back as e.g. 0 days / 23 hours.
const formatExpiry = (days, hours) => {
  let d = ~~days;
  let h = ~~hours;
  // duration_hours() can return 24 (CEIL of a near-full day) — roll it up so
  // a 7-day expiry reads "In 7 Days", not "In 6 Days 24 Hours".
  if (h >= 24) {
    d += Math.floor(h / 24);
    h = h % 24;
  }
  if (d && h) {
    return `In ${d} Day${d !== 1 ? "s" : ""} ${h} Hour${h !== 1 ? "s" : ""}`;
  }
  if (d) return `In ${d} Day${d !== 1 ? "s" : ""}`;
  if (h) return `In ${h} Hour${h !== 1 ? "s" : ""}`;
  return LOCALE.NO_EXPIRATION || "No expiration";
};

module.exports = function (ui) {
  const fig = ui.fig.family;
  const publicLink = ui.mget("public_link");
  const privilege = ui.mget(_a.privilege) || 0;

  const days = parseInt(ui.mget(_a.days)) || 0;
  const hours = parseInt(ui.mget(_a.hours)) || 0;
  const expiryLabel = formatExpiry(days, hours);

  const accessItems = [
    {
      ico: "eye",
      label: LOCALE.CAN_VIEW_FILES || "Can View Files",
      bit: _K.permission.read,
    },
    {
      ico: "desktop_edit",
      label: LOCALE.CAN_EDIT_UPLOAD || "Can Edit & Upload",
      bit: _K.permission.write,
    },
    {
      ico: "desktop__chat",
      label: LOCALE.CAN_CHAT || "Can Chat",
      bit: _K.permission.download,
    },
  ];

  return Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      // ── Header ──────────────────────────────────────────────
      Skeletons.Box.X({
        className: `${fig}__header`,
        kids: [
          Skeletons.Note({
            className: `${fig}__title`,
            content: LOCALE.MANAGE_ACCESS || "Manage Access",
          }),
          Skeletons.Button.Svg({
            ico: "cross",
            className: `${fig}__close-btn`,
            service: "close",
            uiHandler: [ui],
          }),
        ],
      }),

      // ── Body ────────────────────────────────────────────────
      Skeletons.Box.Y({
        className: `${fig}__body`,
        kids: [
          // PUBLIC LINK
          Skeletons.Box.Y({
            className: `${fig}__section`,
            kids: [
              Skeletons.Box.X({
                className: `${fig}__toggle-row`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__section-label`,
                    content: LOCALE.PUBLIC_LINK || "PUBLIC LINK",
                  }),
                  Skeletons.Note({
                    className: `${fig}__toggle`,
                    state: publicLink ? 1 : 0,
                    service: "toggle-public-link",
                    uiHandler: [ui],
                  }),
                ],
              }),
              publicLink
                ? Skeletons.Box.X({
                    className: `${fig}__url-row`,
                    kids: [
                      Skeletons.Note({
                        className: `${fig}__url-text`,
                        content: ui.mget("share_url") || "",
                      }),
                      Skeletons.Button.Svg({
                        ico: "desktop_copy",
                        className: `${fig}__copy-btn`,
                        service: "copy-link",
                        uiHandler: [ui],
                      }),
                    ],
                  })
                : null,
            ],
          }),

          // ACCESS LEVEL
          Skeletons.Box.Y({
            className: `${fig}__section`,
            kids: [
              Skeletons.Note({
                className: `${fig}__section-label`,
                content: LOCALE.ACCESS_LEVEL || "ACCESS LEVEL",
              }),
              Skeletons.Box.Y({
                className: `${fig}__access-list`,
                kids: accessItems.map(({ ico, label, bit }) =>
                  Skeletons.Box.X({
                    className: `${fig}__access-item`,
                    bit,
                    service: "toggle-access",
                    uiHandler: [ui],
                    kids: [
                      Skeletons.Button.Svg({
                        ico: ico,
                        className: `${fig}__access-icon`,
                        bit,
                        service: "toggle-access",
                        uiHandler: [ui],
                        state: privilege & bit ? 1 : 0,
                      }),
                      Skeletons.Note({
                        className: `${fig}__access-label`,
                        content: label,
                        bit,
                        service: "toggle-access",
                        uiHandler: [ui],
                      }),
                      Skeletons.Button.Svg({
                        ico:
                          privilege & bit
                            ? "checked-circle"
                            : "editbox_shapes-circle",
                        className: `${fig}__access-check`,
                        state: privilege & bit ? 1 : 0,
                        bit,
                        service: "toggle-access",
                        uiHandler: [ui],
                      }),
                    ],
                  }),
                ),
              }),
            ],
          }),

          // LINK EXPIRATION
          Skeletons.Box.Y({
            className: `${fig}__section`,
            kids: [
              Skeletons.Note({
                className: `${fig}__section-label`,
                content: LOCALE.LINK_EXPIRATION || "LINK EXPIRATION",
              }),
              Skeletons.Box.X({
                className: `${fig}__expiry-row`,
                kids: [
                  Skeletons.Note({
                    className: `${fig}__expiry-label`,
                    content: expiryLabel,
                  }),
                  Skeletons.Button.Svg({
                    ico: "calendar",
                    className: `${fig}__calendar-btn`,
                    service: "set-expiry",
                    uiHandler: [ui],
                  }),
                  Skeletons.Note({
                    className: `${fig}__clear-btn`,
                    content: LOCALE.CLEAR || "Clear",
                    service: "clear-expiry",
                    uiHandler: [ui],
                  }),
                ],
              }),
              ui._expiryMenuOpen
                ? Skeletons.Box.Y({
                    className: `${fig}__expiry-menu`,
                    kids: EXPIRY_PRESETS.map((preset) =>
                      Skeletons.Note({
                        className: `${fig}__expiry-option`,
                        content: formatExpiry(preset),
                        days: preset,
                        state: days === preset ? 1 : 0,
                        service: "pick-expiry",
                        uiHandler: [ui],
                      }),
                    ),
                  })
                : null,
            ],
          }),
        ],
      }),

      // ── Apply button ─────────────────────────────────────────
      Skeletons.Note({
        className: `${fig}__apply-btn`,
        content: LOCALE.APPLY_CHANGES || "Apply Changes",
        service: "apply",
        uiHandler: [ui],
      }),
    ],
  });
};
