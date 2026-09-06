/**
 * Logo, a pill, and two lines. Centred in the work area.
 *
 * The composition is the hero from the design: a bordered pill above two large
 * lines, the second in the brand purple. The logo is not in that frame — it is
 * here because this screen appears INSIDE the app, after sign-in, where an
 * unbranded marketing hero would read as a different product. Same
 * `raw-logo-drumee-full` wordmark desk/home-empty uses, and an Image rather
 * than a Button because it is decoration: a Button would raise a ui event on
 * click, and nothing on this screen is pressable.
 *
 * ONE MESSAGE FOR ALL FOUR TOURS. Files, Chat, Task and Meet all show this, and
 * it says the same thing on each — what is about to happen, not which pane is
 * behind it. A line per tab would be four strings in six locales to say the one
 * thing the tour itself is about to say better.
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      Skeletons.Image.Svg({
        active: 0,
        ico: "raw-logo-drumee-full",
        className: `${pfx}__logo`,
      }),
      Skeletons.Note({
        active: 0,
        className: `${pfx}__pill`,
        content: LOCALE.TOUR_INTRO_PILL,
      }),
      // Two Notes rather than one with a line break: the second is a different
      // colour, and the frame breaks them at a fixed point rather than wherever
      // the width happens to wrap.
      Skeletons.Box.Y({
        active: 0,
        className: `${pfx}__lines`,
        kids: [
          Skeletons.Note({
            active: 0,
            className: `${pfx}__line`,
            content: LOCALE.TOUR_INTRO_LINE_1,
          }),
          Skeletons.Note({
            active: 0,
            className: `${pfx}__line ${pfx}__line--accent`,
            content: LOCALE.TOUR_INTRO_LINE_2,
          }),
        ],
      }),
    ],
  });
};
