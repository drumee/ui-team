// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/sharebox/skeleton/desk-content.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_meeting(_ui_) {

  const fpx = _ui_.fig.family;

  const header = Skeletons.Box.X({
    className: `${fpx}__header`,
    sys_pn: _a.header,
    kids: [require("./header")(_ui_)]
  })

  const content = Skeletons.Box.X({
    className: `${fpx}__content`,
    sys_pn: _a.content,
    kids: [require("dmz/skeleton/common/desk-content")(_ui_)]
  })

  const lobby = Skeletons.Wrapper.Y({
    className: `${fpx}__lobby container`,
    sys_pn: "lobby-container",
    state: 1,
    kids: [
      Skeletons.Note({
        content: LOCALE.CONNECTING
      }),
      {kind:'spinner'}
    ]
  })

  const footer = Skeletons.Box.X({
    className: `${fpx}__footer`,
    sys_pn: _a.footer,
    dataset: {
      mode: _a.closed,
    }
  })

  let actionButtons = Skeletons.Box.X({
    className: `${fpx}__header-buttons`,
    sys_pn: 'action-buttons',
  })


  let a = Skeletons.Box.X({
    className: `${fpx}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fpx}__container`,
        kids: [
          header,
          actionButtons,
          lobby,
          content,
          footer
        ]
      })
    ]
  });

  return a;

};

module.exports = __skl_dmz_meeting;
