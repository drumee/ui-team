const { toggleState, radioState } = require("core/utils")

const sklSwitch = function (_ui_) {
  const labels = _ui_.mget(_a.labels);
  const multi_line = _ui_.mget('multi_line');
  const state = toggleState(_ui_.mget(_a.state));
  const sw = [
    Skeletons.Switch({
      sys_pn: 'switch',
      state,
      values: [0, 1],
      vendorOpt: [
        { label: labels[1] },
        { label: labels[2] }
      ]
    })
  ];

  if (multi_line) {
    sw.push(Skeletons.Button.Svg({
      ico: "info",
      className: `${_ui_.fig.family}__info`
    })
    );
  }

  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__main`,
    kids: [
      Skeletons.Note(labels[0], `${_ui_.fig.family}__text tbd`),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__switch`,
        kids: sw
      })
    ]
  });

  if (multi_line) {
    a.className = `${_ui_.fig.family}__row multi-line`;
    a.kids[0].className = `${_ui_.fig.family}__text multi-line`;
  }

  return a;
};
module.exports = sklSwitch;