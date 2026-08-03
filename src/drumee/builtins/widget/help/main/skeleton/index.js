const { nav } = require("./nav");
const content = require("./content").default;

/**
 * Get help screen root: fixed-width nav column + scrolling content column.
 * The content column carries `sys_pn` so a page switch can re-feed just the
 * right-hand side.
 */
function help_body(ui) {
  const pfx = ui.fig.family;

  return Skeletons.Box.X({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      nav(ui),
      Skeletons.Box.Y({
        className: `${pfx}__content`,
        sys_pn: "help-content",
        kids: content(ui),
      }),
    ],
  });
}

export default help_body;
