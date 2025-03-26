const __topbar_control_representation = function(ui) {
  let state = 0;
  if (ui.getViewMode() === _a.row) {
    state = 1;
  }
  const view_ctrl = Skeletons.Button.Svg({
    ico       : "desktop_lineview",
    className : "icon ctrl-aspect",
    service   : 'change-view',
    sys_pn    : "view-ctrl",
    uiHandler : ui,
    state,
    icons     : [
      "desktop_lineview",
      "desktop_cells"
    ]});

  return view_ctrl;
};

module.exports = __topbar_control_representation;
