
const __skl_messenger = function(_ui_) {

  let a, upload;
  if(_ui_.canUpload()) {
    upload = Skeletons.Button.Svg({
      className : `${_ui_.fig.family}__icon attach`,
      ico       : "message_attach",
      service   : "attach"
    });
  } else { 
    upload = Skeletons.Box.X();
  }
      
  const container = Skeletons.Box.X({
    className     : `${_ui_.fig.family}__container`,
    debug         : __filename,
    kids          : [
      Skeletons.FileSelector({
        sys_pn:"fselector",
        bubble : 0,
        service : "",
        partHandler : [_ui_],
        uiHandler : [_ui_]
      }),

      upload,

      Skeletons.RichText({ 
        sys_pn      : _a.content,
        name        : _a.content,
        content     : _ui_.mget(_a.content),
        mode        : _a.interactive,
        placeholder : _ui_.getPlaceholder(), 
        autofocus   : _ui_.mget('autofocus'),
        className   : `${_ui_.fig.family}__content`,
        service     : _e.submit
      }), 
        //interactive : 1
         
      Skeletons.Button.Svg({
        className : `${_ui_.fig.family}__icon emoji`,
        ico       : "message_smile",
        sys_pn    : "message-smile",
        uiHandler : _ui_,
        service   : _a.emoji
      }),

      

      Skeletons.Button.Svg({
        className : `${_ui_.fig.family}__icon submit`,
        ico       : "send",
        sys_pn    : _a.submit,
        uiHandler : _ui_,
        service   : _a.submit,
        dataset: {  
          state : _a.closed
        }
      })
      
      //####### POSTPONED #########
      // Skeletons.Button.Svg
      //   cn        : "#{_ui_.fig.family}__icon micro"
      //   ico       : "message_micro"
      //   uiHandler : _ui_
      //   service   : 'micro'
    ]});
  
  return a = [
    Skeletons.Box.Y({
      className     : `${_ui_.fig.family}__main`,
      debug         : __filename,
      kids : [container]}),

    Skeletons.Wrapper.Y({
      className     : `${_ui_.fig.family}__wrapper-popup`,
      name : "popup"
    })

  ];
};

module.exports = __skl_messenger;
