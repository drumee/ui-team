// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/widget/chat/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __lite_chat = function(_ui_) {

  const {
    family
  } = _ui_.fig;

  const fileDragDropWrapper = Skeletons.Box.X({
    className   : `${family}__drag-drop-wrapper`,
    name        : 'fileDragDrop',
    kids        : [
      Skeletons.Note({
        className : `${family}__drag-drop`,
        content   : LOCALE.DRAG_AND_DROP
      })
    ]});

  const list = Skeletons.List.Smart({
    sys_pn     : _a.list,
    flow       : _a.y,
    className  : `${family}__messages`,
    uiHandler  : _ui_,
    start      : _a.bottom,
    formItem   : 'messages',
    dataType   : _a.array,
    dataset    : {
      role     : _a.container
    },
    spinner     : true,
    placeholder : Skeletons.Note(LOCALE.NO_DISCUSSIONS_YET , 'no-content')
  });

  const content = Skeletons.Box.X({
    className   : `${family}__chat-content`,
    kids        : [
      list
    ]});

  const body = Skeletons.Box.Y({
    className: `${family}__body drive-content u-ai-center`,
    sys_pn   : _a.content,
    type: _a.type,
    kids: [
      fileDragDropWrapper,
      content
    ]});
  
  const ackWrapper = Skeletons.Wrapper.Y({
    className   : `${family}__ack-wrapper ack-wrapper`,
    name        : 'ack'
  });

  const header = {  
    className : `${family}__header ${_ui_.fig.group}__header`, 
    kidsOpt: {
      radio : _a.on,
      signal:_e.ui.event,
      uiHandler    : _ui_
    },
    kids : [require('./top-bar')(_ui_)]
  };

  const a = Skeletons.Box.Y({
    className  : `${family}__main`,
    kids : [
      require('./top-bar')(_ui_),
      body,
      ackWrapper,
      Skeletons.Wrapper.Y({
        className   : `${family}_chat_footer ack-wrapper`,
        sys_pn      : 'chat-footer',
        kids        : require('./footer')(_ui_)
      }) 
    ]});

  return a;

  return a;
};

module.exports = __lite_chat;