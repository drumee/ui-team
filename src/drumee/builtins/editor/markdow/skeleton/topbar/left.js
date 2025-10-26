const { slideMenu } = require("ui-toolkit")


const __skl_editor_markdown_topbar = function (_ui_) {
  const pfx = _ui_.fig.family;
  const a = Skeletons.Box.X({
    debug: __filename,
    sys_pn: "container-action",
    className: `${pfx}-topbar__action`,
    service: _e.raise,
    kids: [
      slideMenu({
        trigger
      }),
      // Skeletons.Button.Svg({
      //   ico: "floppy",
      //   service: _e.save,
      //   tooltips: LOCALE.EXPORT_AS_HTML,
      //   className: `${pfx}-topbar__icon save`,
      //   haptic: 1000
      // }),
      // Skeletons.Button.Svg({
      //   ico: "account_websites",
      //   service: "save-html",
      //   sys_pn: "save-html",
      //   className: `${pfx}-topbar__icon save-as`,
      //   tooltips: LOCALE.EXPORT_AS_HTML,
      //   haptic: 1000
      // }),
      Skeletons.Entry({
        className: `${pfx}-topbar__entry slidebar`,
        type: _a.input,
        sys_pn: "style-src",
        interactive: 0,
        placeholder: "stylesheet url",
        value: _ui_.metadata().stylesheet || ""
      })
    ]
  });
  return a;
};
module.exports = __skl_editor_markdown_topbar;
