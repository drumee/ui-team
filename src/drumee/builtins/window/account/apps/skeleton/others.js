// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

function button(_ui_, content, platform, arch) {
  const fig = _ui_.fig.family;
  let { href } = _ui_.getUrl(platform, arch)
  return Skeletons.Box.Y({
    className: `${fig}__buttons-wrapper others`,
    kids: [
      Skeletons.Note({
        className: `button ${_a.download}`,
        content,
        href,
        state: 0
      })
    ]
  })
}

function other_platforms(_ui_, content, service) {
  const fig = _ui_.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__buttons-wrapper`,
    kids: [
      button(_ui_, `Download desktop application for ${navigator.platform}`, _a.download),
    ]
  })
}

module.exports = function (_ui_) {
  const fig = _ui_.fig.family;
  let kids = [
    button(_ui_, `Windows IA32`, 'win', 'ia32'),
    button(_ui_, `Windows X64`, 'win', 'x64'),
    button(_ui_, `MacOs ARM64`, 'mac', 'arm'),
    button(_ui_, `MacOs X64`, 'mac', 'x64'),
    button(_ui_, `Linux Debian AMD64`, 'linux', 'deb'),
    button(_ui_, `Linux RPM X64`, 'linux', 'rpm'),
    button(_ui_, `Linux SNAP`, 'linux', 'snap'),
  ]
  // const a = Skeletons.Box.Y({
  //   className: `${fig}__main`,
  //   debug: __filename,
  //   kids
  // });

  return kids;
};
