function getBadgeIco(event) {
  switch (event) {
    case 'mention':
    case 'chat.post':    return 'chat';
    case 'media.new':    return 'cloud-upload';
    case 'share':        return 'share';
    case 'flag':         return 'flag';
    case 'comment':      return 'comment';
    default:             return 'bell';
  }
}

module.exports = function (ui) {
  const pfx = 'activity-item';
  const data  = ui.model.toJSON();
  const {
    fullname, firstname, lastname,
    action, link, link_label,
    event, ctime, read,
    date_label, uid, author_id,
  } = data;

  const displayName  = fullname || `${firstname || ''} ${lastname || ''}`.trim();
  const timeAgo      = ctime ? Dayjs.unix(ctime).fromNow() : '';
  const badgeIco     = getBadgeIco(event);
  const isUnread     = !read;

  // ── Avatar + action badge ─────────────────────────────────
  const avatar = Skeletons.Box.Y({
    className: `${pfx}__avatar-wrap`,
    kids: [
      Skeletons.UserProfile({
        className: `${pfx}__avatar`,
        id: author_id || uid,
        firstname,
        lastname,
        type: 'thumb',
      }),
      Skeletons.Image.Svg({ ico: badgeIco, className: `${pfx}__badge ${event || ''}` }),
    ],
  });

  // ── Text block: "[Name] action [link]" + timestamp ────────
  const text = `<span class="${pfx}__name">${displayName}</span>`
    + ` <span class="${pfx}__action-text">${action || ''}</span>`
    + (link_label ? ` <span class="${pfx}__link">${link_label}</span>` : '');

  const textBlock = Skeletons.Box.Y({
    className: `${pfx}__text-block`,
    service: data.service || 'open-activity',
    uiHandler: ui,
    kids: [
      Skeletons.Note({ className: `${pfx}__text`, content: text }),
      Skeletons.Note({ className: `${pfx}__time`, content: timeAgo }),
    ],
  });

  // ── Unread dot ────────────────────────────────────────────
  const unreadDot = isUnread
    ? Skeletons.Note({ className: `${pfx}__unread-dot` })
    : null;

  // ── Date group header (TODAY / YESTERDAY) ─────────────────
  const dateHeader = date_label
    ? Skeletons.Note({ className: `${pfx}__date-header`, content: date_label })
    : null;

  return Skeletons.Box.Y({
    className: `${pfx}__group`,
    kids: [
      dateHeader,
      Skeletons.Box.X({
        className: `${pfx}__row`,
        kids: [avatar, textBlock, unreadDot].filter(Boolean),
      }),
    ].filter(Boolean),
  });
};
