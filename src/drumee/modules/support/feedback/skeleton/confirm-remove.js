// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/admin/skeleton/locale/confirm-remove
//   TYPE : 
// ==================================================================== *

const _confirm_buttons = function(view, cmd) {
  //btn_class  = 'pointer bg-white padding-10'
  const yes_opt     = { 
    contentClass : _C.margin.auto,
    className    : 'btn btn--confirm',
    service      : "confirm-remove",
    id           : cmd.model.get(_a.id),
    name         : cmd.model.get(_a.name),
    handler      : {
      ui         : view
    }
  };

  const no_opt      = { 
    contentClass:_C.margin.auto,
    className:'btn btn--cancel',
    service: "close-popup",
    handler : {
      ui : view
    }
  };
  
  const buttons = [
    SKL_Note(null, LOCALE.CANCEL, no_opt), //LOCALE.CANCEL
    SKL_Note(null, LOCALE.DELETE, yes_opt) //_L(_I.GOT_IT
  ];

  const a = SKL_Box_H(view, {
    className:"popup__btn-block u-jc-sb",
    kids:buttons,
    justify:_a.center
  });
  return a;
};

// ===========================================================
// __locale_confirm_remove
//
// @param [Object] view
// @param [Object] question
// @param [Object] warning
// @param [Object] page
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __locale_confirm_remove = function(view, cmd) {
  const key = cmd.model.get(_a.name);
  var message = message || LOCALE.KEY_DELETED; // " The key [#{key}] will be deleted. 
    //This may have effect on Drumee UI ! <b>
    //Are you sure ?"
  const a = {
    kind    : KIND.box,
    flow    : _a.vertical,
    kidsOpt : {
      signal  : _e.ui.event,
      handler : {
        ui      : view
      }
    },
    className : "popup pb-24 pt-30 px-40 u-jc-center u-ai-center",
    kids    : [
      SKL_Box_V(view, {
        className : "p-40 absolute",
        kids : [
          SKL_Note(null, message, {
            className:"popup__header popup__header--remove-page mb-8"
          }),
          _confirm_buttons(view, cmd)
        ],
        styleOpt : {
          width  : 400,
          background : _a.white,
          left: (window.innerWidth/2) - 200, 
          top: (window.innerHeight/2) - 100
        }
      })
    ]
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/admin/skeleton/locale/confirm-remove'); }
  return a;
};
module.exports = __locale_confirm_remove;
