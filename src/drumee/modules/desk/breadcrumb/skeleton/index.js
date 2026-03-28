/* ==================================================================== *
 * desk_breadcrumb skeleton
 * Renders a flat horizontal list of path items with › separators.
 * Each item delegates "open-node" to the source window.
 * ==================================================================== */

const breadcrumbItem = require("builtins/window/skeleton/topbar/breadcrumbs-item");

/**
 * @param {Object} ui   - The desk_breadcrumb widget instance
 * @param {Array}  data - Path items array from window/core.js buildBreadcrumbs()
 */
function skl_desk_breadcrumb(ui, data = []) {
  const pfx = ui.fig.family;

  // Delegate open-node clicks to the source window, not to desk
  const handler = ui._sourceWindow || ui;

  const items = [];
  data.forEach((item, i) => {
    items.push(breadcrumbItem(handler, item));
    if (i < data.length - 1) {
      items.push(
        Skeletons.Note({
          content: "›",
          className: `${pfx}__separator`,
        })
      );
    }
  });

  return Skeletons.Box.X({
    className: `${pfx}__main`,
    debug: __filename,
    kids: items,
  });
}

module.exports = skl_desk_breadcrumb;
