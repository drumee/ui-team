const { dialog, tooltips, tabBar, splitBody } = require("../../skeleton/toolkit");


function grid(ui) {

  const header = Skeletons.Box.X({
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    // Named part so the window can re-feed a fresh topbar in place (e.g. on a
    // live role change) without rebuilding the whole window. Re-feeding the
    // header keeps the header element (and its drag/raise wiring) and only
    // swaps the topbar child.
    sys_pn: "folder-header",
    partHandler: [ui],
    kidsOpt: {
      radio: _a.on,
      uiHandler: [ui],
    },
    service: _e.raise,
    kids: [require("./topbar")(ui)],
  });
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    // Meeting tab (right of Tasks); hidden for share-recipient windows (token).
    kids: [header, tooltips(ui), tabBar(ui, { meeting: !ui.mget(_a.token) }), splitBody(ui), dialog(ui)],
  });
}
module.exports = grid;
