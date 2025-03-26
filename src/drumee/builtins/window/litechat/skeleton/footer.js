// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/builtins/widget/chat/skeleton/footer.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __lite_chat_footer = function(_ui_) {

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
        no_upload   : 1,
        dataset     : {
          mode        : _a.open
        },
        uiHandler   : _ui_,
        autofocus   : 1,
        autoclear   : 1,
        mode        : _e.commit
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

  chatFooterContent.push(message);
  chatFooterContent.push(messageOptions);
  
  return chatFooterContent;
};

module.exports = __lite_chat_footer;