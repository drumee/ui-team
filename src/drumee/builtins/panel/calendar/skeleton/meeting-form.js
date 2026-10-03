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

const dateField = require("./date-field");
const attachments = require("./attachments");

// 12-hour clock parts, matching the frames' Hour / Minute / AM-PM triplet.
function timePicker(ui, which, value) {
  const pfx = ui.fig.family;
  const v = value || {};
  const meridiem = v.meridiem === "PM" ? "PM" : "AM";

  // `hint` is a two-digit format sample, not copy — it stays out of LOCALE on
  // purpose. It is also not optional: ui-core's entry widget falls back to
  // LOCALE.FORM_ENTRY when no placeholder is given, and a full sentence in a
  // two-character box is worse than nothing.
  //
  // Two characters at most; which digits may go in (hour 1-12, minute 00-59)
  // is enforced as the user types by the controller (index.js
  // _installTimeFilter), since the Entry template has no pattern attribute.
  const numberBox = (part, val, placeholderKey, hint) =>
    Skeletons.Box.Y({
      className: `${pfx}__time-part`,
      kids: [
        Skeletons.Entry({
          className: `${pfx}__time-input`,
          formItem: `${which}_${part}`,
          name: `${which}_${part}`,
          value: val == null ? "" : String(val),
          placeholder: hint,
          maxlength: 2,
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
        attrOpt: { "data-active": m === meridiem ? "1" : "0", "data-key": m },
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
      numberBox("hour", v.hour, "HOUR", "12"),
      Skeletons.Note({ className: `${pfx}__time-colon`, content: ":" }),
      numberBox("minute", v.minute, "MINUTE", "00"),
      meridiemToggle,
    ],
  });
}

// One row of the Invite block: icon, label, hint, checkbox.
//
// `data-toggle` names the draft flag the row flips. The controller repaints the
// row, its checkbox and the sub-block that flag reveals from it IN PLACE
// (index.js _syncInviteDom) — a click in the modal never re-feeds the modal.
function toggleRow(ui, opt) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__toggle-row`,
    attrOpt: { "data-on": opt.on ? "1" : "0", "data-toggle": opt.flag },
    bubble: 0,
    service: opt.service,
    uiHandler: [ui],
    // active:0 or a child eats the click before triggerHandlers runs.
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({ ico: opt.ico, className: `${pfx}__toggle-ico` }),
      Skeletons.Box.Y({
        className: `${pfx}__toggle-text`,
        // kidsOpt above reaches this box but NOT its own kids, so the label and
        // hint — the widest target in the row — still swallowed the click.
        // Marked here explicitly.
        kids: [
          Skeletons.Note({
            className: `${pfx}__toggle-label`,
            content: LOCALE[opt.labelKey],
            active: 0,
          }),
          Skeletons.Note({
            className: `${pfx}__toggle-hint`,
            content: LOCALE[opt.hintKey],
            active: 0,
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

// Recipient chips. Its own part ("form-recipient-chips") so adding or removing
// an address re-feeds this row alone, not the modal around it.
function recipientChips(ui, recipients) {
  const pfx = ui.fig.family;
  return recipients.map((email) =>
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
  );
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const draft = form.draft || {};
  const recipients = Array.isArray(draft.recipients) ? draft.recipients : [];

  // `required` names the draft key the field must fill. The field then
  // carries data-field / data-required, and an error line that stays hidden
  // until the controller stamps data-error on a failed submit
  // (index.js _validateRequired).
  const field = (labelKey, control, required) =>
    Skeletons.Box.Y({
      className: `${pfx}__field`,
      attrOpt: required
        ? { "data-field": required, "data-required": "1", "data-error": "0" }
        : {},
      kids: [
        Skeletons.Note({
          className: `${pfx}__field-label`,
          content: LOCALE[labelKey],
        }),
        control,
        required
          ? Skeletons.Note({
              className: `${pfx}__field-error`,
              content: LOCALE.REQUIRE_THIS_FIELD,
            })
          : null,
      ].filter(Boolean),
    });

  // Recipient chips + entry, shown only while "restrict" is on. Always
  // rendered and hidden by data-open, so flipping the switch is an attribute
  // change rather than a re-render.
  const recipientList = Skeletons.Box.Y({
    className: `${pfx}__recipients`,
    attrOpt: {
      "data-sub": "restrict",
      "data-open": draft.restrict ? "1" : "0",
    },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__chips`,
        sys_pn: "form-recipient-chips",
        partHandler: ui,
        attrOpt: { "data-count": String(recipients.length) },
        kids: recipientChips(ui, recipients),
      }),
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
    ],
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
            flag: "require_email",
            service: "cal-toggle-require-email",
          }),
          // The restrict sub-toggle only shows once an email is required —
          // restricting to a list you never collect is meaningless.
          Skeletons.Box.Y({
            className: `${pfx}__invite-sub`,
            attrOpt: {
              "data-sub": "require_email",
              "data-open": draft.require_email ? "1" : "0",
            },
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__switch-row`,
                attrOpt: { "data-toggle": "restrict" },
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
              recipientList,
            ],
          }),
        ],
      }),

      Skeletons.Box.Y({
        className: `${pfx}__invite-group`,
        kids: [
          toggleRow(ui, {
            ico: "ph-hard-drives",
            labelKey: "ADD_PASSWORD_PROTECTION",
            hintKey: "PASSWORD_PROTECTION_HINT",
            on: !!draft.password_on,
            flag: "password_on",
            service: "cal-toggle-password",
          }),
          Skeletons.Box.Y({
            className: `${pfx}__invite-sub`,
            attrOpt: {
              "data-sub": "password_on",
              "data-open": draft.password_on ? "1" : "0",
            },
            kids: [
              // Same build as the sign-in form's PASSWORD row
              // (welcome/signin skeleton/content.js): a row holding a plain
              // password EntryBox and a separate eye button, rather than the
              // EntryBox's own `shower` icon, which it never sizes or places.
              Skeletons.Box.X({
                className: `${pfx}__password`,
                kids: [
                  Skeletons.EntryBox({
                    type: _a.password,
                    className: `${pfx}__password-input`,
                    sys_pn: "form-password",
                    formItem: "password",
                    name: "password",
                    placeholder: LOCALE.PASSWORD,
                    require: "any",
                    bubble: 0,
                    uiHandler: [ui],
                    partHandler: ui,
                  }),
                  Skeletons.Button.Svg({
                    ico: "eye_closed",
                    className: `${pfx}__password-eye`,
                    bubble: 0,
                    service: "cal-toggle-password-visibility",
                    uiHandler: [ui],
                  }),
                ],
              }),
            ],
          }),
        ],
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

      // Two columns, as in the task modal (skin stacks them under 700px):
      // what and when on the left, the time and who on the right.
      Skeletons.Box.X({
        className: `${pfx}__modal-body ${pfx}__modal-body--split`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__modal-col ${pfx}__modal-col--main`,
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
                  // Deliberately NOT interactive, and this Entry must never be
                  // given a `service`. An interactive Entry re-fires its own
                  // service on every printable keyup, which is how the task
                  // modal's title used to create a task per letter typed. Here
                  // there is no service to fire, so nothing books a room — the
                  // footer button is the only way in. Keep both halves true.
                  preselect: 1,
                  bubble: 0,
                  uiHandler: [ui],
                  partHandler: ui,
                }),
                "title",
              ),

              field(
                "DATE",
                dateField(ui, { name: "meeting_date", value: draft.date }),
              ),

              field("ATTACHMENTS", attachments(ui)),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__modal-col ${pfx}__modal-col--side`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__time-row`,
                kids: [
                  field("START_TIME", timePicker(ui, "start", draft.start)),
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
        ],
      }),

      // Cancel · confirm, as in the Meet tab's own schedule modal.
      Skeletons.Box.X({
        className: `${pfx}__modal-foot`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__button ${pfx}__button--neutral`,
            content: LOCALE.CANCEL,
            bubble: 0,
            service: "cal-close-form",
            uiHandler: [ui],
          }),
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
      // Built like Settings' referral rows (settings_main referralCard →
      // innerItem: __inner + __referral-row): a title over the value on the
      // left, a ghost "Copy" button on the right. Only the button copies, as
      // there.
      Skeletons.Box.X({
        className: `${pfx}__link-row`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__link-text-box`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__link-title`,
                content: LOCALE.SHARE_LINK,
              }),
              Skeletons.Note({
                className: `${pfx}__link-text`,
                content: link,
                attrOpt: { title: link },
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}__link-copy`,
            content: LOCALE.COPY,
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

module.exports.recipientChips = recipientChips;
