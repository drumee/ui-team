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
  // malformed response can only ever render a number.
  const n = (v) => String(Math.max(0, Number(v) || 0));

  return Skeletons.Box.Z({
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
          Skeletons.Box.X({
            className: `${pfx}__stats`,
            active: 0,
            kids: [
              tile(
                "noti-chat-teardrop-dots",
                LOCALE.DAILY_REMINDER_MESSAGES.replace("{0}", n(counts.unread_messages)),
              ),
              tile(
                "noti-list-checks",
                LOCALE.DAILY_REMINDER_TASKS.replace("{0}", n(counts.due_tasks)),
              ),
              tile(
                "noti-video-camera",
                LOCALE.DAILY_REMINDER_MEETINGS.replace("{0}", n(counts.meetings)),
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
