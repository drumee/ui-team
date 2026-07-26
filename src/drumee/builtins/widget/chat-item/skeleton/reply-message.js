const { Autolinker } = require("autolinker");

// Mirrors `template/conversation.js` mention decode for the quoted parent.
const decodeMentions = (raw) => {
  if (!raw) return raw;
  // Single left-to-right pass over both mention kinds — see
  // template/conversation.js for why they cannot be two sequential replaces
  // (adjacent mentions with no space between them get swallowed).
  return raw.replace(
    /\[@(.*?)\]\((?:user:([^)]+)|mention:([^:)]+):([^)]+))\)/g,
    (match, label, drumateId, hubId, nid) => {
      if (drumateId) {
        const name = (label || '').trim() || 'Unknown';
        return `<a class="user-mention" data-drumate_id="${drumateId}">@${name}</a>`;
      }
      return `<a class="file-mention" data-hub_id="${hubId}" data-nid="${nid}">@${label}</a>`;
    }
  );
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

  let _message, userName, showAttachment = false;
  const chatItemReplyFig = `${_ui_.fig.family}-reply`;

  const data = _ui_.mget('thread');
  // Quoted file detection mirrors the message bubble (is_attachment OR a
  // non-empty attachment field) so a reply to a file shows its preview even when
  // the snapshot only carries `attachment`. The cards are filled asynchronously
  // by chat-item#setThreadData → attachmentReponse.
  const hasAttachment = data.is_attachment || !_.isEmpty(data.attachment);

  if ((data.message === 'DELETED') && _.isEmpty(data.entity)) {
    _message = 'Message Deleted';

  } else {
    // Trim so the quoted preview has no stray leading/trailing whitespace.
    _message = (data.message || '').trim();

    const displayName = resolveQuotedName(_ui_, data);

    // Name color comes from the skin. Render only when resolved, so an empty
    // name never leaves a blank slot above the quoted message.
    if (displayName) {
      userName = Skeletons.Note({
        className : `${chatItemReplyFig}__note name`,
        content   : displayName
      });
    }

    showAttachment = hasAttachment;
  }

  // Quoted text — full width, only when the replied message had text, so a
  // file-only reply shows no empty line (Figma 2306-36705).
  const message = (_message && _message.length)
    ? Skeletons.Note({
        className         : `${chatItemReplyFig}__note conversation selectable-text`,
        content           : Autolinker.link(decodeMentions(_message)),
        escapeContextmenu : true
      })
    : null;

  // File list — one card per attached file ([thumbnail] name / extension),
  // filled asynchronously by chat-item#attachmentReponse once the thread file
  // metadata loads. A reply to a multi-file message shows every file.
  const filesContainer = showAttachment
    ? Skeletons.Box.Y({
        className   : `${chatItemReplyFig}__files`,
        flow        : _a.none,
        partHandler : _ui_,
        sys_pn      : 'attachment-files'
      })
    : null;

  // Quote box stacks vertically: sender → quoted text → file list. Any absent
  // part is dropped so there is never an empty line. Carry the chat-item author
  // class so the skin can flip the palette for the dark "me" bubble where the
  // quote is nested (see chat-item index.js).
  const author = _ui_.mget('author') || '';
  const a = Skeletons.Box.Y({
    className : `${chatItemReplyFig}__main ${author}`,
    debug     : __filename,
    kids      : [userName, message, filesContainer].filter(Boolean)
  });

  return a;
};

module.exports = __skl_chat_item_reply_message;
