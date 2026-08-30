// Personal meeting modal — Figma 58222:396301, 58227:18289, 58227:19341.
//
// Title · Date · start/end time · Invite. The Invite block is the SECURE-SHARE
// access-control block, which is what the frames actually draw (decision C-02) —
// and all three controls already exist server-side on the room path:
//
//   "Require email to view"  → per-email dmz grants via room.js _commit_invitation,
//                              which also sends real invitation mail
//   "Restrict to emails…"    → the recipient list handed to that same call
//   "Add password protection"→ room.public_link's `password` param
//
// The per-email grant is issued 'no_traversal', so an invitee — member or not —
// never gains workspace access. That is requirement §5, already enforced by the
// server rather than by this form.

// 12-hour clock parts, matching the frames' Hour / Minute / AM-PM triplet.
function timePicker(ui, which, value) {
  const pfx = ui.fig.family;
  const v = value || {};
  const meridiem = v.meridiem === "PM" ? "PM" : "AM";

  const numberBox = (part, val, placeholderKey) =>
    Skeletons.Box.Y({
      className: `${pfx}__time-part`,
      kids: [
        Skeletons.Entry({
          className: `${pfx}__time-input`,
          formItem: `${which}_${part}`,
          name: `${which}_${part}`,
          value: val == null ? "" : String(val),
          require: "any",
          bubble: 0,
          service: "cal-form-time",
          uiHandler: [ui],
        }),
        Skeletons.Note({
          className: `${pfx}__time-caption`,
          content: LOCALE[placeholderKey],
        }),
      ],
    });

  const meridiemToggle = Skeletons.Box.Y({
    className: `${pfx}__meridiem`,
    kids: ["AM", "PM"].map((m) =>
      Skeletons.Note({
        className: `${pfx}__meridiem-item`,
        content: m,
        attrOpt: { "data-active": m === meridiem ? "1" : "0" },
        bubble: 0,
        service: "cal-form-meridiem",
        uiHandler: [ui],
        calWhich: which,
        calMeridiem: m,
      }),
    ),
  });

  return Skeletons.Box.X({
    className: `${pfx}__time`,
    kids: [
      numberBox("hour", v.hour, "HOUR"),
      Skeletons.Note({ className: `${pfx}__time-colon`, content: ":" }),
      numberBox("minute", v.minute, "MINUTE"),
      meridiemToggle,
    ],
  });
}

// One row of the Invite block: icon, label, hint, checkbox.
function toggleRow(ui, opt) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__toggle-row`,
    attrOpt: { "data-on": opt.on ? "1" : "0" },
    bubble: 0,
    service: opt.service,
    uiHandler: [ui],
    // active:0 or a child eats the click before triggerHandlers runs.
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({ ico: opt.ico, className: `${pfx}__toggle-ico` }),
      Skeletons.Box.Y({
        className: `${pfx}__toggle-text`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__toggle-label`,
            content: LOCALE[opt.labelKey],
          }),
          Skeletons.Note({
            className: `${pfx}__toggle-hint`,
            content: LOCALE[opt.hintKey],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__checkbox`,
        attrOpt: { "data-checked": opt.on ? "1" : "0" },
      }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const draft = form.draft || {};
  const recipients = Array.isArray(draft.recipients) ? draft.recipients : [];

  const field = (labelKey, control) =>
    Skeletons.Box.Y({
      className: `${pfx}__field`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__field-label`,
          content: LOCALE[labelKey],
        }),
        control,
      ],
    });

  // Recipient chips + entry, revealed only when "restrict" is on.
  const recipientList = Skeletons.Box.Y({
    className: `${pfx}__recipients`,
    kids: [
      recipients.length
        ? Skeletons.Box.X({
            className: `${pfx}__chips`,
            kids: recipients.map((email) =>
              Skeletons.Box.X({
                className: `${pfx}__email-chip`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__email-chip-text`,
                    content: email,
                  }),
                  Skeletons.Button.Svg({
                    className: `${pfx}__email-chip-remove`,
                    ico: "cross",
                    bubble: 0,
                    service: "cal-remove-recipient",
                    uiHandler: [ui],
                    calEmail: email,
                  }),
                ],
              }),
            ),
          })
        : null,
      Skeletons.Entry({
        className: `${pfx}__input`,
        sys_pn: "form-recipient",
        name: "recipient",
        placeholder: LOCALE.ENTER_EMAIL_OR_DOMAIN,
        require: "any",
        mode: "commit",
        bubble: 0,
        service: "cal-add-recipient",
        uiHandler: [ui],
        partHandler: ui,
      }),
    ].filter(Boolean),
  });

  const inviteBlock = Skeletons.Box.Y({
    className: `${pfx}__invite`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__invite-group`,
        kids: [
          toggleRow(ui, {
            ico: "ph-envelope-simple",
            labelKey: "REQUIRE_EMAIL_TO_VIEW",
            hintKey: "REQUIRE_EMAIL_HINT",
            on: !!draft.require_email,
            service: "cal-toggle-require-email",
          }),
          // The restrict sub-toggle only exists once an email is required —
          // restricting to a list you never collect is meaningless.
          draft.require_email
            ? Skeletons.Box.Y({
                className: `${pfx}__invite-sub`,
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}__switch-row`,
                    bubble: 0,
                    service: "cal-toggle-restrict",
                    uiHandler: [ui],
                    // active:0 or the label/switch eats the click.
                    kidsOpt: { active: 0 },
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}__switch-label`,
                        content: LOCALE.RESTRICT_ACCESS_EMAILS,
                      }),
                      Skeletons.Note({
                        className: `${pfx}__switch`,
                        attrOpt: { "data-on": draft.restrict ? "1" : "0" },
                      }),
                    ],
                  }),
                  draft.restrict ? recipientList : null,
                ].filter(Boolean),
              })
            : null,
        ].filter(Boolean),
      }),

      Skeletons.Box.Y({
        className: `${pfx}__invite-group`,
        kids: [
          toggleRow(ui, {
            ico: "ph-hard-drives",
            labelKey: "ADD_PASSWORD_PROTECTION",
            hintKey: "PASSWORD_PROTECTION_HINT",
            on: !!draft.password_on,
            service: "cal-toggle-password",
          }),
          draft.password_on
            ? Skeletons.Box.Y({
                className: `${pfx}__invite-sub`,
                kids: [
                  Skeletons.EntryBox({
                    className: `${pfx}__input`,
                    sys_pn: "form-password",
                    formItem: "password",
                    name: "password",
                    placeholder: LOCALE.PASSWORD,
                    require: "any",
                    shower: 1,
                    bubble: 0,
                    uiHandler: [ui],
                    partHandler: ui,
                  }),
                ],
              })
            : null,
        ].filter(Boolean),
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    attrOpt: { "data-form": "meeting" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__modal-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__modal-title`,
            content: LOCALE.NEW_PERSONAL_MEETING,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__modal-close`,
            ico: "cross",
            bubble: 0,
            service: "cal-close-form",
            uiHandler: [ui],
          }),
        ],
      }),

      Skeletons.Box.Y({
        className: `${pfx}__modal-body`,
        kids: [
          field(
            "TITLE",
            Skeletons.Entry({
              className: `${pfx}__input`,
              sys_pn: "form-title",
              formItem: "title",
              name: "title",
              value: draft.title || "",
              placeholder: LOCALE.TITLE,
              require: "text",
              interactive: 1,
              preselect: 1,
              bubble: 0,
              uiHandler: [ui],
              partHandler: ui,
            }),
          ),

          field("DATE", {
            kind: "date_picker",
            className: `${pfx}__date-input`,
            innerClass: `${pfx}__date-input-inner`,
            name: "meeting_date",
            placeholder: LOCALE.SELECT_DATE,
            value: draft.date || "",
            service: "cal-form-date",
            uiHandler: [ui],
            vendorOpt: {
              dateFormat: "Y-m-d",
              altInput: true,
              altFormat: "d/m/Y",
              defaultDate: draft.date || null,
              appendTo: document.body,
            },
          }),

          Skeletons.Box.X({
            className: `${pfx}__time-row`,
            kids: [
              field("ENTER_TIME", timePicker(ui, "start", draft.start)),
              Skeletons.Note({
                className: `${pfx}__time-arrow`,
                content: "→",
              }),
              field("END_TIME", timePicker(ui, "end", draft.end)),
            ],
          }),

          field("INVITE", inviteBlock),
        ],
      }),

      Skeletons.Box.X({
        className: `${pfx}__modal-foot`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__button ${pfx}__button--primary`,
            content: LOCALE.CREATE_MEETING_SEND_INVITE,
            bubble: 0,
            service: "cal-submit-meeting",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};

// "Invite link ready" — Figma 58227:43238. Shown after room.public_link
// answers; the link is already on the clipboard by then.
module.exports.inviteLink = function (ui, link) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    attrOpt: { "data-form": "invite-link" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__modal-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__modal-title`,
            content: LOCALE.INVITE_LINK_READY,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__modal-close`,
            ico: "cross",
            bubble: 0,
            service: "cal-close-form",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__link-row`,
        bubble: 0,
        service: "cal-copy-link",
        uiHandler: [ui],
        // active:0 or the link text / copy icon eats the click.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({ className: `${pfx}__link-text`, content: link }),
          // `copylink` is the sprite the rest of the product uses for this
          // exact affordance (settings/hub links, the tutorial's share step).
          Skeletons.Button.Svg({
            className: `${pfx}__link-copy`,
            ico: "copylink",
            bubble: 0,
            service: "cal-copy-link",
            uiHandler: [ui],
            attrOpt: { "aria-label": LOCALE.COPY_LINK },
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__modal-foot`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__button ${pfx}__button--primary`,
            content: LOCALE.DONE,
            bubble: 0,
            service: "cal-close-form",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
