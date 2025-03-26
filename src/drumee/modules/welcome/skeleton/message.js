// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : /src/drumee/modules/welcome/skeleton/message.js
//   TYPE : Skeleton
// ==================================================================== *

// ==================================================
//
// ===========================================================
function __skl_welcome_message (_ui_, content) {
  let body;

  let btnService = _e.close;
  
  if (_.isString(content)) {
    if (content === 'invalid_token') {
      btnService = 'redirect-to-home';
      content = LOCALE.LINK_NO_VALID
    }

    if ((content === 'reset_password') || (content === 'invalid_step')) {
      btnService = 'redirect-to-home';
      content = LOCALE.TRY_AGAIN_LATER;
    }

    body = Skeletons.Note({
      className : `${_ui_.fig.group}__message`,
      content
    });
  
  } else if (_.isArray(content)) {
    body = Skeletons.Box.Y({
      className : `${_ui_.fig.family}__modal body`,
      debug     : __filename, 
      kids : content
    });
  
  } else {
    body = content;
  }

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__modal container u-jc-center u-ai-center`,
    debug     : __filename, 
    kids: [
      body, 
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__modal footer u-jc-center u-ai-center overflow-text go`,
        kids:[
          Skeletons.Note({
            className : `${_ui_.fig.group}__button u-jc-center u-ai-center overflow-text go`,
            content   : LOCALE.CLOSE,
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

export default __skl_welcome_message;
