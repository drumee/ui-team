// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/private-access
//   TYPE :
// ==================================================================== *

// ----------------------------------------

// ===========================================================
// __form_prv_access
//
// @param [Object] view
//
// @return [Object]
//
// ===========================================================
const __form_prv_access = function(view) {
  // top_bar = [
  //   SKL_Note null, LOCALE.LOGIN_REQUIRED,
  //     {justify   : _a.center, className: _C.flexgrid},
  //     {color: 'red', 'font-size' : '18px', padding   : _K.size.px5, width:_K.size.full, height:_K.size.px50}
  //   SKL_SVG("cross-close", {service:_e.close, name:"context"},
  //     { color: "#ff3466", stroke: "0", cursor: "pointer"})
  // ]

  const social_icon_options = { 
    width   : 27,
    height  : 27,
    padding : 0
  };

  const cross_options = {
    width   : 22,
    height  : 22,
    padding : 7
  };

  const top_bar = {
    kind: KIND.box,
    flow: _a.vertical, 
    className: "u-ai-center",
    kids: [
      SKL_Note(null, "Log in", {className: "enter-form__header-text"}),
      SKL_Note(null, "No account? Sign up", {className: "enter-form__header-sign mt-15"})
    ]
  };

  const inner = {
    className   : "enter-form__inner py-50 px-74", //"#{_C.box_shadow} marging-auto padding-5 full login-inner #{_C.bg.white}"
    flow        : _a.vertical,
    persistence : _a.always,
    kind        : KIND.form,
    signal      : _e.ui.event,
    justify     : 'between',
    api         : { 
      signal    : _e.rpc.post,
      method    : _RPC.req.login
    },
    handler     : {
      ui        : view
    },
    kids        : [
      SKL_SVG("cross", {
        className: "enter-form__close",
        service  : _e.close, //"close-context-box"
        name     : _a.context
      }, cross_options), 
      SKL_Box_H(view, {
        className : "enter-form__header mb-30 u-jc-center", //_C.flexgrid
        kids : [top_bar]
      }),
      SKL_Box_V(view, {
        className : "enter-form__body mb-32", //_C.formBody
        styleOpt  : {
          width   : _K.size.full,
          height  : _a.auto
        },
        kids      : require('./login')() 
      }),
      SKL_Box_V(view, {
        className : "enter-form__footer u-ai-center", //'form-footer'
        //sys_pn  : _a.footer
        justify   : _a.right,
        kids      : [
          require('skeleton/button/trigger')('login', 'Log in', {service:_e.submit}),
          SKL_Box_V(view, {
            className: "mt-28",
            kids: [
              SKL_Note(null, "or sign up with ", {className: "entry-form__social-label mb-12"}),
              SKL_Box_H(view, {
                kids: [
                  SKL_SVG("backoffice_facebook", {className: "mx-4 entry-form__social-icon"}, social_icon_options), 
                  SKL_SVG("backoffice_google", {className: "mx-4 entry-form__social-icon"}, social_icon_options) 
                ]
              })
            ]
          })
        ]
      })
    ]
  };
  const anim = require('./slide-x')();
  const a = SKL_Box_V(view, {
    className : "enter-form ", //"login-outer" 
    anim,
    styleOpt  : {
      width     : 320,
      height    : 433
    },
    kids      : [inner]
  }); 
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/form/private-access'); }
  return a;
};
module.exports = __form_prv_access;
