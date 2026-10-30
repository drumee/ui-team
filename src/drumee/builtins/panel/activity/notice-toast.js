// Pop-ups for being @-mentioned and for being assigned a task (Lexis
// 2026-10-29) — the chat pop-up, extended past chat.
//
// Which pushes raise one, and what they say:
//   task.assigned            "<A> assigned you to <task>"
//   task.mention             "<A> mentioned you in <task>" — only a REAL
//                            mention: the server sends the reply / comment /
//                            priority / moved notifications on the same
//                            service, told apart by `options.kind`, and a
//                            server that predates `kind` raises nothing
//   room.mention             "<A> mentioned you in <meeting>" (its description)
//   channel.file_thread_post "<A> mentioned you: <comment>" — only when the
//                            comment names the viewer
// A mention in a chat message needs nothing here: the message raises the chat
// card already, and that card says "mentioned you" (chat-toast.js buildCard).
//
// Mute stays a chat setting (Duy 2026-10-29): it silences the file comment,
// which is chat, and never a task or a meeting.
//
// Open lands where the matching Notification Center row lands
// (widget/item/index.js), so the two can never disagree.

const { showNoticeToast, plainMessage, mentionsMe } = require("./chat-toast");
const { meetingDeepLink } = require("./widget/item/meeting-link");
const { isPopupMuted } = require("./mute");

function senderOf(options = {}, data = {}) {
  const s = options.sender || {};
  return {
    author_id: s.uid || s.id || data.author_id,
    firstname: s.firstname || data.firstname,
    lastname: s.lastname || data.lastname,
    fullname: s.fullname || data.fullname,
    email: s.email || data.email,
  };
}

function taskUrl(data, ts) {
  const nid = data.nid != null && `${data.nid}` !== "0" ? data.nid : 0;
  const taskId = data.task_id || data.id;
  let url = `#/desk/wm/reveal/?hub_id=${data.hub_id}&nid=${nid}&filetype=folder&pid=0&activeTab=${_a.task}`;
  if (taskId) url += `&open_task_id=${taskId}`;
  return `${url}&ts=${ts}`;
}

/**
 * What to show for a push: { model, url, onOpen? }, or null for none.
 * Pure apart from reading Visitor / the mute cache, so it is testable alone.
 *
 * @param {string} service options.service of the push
 * @param {object} data    the push model (first row)
 * @param {object} options the push options
 * @param {object} [host]  the activity panel — only the file comment's Open
 *                         needs it, to look the file up
 */
function noticeFor(service, data, options = {}, host = null) {
  if (!data || !data.hub_id) return null;
  const ts = Date.now();
  const sender = senderOf(options, data);
  switch (service) {
    case "task.assigned":
      return {
        model: {
          ...sender,
          ico: "noti-plus-circle",
          line: `${LOCALE.TASK_ASSIGNED_ACTION}${data.title || ""}`,
        },
        url: taskUrl(data, ts),
      };

    case "task.mention":
      if (options.kind !== "mention") return null;
      return {
        model: {
          ...sender,
          ico: "noti-at",
          line: `${LOCALE.TASK_MENTION_ACTION}${data.title || ""}`,
        },
        url: taskUrl(data, ts),
      };

    case "room.mention": {
      // The meeting's folder on its Meeting tab, opened on the meeting's card
      // — the meeting_notice row's own link.
      const pid = data.pid != null && `${data.pid}` !== "0" ? data.pid : 0;
      return {
        model: {
          ...sender,
          ico: "noti-at",
          folder_name: data.folder_name,
          line: `${LOCALE.MENTIONED_YOU_IN_ACTION}${data.title || ""}`,
        },
        url:
          `#/desk/wm/reveal/?hub_id=${data.hub_id}&nid=${pid}&filetype=folder&pid=0&activeTab=${_a.meeting}` +
          meetingDeepLink(data.nid, data.stime) +
          `&ts=${ts}`,
      };
    }

    case "channel.file_thread_post": {
      if (!mentionsMe(data)) return null;
      if (isPopupMuted({ hub_id: data.hub_id })) return null;
      const ft = data.file_thread || {};
      if (!ft.file_nid) return null;
      const text = plainMessage(data.message).trim();
      // Fallback for when the file cannot be looked up: its folder's chat.
      const url = `#/desk/wm/open/?hub_id=${data.hub_id}&nid=${ft.folder_nid || 0}&filetype=folder&activeTab=${_a.chat}&ts=${ts}`;
      return {
        model: {
          ...sender,
          ico: "noti-at",
          line: text ? `${LOCALE.MENTIONED_YOU}: ${text}` : LOCALE.MENTIONED_YOU,
        },
        url,
        // The comment lives in the FILE's thread, which a hash cannot open:
        // the same opener as the "commented on your file" row, once the file
        // is named.
        onOpen: () => openFileComment(host, data, url, ts),
      };
    }
  }
  return null;
}

function openFileComment(host, data, url, ts) {
  const ft = data.file_thread || {};
  const fallback = () => {
    location.hash = url;
  };
  if (!host || !_.isFunction(host.fetchService)) return fallback();
  Promise.resolve(host.fetchService(SERVICE.media.get_node_attr, { nid: ft.file_nid, hub_id: data.hub_id }))
    .then((a) => {
      const node = a && (a[0] || a);
      if (!node || !node.filetype) return fallback();
      return Promise.resolve(Kind.waitFor("activity_item")).then((Item) => {
        if (!Item || !_.isFunction(Item.openFileOwnerActivity)) return fallback();
        Item.openFileOwnerActivity(
          {
            hub_id: data.hub_id,
            nid: ft.file_nid,
            filetype: node.filetype,
            ext: node.ext || node.extension,
            pid: node.parent_id || ft.folder_nid,
            filename: node.filename || node.user_filename,
            message_id: data.message_id,
            ts,
          },
          { fetchService: host.fetchService.bind(host) },
        );
      });
    })
    .catch(fallback);
}

/**
 * Raise the pop-up for a push, if it calls for one. Never throws.
 */
function toastNotice(host, service, data, options = {}) {
  try {
    const n = noticeFor(service, data, options, host);
    if (!n) return null;
    return showNoticeToast(host, n.model, n.url, n.onOpen);
  } catch (e) {
    if (host && host.warn) host.warn("notice toast failed", e);
    return null;
  }
}

module.exports = { noticeFor, toastNotice };
