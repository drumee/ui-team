/**
 * The daily reminder card — 2026-09-23 redesign.
 *
 * hero (period art + confetti bits) → "Happy <Weekday>, <Name>!" → period
 * sub-line → three stat tiles (rail-chat / rail-task / rail-meet) → calendar
 * row (top-calendar) → [Maybe later] [Open my calendar].
 *
 * Numbers render at their FINAL value. motion.js counts them up from 0 only
 * when it is allowed to animate, so a motion failure can never show a wrong
 * number.
 */
const { weekdayName, sublineKey, pluralCategory, coerceCount } = require("../period");
const { heroFor } = require("../images");

// Skeletons.Note renders `content` as MARKUP, so anything that came from a
// person has to be escaped on the way in — the display name here.
function escapeHtml(value = "") {
  return _.escape(String(value));
}

// The language the string table declared. READ rather than assumed, so the
// weekday and the plural forms follow the moment a real loader lands.
function docLang() {
  try {
    if (typeof document === "undefined") return "en";
    return (document.documentElement.getAttribute("lang") || "en").trim() || "en";
  } catch (e) {
    return "en";
  }
}

// LOCALE is a createSafeObject: a MISSING key resolves to its own NAME, so
// `LOCALE.X || fallback` is dead code — test against the key name.
function t(key, fallbackKey) {
  const v = LOCALE[key];
  if (v && v !== key) return v;
  if (!fallbackKey) return "";
  const f = LOCALE[fallbackKey];
  return f && f !== fallbackKey ? f : "";
}

const BITS = 6;

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const lang = docLang();
  const now = ui.getNow();
  const period = ui.getPeriod();
  const counts = ui.getCounts() || {};
  const name = escapeHtml(ui.getFirstName());
  const day = escapeHtml(weekdayName(now, lang));

  // With no name we drop the name clause rather than render "Happy Friday, !".
  const greeting = name
    ? t("DAILY_REMINDER_HELLO")
        .replace("{0}", day)
        .replace("{1}", `<span class="${pfx}__name">${name}</span>`)
    : t("DAILY_REMINDER_HELLO_NO_NAME").replace("{0}", day);
  // ONE inline wrapper. Note is a flex container, so a bare text node beside
  // the name <span> would become two flex items and the space between them
  // would collapse — "Happy Friday,Iris!".
  const title = `<span class="${pfx}__title-text">${greeting}</span>`;

  // One stat: tinted icon tile, then the number over its label. The SAME
  // coerced value picks the plural form, so the word can never disagree with
  // the digit.
  //
  // `active: 0` on EVERY node here. ui-core binds an onclick to any widget
  // that does not say otherwise, and `active` does not cascade.
  const stat = (kind, ico, base, value) => {
    const n = coerceCount(value);
    const label = t(`${base}_${pluralCategory(n, lang)}`, `${base}_OTHER`);
    return Skeletons.Box.X({
      className: `${pfx}__stat ${pfx}__stat--${kind}`,
      active: 0,
      kids: [
        Skeletons.Box.Y({
          className: `${pfx}__stat-tile`,
          active: 0,
          kids: [Skeletons.Image.Svg({ ico, className: `${pfx}__stat-ico`, active: 0 })],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__stat-text`,
          active: 0,
          kids: [
            Skeletons.Element({
              tagName: "span",
              className: `${pfx}__stat-num`,
              content: String(n),
              attribute: { "data-count": String(n) },
              active: 0,
            }),
            Skeletons.Note({ className: `${pfx}__stat-label`, content: label, active: 0 }),
          ],
        }),
      ],
    });
  };

  const total =
    coerceCount(counts.unread_messages) +
    coerceCount(counts.due_tasks) +
    coerceCount(counts.meetings);

  const bits = [];
  for (let i = 1; i <= BITS; i++) {
    bits.push(Skeletons.Element({
      tagName: "span",
      className: `${pfx}__bit ${pfx}__bit--${i}`,
      active: 0,
    }));
  }

  // Box.Y, NOT Box.Z, for the backdrop: Box.Z renders `display: block`, so
  // align-items / justify-content would be inert and the card would sit at 0,0.
  return Skeletons.Box.Y({
    className: `${pfx}__backdrop`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__card ${pfx}__card--${period}`,
        kids: [
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            // "cross", NOT "close": there is no --icon-close symbol in the
            // sprite, so ico:"close" renders an empty <svg>.
            ico: "cross",
            bubble: 0,
            service: "daily-reminder-close",
            uiHandler: [ui],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__hero-wrap`,
            active: 0,
            kids: [
              ...bits,
              Skeletons.Element({
                tagName: "img",
                className: `${pfx}__hero`,
                attribute: { src: heroFor(period), alt: "", draggable: "false" },
                active: 0,
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__head`,
            active: 0,
            kids: [
              Skeletons.Note({ className: `${pfx}__title`, content: title, active: 0 }),
              Skeletons.Note({
                className: `${pfx}__subline`,
                content: t(sublineKey(period, now), "DAILY_REMINDER_SUB_MORNING"),
                active: 0,
              }),
            ],
          }),
          // A completely empty day gets ONE line rather than three zero
          // tiles. Three zeroes read as a malfunction; a sentence reads as an
          // answer.
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
                  stat("chat", "rail-chat", "DAILY_REMINDER_MSG_LABEL", counts.unread_messages),
                  stat("task", "rail-task", "DAILY_REMINDER_TASK_LABEL", counts.due_tasks),
                  stat("meet", "rail-meet", "DAILY_REMINDER_MEET_LABEL", counts.meetings),
                ],
              }),
          // The whole row is one click target, same service as the primary
          // button. The row stays active (it owns the service); its kids do
          // not, so a tap on the icon or text reaches the row.
          Skeletons.Box.X({
            className: `${pfx}__calrow`,
            bubble: 0,
            service: "daily-reminder-calendar",
            uiHandler: [ui],
            kids: [
              Skeletons.Image.Svg({ ico: "top-calendar", className: `${pfx}__calrow-ico`, active: 0 }),
              Skeletons.Note({
                className: `${pfx}__calrow-text`,
                content: t("DAILY_REMINDER_CAL_ROW"),
                active: 0,
              }),
              Skeletons.Image.Svg({ ico: "arrow-right", className: `${pfx}__calrow-arrow`, active: 0 }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__actions`,
            active: 0,
            kids: [
              Skeletons.Note({
                className: `${pfx}__btn ${pfx}__btn--ghost`,
                content: t("MAYBE_LATER", "DISCARD"),
                bubble: 0,
                service: "daily-reminder-discard",
                uiHandler: [ui],
              }),
              // Opens the Personal Calendar on today, in day view, via the
              // desk's own `toggle-calendar` service — see the widget header.
              Skeletons.Note({
                className: `${pfx}__btn ${pfx}__btn--primary`,
                content: t("OPEN_MY_CALENDAR", "MY_CALENDAR"),
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
