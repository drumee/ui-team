
const __invitation_options_bar = function (ui) {
  // let kids;
  const permission = Skeletons.Button.Svg({
    ico: "desktop__cog", //"desktop_projectroom", 
    className: `${ui.fig.group}__container-buttons--option option permission`,
    uiHandler: [ui],
    service: "prompt-default-permission",
    state: 0
    //radiotoggle: radio #"quick-options-group"
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.group}__container-options`,
    active: 0,
    debug: __filename,
    sys_pn: "ref-options-bar",
    dataset: {
      active: ui.getState()
    },
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}__container-buttons`,
        sys_pn: "ref-options",
        active: 0,
        kids: [permission]
      }),
      Skeletons.Wrapper.Y({
        name: "options",
        part: ui,
        className: `${ui.fig.family}__wrapper-options`
      })
    ]
  });
};
module.exports = __invitation_options_bar;
