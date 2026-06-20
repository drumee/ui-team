const { Autolinker } = require("autolinker");

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

// Resolve the quoted sender's display name like chat-item/template/username.js:
// the name may live on `entity` OR at the top level of the thread snapshot
// (server-persisted threads often drop `entity` but keep surname/firstname).
const resolveSenderName = (m) => {
  const e = m.entity || m;
  const lastname  = e.lastname || m.lastname || '';
  const surname   = e.surname || m.surname || '';
  const firstname = e.firstname || m.firstname || surname || '';
  const nonEmail  = (v) => (v && !String(v).includes('@')) ? v : '';
  const name = `${firstname} ${lastname}`.trim()
    || nonEmail(e.fullname) || nonEmail(m.fullname)
    || nonEmail(e.name) || nonEmail(m.name)
    || e.email || m.email || '';
  return name || '';
};

// Resolve the quoted sender. Own messages → "You" (no name fields needed, so it
// survives reload). For others, the server-persisted `thread` often drops the
// sender fields — recover the name from the parent message if it is still loaded
// in this chat list, mirroring how the parent's own bubble shows the name.
const resolveQuotedName = (_ui_, data) => {
  if (data.author_id === Visitor.get(_a.id)) return LOCALE.YOU || 'You';

  let name = resolveSenderName(data);
  if (name) return name;

  const coll = _ui_.model && _ui_.model.collection;
  const parentId = data.message_id || _ui_.mget('thread_id');
  if (coll && parentId) {
    const parent = coll.find(
      (mm) => mm.get('message_id') === parentId || mm.id === parentId
    );
    if (parent) name = resolveSenderName(parent.toJSON());
  }
  return name || '';
};

const __skl_chat_item_reply_message = function(_ui_) {

  let _message, attachmentWrapper, userName;
  const chatItemReplyFig = `${_ui_.fig.family}-reply`;

  const data = _ui_.mget('thread');

  if ((data.message === 'DELETED') && _.isEmpty(data.entity)) {
    attachmentWrapper = '';
    _message = 'Message Deleted';

  } else {
    let displayName = '';
    // Trim so the quoted preview has no stray leading/trailing whitespace.
    _message = (data.message || '').trim();
    attachmentWrapper = '';

    displayName = resolveQuotedName(_ui_, data);

    // Name color comes from the skin. Render only when resolved, so an empty
    // name never leaves a blank slot above the quoted message.
    if (displayName) {
      userName = Skeletons.Note({
        className : `${chatItemReplyFig}__note name`,
        content   : displayName
      });
    }

    if (data.is_attachment) {
      // Thumbnail is fed asynchronously into this part by
      // chat-item.attachmentReponse (sys_pn → this.__attachmentContent).
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

  // Text column: sender name (when resolved) + quoted preview.
  const items = Skeletons.Box.Y({
    className : `${chatItemReplyFig}__items`,
    kids      : userName ? [userName, message] : [message]
  });

  // Figma row: attachment thumbnail (left) then text column (right), centred.
  // Omit the thumbnail slot entirely on text-only replies — an empty kid would
  // still consume the row's column-gap and indent the quoted text from the edge.
  const row = Skeletons.Box.X({
    className : `${chatItemReplyFig}__row${data.is_attachment ? ' attachment' : ''}`,
    kids      : data.is_attachment ? [attachmentWrapper, items] : [items]
  });

  // Quote box — grey overlay background + left accent bar (skin). Carry the
  // chat-item author class so the skin can flip the palette for the dark "me"
  // bubble where the quote is nested (see chat-item index.js).
  const author = _ui_.mget('author') || '';
  const a = Skeletons.Box.X({
    className : `${chatItemReplyFig}__main ${author}`,
    debug     : __filename,
    kids      : [
      row
    ]});

  return a;
};

module.exports = __skl_chat_item_reply_message;
