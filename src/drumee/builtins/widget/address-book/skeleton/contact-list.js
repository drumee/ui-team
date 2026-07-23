const { actionBtn, iconBtn } = require("./action-buttons");
// Same helper UserProfile uses for its auto_color, so the initials chip we
// draw for account-less contacts picks the identical color.
const { colorFromName } = require("@drumee/ui-essentials");

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

  // Drumee uid the avatar picture is fetched with (Visitor.avatar). Contacts
  // carry it in `entity` (my_contact_show_next), invitations in `drumate_id`.
  // `entity` holds a raw email for contacts with no drumee account, so filter
  // those out; null means "no picture to fetch" (see `avatar` below).
  const avatarId = (c) => {
    const uid = c.drumate_id || c.uid || c.entity || c.entity_id || "";
    if (typeof uid !== "string" || !uid || looksLikeEmail(uid)) return null;
    return uid;
  };

  // Same rule UserProfile.initiales() applies, so both branches below agree.
  const initialsOf = (fn, ln, name) => {
    const first = (fn || name || "?")[0] || "?";
    return (first + (ln ? ln[0] : "")).toUpperCase();
  };

  // Same render path as widget-chatcontactItem (bigchat inbox): the shared
  // UserProfile widget, which loads the real picture and tracks the live
  // online dot — so a drumate looks identical in both lists.
  //
  // Contacts with no drumee account get the initials chip drawn here instead
  // of an id-less UserProfile: Visitor.avatar() falls back to the *current*
  // user's id, so a widget without an id would show our own face on every
  // address-only contact. Same shape/colors either way.
  const avatar = (c, name) => {
    const uid = avatarId(c);
    const fn = (c.firstname || "").trim();
    const ln = (c.lastname || "").trim();
    let inner;
    if (uid) {
      const opt = {
        className: `${fig}__avatar`,
        id: uid,
        // UserProfile initials read firstname[0], so never hand it a blank.
        firstname: fn || name,
        fullname: name,
        online: c.online,
        live_status: 1,
        auto_color: 1,
      };
      // Only pass a real lastname: an empty one makes the widget repeat the
      // first letter ("JJ") instead of falling back to a single initial.
      if (ln) opt.lastname = ln;
      inner = Skeletons.UserProfile(opt);
    } else {
      const text = initialsOf(fn, ln, name);
      inner = Skeletons.Box.Y({
        className: `${fig}__avatar`,
        styleOpt: { background: colorFromName(text || "??") },
        kids: [
          Skeletons.Note({
            className: `${fig}__avatar-text`,
            content: text,
          }),
        ],
      });
    }
    return Skeletons.Box.X({
      className: `${fig}__avatar-wrapper`,
      kids: [inner],
    });
  };

  // Best email for invite accept/refuse (mirrors contact-detail's pickEmail).
  const pickEmail = (c) => {
    if (Array.isArray(c.email) && c.email.length) {
      const def = c.email.find((e) => e.is_default === 1) || c.email[0];
      const v = def?.email || def || "";
      if (looksLikeEmail(v)) return v;
    }
    if (looksLikeEmail(c.email_default)) return c.email_default;
    if (typeof c.email === "string" && looksLikeEmail(c.email)) return c.email;
    if (looksLikeEmail(c.entity)) return c.entity;
    return "";
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
    const isReceived = status === "received";
    const isSent = status === "sent";
    const isArchived = c.is_archived === 1 || status === "archived";
    const isBlocked = c.is_blocked === 1 || status === "blocked";

    const pill = isBlocked
      ? Skeletons.Note({
          className: `${fig}__contact-pill ${fig}__contact-pill--blocked`,
          content: LOCALE.BLOCKED || "Blocked",
        })
      : null;

    // Hover/selection swaps the status pill for these actions (visibility in
    // skin/index.scss). Same set as the detail footer minus Edit: only Archive
    // and Accept are text buttons; the rest are icon buttons.
    let actionKids;
    if (isReceived) {
      const email = pickEmail(c);
      actionKids = [
        actionBtn(fig, "primary", LOCALE.ACCEPT, "accept-invitation", { contactEmail: email }, ui),
        iconBtn(fig, "danger", "cross", LOCALE.REFUSE, "refuse-invitation", { contactEmail: email }, ui),
      ];
    } else if (isSent) {
      actionKids = [
        iconBtn(fig, "danger", "cross", LOCALE.CANCEL_INVITE || LOCALE.CANCEL, "delete-contact", { contactId: key }, ui),
      ];
    } else {
      actionKids = [
        isArchived
          ? iconBtn(fig, "neutral", "apps-arrow-clockwise", LOCALE.RESTORE, "restore-contact", { contactId: key }, ui)
          : actionBtn(fig, "secondary", LOCALE.ARCHIVE, "archive-contact", { contactId: key }, ui),
        isBlocked
          ? iconBtn(fig, "neutral", "unlock", LOCALE.UNBLOCK || "Unblock", "unblock-contact", { contactId: key }, ui)
          : iconBtn(fig, "neutral", "ban", LOCALE.BLOCK || "Block", "block-contact", { contactId: key }, ui),
        iconBtn(fig, "danger", "trash", LOCALE.DELETE, "delete-contact", { contactId: key }, ui),
      ];
    }
    const actions = Skeletons.Box.X({
      className: `${fig}__contact-actions`,
      kids: actionKids,
    });

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
        avatar(c, name),
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
        actions,
      ].filter(Boolean),
    });
  };

  const listBody = contacts.length
    ? Skeletons.Box.Y({
        className: `${fig}__contact-list`,
        kids: contacts.map(item),
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
