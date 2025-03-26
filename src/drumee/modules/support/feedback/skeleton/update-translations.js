// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/admin/skeleton/update-translations
//   TYPE :
// ==================================================================== *

// ===========================================================
// _form (update-translations)
//
// @param [Object] manager
//
// ===========================================================


const __update_translations = function(manager, target) {
  const data = target.model.get('data');
  // bar = SKL_Box_H(manager, {
  //   className: "w-100 mb-30 my-22 u-jc-center"
  //   kids: [
  //     SKL_Note(null, LOCALE.CANCEL, {
  //       className: "btn btn--cancel mx-22"
  //       service : _e.close
  //     })
  //     SKL_Note(null, LOCALE.CHANGE, {
  //       className: "btn btn--confirm mx-22"
  //       service : _e.submit
  //     })
  //   ]
  // })

  // _form =
  //   kind      : KIND.form
  //   flow      : _a.y
  //   showIn    : _a.context
  //   className : "u-jc-center translation-form"
  //   handler   :
  //     ui        : manager
  //   signal    : _e.ui.event
  //   service   : "update-translations"
  //   name      : "update-translations"
  //   kids      : [
  //     SKL_Box_V(manager, {
  //       className: "u-jc-center"
  //       kids: [
  //         SKL_Entry(manager, '', {
  //           className    : "u-ai-center"
  //           name         : "key_code"
  //           placeholder  : "key"
  //           value        : data.key_code
  //           type         : _a.textarea
  //         })
  //         SKL_Entry(manager, '', {
  //           className    : "u-ai-center"
  //           name         : "en"
  //           placeholder  : "en"
  //           value        : data.en
  //           type         : _a.textarea
  //         })
  //         SKL_Entry(manager, '', {
  //           className    : "u-ai-center"
  //           name         : "fr"
  //           placeholder  : "fr"
  //           value        : data.fr
  //           type         : _a.textarea
  //         })
  //         SKL_Entry(manager, '', {
  //           className    : "u-ai-center"
  //           name         : "ru"
  //           value        : data.ru
  //           placeholder  : "ru"
  //           type         : _a.textarea
  //         })
  //         SKL_Entry(manager, '', {
  //           className    : "u-ai-center"
  //           name         : "zh"
  //           value        : data.zh
  //           placeholder  : "zh"
  //           type         : _a.textarea
  //         })
  //       ]
  //     })
  //     bar
  //   ]

  const a = {
    kind: KIND.box,
    flow: _a.y,
    className: 'translation-locale--popup',
    kids: [ 
      require('./local-row')(manager, target) 
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'builtins/admin/skeleton/update-translations'); }

  return a;
};
module.exports = __update_translations;
