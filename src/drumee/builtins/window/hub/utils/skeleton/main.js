// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/share-box/outbound/skeleton/main';
}


// ===========================================================
// __sb_main_outbound
//
// @param [Object] desk_ui
//
// @return [Object]
//
// ===========================================================
const __sb_main_outbound = function(manager) {
  const close_modal = SKL_SVG("account_cross", {
    className : "share-popup__modal-close",
    service   : _e.close,
    handler   : { 
      uiHandler   : manager
    }
  }, {
    width: 36,
    height: 36,
    padding: 12
  });

  const container = SKL_Box_V(manager, {
    initialState : _a.open,
    className: 'share-popup__modal-content u-ai-center',
    kids: [
      SKL_Box_V(manager, {
        className: 'share-popup__body',
        sys_pn: 'body-wrapper',
        kidsOpt: {
          className: 'mb-7'
        }
          //className: 'share-popup__modal-email mb-7'
      })
    ]
  });
  const a = [
    close_modal,
    SKL_Box_V(manager, {
      className : 'share-popup__modal-inner pt-30 u-ai-center',
      kids: [
        SKL_Box_H(manager, {
          className: 'share-popup__modal-header u-ai-center',
          kids: [
            SKL_Note(null, LOCALE.DOCUMENT_ACCESS)
          ]
        }),
        container
      ]
    })    
  ];
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __sb_main_outbound;
