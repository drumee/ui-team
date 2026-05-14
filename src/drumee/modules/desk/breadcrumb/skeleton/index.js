/* ==================================================================== *
 * desk_breadcrumb skeleton
 * Renders a flat horizontal list of path items with › separators.
 * Each item delegates "open-node" to the source window.
 * ==================================================================== */

module.exports = function (ui, data = []) {
  const pfx = ui.fig.family;
  const items = [];
  if (!_.isArray(data)) data = [data]
  data.forEach((item, i) => {
    if (item && (item.filename || item.name)) {
      items.push({ ...item, kind: "desk_breadcrumb_item", service: "breadcrum-jump", isCurrent: i === data.length - 1 });
    }
  });
  return Skeletons.Box.X({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      Skeletons.Note({
        className: `${pfx}__context`,
        sys_pn: _a.context,
        partHandler: ui,
        uiHandler: [ui],
        service: "load-home",
        content: LOCALE.HOME,
      }),
      Skeletons.Box.X({ className: `${pfx}__content`, sys_pn: _a.content, kids: items })
    ],
  });
};
