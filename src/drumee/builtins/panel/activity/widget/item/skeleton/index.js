function escapeHtml(value = "") {
  return _.escape(String(value));
}

function timeAgo(timestamp) {
  if (!timestamp) return "";
  return Dayjs.unix(timestamp).fromNow();
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

function getActivityMeta(ui, data) {
  const name = ui.getItemName();
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

  switch (ui.mget(_a.category)) {
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

    case 'contact_refused':
      return {
        before: LOCALE.DECLINED_YOUR_INVITATION || 'declined your contact invitation',
        label: '',
        after: '',
        colorClass: 'mention',
        badge: 'mention',
      };

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
        if (ui.megt(_a.accessibility) === 'restricted') {
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
          label: ui.megt(_a.filetype) === 'link' ? 'Shared Link' : name,
          after: ' with you',
          colorClass: 'link-share',
          badge: 'share',
        };
      }
      if (data.event === 'media.remove') {
        return {
          before: ui.isFolder() ? 'removed folder ' : 'removed file ',
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
      if (ui.hasAttachment() && data.event !== 'media.new') {
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
        before: ui.isFolder() ? 'created folder ' : 'uploaded file ',
        label: name,
        after: cnt > 1 ? ` and ${cnt - 1} more` : '',
        colorClass: 'mention',
        badge: 'mention',
      };

    case 'meeting': {
      const meetingName = (data.details && (data.details.filename || data.details.user_filename)) || data.hub_name || '';
      return {
        before: 'started a meeting in ',
        label: meetingName,
        after: '',
        colorClass: 'mention',
        badge: 'mention',
      };
    }

    case 'access_request':
      // "{email} is requesting access to {workspace}" (Figma 62).
      return {
        before: data.action || 'is requesting access to ',
        label: data.link_label || '',
        after: '',
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
  const sender = escapeHtml(ui.mget(_a.sender));
  const meta = getActivityMeta(ui, data);
  const text = `<span>${sender} ${escapeHtml(meta.before)}</span><span class="${pfx}__link ${meta.colorClass}">${escapeHtml(meta.label)}</span><span>${escapeHtml(meta.after)}</span>`;
  const avatarFirstname = data.author_firstname || data.firstname;
  const avatarLastname = data.author_lastname || data.lastname;

  const avatar = Skeletons.Box.Y({
    className: `${pfx}__avatar-wrap`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__avatar`,
        id: ui.mget(_a.autho_id),
        firstname: avatarFirstname,
        lastname: avatarLastname,
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
    // Access-request rows open the approve popup; other rows keep their default.
    service: data.category === 'access_request'
      ? 'open-access-request'
      : (data.service || 'open-activity'),
    uiHandler: ui,
    kids: [
      Skeletons.Note({ className: `${pfx}__text`, content: text }),
      Skeletons.Note({ className: `${pfx}__time`, content: timeAgo(data.timestamp || data.ctime || preview.ctime) }),
    ],
  });


  // if (data.id != null) ui.mset('changelog_id', data.id);

  const category = getCategory(data);
  const actionKids = category === 'meeting'
    ? [
      Skeletons.Button.Svg({
        className: `${pfx}__join`,
        ico: 'drumee-phone-cam',
        service: 'join-meeting',
        uiHandler: ui,
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__trash`,
        ico: 'notification_trash',
        service: 'dismiss-activity',
        uiHandler: ui,
      }),
    ]
    : [
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
    ];
  const actions = Skeletons.Box.X({
    className: `${pfx}__actions`,
    kids: actionKids,
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
