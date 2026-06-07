const { iconTextBtn } = require("./action-buttons");

module.exports = function (ui, contact) {
  const fig = ui.fig.family;
  const isReceivedInvite = contact.status === "received";
  const isSentInvite = contact.status === "sent";
  const isArchived = contact.is_archived === 1 || contact.status === "archived";
  const isBlocked = contact.is_blocked === 1 || contact.status === "blocked";
  const contactId = contact.id || contact.contact_id;
  const editing = ui.isEditing();
  const editError = ui.getEditError();

  const looksLikeEmail = (s) => typeof s === "string" && s.includes("@");

  const pickEmail = () => {
    if (Array.isArray(contact.email) && contact.email.length) {
      const def = contact.email.find((e) => e.is_default === 1) || contact.email[0];
      const v = def?.email || def;
      if (looksLikeEmail(v)) return v;
    }
    if (looksLikeEmail(contact.email_default)) return contact.email_default;
    if (typeof contact.email === "string" && looksLikeEmail(contact.email)) return contact.email;
    if (looksLikeEmail(contact.entity)) return contact.entity;
    return "";
  };

  const senderEmail = pickEmail();

  const fullName = (() => {
    const fn = (contact.firstname || "").trim();
    const ln = (contact.lastname || "").trim();
    let parts;
    if (fn && ln && fn !== ln) parts = `${fn} ${ln}`;
    else parts = fn || ln;
    if (parts) return parts;
    return contact.fullname || contact.surname || senderEmail || "—";
  })();

  const initials = (fullName.trim()[0] || "?").toUpperCase();

  // ── Edit mode ─────────────────────────────────────────────────────
  if (editing && !isReceivedInvite && !isSentInvite) {
    return require("./contact-edit")(ui, contact, { fullName, initials, contactId, editError });
  }

  // ── View mode ─────────────────────────────────────────────────────
  const emails = Array.isArray(contact.email) ? contact.email : [];
  const phones = Array.isArray(contact.mobile) ? contact.mobile : [];
  const addresses = Array.isArray(contact.address) ? contact.address : [];
  const tags = Array.isArray(contact.tag) ? contact.tag : [];

  const fieldGroup = (label, children) =>
    children.length
      ? Skeletons.Box.Y({
          className: `${fig}__field-row`,
          kids: [
            Skeletons.Note({ className: `${fig}__field-label`, content: label }),
            ...children,
          ],
        })
      : null;

  const validEmails = emails
    .map((e) => ({ ...e, email: (e?.email || e || "").toString() }))
    .filter((e) => looksLikeEmail(e.email));

  const emailEntries = validEmails.length
    ? validEmails.map((e) =>
        Skeletons.Box.X({
          className: `${fig}__field-multi`,
          kids: [
            Skeletons.Note({
              className: `${fig}__field-value`,
              content: e.email,
            }),
            e.is_default === 1
              ? Skeletons.Note({
                  className: `${fig}__field-tag`,
                  content: LOCALE.DEFAULT,
                })
              : null,
          ].filter(Boolean),
        })
      )
    : (senderEmail
        ? [Skeletons.Note({ className: `${fig}__field-value`, content: senderEmail })]
        : []);

  const phoneEntries = phones.map((p) =>
    Skeletons.Note({
      className: `${fig}__field-value`,
      content: `${p.areacode || ""} ${p.phone || ""}`.trim(),
    })
  );

  const addressEntries = addresses.map((a) => {
    const parts = [a.street, a.city, a.country].filter(Boolean).join(", ");
    return Skeletons.Note({
      className: `${fig}__field-value`,
      content: parts || "—",
    });
  });

  const tagEntries = tags.length
    ? [Skeletons.Box.X({
        className: `${fig}__tag-chips`,
        kids: tags.map((t) =>
          Skeletons.Note({
            className: `${fig}__tag-chip`,
            content: t.name || t.tag_name || String(t),
          })
        ),
      })]
    : [];

  // Every action is an icon + text button. Sits directly below the header.
  let actions;
  if (isReceivedInvite) {
    actions = Skeletons.Box.X({
      className: `${fig}__detail-actions`,
      kids: [
        iconTextBtn(fig, "primary", "account_check", LOCALE.ACCEPT, "accept-invitation", { contactEmail: senderEmail }, ui),
        iconTextBtn(fig, "danger", "cross", LOCALE.REFUSE, "refuse-invitation", { contactEmail: senderEmail }, ui),
      ],
    });
  } else if (isSentInvite) {
    actions = Skeletons.Box.X({
      className: `${fig}__detail-actions`,
      kids: [
        iconTextBtn(fig, "danger", "cross", LOCALE.CANCEL_INVITE || LOCALE.CANCEL, "delete-contact", { contactId }, ui),
      ],
    });
  } else {
    const buttons = [];
    if (isArchived) {
      buttons.push(iconTextBtn(fig, "neutral", "apps-arrow-clockwise", LOCALE.RESTORE, "restore-contact", { contactId }, ui));
    } else {
      buttons.push(iconTextBtn(fig, "neutral", "app-archive", LOCALE.ARCHIVE, "archive-contact", { contactId }, ui));
    }
    buttons.push(iconTextBtn(fig, "neutral", "app-edit", LOCALE.EDIT, "edit-contact", {}, ui));
    if (isBlocked) {
      buttons.push(iconTextBtn(fig, "neutral", "unlock", LOCALE.UNBLOCK || "Unblock", "unblock-contact", { contactId }, ui));
    } else {
      buttons.push(iconTextBtn(fig, "danger", "ban", LOCALE.BLOCK || "Block", "block-contact", { contactId }, ui));
    }
    buttons.push(iconTextBtn(fig, "danger", "trash", LOCALE.DELETE, "delete-contact", { contactId }, ui));
    actions = Skeletons.Box.X({ className: `${fig}__detail-actions`, kids: buttons });
  }

  return Skeletons.Box.Y({
    className: `${fig}__detail-panel`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__detail-header`,
        kids: [
          Skeletons.Box.Y({
            className: `${fig}__detail-avatar`,
            styleOpt: { background: contact.color || "#e4e3ff" },
            kids: [
              Skeletons.Note({
                className: `${fig}__detail-avatar-text`,
                content: initials,
              }),
            ],
          }),
          Skeletons.Note({
            className: `${fig}__detail-name`,
            content: fullName,
          }),
          contact.status
            ? Skeletons.Note({
                className: `${fig}__detail-status`,
                content: contact.status,
              })
            : null,
          // Action buttons sit directly below the avatar/name.
          actions,
        ].filter(Boolean),
      }),
      Skeletons.Box.Y({
        className: `${fig}__detail-fields`,
        kids: [
          fieldGroup(LOCALE.EMAIL, emailEntries),
          fieldGroup(LOCALE.MOBILE, phoneEntries),
          fieldGroup(LOCALE.ADDRESS || "Address", addressEntries),
          fieldGroup(LOCALE.TAGS || "Tags", tagEntries),
          contact.comment
            ? fieldGroup(LOCALE.COMMENT, [
                Skeletons.Note({
                  className: `${fig}__field-value`,
                  content: contact.comment,
                }),
              ])
            : null,
        ].filter(Boolean),
      }),
    ],
  });
};

