/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function endpoint_placeholder(_ui_) {
  const fig = `${_ui_.fig.family}`;

  const footer = Skeletons.Box.Y({
    className: `${fig}-url-bar__tips`,
    kids: [
      Skeletons.Note({
        className: `${fig}__note header`,
        content: "Please enter your Drumee server address",
      }),
    ]
  })
  return footer

};


module.exports = endpoint_placeholder;
