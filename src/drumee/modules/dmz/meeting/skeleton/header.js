// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /ui/src/drumee/modules/dmz/sharebox/skeleton/header.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_header(_ui_) {
  const headerFig = `${_ui_.fig.group}-header`

  const a = Skeletons.Box.G({
    debug: __filename,
    className: `${headerFig}__container`,
    kids: [
      { kind: 'custom_logo'},
    ]
  });

  return a;
};
module.exports = __skl_dmz_header;
