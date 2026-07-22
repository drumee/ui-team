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
      nodeRole: "workspace",
      level: 0,
      radio: `sidebar-radio`, /** Shaed with sidebar items */
    },
    partHandler: ui,
    api: {
      service: SERVICE.desk.home,
      hub_id: Visitor.id,
      // hubs AND home-root folders — Personal workspaces are personal-area
      // folders, not hubs. Row filtering lives in the widget's onPartReady
      // (prepareData) because the mix needs per-filetype rules that the flat
      // `skip` regex cannot express.
      type: "node"
    },
  });

  return list;
};
