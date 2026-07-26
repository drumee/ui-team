// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/widget/chat/skeleton/reply-message.coffee
//   TYPE : Skeleton
// ==================================================================== *

const { Autolinker } = require("autolinker");

// Mirrors `chat-item/template/conversation.js` mention decode for the preview.
const decodeMentions = (raw) => {
  if (!raw) return raw;
  // Single left-to-right pass over both mention kinds — see
  // chat-item/template/conversation.js for why they cannot be two sequential
  // replaces (adjacent mentions with no space between them get swallowed).
  return raw.replace(
    /\[@(.*?)\]\((?:user:([^)]+)|mention:([^:)]+):([^)]+))\)/g,
    (match, rawLabel, drumateId, hubId, nid) => {
      if (drumateId) {
        const label = (rawLabel || '').trim() || '@Unknown';
        return `<a class="user-mention" data-drumate_id="${drumateId}">${label.startsWith('@') ? label : '@' + label}</a>`;
      }
      return `<a class="file-mention" data-hub_id="${hubId}" data-nid="${nid}">@${rawLabel}</a>`;
    }
  );
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

  const displayName = (author === 'me') ? LOCALE.YOU : resolveSenderName(m);

  // Leading reply arrow (exact Figma icon, design Primary/40 purple). Decorative
  // — no service; color is applied in skin via currentColor (sprite strips fill).
  const replyIcon = Skeletons.Button.Svg({
    ico       : 'chat_reply_arrow',
    className : `${chatReplyFig}__arrow ${author}`
  });

  // Header "Reply to {name}" — purple, replaces the old name-colored label.
  // Reply-in-thread (team chat file message) appends " in thread" so the quote
  // reads "Reply to {name} in thread".
  const inThread = _ui_ && _ui_._replyInThread ? ` ${LOCALE.IN_THREAD}` : '';
  const userName = Skeletons.Note({
    className  : `${chatReplyFig}__note name ${author}`,
    content    : `${LOCALE.REPLY_TO} ${displayName}${inThread}`
  });

  // Single-line quoted preview — grey, truncated with ellipsis in skin.
  const message = Skeletons.Note({
    className  : `${chatReplyFig}__note conversation ${author}`,
    content    : Autolinker.link(decodeMentions(m.message))
  });

  // File cards — one per attached file ([thumbnail] name / extension), mirror of
  // the sent-bubble reply quote (chat-item/skeleton/reply-message). Detect the
  // file like the message bubble (is_attachment OR a non-empty attachment field);
  // metadata comes from the replied row's already-rendered attachment cards
  // (threadAttachments — full file records, so the preview URL resolves). A reply
  // to a multi-file message quotes every file.
  const hasAttachment = m.is_attachment || !_.isEmpty(m.attachment);
  const fileCards = [];
  if (hasAttachment && _.isArray(_ui_.threadAttachments)) {
    _ui_.threadAttachments.forEach((attachmentItem) => {
      if (!attachmentItem) return;

      // Name (top) + extension (bottom). Extension omitted when absent so an
      // extension-less file leaves no empty line.
      const fileInfoKids = [
        Skeletons.Note({
          className : `${chatReplyFig}__note filename`,
          content   : attachmentItem.filename || ''
        })
      ];
      if (attachmentItem.ext) {
        fileInfoKids.push(Skeletons.Note({
          className : `${chatReplyFig}__note fileext`,
          content   : attachmentItem.ext
        }));
      }

      fileCards.push(Skeletons.Box.X({
        className : `${chatReplyFig}__file ${author}`,
        kids      : [
          Skeletons.Box.Y({
            className : `${chatReplyFig}__media-attachment ${author}`,
            flow      : _a.none,
            kids      : [
              {
                // Spread the FULL file record so the media grid resolves its
                // preview URL from vhost + ownpath/filepath (a hand-picked subset
                // left the thumbnail blank).
                ...attachmentItem,
                kind          : 'media_grid',
                // Unique class — must NOT reuse `${fig}__attachment-wrapper`,
                // which the chat footer's staged-upload skin (chat/skin/
                // attachment.scss) hides (display:none) and force-sizes to 64px.
                className     : `${chatReplyFig}__grid`,
                isAttachment  : 1,
                origin        : _a.chat,
                uiHandler     : Wm,
                logicalParent : Wm,
                filetype      : attachmentItem.ftype || attachmentItem.filetype
              }
            ]
          }),
          Skeletons.Box.Y({
            className : `${chatReplyFig}__file-info`,
            kids      : fileInfoKids
          })
        ]}));
    });
  }

  // Quoted text — only when the replied message had text (file-only → no gap).
  const hasText = !_.isEmpty((m.message || '').trim());

  // Text column: header → quoted text → file cards, dropping any absent part.
  const content = Skeletons.Box.Y({
    className : `${chatReplyFig}__content ${author}`,
    kids      : [userName, hasText ? message : null, ...fileCards].filter(Boolean)
  });

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
      closeIcon
    ]});

  return a;
};

module.exports = __skl_chat_reply_message;
