function escapeHtml(value = "") {
  return _.escape(String(value));
}

function timeAgo(timestamp) {
  if (!timestamp) return "";
  return Dayjs.unix(timestamp).fromNow();
}

function getSender(data) {
  return data.fullname || [data.firstname, data.lastname].filter(Boolean).join(" ") || data.email || data.uid || "Someone";
}

function getPreview(data) {
  if (data.dest?.nid) return data.dest;
  return data.src || data;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (_.isObject(value)) return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

function getMentionIds(data) {
  const ids = parseJson(data.mention_ids, []);
  return _.isArray(ids) ? ids : [];
}

function hasAttachment(data) {
  const attachment = parseJson(data.attachment, data.attachment);
  if (_.isArray(attachment)) return attachment.length > 0;
  if (_.isObject(attachment)) return !_.isEmpty(attachment);
  return !!attachment && String(attachment).trim() !== "" && attachment !== "null";
}

function isFolder(item = {}) {
  return item.filetype === _a.folder || item.ftype === _a.folder || item.category === _a.folder;
}

function getItemName(data, preview) {
  return preview.filename || preview.name || preview.user_filename || data.link_label || data.surname || data.hub_name || data.message || "item";
}

// Canonical category keys returned by activity.list. activity.get_feed
// rows (from mfs_changelog) only carry `event` like "media.remove" — fall
// back to inferring the category from that prefix so the switch matches.
function getCategory(data) {
  const direct = data.category || data.event_type || data.type;
  if (direct) return direct;
  const ev = String(data.event || '');
  if (ev === 'hub.invite_received') return 'hub_invite';
  const dot = ev.indexOf('.');
  return dot > 0 ? ev.slice(0, dot) : '';
}

const COUNT_SUFFIX = (cnt) => (cnt > 1 ? ` (${cnt})` : '');

function getActivityMeta(data, preview) {
  const category = getCategory(data);
  const name = getItemName(data, preview);
  const cnt = parseInt(data.cnt, 10) || 0;
  const mentioned =
    data.event === 'mention'
    || getMentionIds(data).some((id) => String(id) === String(Visitor.id));

  // 1. Mention is special — overrides any category branch.
  if (mentioned) {
    return {
      before: 'mentioned you in ',
      label: name,
      after: '',
      colorClass: 'mention',
      badge: 'mention',
    };
  }

  switch (category) {
    case 'hub_invite':
      // Never fall back to `name` for hub_invite — that resolver chains
      // through surname/sender fields and ends up showing the inviter's
      // own name (e.g. "invited you to workspace<InviterName>").
      return {
        before: data.action || 'invited you to ',
        label: data.link_label || data.hub_name || data.hub_headline || data.hub_ident || '',
        after: '',
        colorClass: 'mention',
        badge: 'mention',
      };

    case 'contact_invite':
    case 'contact': {
      // status === 'informed' marks the post-accept handshake half.
      const status = data.status || data.contact_status;
      const accepted = status === 'informed'
        || data.event === 'contact.accept_informed'
        || data.event_subtype === 'accepted';
      return {
        before: accepted
          ? (LOCALE.ACCEPTED_YOUR_INVITATION || 'accepted your invitation')
          : (LOCALE.WANTS_TO_CONNECT || 'wants to connect'),
        label: '',
        after: '',
        colorClass: 'mention',
        badge: 'mention',
      };
    }

    case 'chat':
      return {
        before: 'sent you a message',
        label: COUNT_SUFFIX(cnt),
        after: '',
        colorClass: 'mention',
        badge: 'mention',
      };

    case 'teamchat':
      return {
        before: 'posted in ',
        label: name,
        after: COUNT_SUFFIX(cnt),
        colorClass: 'mention',
        badge: 'mention',
      };

    case 'ticket':
      return {
        before: 'updated ticket ',
        label: name,
        after: COUNT_SUFFIX(cnt),
        colorClass: 'mention',
        badge: 'mention',
      };

    case 'media':
    case 'mfs':
      // Sub-routing by `event` for individual mfs_changelog rows from get_feed.
      if (data.event === 'media.share' || data.is_forward === 1) {
        if (preview.accessibility === 'restricted') {
          return {
            before: 'shared a ',
            label: 'Restricted Link',
            after: ' with you',
            colorClass: 'restricted',
            badge: 'share',
          };
        }
        return {
          before: 'shared a ',
          label: preview.filetype === 'link' ? 'Shared Link' : name,
          after: ' with you',
          colorClass: 'link-share',
          badge: 'share',
        };
      }
      if (data.event === 'media.remove') {
        return {
          before: isFolder(preview) ? 'removed folder ' : 'removed file ',
          label: name,
          after: '',
          colorClass: 'restricted',
          badge: 'share',
        };
      }
      if (data.event === 'media.view') {
        return {
          before: 'viewed ',
          label: name,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
        };
      }
      if (hasAttachment(data) && data.event !== 'media.new') {
        return {
          before: 'shared a file in ',
          label: name,
          after: '',
          colorClass: 'link-share',
          badge: 'share',
        };
      }
      // Default media event (media.new or aggregated rollup)
      return {
        before: isFolder(preview) ? 'created folder ' : 'uploaded file ',
        label: name,
        after: cnt > 1 ? ` and ${cnt - 1} more` : '',
        colorClass: 'mention',
        badge: 'mention',
      };

    default:
      return {
        before: data.action || data.event || 'updated ',
        label: name,
        after: '',
        colorClass: 'mention',
        badge: 'mention',
      };
  }
}

module.exports = function (ui) {
  const pfx = 'activity-item';
  const data = ui.model.toJSON();
  const preview = getPreview(data);
  const sender = escapeHtml(getSender(data));
  const meta = getActivityMeta(data, preview);
  const text = `<span>${sender} ${escapeHtml(meta.before)}</span><span class="${pfx}__link ${meta.colorClass}">${escapeHtml(meta.label)}</span><span>${escapeHtml(meta.after)}</span>`;
  const authorId = data.author_id || data.uid;

  const avatar = Skeletons.Box.Y({
    className: `${pfx}__avatar-wrap`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__avatar`,
        id: authorId,
        firstname: data.firstname,
        lastname: data.lastname,
        type: 'thumb',
      }),
      Skeletons.Note({
        className: `${pfx}__badge ${meta.badge}`,
        content: "",
      }),
    ],
  });

  const textBlock = Skeletons.Box.Y({
    className: `${pfx}__text-block`,
    service: data.service || 'open-activity',
    uiHandler: ui,
    kids: [
      Skeletons.Note({ className: `${pfx}__text`, content: text }),
      Skeletons.Note({ className: `${pfx}__time`, content: timeAgo(data.timestamp || data.ctime || preview.ctime) }),
    ],
  });

  // itemType MUST match the canonical `category` returned by activity.list,
  // so server-side `notification_dismiss` can route correctly.
  // Valid values: chat | contact | media | teamchat | ticket | hub_invite | contact_invite | mfs
  const itemType = getCategory(data)
    || (data.event === 'hub.invite_received' ? 'hub_invite' : 'mfs');
  const itemKey = `${itemType}:${data.id || data.hub_id || data.drumate_id || data.key_id || ''}`;
  ui.mset('item_type', itemType);
  ui.mset('item_key', itemKey);

  const actions = Skeletons.Box.X({
    className: `${pfx}__actions`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__bookmark`,
        ico: 'notification_favorite',
        service: 'toggle-favorite',
        uiHandler: ui,
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__trash`,
        ico: 'notification_trash',
        service: 'dismiss-activity',
        uiHandler: ui,
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__group`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__row ${meta.badge}`,
        kids: [avatar, textBlock, actions],
      }),
    ],
  });
};
