/**
 * Sidebar module (refactored)
 */


const cls = (fig, suffix) => `${fig}__${suffix}`;


// ---------- Export ----------
module.exports = function (ui) {
  const fig = ui.fig.family;

  const list = Skeletons.List.Smart({
    className: cls(fig, "list"),
    innerClass: `${cls(fig, "content")}`,
    sys_pn: _a.list,
    flow: _a.none,
    timer: 1000,
    spinnerWait: 1000,
    spinner: true,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: "workspace_item",
      uiHandler: [ui],
      service: "load-workspace",
      radio: `sidebar-radio`, /** Shaed with sidebar items */
    },
    api: {
      service: SERVICE.desk.home,
      hub_id: Visitor.id,
      type: _a.hub
    },
  });

  return list;
};
