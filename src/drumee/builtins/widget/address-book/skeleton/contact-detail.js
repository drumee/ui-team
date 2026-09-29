const { tileBtn } = require("./action-buttons");
const { contactAvatar, linkedDrumateId } = require("./avatar");

module.exports = function (ui, contact) {
  const fig = ui.fig.family;
  // A pending incoming invitation reaches us under two statuses, not one:
  // "received" when the sender had no row in our address book, "invitation"
  // when they already did (a workspace invite auto-adds them, for instance).
  // `contact_notification_get` returns both, and `contact_invite_accept` /
  // `contact_invite_refuse` both act on `status IN ('received','invitation')`
  // — so both must offer Accept/Refuse. Matching only "received" sent an
  // "invitation" down the ordinary-contact branch below, which answered a
  // click on a pending invite with Archive/Edit/Block/Delete.
  const isReceivedInvite =
    contact.status === "received" || contact.status === "invitation";
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

  const fieldGroup = (ico, label, children) =>
    children.length
      ? Skeletons.Box.Y({
          className: `${fig}__field-row`,
          kids: [
            Skeletons.Box.X({
              className: `${fig}__field-head`,
              kids: [
                Skeletons.Image.Svg({ className: `${fig}__field-ico`, ico }),
                Skeletons.Note({ className: `${fig}__field-label`, content: label }),
              ],
            }),
            ...children,
          ],
        })
      : null;

  // An address is the one way to reach a contact without a Drumee account,
  // so render it as a real mailto link. encodeURIComponent keeps a stray
  // "?"/"&" in stored data from turning into mailto header fields.
  const emailLink = (email) =>
    Skeletons.Note({
      className: `${fig}__field-value ${fig}__field-value--link`,
      content: email,
      tagName: _K.tag.a,
      attrOpt: {
        href: `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}`,
        title: LOCALE.SEND_AN_EMAIL,
      },
    });

  const validEmails = emails
    .map((e) => ({ ...e, email: (e?.email || e || "").toString() }))
    .filter((e) => looksLikeEmail(e.email));

  const emailEntries = validEmails.length
    ? validEmails.map((e) =>
        Skeletons.Box.X({
          className: `${fig}__field-multi`,
          kids: [
            emailLink(e.email),
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
        ? [emailLink(senderEmail)]
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

  // Action grid below the avatar/name: icon-above-label tiles, two per row
  // (Figma "Contact — Multi-Action").
  let actions;
  if (isReceivedInvite) {
    actions = Skeletons.Box.X({
      className: `${fig}__detail-tiles`,
      kids: [
        tileBtn(fig, "primary", "account_check", LOCALE.ACCEPT, "accept-invitation", { contactEmail: senderEmail }, ui),
        tileBtn(fig, "danger", "cross", LOCALE.REFUSE, "refuse-invitation", { contactEmail: senderEmail }, ui),
      ],
    });
  } else if (isSentInvite) {
    actions = Skeletons.Box.X({
      className: `${fig}__detail-tiles`,
      kids: [
        // Same "delete-contact" action, but `confirmKind` swaps the dialog
        // copy from "Delete contact?" to "Cancel this invitation?".
        tileBtn(fig, "danger", "cross", LOCALE.CANCEL_INVITE || LOCALE.CANCEL, "delete-contact", { contactId, confirmKind: "cancel-invite" }, ui),
      ],
    });
  } else {
    // Inbox (p2p chat) and Call (p2p call) need the drumate behind the row.
    // A contact saved by email for someone without a Drumee account has none,
    // and a blocked contact must be unblocked first — both keep the tiles in
    // place but inert, with the reason as tooltip. Email stays reachable
    // through the mailto link in the fields below.
    const peerId = linkedDrumateId(contact);
    const unreachable = !peerId
      ? LOCALE.CONTACT_NO_DRUMEE_ACCOUNT
      : isBlocked
        ? LOCALE.CONTACT_UNBLOCK_TO_REACH
        : null;
    const buttons = [
      tileBtn(fig, "neutral", "ph-tray", LOCALE.INBOX, "contact-inbox", {}, ui, unreachable),
      tileBtn(fig, "neutral", "ph-phone", LOCALE.CALL, "contact-call", {}, ui, unreachable),
    ];
    if (isArchived) {
      buttons.push(tileBtn(fig, "neutral", "apps-arrow-clockwise", LOCALE.RESTORE, "restore-contact", { contactId }, ui));
    } else {
      buttons.push(tileBtn(fig, "neutral", "ph-archive", LOCALE.ARCHIVE, "archive-contact", { contactId }, ui));
    }
    buttons.push(tileBtn(fig, "neutral", "ph-pencil-simple-line", LOCALE.EDIT, "edit-contact", {}, ui));
    if (isBlocked) {
      buttons.push(tileBtn(fig, "neutral", "unlock", LOCALE.UNBLOCK || "Unblock", "unblock-contact", { contactId }, ui));
    } else {
      buttons.push(tileBtn(fig, "danger", "ph-minus-circle", LOCALE.BLOCK || "Block", "block-contact", { contactId }, ui));
    }
    buttons.push(tileBtn(fig, "danger", "ph-trash-simple", LOCALE.DELETE, "delete-contact", { contactId }, ui));
    actions = Skeletons.Box.X({ className: `${fig}__detail-tiles`, kids: buttons });
  }

  return Skeletons.Box.Y({
    // `--view` scopes the Figma restyle to this view; the edit form shares
    // `__detail-panel` and keeps its own look.
    className: `${fig}__detail-panel ${fig}__detail-panel--view`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__detail-header`,
        kids: [
          // Same avatar as the sidebar row (real picture + live online dot for
          // drumates, initials chip otherwise), sized up by the modifier.
          contactAvatar(ui, contact, fullName, "detail"),
          Skeletons.Note({
            className: `${fig}__detail-name`,
            content: fullName,
          }),
          // Only an invitation's status says something the tiles don't
          // (received / invitation / sent); ordinary contacts show none.
          contact.status && (isReceivedInvite || isSentInvite)
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
          fieldGroup("ph-envelope-simple", LOCALE.EMAIL, emailEntries),
          fieldGroup("ph-phone", LOCALE.MOBILE, phoneEntries),
          fieldGroup("ph-map-pin", LOCALE.ADDRESS || "Address", addressEntries),
          fieldGroup("ph-tag-simple", LOCALE.TAGS || "Tags", tagEntries),
          contact.comment
            ? fieldGroup("ph-note", LOCALE.NOTE, [
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

