// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/radio
//   TYPE :
// ==================================================================== *


const __sandbox_menu = function (_ui_) {
  const btns = Skeletons.Box.X({
    kids: [
      Skeletons.Box.X({
        className: "sandbox--radio",
        kidsOpt: {
          className: `${_ui_.fig.name}-radio-button`,
          radio: "sandbox",
          style: {
            width: 50,
            height: 50,
            padding: 10
          }
        },
        kidsMap: {
          content: "ico"
        },
        kids: [
          Skeletons.Button.Svg({
            ico: "desktop_memory",
            initialState: 1,
          }),
          Skeletons.Button.Svg({
            ico: "desktop_desktop",
          }),
          Skeletons.Button.Svg({
            ico: "desktop_contact",
          }),
          Skeletons.Button.Svg({
            ico: "desktop_chat",
          }),
          Skeletons.Button.Svg({
            ico: "desktop_calendar",
          }),
          Skeletons.Button.Svg({
            ico: "desktop_account--white",
          })
        ]
      })
    ]
  });
  const a = Skeletons.Box.Y({
    tips: `The default selection is the last one. \
    How would you do to make the first one to become the default selection?`,
    kids: [btns]
  });
  return a;
};

module.exports = __sandbox_menu;
