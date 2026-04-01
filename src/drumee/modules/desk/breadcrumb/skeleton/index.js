/* ==================================================================== *
 * desk_breadcrumb skeleton
 * Renders a flat horizontal list of path items with › separators.
 * Each item delegates "open-node" to the source window.
 * ==================================================================== */

/**
 * @param {Object} ui   - The desk_breadcrumb widget instance
 * @param {Array}  data - Path items array from window/core.js buildBreadcrumbs()
 */
function skl_desk_breadcrumb(ui, data = []) {
  const pfx = ui.fig.family;
  const items = [];
  if (!_.isArray(data)) data = [data]
  data.forEach((item, i) => {
    if (item.filename || item.name) {
      items.push({ ...item, kind: "desk_breadcrumb_item", service: "breadcrum-jump" });
    }
  });
  return Skeletons.Box.X({
    className: `${pfx}__main`,
    debug: __filename,
    kids: items,
  });
}

module.exports = skl_desk_breadcrumb;
