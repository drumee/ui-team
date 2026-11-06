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
// Invite (Figma 1693:200040 / 1693:200549): "Require email to view" — the
// viewer gives an email at the link's gate — which opens "Restrict access to
// specific emails or domains" (a switch, then the allowed emails / @domains),
// and "Add password protection". All three ride on room.public_link, which
// the guest gate enforces (server dmz.js).
//

const dateField = require("./date-field");

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
// The allowed emails / @domains (Figma 53:54001): two chips and a "+N" that
// opens the rest, so a long list keeps the card one row tall but every entry
// can still be seen and removed.
const CHIPS_SHOWN = 2;

function recipientChips(ui, recipients, expanded) {
  const pfx = ui.fig.family;
  const folded = !expanded && recipients.length > CHIPS_SHOWN + 1;
  const shown = folded ? recipients.slice(0, CHIPS_SHOWN) : recipients;
  const chips = shown.map((email) =>
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
          attrOpt: keyButton(LOCALE.REMOVE),
        }),
      ],
    }),
  );
  if (folded) {
    chips.push(
      Skeletons.Note({
        className: `${pfx}__email-chip ${pfx}__email-chip--more`,
        content: `+${recipients.length - CHIPS_SHOWN}`,
        bubble: 0,
        service: "cal-expand-recipients",
        uiHandler: [ui],
      }),
    );
  }
  return chips;
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const draft = form.draft || {};
  // Opened from a personal meeting's chip (index.js _openMeetingForm(row)).
  const editing = form.mode === "edit";

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

  const recipients = draft.recipients || [];

  // "Require email to view" (Figma 58227:17869): the checkbox row, and under
  // it — only while an email is required, since restricting a list you never
  // collect means nothing — the restrict switch and its email / domain list.
  // Every sub-block is always rendered and shown by data-open, so a click is
  // an attribute change (index.js _syncInviteDom), never a re-render.
  const emailBlock = Skeletons.Box.Y({
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
            // active:0 or the label / switch eats the click.
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__switch-text`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__switch-label`,
                    content: LOCALE.RESTRICT_ACCESS_EMAILS,
                    active: 0,
                  }),
                  Skeletons.Image.Svg({
                    ico: "ph-info",
                    className: `${pfx}__switch-info`,
                    active: 0,
                  }),
                ],
              }),
              Skeletons.Note({
                className: `${pfx}__switch`,
                attrOpt: { "data-on": draft.restrict ? "1" : "0" },
              }),
            ],
          }),
          Skeletons.Box.Y({
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
                kids: recipientChips(ui, recipients, form.recipientsExpanded),
              }),
              // Enter commits the entry (cal-add-recipient); the field is
              // never interactive, or every keystroke would add one.
              Skeletons.Entry({
                className: `${pfx}__input ${pfx}__recipient-input`,
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
          }),
        ],
      }),
    ],
  });

  // The password row is always rendered and hidden by data-open, so flipping
  // the checkbox is an attribute change rather than a re-render.
  const passwordBlock = Skeletons.Box.Y({
    className: `${pfx}__invite-group`,
    kids: [
      toggleRow(ui, {
        ico: "ph-key",
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
                // A password already set is never sent back: dots say there is
                // one, and an empty field keeps it.
                placeholder: draft.has_password ? "••••••••" : LOCALE.PASSWORD,
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

  const inviteBlock = Skeletons.Box.Y({
    className: `${pfx}__invite`,
    kids: [emailBlock, passwordBlock],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__modal`,
    attrOpt: { "data-form": "meeting", "data-mode": editing ? "edit" : "create" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__modal-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__modal-title`,
            content: editing ? LOCALE.MEETING_INFORMATION : LOCALE.NEW_PERSONAL_MEETING,
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

      // Two sides: what and when — title, date, the time row — on the left;
      // who — Invite — on the right, in both modes (an existing meeting's
      // Invite is read from its guest link). The skin stacks them on a
      // narrow screen.
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

              Skeletons.Box.X({
                className: `${pfx}__time-row`,
                kids: [
                  field("START_TIME", timePicker(ui, "start", draft.start)),
                  Skeletons.Image.Svg({ ico: "arrow-right", className: `${pfx}__time-arrow` }),
                  field("END_TIME", timePicker(ui, "end", draft.end)),
                ],
              }),

            ],
          }),
          // Invite settings (the link's gate): given at booking, and for an
          // existing meeting read from its link (index.js _loadMeetingLink)
          // and saved back onto that same link on Update.
          // Its own part: an edit form fills it when the link answers
          // (index.js _renderMeetingInvite), without re-feeding the modal.
          Skeletons.Box.Y({
            className: `${pfx}__modal-col ${pfx}__modal-col--side`,
            sys_pn: "meeting-invite",
            partHandler: ui,
            kids: [field("INVITE", inviteBlock)],
          }),
        ],
      }),

      // One full-width action, as the frames draw it; the × closes. An
      // existing meeting gets Delete beside Update instead.
      Skeletons.Box.X({
        className: `${pfx}__modal-foot`,
        kids: [
          editing
            ? Skeletons.Note({
                className: `${pfx}__button ${pfx}__button--danger`,
                content: LOCALE.DELETE,
                bubble: 0,
                service: "cal-delete-meeting",
                uiHandler: [ui],
              })
            : null,
          Skeletons.Note({
            className: `${pfx}__button ${pfx}__button--primary`,
            content: editing ? LOCALE.UPDATE : LOCALE.CREATE_MEETING_SEND_INVITE,
            bubble: 0,
            service: "cal-submit-meeting",
            uiHandler: [ui],
          }),
        ].filter(Boolean),
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

/**
 * The Invite side's kids alone, for re-feeding that part (index.js
 * _renderMeetingInvite). Taken from the whole form's build so the column is
 * described in one place.
 */
module.exports.inviteSide = function (ui) {
  const side = `${ui.fig.family}__modal-col--side`;
  const find = (node) => {
    if (!node || typeof node !== "object") return null;
    if (String(node.className || "").split(/\s+/).includes(side)) return node;
    for (const k of node.kids || []) {
      const hit = find(k);
      if (hit) return hit;
    }
    return null;
  };
  const col = find(module.exports(ui));
  return (col && col.kids) || [];
};
