const { Autolinker } = require("autolinker");
const { colorFromName } = require("@drumee/ui-essentials");

// Mirrors `template/conversation.js` mention decode for the quoted parent.
const decodeMentions = (raw) => {
  if (!raw) return raw;
  let text = raw.replace(
    /\[@([^\]]+)\]\(mention:([^:]+):([^)]+)\)/g,
    '<a class="file-mention" data-hub_id="$2" data-nid="$3">@$1</a>'
  );
  text = text.replace(
    /\[@([^\]]*)\]\(user:([^)]+)\)/g,
    (match, name, drumateId) => {
      const label = (name || '').trim() || 'Unknown';
      return `<a class="user-mention" data-drumate_id="${drumateId}">@${label}</a>`;
    }
  );
  return text;
};

const __skl_chat_item_reply_message = function(_ui_) {
  
  let _message, attachmentWrapper, color, userName;
  const chatItemReplyFig = `${_ui_.fig.family}-reply`;

  const data = _ui_.mget('thread');

  if ((data.message === 'DELETED') && _.isEmpty(data.entity)) {
    const username = '';
    attachmentWrapper = '';
    _message = 'Message Deleted';
    color = '#2F2F2f';
  
  } else {
    // Optimistic UI may snapshot the parent before `entity` is populated by the
    // server response — guard against undefined to avoid render crash.
    const entity = data.entity || {};
    const {
      author_id
    } = data;
    let fullname = '';
    let displayName = '';
    _message = data.message;
    attachmentWrapper = '';

    if (author_id === Visitor.get(_a.id)) {
      fullname = Visitor.get(_a.fullname)|| (Visitor.get(_a.firstname) + ' ' + Visitor.get(_a.lastname));
      displayName = LOCALE.YOU || 'You';

    } else {
      if (entity.fullname != null) {
        ({
          fullname
        } = entity);
      } else {
        fullname = `${entity.firstname || ''} ${entity.lastname || ''}`.trim();
      }

      displayName = entity.surname || fullname;
    }

    color = colorFromName(fullname);
    
    userName    = Skeletons.Note({
      className         : `${chatItemReplyFig}__note name`,
      content           : displayName,
      styleOpt  : {
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
            partHandler : _ui_, 
            sys_pn      : 'attachment-content'
          })
        ]});
    }
  }

  const message = Skeletons.Note({
    className         : `${chatItemReplyFig}__note conversation selectable-text`,
    content           : Autolinker.link(decodeMentions(_message)),
    escapeContextmenu : true
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
  
  // Carry the chat-item author class so SCSS can mirror the quote alignment
  // (own replies on the right, others on the left) — same pattern as bubble.
  const author = _ui_.mget('author') || '';
  // Mirror the colored border: own replies show the bar on the right edge.
  const borderStyle = author === 'me'
    ? { borderRight: `2px solid ${color}` }
    : { borderLeft : `2px solid ${color}` };
  const a = Skeletons.Box.X({
    className : `${chatItemReplyFig}__main ${author}`,
    debug     : __filename,
    styleOpt  : borderStyle,
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
