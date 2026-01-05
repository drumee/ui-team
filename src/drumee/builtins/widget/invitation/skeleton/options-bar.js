
const __invitation_options_bar = function (ui) {
  let kids;
  const permission = Skeletons.Button.Svg({
    ico: "desktop__cog", //"desktop_projectroom", 
    className: `${ui.fig.group}__container-buttons--option option permission`,
    uiHandler: [ui],
    service: "setup-permission",
    state: 0
    //radiotoggle: radio #"quick-options-group"
  });
  const message = Skeletons.Button.Svg({
    ico: "desktop__chat",
    className: `${ui.fig.group}__container-buttons--option option message`,
    uiHandler: [ui],
    service: "setup-message",
    state: 0
    //radiotoggle : radio #"quick-options-group"
  });

  if (ui.mget(_a.mode) === 'mini') {
    kids = [message];
  } else {
    kids = [permission, message];
  }

  const a = Skeletons.Box.Y({
    className: `${ui.fig.group}__container-options mt-10`,
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
        //state     : state
        kids
      }),
      Skeletons.Wrapper.Y({
        name: "options",
        part: ui,
        className: `${ui.fig.family}__wrapper-options`
      })
    ]
  });
  return a;
};
module.exports = __invitation_options_bar;
