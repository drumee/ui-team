/**
 * Left column of the Get help screen: title, search box and the page list.
 */

/**
 * The page list on its own, so a nav-search keystroke can re-feed just this
 * part instead of rebuilding the column (which would drop input focus).
 */
function navList(ui) {
  const pfx = `${ui.fig.family}__nav`;
  const current = ui.getPage();

  return ui.getNavPages().map((page) =>
    Skeletons.Box.X({
      className: `${pfx}-item`,
      // data-* via attrOpt — a bare `dataset` prop is dropped at render.
      attrOpt: { "data-active": page.id === current ? 1 : 0 },
      service: "help-load-page",
      page_id: page.id,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Button.Svg({ ico: page.ico, className: `${pfx}-item-ico` }),
        Skeletons.Note({ className: `${pfx}-item-label`, content: page.label }),
      ],
    })
  );
}

function nav(ui) {
  const pfx = `${ui.fig.family}__nav`;

  return Skeletons.Box.Y({
    className: `${pfx}-column`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-title`,
        content: LOCALE.GET_HELP,
      }),
      Skeletons.Box.X({
        className: `${pfx}-search`,
        kids: [
          Skeletons.Image.Svg({
            ico: "ph-magnifying-glass",
            className: `${pfx}-search-ico`,
          }),
          Skeletons.Entry({
            className: `${pfx}-search-input`,
            sys_pn: "nav-search",
            partHandler: ui,
            placeholder: LOCALE.HELP_SEARCH_PLACEHOLDER,
            // A page switch rebuilds this input; an empty box beside a
            // still-filtered list reads as a bug, so re-seed the term.
            value: ui.getNavQuery(),
            require: "any",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        sys_pn: "help-nav-list",
        kids: navList(ui),
      }),
    ],
  });
}

module.exports = { nav, navList };
