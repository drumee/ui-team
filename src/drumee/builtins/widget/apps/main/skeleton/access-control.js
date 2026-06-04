const folderTemplate = require("../../../../media/grid/template/folder");
const { filesize } = require("@drumee/ui-essentials");

// Owner-only "Access control" overlay opened from the Security tab card pencil.
// Differs from folder-permission.js by adding hub-level governance controls:
// Geo-Fencing, VPN, Time Window, Managed Device, and a View Access Audit
// footer button. UI-only state — no backend wiring yet.

function mapMemberRow(row) {
  const fullname =
    row.fullname ||
    [row.firstname, row.lastname].filter(Boolean).join(" ").trim() ||
    row.email ||
    "—";
  const initials = (() => {
    const f = (row.firstname || "").trim();
    const l = (row.lastname || "").trim();
    if (f && l) return (f[0] + l[0]).toUpperCase();
    const parts = fullname.split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();
  return {
    id: row.uid || row.id,
    name: fullname,
    email: row.email || "",
    role: row.role || "View",
    avatar: row.uid ? "dark" : "neutral",
    initials,
  };
}

function hubHeader(ui, hub) {
  const pfx = ui.fig.family;
  const area = (hub && hub.area) || "private";
  const id = (hub && hub.id) || "";
  const name = (hub && hub.name) || "";
  const ts = hub && (hub.updated || hub.mtime);
  const bytes = hub && (hub.filesize != null ? hub.filesize : hub.size);
  let updated = "";
  if (ts && typeof Dayjs !== "undefined") {
    try {
      updated = Dayjs.unix(ts).fromNow();
    } catch (e) {
      updated = "";
    }
  }
  const size = bytes != null ? filesize(bytes) : "";
  const parts = [];
  if (updated) parts.push((LOCALE.UPDATED || "Updated") + " " + updated);
  if (size) parts.push(size);
  const meta = parts.join(" • ");
  return Skeletons.Box.X({
    className: `${pfx}__ac-hub-card`,
    kids: [
      Skeletons.Element({
        tagName: "div",
        className: `${pfx}__ac-hub-ico ${area}`,
        content: folderTemplate({
          area,
          filetype: _a.folder,
          role: "folder",
          widgetId: `ac-${id}`,
          isAttachment: 1,
        }),
      }),
      Skeletons.Box.Y({
        className: `${pfx}__ac-hub-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__ac-hub-title`,
            content: name,
          }),
          meta
            ? Skeletons.Note({
                className: `${pfx}__ac-hub-meta`,
                content: meta,
              })
            : null,
        ].filter(Boolean),
      }),
    ],
  });
}

function toggleSwitch(ui, { on, service, extra }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    ...(extra || {}),
    className: `${pfx}__ac-toggle${on ? ` ${pfx}__ac-toggle--on` : ""}`,
    service,
    uiHandler: [ui],
    kids: [Skeletons.Box.X({ className: `${pfx}__ac-toggle-knob` })],
  });
}

function toggleRow(ui, { icon, label, on, service }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__ac-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ac-row-title`,
        kids: [
          Skeletons.Image.Svg({
            ico: icon,
            className: `${pfx}__ac-row-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__ac-row-label`,
            content: label,
          }),
        ],
      }),
      toggleSwitch(ui, { on, service }),
    ],
  });
}

// Minimal country list with flag emojis (representative set per Figma).
// Order matches the design's first-screen ordering so reviewers see the same
// scrollback when developing against the mock.
const COUNTRIES = [
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "BS", name: "The Bahamas", flag: "🇧🇸" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "CK", name: "Cook Islands", flag: "🇨🇰" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "US", name: "United States", flag: "🇺🇸" },
];

function findCountry(code) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) || null;
}

function countryDropdown(ui, kind) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const selectedCode =
    kind === "allowed" ? sc.allowedCountry : sc.blockedCountry;
  const q = (sc.countrySearch || "").trim().toLowerCase();
  const list = q
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q))
    : COUNTRIES;

  return Skeletons.Box.Y({
    className: `${pfx}__ac-cdrop`,
    dataset: { kind },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ac-cdrop-search`,
        kids: [
          Skeletons.Image.Svg({
            ico: "magnifying-glass",
            className: `${pfx}__ac-cdrop-search-ico`,
          }),
          Skeletons.Entry({
            className: `${pfx}__ac-cdrop-search-input`,
            placeholder: LOCALE.SEARCH_PLACEHOLDER || "Search…",
            require: "any",
            mode: "commit",
            service: "apps-ac-country-search",
            sys_pn: `ac-country-search:${kind}`,
            partHandler: ui,
            uiHandler: [ui],
            bubble: 0,
            value: sc.countrySearch || "",
          }),
          Skeletons.Box.X({
            className: `${pfx}__ac-cdrop-kbd`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__ac-cdrop-kbd-glyph`,
                content: "⌘K",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__ac-cdrop-list`,
        kids: list.length
          ? list.map((c) => {
              const checked = c.code === selectedCode;
              return Skeletons.Box.X({
                className: `${pfx}__ac-cdrop-item${checked ? ` ${pfx}__ac-cdrop-item--checked` : ""}`,
                service: "apps-ac-select-country",
                uiHandler: [ui],
                country_kind: kind,
                country_code: c.code,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__ac-cdrop-flag`,
                    content: c.flag,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__ac-cdrop-name`,
                    content: c.name,
                  }),
                  Skeletons.Box.X({
                    className: `${pfx}__ac-cdrop-radio${checked ? ` ${pfx}__ac-cdrop-radio--on` : ""}`,
                    kids: checked
                      ? [
                          Skeletons.Image.Svg({
                            ico: "editbox_checkmark",
                            className: `${pfx}__ac-cdrop-radio-mark`,
                          }),
                        ]
                      : [],
                  }),
                ],
              });
            })
          : [
              Skeletons.Note({
                className: `${pfx}__ac-cdrop-empty`,
                content: LOCALE.NO_RESULTS || "No results",
              }),
            ],
      }),
    ],
  });
}

function countryPickerRow(ui, { kind, label, labelClass }) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const selectedCode =
    kind === "allowed" ? sc.allowedCountry : sc.blockedCountry;
  const sel = findCountry(selectedCode);
  const open = sc.countryPickerOpen === kind;

  return Skeletons.Box.X({
    className: `${pfx}__ac-country-row${open ? ` ${pfx}__ac-country-row--open` : ""}`,
    service: "apps-ac-pick-country",
    uiHandler: [ui],
    country_kind: kind,
    dataset: { kind },
    kids: [
      Skeletons.Note({
        className: `${pfx}__ac-country-label ${labelClass}`,
        content: label,
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-country-picker`,
        kids: [
          sel
            ? Skeletons.Note({
                className: `${pfx}__ac-country-flag`,
                content: sel.flag,
              })
            : null,
          Skeletons.Note({
            className: sel
              ? `${pfx}__ac-country-value`
              : `${pfx}__ac-country-placeholder`,
            content: sel ? sel.name : LOCALE.SELECT_COUNTRY || "Select country",
          }),
          Skeletons.Image.Svg({
            ico: "apps-caret-down",
            className: `${pfx}__ac-country-caret`,
          }),
        ].filter(Boolean),
      }),
    ],
  });
}

function geoSection(ui) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const kids = [
    toggleRow(ui, {
      icon: "apps-globe",
      label: LOCALE.GEO_FENCING || "Geo-Fencing",
      on: !!sc.geoOn,
      service: "apps-ac-toggle-geo",
    }),
  ];
  if (sc.geoOn) {
    const listKids = [
      countryPickerRow(ui, {
        kind: "allowed",
        label: LOCALE.ALLOWED || "ALLOWED",
        labelClass: `${pfx}__ac-country-label--allowed`,
      }),
      countryPickerRow(ui, {
        kind: "blocked",
        label: LOCALE.BLOCKED || "BLOCKED",
        labelClass: `${pfx}__ac-country-label--blocked`,
      }),
    ];
    // Floating dropdown is rendered as a sibling of the rows so its inner
    // service routes (search input, country items) don't bubble through the
    // row's `apps-ac-pick-country` handler.
    if (sc.countryPickerOpen) {
      listKids.push(countryDropdown(ui, sc.countryPickerOpen));
    }
    kids.push(
      Skeletons.Box.Y({
        className: `${pfx}__ac-country-list`,
        dataset: { open: sc.countryPickerOpen || "" },
        kids: listKids,
      }),
    );
  }
  return Skeletons.Box.Y({
    className: `${pfx}__ac-section`,
    kids,
  });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(t) {
  if (!t) return "";
  const h = t.hour || 12;
  const m = t.minute == null ? 0 : t.minute;
  const p = t.period || "AM";
  return `${pad2(h)}:${pad2(m)} ${p}`;
}

function timePicker(ui, { kind, placeholder, value, open }) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__ac-time-field${open ? ` ${pfx}__ac-time-field--open` : ""}`,
    service: "apps-ac-pick-time",
    uiHandler: [ui],
    time_kind: kind,
    dataset: { kind },
    kids: [
      Skeletons.Note({
        className: `${pfx}__ac-time-placeholder`,
        content: placeholder,
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-time-value`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__ac-time-text`,
            content: value,
          }),
          Skeletons.Image.Svg({
            ico: "apps-caret-down",
            className: `${pfx}__ac-time-caret`,
          }),
        ],
      }),
    ],
  });
}

function timeUnitOptions(unit) {
  // Hours: 1..12; Minutes: 5-minute increments for the visual list, but the
  // input accepts any 0..59 value via keyboard.
  if (unit === "hour") {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }
  return Array.from({ length: 12 }, (_, i) => i * 5);
}

function timeUnitFlyout(ui, kind, unit) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const t = (kind === "start" ? sc.startTime : sc.endTime) || {};
  const current =
    unit === "hour" ? t.hour || 12 : t.minute == null ? 0 : t.minute;
  return Skeletons.Box.Y({
    className: `${pfx}__ac-tdrop-flyout`,
    dataset: { kind, unit },
    kids: timeUnitOptions(unit).map((v) =>
      Skeletons.Box.X({
        className: `${pfx}__ac-tdrop-flyout-item${v === current ? ` ${pfx}__ac-tdrop-flyout-item--on` : ""}`,
        service: `apps-ac-time-${unit}-pick`,
        uiHandler: [ui],
        time_kind: kind,
        time_value: v,
        kids: [
          Skeletons.Note({
            className: `${pfx}__ac-tdrop-flyout-text`,
            content: pad2(v),
          }),
        ],
      }),
    ),
  });
}

function timeUnitColumn(ui, { kind, unit, label, t, openUnit }) {
  const pfx = ui.fig.family;
  const value =
    unit === "hour" ? t.hour || 12 : t.minute == null ? 0 : t.minute;
  const open = openUnit === unit;
  return Skeletons.Box.Y({
    className: `${pfx}__ac-tdrop-col`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__ac-tdrop-col-label`,
        content: label,
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-tdrop-pill${open ? ` ${pfx}__ac-tdrop-pill--open` : ""}`,
        // The caret area toggles the flyout. The Entry has bubble:0 so typing
        // and clicking inside the input doesn't re-fire this service.
        service: `apps-ac-time-${unit}-toggle`,
        uiHandler: [ui],
        time_kind: kind,
        kids: [
          Skeletons.Entry({
            className: `${pfx}__ac-tdrop-pill-input`,
            sys_pn: `ac-time-${kind}-${unit}`,
            partHandler: ui,
            uiHandler: [ui],
            value: pad2(value),
            require: "any",
            mode: "commit",
            service: `apps-ac-time-${unit}-input`,
            time_kind: kind,
            bubble: 0,
            preselect: 1,
          }),
          Skeletons.Image.Svg({
            ico: "apps-caret-down",
            className: `${pfx}__ac-tdrop-pill-caret`,
          }),
        ],
      }),
      open ? timeUnitFlyout(ui, kind, unit) : null,
    ].filter(Boolean),
  });
}

function timeDropdown(ui, kind) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const t = (kind === "start" ? sc.startTime : sc.endTime) || {};
  const isAM = (t.period || "AM") === "AM";
  const openUnit =
    sc.timeUnitOpen && sc.timeUnitOpen.startsWith(`${kind}-`)
      ? sc.timeUnitOpen.slice(kind.length + 1)
      : null;

  return Skeletons.Box.Y({
    className: `${pfx}__ac-tdrop`,
    dataset: { kind },
    kids: [
      // Header strip — purple clock + time display
      Skeletons.Box.X({
        className: `${pfx}__ac-tdrop-header`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-clock",
            className: `${pfx}__ac-tdrop-header-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__ac-tdrop-header-time`,
            content: formatTime(t),
          }),
        ],
      }),
      Skeletons.Box.X({ className: `${pfx}__ac-tdrop-divider` }),
      // Hour / Minute / Period columns
      Skeletons.Box.X({
        className: `${pfx}__ac-tdrop-cols`,
        kids: [
          timeUnitColumn(ui, {
            kind,
            unit: "hour",
            label: LOCALE.HOUR || "Hour",
            t,
            openUnit,
          }),
          timeUnitColumn(ui, {
            kind,
            unit: "minute",
            label: LOCALE.MINUTE || "Minute",
            t,
            openUnit,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__ac-tdrop-col`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__ac-tdrop-col-label`,
                content: LOCALE.PERIOD || "Period",
              }),
              Skeletons.Box.X({
                className: `${pfx}__ac-tdrop-period`,
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}__ac-tdrop-period-half ${pfx}__ac-tdrop-period-half--left${isAM ? ` ${pfx}__ac-tdrop-period-half--on` : ""}`,
                    service: "apps-ac-time-period",
                    uiHandler: [ui],
                    time_kind: kind,
                    period_value: "AM",
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}__ac-tdrop-period-label`,
                        content: "AM",
                      }),
                    ],
                  }),
                  Skeletons.Box.X({
                    className: `${pfx}__ac-tdrop-period-half ${pfx}__ac-tdrop-period-half--right${!isAM ? ` ${pfx}__ac-tdrop-period-half--on` : ""}`,
                    service: "apps-ac-time-period",
                    uiHandler: [ui],
                    time_kind: kind,
                    period_value: "PM",
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}__ac-tdrop-period-label`,
                        content: "PM",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LETTERS = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
  sun: "S",
};

function dayChip(ui, key, active) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__ac-day${active ? ` ${pfx}__ac-day--on` : ""}`,
    service: "apps-ac-toggle-day",
    uiHandler: [ui],
    day_key: key,
    kids: [
      Skeletons.Note({
        className: `${pfx}__ac-day-letter`,
        content: DAY_LETTERS[key],
      }),
    ],
  });
}

function timeWindowSection(ui) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const days = sc.days || {};
  const kids = [
    toggleRow(ui, {
      icon: "apps-clock",
      label: LOCALE.TIME_WINDOW || "Time Window",
      on: !!sc.timeOn,
      service: "apps-ac-toggle-time",
    }),
  ];
  if (sc.timeOn) {
    const timeRowKids = [
      timePicker(ui, {
        kind: "start",
        placeholder: LOCALE.START_TIME || "Start time",
        value: formatTime(sc.startTime),
        open: sc.timePickerOpen === "start",
      }),
      timePicker(ui, {
        kind: "end",
        placeholder: LOCALE.END_TIME || "End time",
        value: formatTime(sc.endTime),
        open: sc.timePickerOpen === "end",
      }),
    ];
    // Time dropdown rendered as a sibling of the pickers so internal services
    // (hour/minute/period) don't bubble through the picker's pick-time handler.
    if (sc.timePickerOpen) {
      timeRowKids.push(timeDropdown(ui, sc.timePickerOpen));
    }
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__ac-time-row`,
        dataset: { open: sc.timePickerOpen || "" },
        kids: timeRowKids,
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-days-row`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__ac-days-label`,
            content: LOCALE.OPERATIONAL_DAYS || "Operational Days",
          }),
          Skeletons.Box.X({
            className: `${pfx}__ac-days-chips`,
            kids: DAY_KEYS.map((k) => dayChip(ui, k, !!days[k])),
          }),
        ],
      }),
    );
  }
  return Skeletons.Box.Y({
    className: `${pfx}__ac-section`,
    kids,
  });
}

function autoRevocationSection(ui) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const on = !!sc.autoOn;
  const mins = sc.autoMins || 30;
  const kids = [
    toggleRow(ui, {
      icon: "apps-arrow-clockwise",
      label: LOCALE.AUTO_REVOCATION || "Auto Revocation",
      on,
      service: "apps-ac-toggle-auto",
    }),
  ];
  if (on) {
    const pct = Math.max(0, Math.min(100, (mins / 120) * 100));
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__ac-slider-row`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__ac-slider`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__ac-slider-fill`,
                style: { width: `${pct}%` },
              }),
              Skeletons.Box.X({
                className: `${pfx}__ac-slider-thumb`,
                style: { left: `${pct}%` },
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__ac-slider-label`,
            content: `${mins} min`,
          }),
        ],
      }),
    );
  }
  return Skeletons.Box.Y({
    className: `${pfx}__ac-section`,
    kids,
  });
}

function oneTimeLinkSection(ui) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const on = !!sc.oneTimeOn;
  const kids = [
    Skeletons.Box.X({
      className: `${pfx}__ac-row`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__ac-row-title`,
          kids: [
            Skeletons.Image.Svg({
              ico: "apps-link-simple",
              className: `${pfx}__ac-row-ico`,
            }),
            Skeletons.Note({
              className: `${pfx}__ac-row-label`,
              content: LOCALE.ONE_TIME_LINK || "One-time link",
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__ac-row-trailing`,
          kids: [
            on
              ? Skeletons.Note({
                  className: `${pfx}__ac-row-sub`,
                  content:
                    LOCALE.EXPIRES_AFTER_SINGLE ||
                    "Expires after single access",
                })
              : null,
            toggleSwitch(ui, { on, service: "apps-ac-toggle-onetime" }),
          ].filter(Boolean),
        }),
      ],
    }),
  ];
  if (on) {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}__ac-link-field`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__ac-link-text`,
            content: sc.oneTimeUrl || "",
          }),
          Skeletons.Box.X({
            className: `${pfx}__ac-link-copy`,
            service: "apps-ac-copy-link",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({
                ico: "apps-copy",
                className: `${pfx}__ac-link-copy-ico`,
              }),
            ],
          }),
        ],
      }),
    );
  }
  return Skeletons.Box.Y({
    className: `${pfx}__ac-section`,
    kids,
  });
}

function memberAvatar(pfx, m) {
  if (m.avatar === "neutral") {
    return Skeletons.Box.X({
      className: `${pfx}__ac-avatar ${pfx}__ac-avatar--neutral`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__ac-avatar-initials`,
          content: m.initials || "??",
        }),
      ],
    });
  }
  return Skeletons.Box.X({ className: `${pfx}__ac-avatar` });
}

function memberRow(ui, m) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__ac-member-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ac-member-info`,
        kids: [
          memberAvatar(pfx, m),
          Skeletons.Box.Y({
            className: `${pfx}__ac-member-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__ac-member-name`,
                content: m.name,
              }),
              Skeletons.Note({
                className: `${pfx}__ac-member-email`,
                content: m.email,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-role-pill`,
        service: "apps-ac-change-role",
        uiHandler: [ui],
        member_id: m.id,
        kids: [
          Skeletons.Note({
            className: `${pfx}__ac-role-pill-label`,
            content: m.role,
          }),
          Skeletons.Image.Svg({
            ico: "apps-caret-down",
            className: `${pfx}__ac-role-pill-caret`,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-row-remove`,
        service: "apps-ac-remove-member",
        uiHandler: [ui],
        member_id: m.id,
        kids: [
          Skeletons.Image.Svg({
            ico: "trash",
            className: `${pfx}__ac-row-remove-ico`,
          }),
        ],
      }),
    ],
  });
}

function deviceRow(ui, d) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__ac-device-row`,
    kids: [
      Skeletons.Image.Svg({
        ico: d.kind === "mobile" ? "apps-mobile" : "apps-laptop",
        className: `${pfx}__ac-device-ico`,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__ac-device-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__ac-device-name`,
            content: d.name,
          }),
          Skeletons.Note({
            className: `${pfx}__ac-device-info`,
            content: d.info,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-device-remove`,
        service: "apps-ac-remove-device",
        uiHandler: [ui],
        device_id: d.id,
        kids: [
          Skeletons.Image.Svg({
            ico: "cross",
            className: `${pfx}__ac-device-remove-ico`,
          }),
        ],
      }),
    ],
  });
}

function sectionHeading(
  ui,
  { icon, label, addLabel, addService, removeAllService },
) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__ac-sec-heading`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ac-row-title`,
        kids: [
          Skeletons.Image.Svg({
            ico: icon,
            className: `${pfx}__ac-row-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__ac-row-label`,
            content: label,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__ac-sec-actions`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__ac-add-input`,
            service: addService,
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__ac-add-placeholder`,
                content: addLabel,
              }),
              Skeletons.Box.X({
                className: `${pfx}__ac-add-plus`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__ac-add-plus-glyph`,
                    content: "+",
                  }),
                ],
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__ac-remove-all`,
            service: removeAllService,
            uiHandler: [ui],
            kids: [
              Skeletons.Note({
                className: `${pfx}__ac-remove-all-label`,
                content: LOCALE.REMOVE_ALL || "Remove all",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function emptyRow(pfx, message) {
  return Skeletons.Box.X({
    className: `${pfx}__ac-empty`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__ac-empty-label`,
        content: message,
      }),
    ],
  });
}

function memberSection(ui) {
  const pfx = ui.fig.family;
  const members = ((ui._secCtrl && ui._secCtrl.members) || []).map(
    mapMemberRow,
  );
  return Skeletons.Box.Y({
    className: `${pfx}__ac-section`,
    kids: [
      sectionHeading(ui, {
        icon: "apps-user-circle",
        label: LOCALE.MEMBER_PERMISSIONS || "Member Permissions",
        addLabel: LOCALE.ADD_MEMBER || "Add member",
        addService: "apps-ac-add-member",
        removeAllService: "apps-ac-remove-all-members",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__ac-list`,
        kids: members.length
          ? members.map((m) => memberRow(ui, m))
          : [
              emptyRow(
                pfx,
                LOCALE.NO_FOLDER_MEMBERS || "No member has access yet.",
              ),
            ],
      }),
    ],
  });
}

function deviceSection(ui) {
  const pfx = ui.fig.family;
  const devices = (ui._secCtrl && ui._secCtrl.devices) || [];
  return Skeletons.Box.Y({
    className: `${pfx}__ac-section`,
    kids: [
      sectionHeading(ui, {
        icon: "apps-devices",
        label: LOCALE.DEVICE_ACCESS || "Device Access",
        addLabel: LOCALE.ADD_DEVICE || "Add device",
        addService: "apps-ac-add-device",
        removeAllService: "apps-ac-remove-all-devices",
      }),
      Skeletons.Box.Y({
        className: `${pfx}__ac-device-list`,
        kids: devices.length
          ? devices.map((d) => deviceRow(ui, d))
          : [emptyRow(pfx, LOCALE.NO_DEVICES || "No devices linked.")],
      }),
    ],
  });
}

// ─────────────────────────────────────────────────────────────
//  ACCESS AUDIT LOG — shared-workspace section + drill-in
// ─────────────────────────────────────────────────────────────

// Mock entries — UI-only stub matching the Figma at 100:51230. Replace with
// a backend feed when the audit service is wired up.
const AUDIT_ENTRIES = [
  {
    id: 1,
    firstname: "Marcus",
    lastname: "Thorne",
    email: "marcus@drumee.io",
    avatar: "dark",
    ts: "Oct 24, 2023 - 14:22:05",
  },
  {
    id: 2,
    firstname: "Elena",
    lastname: "Rodriguez",
    email: "elena.r@drumee.io",
    avatar: "dark",
    ts: "Oct 23, 2023 - 11:45:12",
  },
  {
    id: 3,
    firstname: "Samir",
    lastname: "Al-Fayed",
    email: "samir@drumee.io",
    avatar: "dark",
    ts: "Oct 23, 2023 - 19:30:55",
  },
  {
    id: 4,
    fullname: "System (Bot)",
    email: "automation-service",
    avatar: "neutral",
    ts: "Oct 23, 2023 - 00:00:00",
  },
  {
    id: 5,
    fullname: "System (Bot)",
    email: "automation-service",
    avatar: "neutral",
    ts: "Oct 23, 2023 - 00:00:00",
  },
];

// In shared mode the audit log is a section in the main body; clicking it
// drills into the dedicated audit view. Matches the chevron-right affordance
// reviewers expect for "tap row → push view" navigation.
function auditLogSection(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__ac-row ${pfx}__ac-row--nav`,
    service: "apps-ac-open-audit",
    uiHandler: [ui],
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ac-row-title`,
        kids: [
          Skeletons.Image.Svg({
            ico: "apps-arrow-clockwise",
            className: `${pfx}__ac-row-ico`,
          }),
          Skeletons.Note({
            className: `${pfx}__ac-row-label`,
            content: LOCALE.ACCESS_AUDIT_LOG || "Access Audit Log",
          }),
        ],
      }),
      Skeletons.Image.Svg({
        ico: "apps-caret-down",
        className: `${pfx}__ac-row-chevron`,
      }),
    ],
  });
}

function auditEntryRow(ui, entry) {
  const pfx = ui.fig.family;
  const m = mapMemberRow(entry);
  return Skeletons.Box.X({
    className: `${pfx}__ac-audit-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__ac-audit-user`,
        kids: [
          memberAvatar(pfx, m),
          Skeletons.Box.Y({
            className: `${pfx}__ac-audit-user-text`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__ac-audit-user-name`,
                content: m.name,
              }),
              Skeletons.Note({
                className: `${pfx}__ac-audit-user-email`,
                content: m.email,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__ac-audit-ts`,
        content: entry.ts,
      }),
    ],
  });
}

function auditDrillIn(ui, hub) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const total = sc.auditTotal || 0;
  const pageSize = sc.auditPageSize || 25;
  const page = sc.auditPage || 1;
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return [
    // Header — Back arrow + close
    Skeletons.Box.Y({
      className: `${pfx}__ac-header`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__ac-header-row`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__ac-back`,
              service: "apps-ac-back-from-audit",
              uiHandler: [ui],
              kids: [
                Skeletons.Image.Svg({
                  ico: "apps-caret-down",
                  className: `${pfx}__ac-back-ico`,
                }),
                Skeletons.Note({
                  className: `${pfx}__ac-back-label`,
                  content: LOCALE.BACK || "Back",
                }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}__ac-close`,
              service: "apps-ac-close",
              uiHandler: [ui],
              kids: [
                Skeletons.Image.Svg({
                  ico: "cross",
                  className: `${pfx}__ac-close-ico`,
                }),
              ],
            }),
          ],
        }),
        hubHeader(ui, hub),
      ],
    }),
    // Body — toggle row, table, entries
    Skeletons.Box.Y({
      className: `${pfx}__ac-body ${pfx}__ac-body--audit`,
      kids: [
        toggleRow(ui, {
          icon: "apps-arrow-clockwise",
          label: LOCALE.ACCESS_AUDIT_LOG || "Access Audit Log",
          on: !!sc.auditOn,
          service: "apps-ac-toggle-audit",
        }),
        sc.auditOn
          ? Skeletons.Box.Y({
              className: `${pfx}__ac-audit-table`,
              kids: [
                Skeletons.Box.X({
                  className: `${pfx}__ac-audit-thead`,
                  kids: [
                    Skeletons.Note({
                      className: `${pfx}__ac-audit-th ${pfx}__ac-audit-th--user`,
                      content: LOCALE.USER || "User",
                    }),
                    Skeletons.Note({
                      className: `${pfx}__ac-audit-th ${pfx}__ac-audit-th--ts`,
                      content: LOCALE.TIMESTAMP || "Timestamp",
                    }),
                  ],
                }),
                Skeletons.Box.Y({
                  className: `${pfx}__ac-audit-list`,
                  kids: AUDIT_ENTRIES.map((e) => auditEntryRow(ui, e)),
                }),
              ],
            })
          : null,
      ].filter(Boolean),
    }),
    // Footer — pagination
    Skeletons.Box.X({
      className: `${pfx}__ac-audit-footer`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__ac-audit-count`,
          content: total
            ? `Showing ${start}-${end} of ${total.toLocaleString()} entries`
            : "",
        }),
        Skeletons.Box.X({
          className: `${pfx}__ac-audit-pager`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}__ac-audit-pager-btn${page <= 1 ? ` ${pfx}__ac-audit-pager-btn--disabled` : ""}`,
              service: page > 1 ? "apps-ac-audit-prev" : null,
              uiHandler: page > 1 ? [ui] : null,
              kids: [
                Skeletons.Image.Svg({
                  ico: "apps-caret-down",
                  className: `${pfx}__ac-audit-pager-ico ${pfx}__ac-audit-pager-ico--prev`,
                }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}__ac-audit-pager-btn${page >= pageCount ? ` ${pfx}__ac-audit-pager-btn--disabled` : ""}`,
              service: page < pageCount ? "apps-ac-audit-next" : null,
              uiHandler: page < pageCount ? [ui] : null,
              kids: [
                Skeletons.Image.Svg({
                  ico: "apps-caret-down",
                  className: `${pfx}__ac-audit-pager-ico ${pfx}__ac-audit-pager-ico--next`,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

function mainView(ui, hub) {
  const pfx = ui.fig.family;
  const sc = ui._secCtrl || {};
  const isShared = sc.mode === "shared";
  const bodyKids = [
    geoSection(ui),
    toggleRow(ui, {
      icon: "apps-lock-simple",
      label: LOCALE.VPN_REQUIRED || "VPN Required",
      on: !!sc.vpnOn,
      service: "apps-ac-toggle-vpn",
    }),
    timeWindowSection(ui),
    autoRevocationSection(ui),
  ];
  // Restricted workspaces: Member Permissions + Device Access (no One-time link).
  // Shared workspaces: One-time link + Device Access + Access Audit Log nav row.
  if (isShared) {
    bodyKids.push(
      oneTimeLinkSection(ui),
      deviceSection(ui),
      auditLogSection(ui),
    );
  } else {
    bodyKids.push(memberSection(ui), deviceSection(ui));
  }
  return [
    // Header
    Skeletons.Box.Y({
      className: `${pfx}__ac-header`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__ac-header-row`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__ac-title`,
              content: LOCALE.ACCESS_CONTROL || "Access control",
            }),
            Skeletons.Box.X({
              className: `${pfx}__ac-close`,
              service: "apps-ac-close",
              uiHandler: [ui],
              kids: [
                Skeletons.Image.Svg({
                  ico: "cross",
                  className: `${pfx}__ac-close-ico`,
                }),
              ],
            }),
          ],
        }),
        hubHeader(ui, hub),
      ],
    }),
    // Body
    Skeletons.Box.Y({
      className: `${pfx}__ac-body`,
      kids: bodyKids,
    }),
    // Footer
    Skeletons.Box.Y({
      className: `${pfx}__ac-footer`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__ac-save-btn`,
          service: "apps-ac-save",
          uiHandler: [ui],
          kids: [
            Skeletons.Image.Svg({
              ico: "apps-floppy",
              className: `${pfx}__ac-save-ico`,
            }),
            Skeletons.Note({
              className: `${pfx}__ac-save-label`,
              content: LOCALE.SAVE_CHANGES || "Save Changes",
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${pfx}__ac-audit-btn`,
          service: "apps-ac-view-audit",
          uiHandler: [ui],
          kids: [
            Skeletons.Image.Svg({
              ico: "apps-arrow-clockwise",
              className: `${pfx}__ac-audit-ico`,
            }),
            Skeletons.Note({
              className: `${pfx}__ac-audit-label`,
              content: LOCALE.VIEW_ACCESS_AUDIT || "View Access Audit",
            }),
          ],
        }),
      ],
    }),
  ];
}

export default function access_control_overlay(ui) {
  const pfx = ui.fig.family;
  const hub = ui._editingHub;
  if (!hub) return null;
  const sc = ui._secCtrl || {};
  const cardKids = sc.auditView ? auditDrillIn(ui, hub) : mainView(ui, hub);

  return Skeletons.Box.Y({
    className: `${pfx}__ac-overlay`,
    dataset: { state: "open", view: sc.auditView ? "audit" : "main" },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__ac-card`,
        kids: cardKids,
      }),
    ],
  });
}
