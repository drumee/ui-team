// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/widget/chat/skeleton/reply-message.coffee
//   TYPE : Skeleton
// ==================================================================== *

const { Autolinker } = require("autolinker");

// Mirrors `chat-item/template/conversation.js` mention decode for the preview.
const decodeMentions = (raw) => {
  if (!raw) return raw;
  let text = raw.replace(
    /\[@([^\]]+)\]\(mention:([^:]+):([^)]+)\)/g,
    '<a class="file-mention" data-hub_id="$2" data-nid="$3">@$1</a>'
  );
  text = text.replace(
    /\[@([^\]]*)\]\(user:([^)]+)\)/g,
    (match, name, drumateId) => {
      const label = (name || '').trim() || '@Unknown';
      return `<a class="user-mention" data-drumate_id="${drumateId}">${label.startsWith('@') ? label : '@' + label}</a>`;
    }
  );
  return text;
};

// Resolve the replied sender's display name the same way as
// chat-item/template/username.js — the name lives on `entity` for other users
// (top-level surname/firstname are often empty), own messages show "You".
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

const __skl_chat_reply_message = function(_ui_, msg) {

  const chatReplyFig = `${_ui_.fig.family}-reply`;

  // Replied message attributes (literal keys, like chat-item/skeleton/reply-message).
  const m = (msg.model && msg.model.toJSON) ? msg.model.toJSON()
          : (msg.getAttr ? msg.getAttr() : {});
  const author = m.author || msg.mget('author');
  let attachmentWrapper = '';

  const displayName = (author === 'me') ? LOCALE.YOU : resolveSenderName(m);

  // Leading reply arrow (exact Figma icon, design Primary/40 purple). Decorative
  // — no service; color is applied in skin via currentColor (sprite strips fill).
  const replyIcon = Skeletons.Button.Svg({
    ico       : 'chat_reply_arrow',
    className : `${chatReplyFig}__arrow ${author}`
  });

  // Header "Reply to {name}" — purple, replaces the old name-colored label.
  const userName = Skeletons.Note({
    className  : `${chatReplyFig}__note name ${author}`,
    content    : `${LOCALE.REPLY_TO} ${displayName}`
  });

  // Single-line quoted preview — grey, truncated with ellipsis in skin.
  const message = Skeletons.Note({
    className  : `${chatReplyFig}__note conversation ${author}`,
    content    : Autolinker.link(decodeMentions(m.message))
  });

  if (m.is_attachment) {
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

  // Text column: header + preview stacked, takes remaining width.
  const content = Skeletons.Box.Y({
    className : `${chatReplyFig}__content ${author}`,
    kids      : [
      userName,
      message
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
    kids      : [
      replyIcon,
      content,
      attachmentWrapper,
      closeIcon
    ]});

  return a;
};

module.exports = __skl_chat_reply_message;
