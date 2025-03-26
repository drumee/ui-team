// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/skeleton/popup-message.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_popup_message (_ui_, opt) {

  const popupFig = `${_ui_.fig.family}-popup`

  let btnService = opt.btnService || 'close-popup';
  let btnLabel = opt.btnLabel || LOCALE.OK

  const a = Skeletons.Box.Y({
    className : `${popupFig}__container u-jc-center u-ai-center`,
    debug     : __filename, 
    kids: [
      Skeletons.Note({
        className : `${popupFig}__message`,
        content   : opt.content
      }),

      Skeletons.Box.X({
        className : `${popupFig}__footer u-jc-center u-ai-center overflow-text go`,
        kids:[
          Skeletons.Note({
            className : `${popupFig}__button u-jc-center u-ai-center overflow-text go`,
            content   : btnLabel,
            flow      : _a.y,
            service   : btnService,
            uiHandler : [_ui_]
          })
       ]
      })
    ]
  });

  return a;
};

export default __skl_dmz_popup_message;
