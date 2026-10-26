// Personal meeting modal — Figma 1693:163829 (create), 1693:166935 (the same
// form in two columns, for short screens), 1693:163906 (invite link ready).
//
// Title · Date · Attachments · Enter time → End time · Invite, built as ONE
// tree. The skin stacks it in the frame's single 460px column and, on a short
// wide screen, lays the same nodes out in the landscape frame's two columns.
// Two trees with one hidden by CSS would put every input `name` in the DOM
// twice, and the submit reads by name (getData) — the hidden, empty copy of
// the password could win while the toggle still says it is on.
//
// Invite holds "Add password protection" only: room.public_link's `password`,
// which the server enforces. The frames also draw "Require email to view" and
// "Restrict access to specific emails or domains". Those are not drawn,
// because nothing on the server acts on them yet — the per-email grant they
// would feed (room.js _commit_invitation) has no caller, so the link would
// stay open to anyone holding it. Their handlers (index.js
// cal-toggle-require-email / cal-toggle-restrict / cal-add-recipient) and
// recipientChips stay, so drawing the rows again is all it takes once the
// server makes that call.
//
// Attachments are not in the frames but the feature ships (room.link_files),
// so they sit under Date.

const dateField = require("./date-field");
const attachments = require("./attachments");

// Button.Svg renders a plain div: no role, not in the tab order. These make
// the icon buttons below focusable and announced; index.js _installFormKeys
// presses them on Enter / Space.
const keyButton = (label) => ({ "aria-label": label, role: "button", tabindex: "0" });

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

// Recipient chips for the "Restrict access" list. Not drawn while that row is
// hidden (see the header); kept for index.js _renderRecipients, which feeds
// the "form-recipient-chips" part once the row is back.
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

  // The password row is always rendered and hidden by data-open, so flipping
  // the checkbox is an attribute change rather than a re-render.
  const inviteBlock = Skeletons.Box.Y({
    className: `${pfx}__invite-group`,
    kids: [
      toggleRow(ui, {
        ico: "app-lock",
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
                // A toggle: "Show", pressed while the password is shown
                // (index.js flips aria-pressed with the icon).
                attrOpt: { ...keyButton(LOCALE.SHOW), "aria-pressed": "false" },
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
            attrOpt: keyButton(LOCALE.CLOSE),
          }),
        ],
      }),

      // What and when in the main column, Invite in the side one. The skin
      // stacks the two (the portrait frame) and puts them side by side only
      // on a short wide screen (the landscape frame).
      Skeletons.Box.Y({
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
                Skeletons.Box.X({
                  className: `${pfx}__date-box`,
                  kids: [
                    dateField(ui, { name: "meeting_date", value: draft.date }),
                    Skeletons.Image.Svg({ ico: "top-calendar", className: `${pfx}__date-ico` }),
                  ],
                }),
              ),

              field("ATTACHMENTS", attachments(ui)),

              Skeletons.Box.X({
                className: `${pfx}__time-row`,
                kids: [
                  field("ENTER_TIME", timePicker(ui, "start", draft.start)),
                  Skeletons.Image.Svg({ ico: "arrow-right", className: `${pfx}__time-arrow` }),
                  field("END_TIME", timePicker(ui, "end", draft.end)),
                ],
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__modal-col ${pfx}__modal-col--side`,
            kids: [field("INVITE", inviteBlock)],
          }),
        ],
      }),

      // One full-width action, as the frames draw it; the × closes.
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

// "Invite link ready" — Figma 1693:163906. Shown after room.public_link
// answers; the link is already on the clipboard by then. One filled row:
// link glyph, the link (truncated, full text in the tooltip) and a copy
// button, then Done.
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
            attrOpt: keyButton(LOCALE.CLOSE),
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__link-row`,
        kids: [
          Skeletons.Image.Svg({ ico: "chat-link-simple", className: `${pfx}__link-ico` }),
          Skeletons.Note({
            className: `${pfx}__link-text`,
            content: link,
            attrOpt: { title: link },
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__link-copy`,
            ico: "chat-action-copy",
            bubble: 0,
            service: "cal-copy-link",
            uiHandler: [ui],
            attrOpt: { ...keyButton(LOCALE.COPY_LINK), title: LOCALE.COPY_LINK },
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
