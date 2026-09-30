const { contactAvatar } = require("./avatar");

module.exports = function (ui, contacts) {
  const fig = ui.fig.family;
  const selectedKey = ui.getSelectedKey();
  const tab = ui.getTab();
  const pendingCount = ui.getInvitations().length;

  const fullName = (c) => {
    const fn = (c.firstname || "").trim();
    const ln = (c.lastname || "").trim();
    let parts;
    if (fn && ln && fn !== ln) parts = `${fn} ${ln}`;
    else parts = fn || ln;
    if (parts) return parts;
    return c.fullname || c.surname || c.email_default || c.email || c.entity || "—";
  };

  const looksLikeEmail = (s) => typeof s === "string" && s.includes("@");

  const subtitle = (c, name) => {
    let value = "";
    if (Array.isArray(c.email) && c.email.length) {
      const def = c.email.find((e) => e.is_default === 1) || c.email[0];
      const v = def?.email || def || "";
      if (looksLikeEmail(v)) value = v;
    }
    if (!value && looksLikeEmail(c.email_default)) value = c.email_default;
    if (!value && typeof c.email === "string" && looksLikeEmail(c.email)) value = c.email;
    if (!value && looksLikeEmail(c.entity)) value = c.entity;
    return value && value !== name ? value : "";
  };

  const tabBtn = (key, label, count) =>
    Skeletons.Box.X({
      className: `${fig}__tab`,
      dataset: { active: tab === key ? 1 : 0 },
      bubble: 0,
      service: `tab-${key}`,
      uiHandler: [ui],
      kids: [
        Skeletons.Note({ className: `${fig}__tab-label`, content: label }),
        count
          ? Skeletons.Note({
              className: `${fig}__tab-count`,
              content: String(count),
            })
          : null,
      ].filter(Boolean),
    });

  const tabsBar = Skeletons.Box.X({
    className: `${fig}__tabs`,
    kids: [
      tabBtn("all", LOCALE.ALL, 0),
      tabBtn("pending", LOCALE.PENDING, pendingCount),
      tabBtn("archived", LOCALE.ARCHIVED, 0),
      tabBtn("blocked", LOCALE.BLOCKED || "Blocked", 0),
    ],
  });

  const item = (c) => {
    const key = ui.keyOf(c);
    const name = fullName(c);
    const sub = subtitle(c, name);
    const status = c.status || "active";
    const isBlocked = c.is_blocked === 1 || status === "blocked";

    const pill = isBlocked
      ? Skeletons.Note({
          className: `${fig}__contact-pill ${fig}__contact-pill--blocked`,
          content: LOCALE.BLOCKED || "Blocked",
        })
      : null;

    return Skeletons.Box.X({
      className: `${fig}__contact-item`,
      dataset: {
        contactKey: key,
        selected: selectedKey === key ? 1 : 0,
        status,
      },
      bubble: 0,
      service: "select-contact",
      uiHandler: [ui],
      contactKey: key,
      kids: [
        contactAvatar(ui, c, name),
        Skeletons.Box.Y({
          className: `${fig}__contact-text`,
          kids: [
            Skeletons.Note({
              className: `${fig}__contact-name`,
              content: name,
            }),
            sub
              ? Skeletons.Note({
                  className: `${fig}__contact-sub`,
                  content: sub,
                })
              : null,
          ].filter(Boolean),
        }),
        pill,
      ].filter(Boolean),
    });
  };

  const listBody = contacts.length
    ? Skeletons.Box.Y({
        className: `${fig}__contact-list`,
        // WINDOWED — see the note on ui.contactWindow(). `contacts.length`
        // above still gates the empty state, so a non-empty book can never
        // render the "no contacts" note.
        kids: contacts.slice(0, ui.contactWindow()).map(item),
      })
    : Skeletons.Note({
        className: `${fig}__empty`,
        content: ui.isPendingTab() ? LOCALE.NO_INVITEE : LOCALE.NO_CONTACT,
      });

  return Skeletons.Box.Y({
    className: `${fig}__sidebar-stack`,
    kids: [tabsBar, listBody].filter(Boolean),
  });
};
