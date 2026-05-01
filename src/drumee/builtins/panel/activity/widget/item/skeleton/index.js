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

function getActivityMeta(data, preview) {
  const category = data.category || data.event_type;
  const name = getItemName(data, preview);

  if (data.event === "media.share" || data.is_forward === 1) {
    if (preview.accessibility === "restricted") {
      return {
        before: "shared a ",
        label: "Restricted Link",
        after: " with you",
        colorClass: "restricted",
        badge: "share",
      };
    }
    return {
      before: "shared a ",
      label: preview.filetype === "link" ? "Shared Link" : name,
      after: " with you",
      colorClass: "link-share",
      badge: "share",
    };
  }

  if (data.event === "hub.invite_received") {
    return {
      before: data.action || "invited you to ",
      label: data.link_label || name,
      after: "",
      colorClass: "mention",
      badge: "mention",
    };
  }

  if (data.event === "media.remove") {
    return {
      before: isFolder(preview) ? "removed folder " : "removed file ",
      label: name,
      after: "",
      colorClass: "restricted",
      badge: "share",
    };
  }

  if (data.event === "media.view") {
    return {
      before: "viewed ",
      label: name,
      after: "",
      colorClass: "mention",
      badge: "mention",
    };
  }

  if (data.event === "media.new" || category === "media") {
    return {
      before: isFolder(preview) ? "created folder " : "uploaded file ",
      label: name,
      after: data.cnt > 1 ? ` and ${data.cnt - 1} more` : "",
      colorClass: "mention",
      badge: "mention",
    };
  }

  if (data.event === "mention" || getMentionIds(data).some((id) => String(id) === String(Visitor.id))) {
    return {
      before: "mentioned you in ",
      label: name,
      after: "",
      colorClass: "mention",
      badge: "mention",
    };
  }

  if (hasAttachment(data)) {
    return {
      before: "shared a file in ",
      label: name,
      after: "",
      colorClass: "link-share",
      badge: "share",
    };
  }

  if (data.event === "chat.post" || category === "chat") {
    return {
      before: "sent you a message",
      label: data.cnt > 1 ? ` (${data.cnt})` : "",
      after: "",
      colorClass: "mention",
      badge: "mention",
    };
  }

  if (data.event === "channel.post" || category === "teamchat") {
    return {
      before: "posted in ",
      label: name,
      after: data.cnt > 1 ? ` (${data.cnt})` : "",
      colorClass: "mention",
      badge: "mention",
    };
  }

  if (category === "ticket") {
    return {
      before: "updated ticket ",
      label: name,
      after: data.cnt > 1 ? ` (${data.cnt})` : "",
      colorClass: "mention",
      badge: "mention",
    };
  }

  return {
    before: data.action || data.event || "updated ",
    label: name,
    after: "",
    colorClass: "mention",
    badge: "mention",
  };
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

  const actions = Skeletons.Box.X({
    className: `${pfx}__actions`,
    kids: [
      Skeletons.Button.Svg({
        className: `${pfx}__bookmark`,
        ico: 'notification_favorite',
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__trash`,
        ico: 'notification_trash',
        service: 'dismiss-activity',
        changelog_id: data.id,
        uiHandler: ui.mget(_a.uiHandler) || [ui],
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
