const __window_channel_topbar = function (_ui_) {
  const name = _ui_.model.get(_a.filename) || "";
  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__${figname}-container ${_ui_.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__${figname}-title`,
        kids: [
          Skeletons.Button.Svg({
            className: `${_ui_.fig.group}-channel__topbar--icon`,
            ico: "tchat"
          }),
          Skeletons.Note({
            sys_pn: "ref-window-name",
            uiHandler: _ui_,
            partHandler: _ui_,
            className: "name",
            content: name
          })
        ]
      }),
      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: _ui_,
        partHandler: _ui_
      }),

      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]
  });

  return a;
};
module.exports = __window_channel_topbar;

