// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : router/skeleton/popup-info
//   TYPE : 
// ==================================================================== *


const _upgrade = function (_ui_, args) {
  const {content, title} = args;
  const body = Skeletons.Box.Y({
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__message info my-30`,
        content
      }),
    ]
  });

  let okBtn = LOCALE.OK;
  let okBtnSedrvice = _a.close;
  
  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main u-jc-center u-ai-center`,
    debug: __filename,
    sys_pn: "container",
    kids: [
      Preset.Button.Close(_ui_),
      Skeletons.Note({
        className: `${_ui_.fig.family}__title mb-20`,
        content: title || LOCALE.DRUMEE_THANKS || "Congratulations for using Drumee"
      }),
      body,
      Skeletons.Box.X({
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__button u-jc-center overflow-text go`,
            content: okBtn,
            service: okBtnSedrvice
            // ui        : _ui_
          })
        ]
      })
    ]
  });
  return a;
};
module.exports = _upgrade;
