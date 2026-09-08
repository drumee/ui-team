/**
 * Logo, title, button. Centred in the work area.
 *
 * `raw-logo-drumee-full` is the full wordmark, the same symbol signin and the
 * sharebox top-nav use — an Image rather than a Button because it is
 * decoration here and a Button would raise a ui event on click.
 *
 * The copy is HOME_HERO_TITLE / CREATE_FIRST_WORKSPACE, which already exist and
 * are already translated in all six locale files. HOME_HERO_DESC is the third
 * string of that set and is deliberately NOT drawn: the ask was logo, title,
 * button.
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
        className: `${pfx}__title`,
        content: LOCALE.HOME_HERO_TITLE,
      }),
      // A Button, not a Box: the dialog opens from a ui event, and a Box with
      // inert kids raises none.
      Skeletons.Button.Label({
        className: `${pfx}__cta`,
        ico: "ph-plus",
        label: LOCALE.CREATE_FIRST_WORKSPACE,
        service: "create-first-workspace",
        uiHandler: [ui],
      }),
    ],
  });
};
