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
      // Home is a TAB, exactly like every crumb after it (59:55943 draws each
      // one as an icon + name pill). It used to be a bare Note, which is why
      // its label sat on a different baseline and in a different colour from
      // the workspace names beside it: two unrelated elements cannot share a
      // type ramp by accident.
      //
      // kidsOpt active:0 — ui-core binds a click to every widget that does not
      // opt out and stops propagation before triggerHandlers, so a child left
      // at the default would eat the click and "load-home" would never fire.
      Skeletons.Box.X({
        className: `${pfx}__context`,
        sys_pn: _a.context,
        partHandler: ui,
        uiHandler: [ui],
        service: "load-home",
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            className: `${pfx}__context-icon`,
            ico: "sidebar_home",
          }),
          Skeletons.Note({
            className: `${pfx}__context-label`,
            content: LOCALE.HOME,
          }),
        ],
      }),
      Skeletons.Box.X({ className: `${pfx}__content`, sys_pn: _a.content, kids: items })
    ],
  });
};
