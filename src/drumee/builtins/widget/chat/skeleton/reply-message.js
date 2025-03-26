// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/widget/chat/skeleton/reply-message.coffee
//   TYPE : Skeleton
// ==================================================================== *

const { Autolinker } = require("autolinker");
const { colorFromName } = require("core/utils");

const __skl_chat_reply_message = function(_ui_, msg) {
  
  const chatReplyFig = `${_ui_.fig.family}-reply`;

  const author      = msg.mget(_a.author);
  let fullname    = msg.mget(_a.fullname) || (msg.mget(_a.firstname) + ' ' + msg.mget(_a.lastname));
  let displayName = msg.mget(_a.surname);
  let attachmentWrapper   = '';
  if (_ui_.mget(_a.type) === _a.private) {
    const msgEntity = msg.mget(_a.entity);
    fullname    = (msgEntity.firstname + ' ' + msgEntity.lastname) || '';
    displayName = msgEntity.surname;
  }
  
  if (author === 'me') {
    displayName = LOCALE.YOU;//'You'
  }
  
  const userName    = Skeletons.Note({
    className  : `${chatReplyFig}__note name ${author}`,
    content    : displayName,
    styleOpt   : {
      color     : colorFromName(fullname)
    }
  });
  
  const message = Skeletons.Note({
    className  : `${chatReplyFig}__note conversation ${author}`,
    content    : Autolinker.link(msg.mget(_a.message))
  });
  
  if (msg.mget('is_attachment')) {
    const attachmentItem = _ui_.threadAttachment.model.attributes;
    const attachment = {
      kind          : 'media_grid',
      className     : `${_ui_.fig.family}__attachment-wrapper`,
      logicalParent : _ui_,
      row           : attachmentItem,
      filetype      : attachmentItem.ftype,
      nid           : attachmentItem.nid,
      hub_id        : attachmentItem.hub_id,
      filename      : attachmentItem.filename,
      ext           : attachmentItem.ext,
      filesize      : attachmentItem.filesize,
      vhost         : attachmentItem.vhost,
      mode          : _a.view,
      signal        : _e.ui.event,
      accessibility : attachmentItem.accessibility,
      capability    : attachmentItem.capability,
      handler       : {
        ui          : _ui_
      }
    };

    attachmentWrapper = Skeletons.Wrapper.X({
      className  : `${chatReplyFig}__items-wrapper attachment`,
      kids: [
        Skeletons.Box.Y({
          className   : `${chatReplyFig}__media-attachment ${author}`,
          flow        : _a.none,
          sys_pn      : "content", 
          kids        : [ attachment ]})
      ]});
  }

  const messageRow = Skeletons.Box.X({
    className  : `${chatReplyFig}__items-wrapper message-row${author}`,
    kids       : [
      Skeletons.Box.Y({
        className : `${chatReplyFig}__items-wrapper message`,
        kids      : [
          userName,
          message
        ]}),
      
      attachmentWrapper
    ]});
  
  const closeIcon = Skeletons.Button.Svg({
    ico       : 'account_cross',
    className : `${chatReplyFig}__icon close-icon ${author} account_cross`,
    service   : 'close-reply-message',
    uiHandler : _ui_
  });

  const a = Skeletons.Box.X({
    className : `${chatReplyFig}__main ${author}`,
    debug     : __filename,
    styleOpt  : {
      borderLeft  : `2px solid ${colorFromName(fullname)}`
    },
    kids      : [
      Skeletons.Box.X({
        className  : `${chatReplyFig}__container ${author}`,
        kids : [
          messageRow,
          closeIcon
        ]}) 
    ]});
  
  return a;
};

module.exports = __skl_chat_reply_message;
