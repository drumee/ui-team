// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

function button(_ui_, opt) {
  const fig = _ui_.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__buttons-wrapper`,
    kids: [
      Skeletons.Note({
        className: `button ${opt.service || _a.download}`,
        ...opt,
        state: 0,
      }),
    ],
  });
}

module.exports = function (_ui_) {
  const fig = _ui_.fig.family;
  let { DOWNLOAD_FOR_PLATFORM, SHOW_ALL_PLATFORMS } = LOCALE;
  let content = "";
  let { href } = _ui_.getUrl();
  if (_ui_.platform) {
    let target = _ui_.platform;
    let kids = [
      button(_ui_, { content: DOWNLOAD_FOR_PLATFORM.format(target), href }),
      button(_ui_, { content: SHOW_ALL_PLATFORMS, service: _a.show }),
    ];
    if (target == "linux") {
      let deb = _ui_.getUrl(target, "deb").href;
      let rpm = _ui_.getUrl(target, "rpm").href;
      kids = [
        button(_ui_, {
          content: DOWNLOAD_FOR_PLATFORM.format(`${target} (.deb)`),
          href: deb,
        }),
        button(_ui_, {
          content: DOWNLOAD_FOR_PLATFORM.format(`${target} (.rpm)`),
          href: rpm,
        }),
        button(_ui_, { content: SHOW_ALL_PLATFORMS, service: _a.show }),
      ];
    }
    if (_ui_.architecture) target = `${target} ${_ui_.architecture}`;
    content = Skeletons.Box.Y({
      className: `${fig}__content`,
      kids,
    });
  } else {
    content = require("./others")(_ui_);
  }
  const a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Button.Svg({
        ico: "account_ip",
        className: `${fig}__icon`,
      }),
      content,
      Skeletons.Wrapper.X({
        className: `${fig}__others`,
        sys_pn: "others",
      }),
    ],
  });

  return a;
};
