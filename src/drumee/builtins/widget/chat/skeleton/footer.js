const __skl_widget_chat_footer = function(_ui_) {

  const chatFig = _ui_.fig.family;
  const chatFooterContent = [];
  
  const message = Skeletons.Box.Y({
    className   : `${chatFig}__messenger-wrapper`,
    kids        : [
      Skeletons.Box.X({
        className   : `${chatFig}-reply__wrapper`,
        sys_pn      : 'reply-wrapper',
        dataset     : {
          mode        : _a.closed
        }
      }),
      

      Skeletons.Messenger({
        className   : `${chatFig}__messenger`,
        sys_pn      : _a.message,
        dataset     : {
          mode        : _a.open
        },
        uiHandler   : [_ui_],
        autofocus   : 1,
        autoclear   : 1,
        mode        : _e.commit,
        service     : _e.send,
        content     : _ui_.getStoredMessage(),
        bubble      : 0
      }),
        
      Skeletons.Wrapper.Y({
        className   : `${chatFig}__attachment-wrapper`,
        name        : 'attachment'
      })
    ]});
  
  const messageOptions = Skeletons.Box.Y({
    className   : `${chatFig}__message-options-wrapper`,
    sys_pn      : 'message-options-wrapper',
    state       : 0,
    kids        : [
      Skeletons.Box.X({
        className   : `${chatFig}__message-count`,
        sys_pn      : 'selected-message-count'
      }),
      
      Skeletons.Box.X({
        className   : `${chatFig}__action-buttons`,
        sys_pn      : 'message-action-buttons'
      })
    ]});

  if (Visitor.isMimicUser() || _ui_.mget('isReadOnly')) {
    const readOnly = Skeletons.Wrapper.Y({
      className   : `${chatFig}_read-only-msg`,
      kids:[
        Skeletons.Note({
          content: _ui_.mget('readOnlyMsg') || 'Read Only'})
      ]});
    chatFooterContent.push(readOnly);
  } else {
    chatFooterContent.push(message);
    chatFooterContent.push(messageOptions);
  }
  
  return chatFooterContent;
};

module.exports = __skl_widget_chat_footer;