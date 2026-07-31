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

  // 0. Reply to your task comment ("{author} replied to your comment in {task}").
  // It rides the same task_mention row (data.kind='reply' → task_kind), so it
  // MUST be checked before the mention branch below: channel.list_notifications
  // synthesises mention_ids for every task row, which would otherwise label a
  // plain reply "mentioned you in" — a claim the sender never made.
  if (data.event === 'task_mention' && data.task_kind === 'reply') {
    return {
      before: LOCALE.TASK_COMMENT_REPLY_ACTION || 'replied to your comment in ',
      label: data.task_title || name,
      after: '',
      colorClass: 'mention',
      badge: 'mention',
    };
  }

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

  // 2b. Storage alert from the admin console ("{admin} sent you a storage
  // alert…"). Like task_assigned, it is a contact_activity row (category
  // resolves to 'contact') and would otherwise read "wants to connect".
  if (data.event === 'storage_alert') {
    return {
      before: LOCALE.STORAGE_ALERT_FEED
        || 'sent you a storage alert — your usage is high, please review and clear unnecessary files',
      label: '',
      after: '',
      colorClass: 'mention',
      badge: 'mention',
    };
  }

  // 2. Task assignment ("{creator} assigned you to {task}"). A task_assigned row
  // is a contact_activity event (category resolves to 'contact'), so without
  // this it would fall into the contact branch and read "wants to connect". The
  // task title is flattened onto the row server-side as `task_title`.
  if (data.event === 'task_assigned') {
    return {
      before: LOCALE.TASK_ASSIGNED_ACTION || 'assigned you to ',
      label: data.task_title || name,
      after: '',
      colorClass: 'mention',
      badge: 'mention',
    };
  }

  if (data.event === 'task_column_change') {
    return {
      before: data.task_action === 'created' ? 'created task ' : 'moved task ',
      label: data.task_title || name,
      after: '',
      colorClass: 'mention',
      badge: 'mention',
    };
  }

  // 2c. Task @-mention ("{author} mentioned you in {task}"). Like task_assigned
  // it is a contact_activity row (category resolves to 'contact'); without this
  // branch a feed-sourced task_mention would fall into the contact branch and
  // wrongly read "wants to connect". The task title is flattened onto the row
  // server-side as `task_title`.
  if (data.event === 'task_mention') {
    return {
      before: LOCALE.TASK_MENTION_ACTION || 'mentioned you in ',
      label: data.task_title || name,
      after: '',
      colorClass: 'mention',
      badge: 'mention',
    };
  }

  if (data.event === 'media.workspace_move') {
    const destination = parseJson(data.dest, {});
    const destinationName = destination.hub_name
      || destination.workspace_name
      || ui.mget('destination_hub_name')
      || LOCALE.WORKSPACE;
    return {
      before: ui.isFolder() ? 'moved folder ' : 'moved file ',
      label: name,
      after: ` to ${destinationName}`,
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
      // A folder-chat rollup whose latest unread meeting event is a start/end
      // (notification_center_next surfaces it as meeting_action, giving meetings
      // priority over plain chat). Render "<actor> started/ended a meeting in
      // <folder>" — actor name + avatar come from the same author fields. No count
      // suffix here (a meeting event is a single fact, not a message tally).
      if (data.meeting_action === 'start' || data.meeting_action === 'end') {
        return {
          before: data.meeting_action === 'start'
            ? (LOCALE.STARTED_MEETING_ACTION || 'started a meeting in ')
            : (LOCALE.ENDED_MEETING_ACTION || 'ended a meeting in '),
          label: name,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
        };
      }
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
      {
        const itemFiletype = data.item_filetype || data.uploaded_filetype || ui.mget('item_filetype');
        const createdFolder = itemFiletype ? itemFiletype === _a.folder : ui.isFolder();
        // A single-file upload shows the file's OWN name (item_filename, carried
        // by the server rollup); a multi-file rollup keeps the destination
        // folder/workspace name with "and N more". `name` (getItemName) is the
        // folder/workspace; item_filename is absent on raw feed rows (which
        // already resolve `name` to the file), so this only refines the rollup.
        const single = cnt <= 1;
        const label = (!createdFolder && single && data.item_filename) ? data.item_filename : name;
        return {
          before: createdFolder ? 'created folder ' : 'uploaded file ',
          label,
          after: cnt > 1 ? ` and ${cnt - 1} more` : '',
          colorClass: 'mention',
          badge: 'mention',
        };
      }

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

    case 'share_open':
      // "{email} opened {folder}" — a recipient viewed a notify-on-open share.
      // Now an ordinary feed row (activity.get_feed merges secure_share_open_feed),
      // so the folder name arrives as `node_name`; the legacy pinned path used
      // `link_label`. Fall back through both, and localise the verb.
      return {
        before: data.action || LOCALE.SECURE_SHARE_OPENED_ACTION || 'opened ',
        label: data.link_label || data.node_name || '',
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

  const textBlockService = data.category === 'access_request'
    ? 'open-access-request'
    : data.category === 'meeting'
      ? 'open-meeting-chat'
      : data.service;
  const textBlock = Skeletons.Box.Y({
    className: `${pfx}__text-block`,
    // Access-request rows open the approve popup; other rows route by category.
    service: textBlockService,
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
