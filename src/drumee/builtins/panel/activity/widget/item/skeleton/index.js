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

// Round 3 row redesign (Figma component set 58187:90482 `notification card feed`).
// Every branch of getActivityMeta below now also declares the 14x14 action badge
// that sits on the leading element: `ico` is a sprite name (icons/src/normalized/
// noti-*.svg, exported straight from the design's Phosphor set) and `tone` picks
// the badge fill — brand Primary/40 #5950FF, error Signal/Error #D74E49, success
// Signal/Success #54B684, warning Signal/Warning #E8A13B.
//
// The copy (before/label/after) and the routing are deliberately UNCHANGED; only
// these presentation fields are new. Figma has no variant for a few events we do
// emit (workspace move, ticket, storage alert, access request, share open), so
// those reuse the nearest glyph from the same exported set — noted per branch.
const BADGE = {
  brand: 'brand',
  error: 'error',
  success: 'success',
  warning: 'warning',
};

// Built-in Kanban column keys → their locale label. A user-created column is
// not in here: the server resolves its stored name and ships it as
// `column_name`, which wins. Mirrors BUILTIN_META in window/tasks/index.js —
// the two must agree, or a notification would name a column differently from
// the board it came from.
const COLUMN_LABEL = {
  todo: 'STATUS_TODO',
  in_progress: 'STATUS_IN_PROGRESS',
  to_review: 'STATUS_TO_REVIEW',
  complete: 'STATUS_COMPLETE',
};

const PRIORITY_LABEL = {
  low: 'PRIORITY_LOW',
  medium: 'PRIORITY_MEDIUM',
  high: 'PRIORITY_HIGH',
  urgent: 'PRIORITY_URGENT',
};

// Resolve a display name for a column/priority key. `stored` (the server-side
// name of a custom column) wins; otherwise the key is looked up in `map` and
// localised. An unknown key yields '' rather than the raw key — a key name
// leaking into a sentence reads as a bug to the user.
function labelOf(map, key, stored) {
  if (stored) return String(stored);
  const k = lookup(map, String(key || ''));
  return k ? LOCALE[k] : '';
}

// Own-property lookup: `column_key` / `priority` come from the server, so a
// value that happens to name an Object.prototype member ('constructor', …)
// would otherwise resolve to an inherited function and be rendered.
function lookup(map, key) {
  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
}

// "Aug 14, 10:00 AM" — Figma's scheduled-meeting card. Built from the meeting's
// epoch `stime`, NOT from the `date` string stored on the node: that one was
// formatted by the ORGANIZER, in the organizer's language and timezone.
//
// A comma joins the two halves rather than a localised "at": that word would
// need its own locale key which is empty in some languages, and an empty joiner
// leaves a double space. The comma reads correctly in all six.
// Same year/other year rule as the day-group headers below, for the same reason.
function meetingTime(stime) {
  const ts = parseInt(stime, 10);
  if (!ts) return '';
  const d = Dayjs.unix(ts);
  const day = d.year() === Dayjs().year() ? d.format('MMM D') : d.format('MMM D, YYYY');
  return `${day}, ${d.format('h:mm A')}`;
}

function getActivityMeta(ui, data) {
  const name = ui.getItemName();
  const cnt = parseInt(data.cnt, 10) || 0;
  const mentioned =
    data.event === 'mention'
    || getMentionIds(data).some((id) => String(id) === String(Visitor.id));

  // 0. A task_mention row carries more than @-mentions. `task_kind` (the `kind`
  // field task._notifyMentions writes into the activity's JSON data) tells the
  // four other things that ride the same event apart: a reply to your comment, a
  // plain comment on your task, a priority change and a column move.
  //
  // Every kind MUST be matched before the generic mention branch below:
  // channel.list_notifications synthesises mention_ids for every task row, so an
  // unmatched kind would fall into that branch and claim the sender "mentioned
  // you" — something they never did. That is why this is a switch with an
  // explicit default rather than a chain of ifs.
  if (data.event === 'task_mention' && data.task_kind) {
    const taskName = data.task_title || name;
    const folder = data.folder_name;
    switch (data.task_kind) {
      case 'reply':
        return {
          before: LOCALE.TASK_COMMENT_REPLY_ACTION,
          label: taskName,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
          // Figma: Tab=Task, Action=New task comment.
          ico: 'noti-chat-teardrop-dots',
          tone: BADGE.brand,
          folder,
        };

      case 'comment':
        // A comment on a task you are assigned to, where you were NOT
        // @-mentioned and are not the person being replied to.
        return {
          before: LOCALE.TASK_COMMENTED_ACTION,
          label: taskName,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
          ico: 'noti-chat-teardrop-dots',
          tone: BADGE.brand,
          folder,
        };

      case 'priority':
        return {
          before: LOCALE.TASK_PRIORITY_ACTION,
          label: taskName,
          after: LOCALE.TASK_PRIORITY_TO,
          // The new priority, highlighted like the task name (Figma marks both
          // ends of a "moved to" sentence as {ts1}).
          tail: labelOf(PRIORITY_LABEL, data.task_priority),
          colorClass: 'mention',
          badge: 'mention',
          ico: 'noti-shooting-star',
          tone: BADGE.brand,
          folder,
        };

      case 'moved': {
        // Figma's card for a status change carries no actor — the sentence is
        // about the task, and the avatar already shows who moved it.
        const done = parseInt(data.task_is_done, 10) === 1;
        const column = labelOf(COLUMN_LABEL, data.column_key, data.column_name);
        // With no resolvable column name "moved to " would dangle, so fall back
        // to the plain completed/moved sentence instead of an empty tail.
        // Leading element is the task chip, not a face, and the sentence names
        // nobody — the same shape the column-watch row uses for the identical
        // fact. One event must not render two different ways.
        if (done || !column) {
          return {
            before: '',
            label: taskName,
            after: done ? LOCALE.TASK_COMPLETED_ACTION : LOCALE.TASK_MOVED_ACTION,
            noSender: 1,
            colorClass: 'mention',
            badge: 'mention',
            // Figma: CheckCircle on the success fill for a completed task.
            ico: done ? 'noti-check-circle' : 'noti-share-fat',
            tone: done ? BADGE.success : BADGE.brand,
            chipIco: 'noti-list-checks',
            folder,
          };
        }
        return {
          before: '',
          label: taskName,
          after: LOCALE.TASK_MOVED_TO_ACTION,
          tail: column,
          noSender: 1,
          colorClass: 'mention',
          badge: 'mention',
          // Figma: Tab=Task, Action=Status changed (ShareFat).
          ico: 'noti-share-fat',
          tone: BADGE.brand,
          chipIco: 'noti-list-checks',
          folder,
        };
      }

      default:
        // An unknown kind from a newer server. Say the one thing that is
        // certainly true rather than inventing a claim, and never fall through
        // to "mentioned you in".
        return {
          before: LOCALE.TASK_UPDATED_ACTION,
          label: taskName,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
          ico: 'noti-shooting-star',
          tone: BADGE.brand,
          folder,
        };
    }
  }

  // 1. Mention is special — overrides any category branch.
  if (mentioned) {
    return {
      before: 'mentioned you in ',
      label: name,
      after: '',
      colorClass: 'mention',
      badge: 'mention',
      // Figma: Tab=Task/Chat, Action=Mentioned.
      ico: 'noti-at',
      tone: BADGE.brand,
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
      // No Figma variant: an admin-console system notice, so the Gear glyph on
      // the warning tone (the design's only "needs attention" fill).
      ico: 'noti-gear',
      tone: BADGE.warning,
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
      // Figma: Tab=Task, Action=Task assigned.
      ico: 'noti-plus-circle',
      tone: BADGE.brand,
      // The task's own folder, resolved server-side (_stampTaskFolderNames).
      // Without it the row never said WHERE the task lives.
      folder: data.folder_name,
    };
  }

  if (data.event === 'task_column_change') {
    // Column-watch notification (the bell toggle in a column header). The
    // sentence follows Figma's status-change card, which is about the task and
    // carries no actor — the avatar already shows who moved it.
    const created = data.task_action === 'created';
    const column = labelOf(COLUMN_LABEL, data.column_key, data.column_name);
    if (created || !column) {
      return {
        before: created ? LOCALE.TASK_CREATED_ACTION : '',
        label: data.task_title || name,
        after: created ? '' : LOCALE.TASK_MOVED_ACTION,
        noSender: created ? 0 : 1,
        colorClass: 'mention',
        badge: 'mention',
        // Figma: Tab=Task, Action=Status changed (ShareFat). A "created" row has
        // no Figma variant — reuse the Task-assigned glyph, same meaning.
        ico: created ? 'noti-plus-circle' : 'noti-share-fat',
        tone: BADGE.brand,
        chipIco: 'noti-list-checks',
        folder: data.folder_name,
      };
    }
    return {
      before: '',
      label: data.task_title || name,
      after: LOCALE.TASK_MOVED_TO_ACTION,
      tail: column,
      noSender: 1,
      colorClass: 'mention',
      badge: 'mention',
      ico: 'noti-share-fat',
      tone: BADGE.brand,
      chipIco: 'noti-list-checks',
      folder: data.folder_name,
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
      // Figma: Tab=Task, Action=Mentioned in task.
      ico: 'noti-at',
      tone: BADGE.brand,
      // The task's folder — same reason as task_assigned above.
      folder: data.folder_name,
    };
  }

  // A scheduled-meeting notice (invited / rescheduled / cancelled). A contact
  // activity like the task events, so it carries no `category` and would
  // otherwise fall into the contact branch and read "wants to connect".
  if (data.event === 'meeting_notice') {
    const meetingName = data.meeting_title || name;
    const when = meetingTime(data.meeting_stime);
    switch (data.meeting_kind) {
      case 'cancelled':
        return {
          before: '',
          label: meetingName,
          after: LOCALE.MEETING_CANCELLED_ACTION,
          noSender: 1,
          colorClass: 'restricted',
          badge: 'mention',
          // Figma: XCircle on the error fill (Meeting cancelled).
          ico: 'noti-x-circle',
          tone: BADGE.error,
          folder: data.folder_name,
        };

      case 'moved':
        // Rescheduled. With no readable start time the sentence would end on a
        // dangling preposition, so it degrades to the plain form.
        return {
          before: '',
          label: meetingName,
          after: when ? `${LOCALE.MEETING_RESCHEDULED_TO_ACTION}${when}` : LOCALE.MEETING_RESCHEDULED_ACTION,
          noSender: 1,
          colorClass: 'mention',
          badge: 'mention',
          ico: 'noti-video-camera',
          tone: BADGE.warning,
          folder: data.folder_name,
        };

      default:
        // 'invite' — Duy 2026-08-21: this replaces the "uploaded <meeting>" row
        // an invitee used to get, and it names the organizer.
        return {
          before: LOCALE.MEETING_INVITED_ACTION,
          label: meetingName,
          after: when ? `${LOCALE.MEETING_ON_ACTION}${when}` : '',
          colorClass: 'mention',
          badge: 'mention',
          ico: 'noti-video-camera',
          tone: BADGE.brand,
          folder: data.folder_name,
        };
    }
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
      // No Figma variant. ShareFat is the design's "moved to" glyph (Task
      // status change), which is exactly this event.
      ico: 'noti-share-fat',
      tone: BADGE.brand,
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
        // Figma Tab=Other, Action=Invitation carries a SmileySticker, which is
        // a copy-paste leftover from the reaction card — PlusCircle ("added
        // you") is the design's own invite glyph on the Task tab.
        ico: 'noti-plus-circle',
        tone: BADGE.brand,
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
        // An accepted invitation is the design's "completed" state.
        ico: accepted ? 'noti-check-circle' : 'noti-plus-circle',
        tone: accepted ? BADGE.success : BADGE.brand,
      };
    }

    case 'contact_refused':
      return {
        before: LOCALE.DECLINED_YOUR_INVITATION || 'declined your contact invitation',
        label: '',
        after: '',
        colorClass: 'mention',
        badge: 'mention',
        // Figma: XCircle on the error fill (Meeting cancelled).
        ico: 'noti-x-circle',
        tone: BADGE.error,
      };

    case 'chat':
      return {
        before: 'sent you a message',
        label: COUNT_SUFFIX(cnt),
        after: '',
        colorClass: 'mention',
        badge: 'mention',
        // Figma: Tab=Chat, Action=New message.
        ico: 'noti-chats-circle',
        tone: BADGE.brand,
      };

    case 'teamchat':
      // A folder-chat rollup whose latest unread meeting event is a start/end
      // (notification_center_next surfaces it as meeting_action, giving meetings
      // priority over plain chat). Render "<actor> started/ended a meeting in
      // <folder>" — actor name + avatar come from the same author fields. No count
      // suffix here (a meeting event is a single fact, not a message tally).
      if (data.meeting_action === 'start' || data.meeting_action === 'end') {
        const ended = data.meeting_action === 'end';
        return {
          before: ended
            ? (LOCALE.ENDED_MEETING_ACTION || 'ended a meeting in ')
            : (LOCALE.STARTED_MEETING_ACTION || 'started a meeting in '),
          label: name,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
          // Figma: Instant meeting (VideoCamera). An "ended" row has no variant
          // — XCircle is the design's meeting-over glyph, but on the brand fill
          // because ending a meeting is not an error.
          ico: ended ? 'noti-x-circle' : 'noti-video-camera',
          tone: BADGE.brand,
        };
      }
      // At least one of this folder's unread messages @-mentions the viewer.
      // The rollup is per folder, so a mention used to be indistinguishable from
      // an ordinary message and read "sent a message"; the server now flags it
      // (`mentioned_in` = the folder, from channel_list_notifications).
      // Deliberately checked AFTER meeting_action: a rollup carrying both is a
      // meeting, which is the more specific fact and owns the Meeting tab.
      if (data.mentioned_in) {
        return {
          before: LOCALE.MENTIONED_YOU_IN_ACTION,
          label: data.mentioned_in,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
          // Figma: Tab=Chat, Action=Mentioned.
          ico: 'noti-at',
          tone: BADGE.brand,
          folder: data.folder_name,
          // Duy 2026-08-21 asked for the folder in the sentence AND the chip on
          // this card, so it opts out of the "don't repeat the label" guard.
          folderAlways: 1,
        };
      }
      // Figma's Chat/"Folder Message" card carries NO folder in its sentence —
      // the folder is the chip on the second line. This used to read "posted in
      // <folder>", which both duplicated the chip and left nothing for it to
      // show. Duy 2026-08-20: the sentence is "sent a message".
      return {
        before: LOCALE.SENT_A_MESSAGE,
        label: '',
        after: COUNT_SUFFIX(cnt),
        colorClass: 'mention',
        badge: 'mention',
        // Figma: Tab=Chat, Action=Folder Message.
        ico: 'noti-chats-circle',
        tone: BADGE.brand,
        folder: data.folder_name,
      };

    case 'ticket':
      return {
        before: 'updated ticket ',
        label: name,
        after: COUNT_SUFFIX(cnt),
        colorClass: 'mention',
        badge: 'mention',
        // No Figma variant. ShootingStar is the design's generic "updated".
        ico: 'noti-shooting-star',
        tone: BADGE.brand,
      };

    case 'media':
    case 'mfs':
      // Sub-routing by `event` for individual mfs_changelog rows from get_feed.
      if (data.event === 'media.share' || data.is_forward === 1) {
        // `mget`, not `megt`: the latter is not a method on anything, so these
        // two calls threw TypeError and took the whole row's render with them.
        // Introduced in 8ee9a78f while converting `preview.accessibility` to
        // `ui.mget(...)` — that commit spells mget correctly three times over.
        if (ui.mget(_a.accessibility) === 'restricted') {
          return {
            before: 'shared a ',
            label: 'Restricted Link',
            after: ' with you',
            colorClass: 'restricted',
            badge: 'share',
            // Figma: Tab=files, Action=File shared.
            ico: 'noti-share-network',
            tone: BADGE.error,
          };
        }
        return {
          before: 'shared a ',
          label: ui.mget(_a.filetype) === 'link' ? 'Shared Link' : name,
          after: ' with you',
          colorClass: 'link-share',
          badge: 'share',
          // Figma: Tab=files, Action=File shared.
          ico: 'noti-share-network',
          tone: BADGE.brand,
        };
      }
      if (data.event === 'media.remove') {
        return {
          before: ui.isFolder() ? 'removed folder ' : 'removed file ',
          label: name,
          after: '',
          colorClass: 'restricted',
          badge: 'share',
          // Figma: Tab=files, Action=File delete (MinusCircle on error).
          ico: 'noti-minus-circle',
          tone: BADGE.error,
          chipIco: 'noti-file-text',
          // Figma's delete card reads "<File-name> has been move to trash" with
          // no actor. Duy 2026-08-21 kept the actor sentence deliberately ("it
          // shows who removed it") and asked only for the missing folder chip.
          // The containing folder is already resolved server-side for every
          // media.* changelog row.
          folder: data.folder_name,
        };
      }
      if (data.event === 'media.view') {
        return {
          before: 'viewed ',
          label: name,
          after: '',
          colorClass: 'mention',
          badge: 'mention',
          // No Figma variant. ShootingStar is the design's generic activity glyph.
          ico: 'noti-shooting-star',
          tone: BADGE.brand,
        };
      }
      if (ui.hasAttachment() && data.event !== 'media.new') {
        return {
          before: 'shared a file in ',
          label: name,
          after: '',
          colorClass: 'link-share',
          badge: 'share',
          ico: 'noti-share-network',
          tone: BADGE.brand,
        };
      }
      // A file's CONTENT changed: an editor save (media.save → _persist_file),
      // an upload over an existing node, or an image rotate. Figma reads
      // "<File-name> has been updated" with no actor, so the avatar carries the
      // who and the sentence carries the what.
      //
      // media.rename gets the same sentence on purpose (Duy 2026-08-21): the row
      // used to fall through to the upload branch below and announce a renamed
      // file as a fresh upload, which is the one thing it definitely was not.
      // The widget mset()s `dest` over `src`, so `name` is already the NEW name.
      //
      // Placed AFTER the share / view / attachment branches, never before, so a
      // row that reaches one of those today keeps reaching it.
      if (data.event === 'media.replace' || data.event === 'media.rename') {
        return {
          before: '',
          label: name,
          after: LOCALE.FILE_UPDATED_ACTION,
          noSender: 1,
          colorClass: 'mention',
          badge: 'mention',
          // No Figma variant for either. ShootingStar is the design's generic
          // "updated" glyph, already used for the ticket row.
          ico: 'noti-shooting-star',
          tone: BADGE.brand,
          folder: data.folder_name,
        };
      }
      // Default media event (media.new or aggregated rollup)
      {
        const itemFiletype = data.item_filetype || data.uploaded_filetype || ui.mget('item_filetype');
        // A scheduled meeting is a media node too (room.book creates a
        // `schedule` node), so notification_center_next rolls it up as an
        // upload — which is why an invitation used to read "<organizer>
        // uploaded <Meeting-name>" and sat in the Files tab. Only a SINGLE-item
        // rollup can be trusted here: the rollup groups per folder and takes
        // MAX(item_filetype), so a folder holding both a meeting and a file
        // would otherwise be relabelled a meeting. cnt > 1 keeps its old
        // upload wording, exactly as before.
        if (itemFiletype === 'schedule' && cnt <= 1) {
          const meetingLabel = data.item_filename || name;
          const when = meetingTime(data.meeting_stime);
          return {
            // Figma's scheduled-meeting card is "<Meeting-name> on <time>" with
            // the time in Primary/100 ({ts2}), i.e. not highlighted — so it goes
            // in `after`, not `tail`.
            before: '',
            label: meetingLabel,
            after: when ? `${LOCALE.MEETING_ON_ACTION}${when}` : '',
            noSender: 1,
            colorClass: 'mention',
            badge: 'mention',
            ico: 'noti-video-camera',
            tone: BADGE.brand,
            folder: data.folder_name,
          };
        }
        const createdFolder = itemFiletype ? itemFiletype === _a.folder : ui.isFolder();
        // A single-file upload shows the file's OWN name (item_filename, carried
        // by the server rollup); a multi-file rollup keeps the destination
        // folder/workspace name with "and N more". `name` (getItemName) is the
        // folder/workspace; item_filename is absent on raw feed rows (which
        // already resolve `name` to the file), so this only refines the rollup.
        const single = cnt <= 1;
        const label = (!createdFolder && single && data.item_filename) ? data.item_filename : name;
        return {
          // Figma reads "Sarah Chen uploaded {File-name}" — no "file" between
          // the verb and the name (Duy 2026-08-20). "created folder" keeps its
          // wording: the design has no variant for it, and dropping the noun
          // there would leave "created <name>" with no clue what was created.
          before: createdFolder ? 'created folder ' : LOCALE.UPLOADED_ACTION,
          label,
          after: cnt > 1 ? ` and ${cnt - 1} more` : '',
          colorClass: 'mention',
          badge: 'mention',
          // Figma: Tab=files, Action=File uploaded (UploadSimple). A new folder
          // is a creation, not an upload — PlusCircle from the same set.
          ico: createdFolder ? 'noti-plus-circle' : 'noti-upload-simple',
          tone: BADGE.brand,
          // The destination folder/workspace. Suppressed automatically when it
          // would only repeat the label (a multi-file rollup labels the folder).
          folder: data.folder_name,
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
        // Figma: Tab=Meeting, Action=Instant meeting.
        ico: 'noti-video-camera',
        tone: BADGE.brand,
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
        // No Figma variant. Gear is the design's permission glyph (Role changed),
        // and an access request is a permission ask.
        ico: 'noti-gear',
        tone: BADGE.brand,
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
        // No Figma variant. This is share activity → the File-shared glyph.
        ico: 'noti-share-network',
        tone: BADGE.brand,
      };

    default:
      return {
        before: data.action || data.event || 'updated ',
        label: name,
        after: '',
        colorClass: 'mention',
        badge: 'mention',
        ico: 'noti-shooting-star',
        tone: BADGE.brand,
      };
  }
}

// Day-group header ("Today" / "Yesterday" / "Aug 13"). The panel stamps
// `day_header` on the first row of each day before the rows become items — see
// _stampDayHeaders in panel/activity/index.js — so the header is rendered by the
// row that opens the group rather than by a synthetic list entry.
function dayHeaderLabel(key, timestamp) {
  if (key === 'today') return LOCALE.TODAY;
  if (key === 'yesterday') return LOCALE.YESTERDAY;
  if (!timestamp) return '';
  const d = Dayjs.unix(timestamp);
  // Same-year dates read as "Aug 13" (Figma); older ones need the year or two
  // Augusts a year apart would be indistinguishable.
  return d.year() === Dayjs().year() ? d.format('MMM D') : d.format('MMM D, YYYY');
}

module.exports = function (ui) {
  const pfx = 'activity-item';
  const data = ui.model.toJSON();
  const sender = escapeHtml(ui.mget(_a.sender));
  const meta = getActivityMeta(ui, data);
  // Several Figma cards state a fact about the item rather than an act by a
  // person — "<File-name> has been updated", "<Task-name> has been moved to
  // <Column>", "<Meeting-name> on <time>". Those branches set `noSender` so the
  // sentence does not open with a name; the avatar still shows who did it.
  // Every other branch keeps the leading "<sender> " exactly as before.
  // Trimmed: the resolved name arrives WITH a trailing space (measured live on
  // the endpoint — `sender` is "Duy Nguyen " at 11 chars, from the CONCAT in the
  // notification procs), and the template adds its own separator, so every
  // actor row rendered "Duy Nguyen  mentioned you in …" with a double space.
  // Pre-existing and visible on rows this change does not otherwise touch.
  const lead = meta.noSender ? '' : `${String(sender).trim()} `;
  // `tail` is a SECOND highlighted span, for the sentences Figma marks at both
  // ends ("… moved to {ts1}In Progress{/ts1}"). Absent on every other row, and
  // an empty one renders nothing at all.
  const tail = meta.tail
    ? `<span class="${pfx}__link ${meta.colorClass}">${escapeHtml(meta.tail)}</span>`
    : '';
  const text = `<span>${lead}${escapeHtml(meta.before)}</span><span class="${pfx}__link ${meta.colorClass}">${escapeHtml(meta.label)}</span><span>${escapeHtml(meta.after)}</span>${tail}`;
  const avatarFirstname = data.author_firstname || data.firstname;
  const avatarLastname = data.author_lastname || data.lastname;
  const category = getCategory(data);

  // Unread = the design's white card; read = no fill. Rows the panel builds
  // itself (access requests, live meetings) carry no is_read and are actionable,
  // so an absent flag means unread.
  const unread = parseInt(data.is_read, 10) === 1 ? '0' : '1';

  // Leading element: the actor's avatar (32px, radius 12) — unchanged from the
  // live panel — or the file-type chip (Overlay/brand fill, glyph inside).
  //
  // The chip is used ONLY where Figma is unambiguous that the row has no actor
  // face: the two branches above that set `chipIco` (file deleted, task status
  // changed). Deriving it from a "does this row name an actor" heuristic instead
  // would silently flip the leading element on rows that render an avatar today,
  // so the switch is opt-in per branch rather than inferred.
  const leading = meta.chipIco
    ? Skeletons.Box.X({
      className: `${pfx}__chip`,
      kids: [
        Skeletons.Image.Svg({
          className: `${pfx}__chip-ico`,
          ico: meta.chipIco,
        }),
      ],
    })
    : Skeletons.UserProfile({
      className: `${pfx}__avatar`,
      id: ui.mget(_a.autho_id),
      firstname: avatarFirstname,
      lastname: avatarLastname,
      type: 'thumb',
    });

  // 14x14 action badge pinned at (22,22) of the 32px leading element. `tone`
  // selects the fill; the glyph is a normalized sprite exported from the design.
  const avatar = Skeletons.Box.Y({
    className: `${pfx}__leading`,
    kids: [
      leading,
      Skeletons.Box.X({
        className: `${pfx}__badge`,
        dataset: { tone: meta.tone || BADGE.brand },
        kids: [
          Skeletons.Image.Svg({
            className: `${pfx}__badge-ico`,
            ico: meta.ico || 'noti-shooting-star',
          }),
        ],
      }),
    ],
  });

  // Second line: optional folder/workspace chip (a Figma component property, so
  // it toggles) followed by the relative time.
  //
  // The chip is opt-in per branch via `meta.folder`, like the badge — the first
  // version read `hub_name`/`workspace_name`, and NEITHER field exists on any
  // feed row, so no chip ever rendered. The name comes from the server's
  // normalized `folder_name`, which is resolved for both row shapes (rollups
  // name the folder directly; raw changelog rows get it from their parent id).
  // Still suppressed when it would only repeat the label, which is what a
  // multi-file upload rollup does.
  const folderName = meta.folder || '';
  // `folderAlways` opts a branch out of the "don't repeat the label" guard —
  // used only by the folder-mention row, where Duy asked for the folder in the
  // sentence AND the chip.
  const showFolder = !!folderName && (!!meta.folderAlways || folderName !== meta.label);

  const metaLine = Skeletons.Box.X({
    className: `${pfx}__meta`,
    kids: [
      showFolder
        ? Skeletons.Note({ className: `${pfx}__folder`, content: escapeHtml(folderName) })
        : null,
      Skeletons.Note({
        className: `${pfx}__time`,
        content: timeAgo(data.timestamp || data.ctime),
      }),
    ].filter(Boolean),
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
      metaLine,
    ],
  });


  // if (data.id != null) ui.mset('changelog_id', data.id);

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

  // The caption is a label, not a control — but it cannot simply be inert.
  // `active: 0` would leave it with no click handler of its own, so a click
  // would bubble out of the group to the activity_item root (which binds one by
  // default) and dispatch to the panel. Keeping it active gives it the framework
  // handler, whose e.stopPropagation() contains the click; `day-header` is then
  // swallowed explicitly in onUiEvent so it can never route anywhere.
  const header = data.day_header
    ? Skeletons.Note({
      className: `${pfx}__day`,
      content: escapeHtml(dayHeaderLabel(data.day_header, data.timestamp || data.ctime)),
      service: 'day-header',
      uiHandler: ui,
    })
    : null;

  return Skeletons.Box.Y({
    className: `${pfx}__group`,
    kids: [
      header,
      Skeletons.Box.X({
        className: `${pfx}__row ${meta.badge}`,
        dataset: { unread },
        kids: [avatar, textBlock, actions],
      }),
    ].filter(Boolean),
  });
};
