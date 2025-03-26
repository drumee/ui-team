const { colorFromName } = require("core/utils");
const __skl_chat_item_reply_message = function(_ui_) {
  
  let _message, attachmentWrapper, color, userName;
  const chatItemReplyFig = `${_ui_.fig.family}-reply`;

  const data = _ui_.mget(_a.thread);

  if ((data.message === 'DELETED') && _.isEmpty(data.entity)) {
    const username = '';
    attachmentWrapper = '';
    _message = 'Message Deleted';
    color = '#2F2F2f';
  
  } else {
    const {
      entity
    } = data;
    const {
      author_id
    } = data;
    let fullname = '';
    let displayName = '';
    _message = data.message;
    attachmentWrapper = '';

    if (author_id === Visitor.get(_a.id)) {
      fullname = Visitor.get(_a.fullname)|| (Visitor.get(_a.firstname) + ' ' + Visitor.get(_a.lastname));
      displayName = 'You';
    
    } else {
      if (entity.fullname != null) {
        ({
          fullname
        } = entity);
      } else {
        fullname    = (entity.firstname + ' ' + entity.lastname) || '';
      }
      
      displayName = entity.surname;
    }

    color = colorFromName(fullname);
    
    userName    = Skeletons.Note({
      className  : `${chatItemReplyFig}__note name`,
      content    : displayName,
      styleOpt   : {
        color
      }
    });
        
    if (data.is_attachment) {
      attachmentWrapper = Skeletons.Wrapper.X({
        className  : `${chatItemReplyFig}__wrapper attachment`,
        kids: [
          Skeletons.Box.Y({
            className   : `${chatItemReplyFig}__media-attachment`,
            flow        : _a.none,
            sys_pn      : 'attachment-content'
          })
        ]});
    }
  }

  const message = Skeletons.Note({
    className  : `${chatItemReplyFig}__note conversation`,
    content    : Autolinker.link(_message)
  });

  const messageRow = Skeletons.Box.X({
    className  : `${chatItemReplyFig}__wrapper message`,
    kids       : [
      Skeletons.Box.Y({
        className : `${chatItemReplyFig}__wrapper items`,
        kids      : [
          userName,
          message
        ]}),
      
      attachmentWrapper
    ]});
  
  const a = Skeletons.Box.X({
    className : `${chatItemReplyFig}__main`,
    debug     : __filename,
    styleOpt  : {
      borderLeft  : `2px solid ${colorFromName}`
    },
    kids      : [
      Skeletons.Box.X({
        className  : `${chatItemReplyFig}__container`,
        kids : [
          messageRow
        ]}) 
    ]});
  
  return a;
};

module.exports = __skl_chat_item_reply_message;
