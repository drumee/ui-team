
module.exports = function(ui) {
  const mode = ui.mget(_a.mode) || "hbfcx";
  const m = new RegExp(`[${mode}]`);
  const figname = "topbar";
  const pfx = `${ui.fig.group}-confirm`;
  const a = Skeletons.Box.X({
    className : `${pfx}-${figname}__container`,
    sys_pn    : "topbar",
    debug     : __filename,
    service   : _e.raise,
    kids : [
      Skeletons.Box.X({
        className: `${pfx}__title forbiden`,
        kids: [
          Skeletons.Note({
            sys_pn    : "window-label",
            className : _a.name,
            content   : ui.mget(_a.title) || ""
          })
        ]})
    ]});
  if (m.test('x')) {
    a.kids.unshift(Preset.Button.Close(ui));
  } else if (m.test('c')) {
    a.kids.unshift(require('window/skeleton/topbar/control')(ui, 'c'));
  }

  return a;
};
