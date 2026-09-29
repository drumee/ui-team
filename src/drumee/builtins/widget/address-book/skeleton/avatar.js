// Contact avatar + Drumee-account helpers, shared by the sidebar list
// (contact-list.js) and the detail panel (contact-detail.js).

// Same helper UserProfile uses for its auto_color, so the initials chip we
// draw for account-less contacts picks the identical color.
const { colorFromName } = require("@drumee/ui-essentials");

const looksLikeEmail = (s) => typeof s === "string" && s.includes("@");

// Drumee uid the avatar picture is fetched with (Visitor.avatar). Contacts
// carry it in `entity` (my_contact_show_next), invitations in `drumate_id`.
// `entity` holds a raw email for contacts with no drumee account, so filter
// those out; null means "no picture to fetch" (see `contactAvatar` below).
function avatarId(c) {
  const uid = c.drumate_id || c.uid || c.entity || c.entity_id || "";
  if (typeof uid !== "string" || !uid || looksLikeEmail(uid)) return null;
  return uid;
}

// The drumate a contact row is linked to, or null when there is none — an
// address-book entry saved by email (manual add, CSV/VCF import, Google sync)
// for someone without a Drumee account. `my_contact_show_next` stores the uid
// in `entity` when the email resolved to a drumate and the raw email
// otherwise, and reports that resolution as `is_drumate`.
function linkedDrumateId(c) {
  if (!c) return null;
  if (c.is_drumate != null && Number(c.is_drumate) !== 1) return null;
  const uid = c.entity;
  if (typeof uid !== "string" || !uid || looksLikeEmail(uid)) return null;
  if (uid === Visitor.id) return null;
  return uid;
}

// Same rule UserProfile.initiales() applies, so both branches below agree.
function initialsOf(fn, ln, name) {
  const first = (fn || name || "?")[0] || "?";
  return (first + (ln ? ln[0] : "")).toUpperCase();
}

// Same render path as widget-chatcontactItem (bigchat inbox): the shared
// UserProfile widget, which loads the real picture and tracks the live
// online dot — so a drumate looks identical in both lists.
//
// Contacts with no drumee account get the initials chip drawn here instead
// of an id-less UserProfile: Visitor.avatar() falls back to the *current*
// user's id, so a widget without an id would show our own face on every
// address-only contact. Same shape/colors either way.
//
// `variant` adds a `__avatar-wrapper--<variant>` modifier so a surface can
// resize the same avatar without duplicating its rules.
function contactAvatar(ui, c, name, variant) {
  const fig = ui.fig.family;
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
  const modifier = variant ? ` ${fig}__avatar-wrapper--${variant}` : "";
  return Skeletons.Box.X({
    className: `${fig}__avatar-wrapper${modifier}`,
    kids: [inner],
  });
}

module.exports = { avatarId, linkedDrumateId, contactAvatar };
