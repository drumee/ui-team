// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/video/skeleton/topbar
//   TYPE : Skeleton
// ==================================================================== *

/**
 * Video-player header — the shared topbar widget, configured.
 *
 * The video player has no inline actions of its own, so the right side is
 * just the widget's three defaults. Close is re-pointed at `_e.close`, the
 * service the base player listens for.
 *
 * `${group}__header` is the jQuery-draggable handle wired up in
 * player/interact.js (`handle: '.${fig.group}__header'`), and the "topbar"
 * sys_pn is what triggers `setupInteract()` in interact's onPartReady. The
 * widget emits both, so the window stays draggable by its header.
 */

const Topbar = require("builtins/player/widget/topbar");

/**
 * The gear menu. Every row is either forwarded to the source MFS view
 * (see `DELEGATED_SERVICES` in ../index.js) or handled by the base player,
 * so nothing here can silently no-op.
 *
 * Print and Edit are deliberately absent: the base's "print" calls
 * `printPdf()`, which means nothing for a video, and there is no editor.
 */
function menu(ui) {
  const media = ui.media;
  // The node is editable only when we still have the MFS view to forward
  // to and the session may write.
  const editable = !!media && !Visitor.inDmz && !!ui.canUpload();
  const sections = [];

  const file = [];
  if (media && !Visitor.inDmz) {
    file.push({ id: "copy", label: LOCALE.COPY, icon: "apps-copy", service: _e.copy });
  }
  if (Visitor.inDmz || ui.canDownload()) {
    file.push({
      id: "download",
      label: LOCALE.DOWNLOAD,
      icon: "app-download",
      service: _e.download,
    });
  }
  if (file.length) sections.push(file);

  const naming = [];
  if (editable) {
    naming.push({
      id: "rename",
      label: LOCALE.RENAME,
      icon: "app-edit",
      service: "direct-rename",
    });
  }
  if (media && !Visitor.inDmz) {
    naming.push({
      id: "chat-threads",
      label: LOCALE.CHAT_THREADS,
      icon: "file-thread",
      service: "chat-threads",
      children: [
        { id: "view-chat-threads", label: LOCALE.VIEW_CHAT_THREADS, service: _a.chat },
        {
          id: "download-file-chat",
          label: LOCALE.DOWNLOAD_CHAT_THREADS,
          service: "download-file-chat",
        },
      ],
    });
  }
  if (naming.length) sections.push(naming);

  // Sharing is area-dependent: each area exposes the one link flavour that
  // makes sense for it.
  const details = [];
  if (editable) {
    switch (ui.mget(_a.area)) {
      case _a.share:
        details.push({
          id: "secure-share",
          label: LOCALE.SHARE,
          icon: "ctxmenu-share",
          service: "secure-share",
        });
        break;
      case _a.private:
        details.push({
          id: "designation-link",
          label: LOCALE.DESIGNATION_LINK,
          icon: "app-share",
          service: "designation-link",
        });
        break;
      case _a.public:
        details.push({
          id: "direct-url",
          label: LOCALE.URL_ADDRESS,
          icon: "apps-link-simple",
          service: "direct-url",
        });
        break;
    }
  }
  // "info" is handled by the base player.
  details.push({ id: "info", label: LOCALE.GET_INFO, icon: "ctxmenu-info", service: "info" });
  sections.push(details);

  if (media && media.canRemove && media.canRemove()) {
    sections.push([
      {
        id: "trash",
        label: LOCALE.MOVE_TO_TRASH,
        icon: "chat-action-trash",
        service: _e.remove,
        className: "trash",
      },
    ]);
  }

  const items = [];
  sections.forEach((s, i) => {
    if (i) items.push({ separator: true });
    items.push(...s);
  });
  return items;
}

module.exports = function (ui) {
  return Topbar(ui, {
    left: {
      fileTypeIcon: "app-video-file",
      title: ui.mget(_a.filename),
    },
    defaults: {
      "folder-settings": { menu: menu(ui) },
      // Only the service is overridden. The widget's own `icon close` class
      // is what the skin sizes and colours; `window-button__icon-button` has
      // no global styling of its own.
      close: { service: _e.close },
    },
  });
};
