function _helpers(ui, content, name) {
  const pfx = `${ui.fig.family}__helper`
  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}-container`,
    service : `video-help`,
    name,
    haptic:2000,
    kidsOpt:{
      active:0
    },
    kids: [
      Skeletons.Note({
        className: `${pfx}-text`,
        content
      })
    ]
  });

};

module.exports = function (ui, opt, label, extra) {
  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${ui.fig.family}__action`,
    helper: _helpers(ui, label, opt.helperName),
    kids: [Skeletons.Button.Svg({innerClass:'action', ...opt})]
  })
  if(extra){
    a.kids.unshift(extra)
  }
  return a;
};


