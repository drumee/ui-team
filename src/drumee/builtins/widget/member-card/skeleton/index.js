/* ==================================================================== *
 * member_card skeleton -- Figma 978:125420 / 910:81010.
 *
 * Person (avatar, name, title, department), a quick message with the chat /
 * add-contact / call actions, the Contact block (email, phone), then Cancel
 * and Update.
 * ==================================================================== */

function icon(pfx, ico, service, ui, tip) {
  return Skeletons.Box.X({
    className: `${pfx}__action`,
    service,
    uiHandler: [ui],
    tooltips: tip ? { content: tip } : undefined,
    kids: [Skeletons.Image.Svg({ active: 0, ico, className: `${pfx}__action-ico` })],
  });
}

function person(ui, pfx) {
  const p = ui._person || {};
  const depts = Array.isArray(p.departments) ? p.departments : [];
  const dept = depts.length
    ? `${depts[0].name}${depts.length > 1 ? ` +${depts.length - 1}` : ""}`
    : "";
  return Skeletons.Box.X({
    className: `${pfx}__person`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__avatar`,
        id: ui._uid,
        firstname: p.firstname,
        lastname: p.lastname,
        fullname: ui._name(),
        active: 0,
      }),
      Skeletons.Box.Y({
        className: `${pfx}__who`,
        kids: [
          Skeletons.Note({ className: `${pfx}__name`, content: ui._name() }),
          p.title ? Skeletons.Note({ className: `${pfx}__title`, content: p.title }) : null,
          dept
            ? Skeletons.Box.X({
                className: `${pfx}__dept`,
                kids: [
                  Skeletons.Image.Svg({ active: 0, ico: "ph-cube", className: `${pfx}__dept-ico` }),
                  Skeletons.Note({ className: `${pfx}__dept-name`, content: dept }),
                ],
              })
            : null,
        ].filter(Boolean),
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });
}

function message(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__block`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__message`,
        kids: [
          Skeletons.Entry({
            className: `${pfx}__message-entry`,
            sys_pn: "message",
            partHandler: ui,
            placeholder: LOCALE.SEND_A_QUICK_MESSAGE || "Send a quick message",
            mode: _a.commit,
            require: "any",
            service: "member-card-send",
            uiHandler: [ui],
          }),
          Skeletons.Box.X({
            className: `${pfx}__send`,
            service: "member-card-send",
            uiHandler: [ui],
            kids: [Skeletons.Image.Svg({ active: 0, ico: "send", className: `${pfx}__send-ico` })],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          icon(pfx, "ph-chat-teardrop-text", "member-card-chat", ui, LOCALE.CHAT || "Chat"),
          ui._contact ? null : icon(pfx, "meet-user-plus", "member-card-add-contact", ui, LOCALE.ADD_TO_CONTACTS || "Add to contacts"),
          icon(pfx, "ph-phone", "member-card-call", ui, LOCALE.CALL || "Call"),
        ].filter(Boolean),
      }),
    ],
  });
}

function contact(ui, pfx) {
  const p = ui._person || {};
  const email = p.email || (ui._contact && ui._contact.email && ui._contact.email[0] && ui._contact.email[0].email) || "";
  return Skeletons.Box.Y({
    className: `${pfx}__block`,
    kids: [
      Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.CONTACT || "Contact" }),
      Skeletons.Box.X({
        className: `${pfx}__line`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: "ph-envelope-simple", className: `${pfx}__line-ico` }),
          Skeletons.Note({ className: `${pfx}__line-text`, content: email }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__line ${pfx}__phone`,
        kids: [
          Skeletons.Image.Svg({ active: 0, ico: "ph-phone", className: `${pfx}__line-ico` }),
          Skeletons.Entry({
            className: `${pfx}__phone-entry`,
            sys_pn: "phone",
            partHandler: ui,
            value: ui._phone || "",
            placeholder: LOCALE.ADD_PHONE_NUMBER || "Add a phone number",
            require: "any",
          }),
        ],
      }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  if (!ui._loaded) {
    return Skeletons.Box.Y({
      className: `${pfx}__main`,
      debug: __filename,
      kids: [Skeletons.Note({ className: `${pfx}__loading`, content: LOCALE.LOADING || "Loading..." })],
    });
  }
  const self = ui._person && ~~ui._person.self;
  // Embedded in another dialog (the org chart's Edit member, 910:81010): the
  // host shows the person and owns Cancel/Update; it calls savePhone().
  if (ui.mget("embedded")) {
    return Skeletons.Box.Y({
      className: `${pfx}__main ${pfx}__main--embedded`,
      debug: __filename,
      kids: [
        self ? null : message(ui, pfx),
        contact(ui, pfx),
        Skeletons.Note({ className: `${pfx}__status`, sys_pn: "status", partHandler: ui, content: "" }),
      ].filter(Boolean),
    });
  }
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      person(ui, pfx),
      self ? null : message(ui, pfx),
      contact(ui, pfx),
      Skeletons.Note({ className: `${pfx}__status`, sys_pn: "status", partHandler: ui, content: "" }),
      Skeletons.Box.X({
        className: `${pfx}__footer`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__btn`,
            service: "member-card-cancel",
            uiHandler: [ui],
            kids: [Skeletons.Note({ active: 0, content: LOCALE.CANCEL || "Cancel" })],
          }),
          Skeletons.Box.X({
            className: `${pfx}__btn ${pfx}__btn--primary`,
            service: "member-card-update",
            uiHandler: [ui],
            kids: [Skeletons.Note({ active: 0, content: LOCALE.UPDATE || "Update" })],
          }),
        ],
      }),
    ].filter(Boolean),
  });
};
