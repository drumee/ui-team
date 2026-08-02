/**
 * FAQ page: filter box, category chips and the accordion.
 */

/**
 * One accordion row. The answer is ALWAYS rendered and collapsed by CSS —
 * expanding must not add or remove nodes, because the only way to re-render
 * one row is to re-feed the whole list, which rebuilds all of them and
 * replays every other row's animation. Toggling is therefore a single
 * attribute flip (see help_main.toggleFaq) and the height transitions.
 */
function faqRow(ui, entry) {
  const pfx = `${ui.fig.family}__faq`;
  const open = ui.isFaqOpen(entry.id);

  return Skeletons.Box.X({
    className: `${pfx}-row`,
    // data-* must go through attrOpt — a bare `dataset` prop is dropped at
    // render (ui-core letc.js). data-faq addresses the row without a rebuild.
    attrOpt: { "data-open": open ? 1 : 0, "data-faq": entry.id },
    service: "help-faq-toggle",
    faq_id: entry.id,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-body`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-question`,
            content: entry.question,
          }),
          Skeletons.Note({
            className: `${pfx}-answer`,
            content: entry.answer,
          }),
        ],
      }),
      // One glyph for both states — the skin rotates it 180° when the row
      // is open, which animates; swapping up/down icons cannot.
      Skeletons.Image.Svg({ ico: "ph-caret-down", className: `${pfx}-caret` }),
    ],
  });
}

/**
 * The rows alone — re-fed when the filter or category changes (not on
 * expand), so the filter input keeps focus. Falls back to an empty-state
 * note when nothing matches.
 */
function faqList(ui) {
  const pfx = `${ui.fig.family}__faq`;
  const entries = ui.getFaqEntries();
  if (!entries.length) {
    return [
      Skeletons.Note({
        className: `${pfx}-empty`,
        content: LOCALE.HELP_FAQ_NO_RESULTS,
      }),
    ];
  }
  return entries.map((e) => faqRow(ui, e));
}

/** Category chips. The active one is tinted per the design. */
function categoryChips(ui) {
  const pfx = `${ui.fig.family}__faq`;
  const current = ui.getFaqCategory();

  return Skeletons.Box.X({
    className: `${pfx}-chips`,
    kids: ui.getFaqCategories().map((cat) =>
      Skeletons.Box.X({
        className: `${pfx}-chip`,
        attrOpt: { "data-active": cat.id === current ? 1 : 0 },
        service: "help-faq-category",
        category_id: cat.id,
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({ className: `${pfx}-chip-label`, content: cat.label }),
        ],
      })
    ),
  });
}

function faqPage(ui) {
  const pfx = `${ui.fig.family}__faq`;

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__page ${pfx}-page`,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__page-title`,
        content: LOCALE.HELP_FAQ_TITLE,
      }),
      Skeletons.Box.Y({
        className: `${pfx}-controls`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-search`,
            kids: [
              Skeletons.Image.Svg({
                ico: "ph-magnifying-glass",
                className: `${pfx}-search-ico`,
              }),
              Skeletons.Entry({
                className: `${pfx}-search-input`,
                sys_pn: "faq-search",
                partHandler: ui,
                placeholder: LOCALE.HELP_FAQ_FILTER_PLACEHOLDER,
                // Category chips re-render this column; keep the typed
                // filter visible so it matches the rows actually shown.
                value: ui.getFaqQuery(),
                require: "any",
              }),
            ],
          }),
          categoryChips(ui),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-list`,
        sys_pn: "faq-list",
        kids: faqList(ui),
      }),
    ],
  });
}

module.exports = { faqPage, faqList };
