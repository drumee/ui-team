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

function getActivityMeta(data, preview) {
  const name = preview.filename || preview.name || data.link_label || "item";
  switch (data.event) {
    case "media.share":
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
    case "media.view":
    case "mention":
    case "chat.post":
      return {
        before: "mentioned you in ",
        label: name,
        after: "",
        colorClass: "mention",
        badge: "mention",
      };
    case "media.new":
      return {
        before: preview.ftype === _a.folder ? "created folder " : "uploaded file ",
        label: name,
        after: "",
        colorClass: "mention",
        badge: "mention",
      };
    case "media.remove":
      return {
        before: preview.ftype === _a.folder ? "removed folder " : "removed file ",
        label: name,
        after: "",
        colorClass: "restricted",
        badge: "share",
      };
    case "hub.invite_received":
      return {
        before: data.action || "invited you to ",
        label: data.link_label || name,
        after: "",
        colorClass: "mention",
        badge: "mention",
      };
    default:
      return {
        before: data.action || data.event || "updated ",
        label: name,
        after: "",
        colorClass: "mention",
        badge: "mention",
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
