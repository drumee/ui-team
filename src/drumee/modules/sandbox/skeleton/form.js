// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/form
//   TYPE :
// ==================================================================== *





// ===========================================================
// __sandbox_form
//
// @param [Object] view
// @return [Object]
//
// ===========================================================
const __sandbox_form = function(view) {

  const entries = [{
    name        : "req_lastname",
    className   : "sandbox-form__input",
    kind        : KIND.entry,
    placeholder : "I'm a text input field, put your last name",
    require     : "email_or_id",
    styleOpt: {
      height: 200
    }
  },{
    name        : "req_name",
    className   : "sandbox-form__input",
    kind        : KIND.entry,
    placeholder : "I'm a text input field, put yourname",
    require     : "email_or_id"
  },{
    name        : "req_email",
    className   : "sandbox-form__input",
    kind        : KIND.entry,
    placeholder : "I'm a textarea field, put your email",
    type        : _a.textarea
  },{
    name        : _a.password,
    className   : "sandbox-form__input",
    kind        : KIND.entry,
    type        : "req_pw",
    on_enter    : _e.submit,
    placeholder : "I'm a password",
    require     : "any"
  }];

  const button = {
    kind : KIND.note,
    content : "Send",
    flow    : _a.x, 
    justify : _a.center, 
    styleOpt : { 
      width : 100,
      padding : 10,
      background : "#5699E3"
    }
  };
  const inner = {
    className   : "enter-form__inner py-50 px-74",
    flow        : _a.vertical,
    persistence : _a.always,
    kind        : KIND.form,
    signal      : _e.ui.event,
    justify     : 'between',
    styleOpt : { 
      border    : "1px solid red"
    },
    kids        : [
      Skeletons.Box.Y({
        className : "enter-form__body mb-32", 
        kidsOpt : {
          styleOpt: {
            padding : 10
          }
        },
        styleOpt  : {
          width   : _K.size.full,
          height  : _a.auto
        },
        kids      : entries
      }),
      Skeletons.Box.X({
        className : "enter-form__footer u-ai-center", 
        justify   : _a.right,
        kids      : [
          button
        ]
      })
    ]
  };

  const form = { 
    kind:"drumee_api_form",
    nid : "/contact/contact.form.json",
    vhost:bootstrap().main_domain
  };
  const a = Skeletons.Box.Y({
    className : "enter-form ", //"login-outer" 
    anim      : require('./slide-x')(),
    styleOpt  : {
      width     : 400,
      height    : _a.auto
    },
    tips:"This is one of numerous widget availble in Drumee library",
    kids      : [
      form
    ]
  }); 

  return a;
};

module.exports =  __sandbox_form;
