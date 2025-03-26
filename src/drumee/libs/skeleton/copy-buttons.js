// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/confirm-buttons
//   TYPE : 
// ==================================================================== *

// ==================================================
// ==================================================

// ===========================================================
// __skl_conf_buttons
//
// @param [Object] view
// @param [Object] yes_ext
// @param [Object] no_ext
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_restore_buttons = function(view) {
  _dbg("dfdtytyybytty", view);
  //btn_class  = 'pointer bg-white padding-10'
  const same_opt     = { 
    contentClass : _C.margin.auto,
    className    : 'popup__btn popup__btn--rename-success',
    service      : "sameCopy"
  };
    // signal       : _e.ui.event
  const lang_pick_opt  = { 
    contentClass:_C.margin.auto,
    className :'popup__select', //btn popup__btn--success'
    service   : "pickLanguage"
  };
    // signal    : _e.ui.event
  const no_opt      = { 
    contentClass:_C.margin.auto,
    className :'popup__btn popup__btn--rename-cancel',
    // service   : "copyPopupClose"
    // service   : _e.cancel
    service   : "cancel"
  };
    // signal    : _e.ui.event

    //  if yes_ext?
    //    _.merge yes_opt, yes_ext
    //  if no_ext?
    //    _.merge no_opt, no_ext

    //  buttons = [
    //    SKL_Note(_e.cancel, "Cancel", no_opt) #LOCALE.CANCEL
    //    SKL_Note("same", "Same", same_opt) #_L(_I.GOT_IT
    //    SKL_Note("different", "Different", lang_pick_opt) #_L(_I.GOT_IT
    //  ]

  const a = SKL_Box_V(view, {
    kidsOpt : {
      handler : {
        ui : view
      }
    },
    kids: [

      SKL_Box_H(view, {
        className: "u-jc-center mb-32",
        kidsOpt : {
          handler : {
            ui : view
          }
        },
        kids:[
          SKL_Note("different", "Select a language", lang_pick_opt),
          SKL_Box_V(view,{
            wrapper : 1,
            sys_pn  : "languages_list",
            className: "languages__list"
          })
        ]
      }),

      SKL_Box_H(view, {
        kidsOpt : {
          handler : {
            ui : view
          }
        },
        kids: [
          SKL_Note(_e.cancel, "Cancel", no_opt),
          SKL_Note("same", "Submit", same_opt)
        ]
      })

    ]
  });

  return a;
};
module.exports = __skl_restore_buttons;
