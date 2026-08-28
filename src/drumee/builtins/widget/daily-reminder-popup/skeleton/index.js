/**
 * The daily reminder card (screenshot: Downloads/dr1.jpg).
 *
 * Centred modal: title, three stat tiles in a row, a sub-line, then a
 * full-width [Discard] / [My calendar] pair.
 */
// Skeletons.Note renders `content` as MARKUP, so anything that came from a
// person has to be escaped on the way in. The display name is the user's own,
// which makes this self-inflicted at worst — but "only the victim can trigger
// it" is not a reason to render unescaped markup, and the same helper guards
// every other name in this codebase.
function escapeHtml(value = "") {
  return _.escape(String(value));
}

// The language the string table declared. locale/index.js currently hardcodes
// declare-lang('en') and loads only en.json, so this is 'en' today — but it is
// READ rather than assumed, so the counts inflect correctly the moment a real
// loader lands.
function docLang() {
  try {
    if (typeof document === "undefined") return "en";
    return (document.documentElement.getAttribute("lang") || "en").trim() || "en";
  } catch (e) {
    return "en";
  }
}

// LOCALE is a createSafeObject: a MISSING key resolves to the key's own NAME,
// never to undefined. So the usual `LOCALE.X || fallback` is DEAD CODE — the
// test has to be against the key name itself.
function localeOr(key, fallbackKey) {
  const v = LOCALE[key];
  if (v && v !== key) return v;
  const f = LOCALE[fallbackKey];
  return f && f !== fallbackKey ? f : "";
}

// Pick the plural form for `n` in the document language.
//
// "1 unread messages" was wrong, and the fix cannot be `n === 1 ? singular :
// plural`: that is right for English and Spanish, wrong for French (0 takes
// the singular), and badly wrong for Russian, which has THREE forms chosen on
// n%10 and n%100 — 1 and 21 take one form, 2-4 another, 5-20 a third. Chinese
// and Khmer do not inflect at all. Intl.PluralRules is the CLDR table for
// exactly this and ships in every browser this app supports.
//
// Falls back to _OTHER for any category a language does not define, so adding
// a language never renders a raw key name.
function pluralized(base, n) {
  let cat = n === 1 ? "one" : "other";
  try {
    cat = new Intl.PluralRules(docLang()).select(n);
  } catch (e) {
    /* keep the English-shaped default */
  }
  return localeOr(`${base}_${cat.toUpperCase()}`, `${base}_OTHER`);
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const counts = ui.getCounts() || {};
  const name = escapeHtml(ui.getFirstName());

  // "Hi <name>, Today you have ...." — with no name we drop the greeting
  // clause rather than render the mockup's literal "[User name]".
  const title = name
    ? LOCALE.DAILY_REMINDER_TITLE.replace("{0}", name)
    : LOCALE.DAILY_REMINDER_TITLE_NO_NAME;

  // One stat tile: a lilac rounded square with a purple glyph, caption under.
  //
  // `active: 0` on EVERY node here. These are not clickable at all, and
  // ui-core binds an onclick to any widget that does not say otherwise
  // (letc.js defaults `active` to 1) — which would make the whole tile eat
  // clicks and, worse, register handlers for a card that is about to be
  // destroyed. `active` does not cascade and kidsOpt is a no-op for it, so it
  // goes on each node individually.
  const tile = (ico, label) =>
    Skeletons.Box.Y({
      className: `${pfx}__stat`,
      active: 0,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__stat-tile`,
          active: 0,
          kids: [
            Skeletons.Image.Svg({ ico, className: `${pfx}__stat-ico`, active: 0 }),
          ],
        }),
        Skeletons.Note({
          className: `${pfx}__stat-label`,
          content: label,
          active: 0,
        }),
      ],
    });

  // Counts flow into Note as markup too. They are ours, not user input, but
  // they arrive over the wire — coercing to a non-negative integer means a
  // malformed response can only ever render a number. The SAME coerced value
  // picks the plural form, so the word can never disagree with the digit.
  const num = (v) => Math.max(0, Math.floor(Number(v) || 0));
  const stat = (base, v) => {
    const c = num(v);
    return pluralized(base, c).replace("{0}", String(c));
  };
  // Coerced exactly the way the tiles are, so "nothing to report" and the
  // numbers on screen can never disagree.
  const total =
    num(counts.unread_messages) + num(counts.due_tasks) + num(counts.meetings);

  // Box.Y, NOT Box.Z. Measured on the endpoint: Box.Z renders `display: block`,
  // so `align-items` / `justify-content` on the backdrop are INERT and the card
  // sat at 0,0 instead of centred. Box.Y is a real flex column, which centres
  // horizontally on the cross axis and vertically on the main axis. This is the
  // mirror image of the known Skeletons.Note trap, where text-align is the
  // thing that does nothing because Note IS a flex container.
  // Do not "simplify" this back to Box.Z, and do not paper over it with
  // `display: flex` in the skin — the repo rule is that Box variants own that
  // property.
  return Skeletons.Box.Y({
    className: `${pfx}__backdrop`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__card`,
        kids: [
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: "close",
            bubble: 0,
            service: "daily-reminder-close",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__title`,
            content: title,
            active: 0,
          }),
          // A completely empty day gets ONE line rather than three zero tiles.
          // Three zeroes read as a malfunction; a sentence reads as an answer.
          total === 0
            ? Skeletons.Note({
                className: `${pfx}__empty`,
                content: LOCALE.DAILY_REMINDER_NOTHING,
                active: 0,
              })
            : Skeletons.Box.X({
                className: `${pfx}__stats`,
                active: 0,
                kids: [
                  tile(
                    "noti-chat-teardrop-dots",
                    stat("DAILY_REMINDER_MESSAGES", counts.unread_messages),
                  ),
                  tile(
                    "noti-list-checks",
                    stat("DAILY_REMINDER_TASKS", counts.due_tasks),
                  ),
                  tile(
                    "noti-video-camera",
                    stat("DAILY_REMINDER_MEETINGS", counts.meetings),
                  ),
                ],
              }),
          Skeletons.Note({
            className: `${pfx}__subline`,
            content: LOCALE.DAILY_REMINDER_SUBLINE,
            active: 0,
          }),
          Skeletons.Box.X({
            className: `${pfx}__actions`,
            active: 0,
            kids: [
              Skeletons.Note({
                className: `${pfx}__btn ${pfx}__btn--ghost`,
                content: LOCALE.DISCARD,
                bubble: 0,
                service: "daily-reminder-discard",
                uiHandler: [ui],
              }),
              // Drawn per the design but DELIBERATELY NOT WIRED to a
              // destination — there is no personal Calendar yet. Its service
              // only raises a notice. See the widget header.
              Skeletons.Note({
                className: `${pfx}__btn ${pfx}__btn--primary`,
                content: LOCALE.MY_CALENDAR,
                bubble: 0,
                service: "daily-reminder-calendar",
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
