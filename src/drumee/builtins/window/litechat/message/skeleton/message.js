// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/builtins/widget/chat-item/skeleton/message.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __litechat_message_content = function(_ui_) {
  const chatItemFig = _ui_.fig.family;
  const author      = _ui_.mget(_a.author);

  const messageContent = Autolinker.link(_ui_.mget(_a.message));


  const message = Skeletons.Note({
    className     : `${chatItemFig}__conversation ${author}`,
    content       : messageContent.nl2br() || ' ',
    formItem      : _a.author,
    name          : _a.author,
    value         : _ui_.mget(_a.author)
  });

  return message;
};

module.exports = __litechat_message_content;