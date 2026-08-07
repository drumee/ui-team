// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/text/skeleton/topbar
//   TYPE : Skeleton
// ==================================================================== *

/**
 * Text-player header — the shared topbar widget, configured.
 *
 * Two things carry over from the bespoke header:
 *
 *   acknowledgement — the save-state note. `index.js` calls `ensurePart`
 *                     on BOTH `acknowledgement` and its container, so the
 *                     pair is passed through as a custom action rather
 *                     than rebuilt.
 *   title           — the filename, or LOCALE.NOTE when there is no
 *                     `media` behind this view (an unsaved note).
 *
 * Save and Print were a bespoke `KIND.menu.topic` dropdown next to the
 * title; they are now rows in the widget's gear menu.
 *
 * The old root carried `sys_pn: _a.topBar`, which resolves to the string
 * "topBar" — NOT the "topbar" that `setupInteract()` keys on. The casing
 * alone meant this header was never a drag handle; the widget emits the
 * literal "topbar", so now it is, like every other player's.
 */

const Topbar = require("builtins/player/widget/topbar");

/**
 * The gear menu. `save` and `print` are this player's own cases; the file
 * rows are forwarded to the source MFS view and so only appear when there
 * is one — a note has no `media`.
 */
function menu(ui) {
  const media = ui.media;
  const editable = !!media && !Visitor.inDmz && !!ui.canUpload();
  const sections = [];

  const own = [];
  if (ui.canUpload()) {
    own.push({
      id: "save",
      label: LOCALE.SAVE_CHANGES,
      icon: "apps-floppy",
      service: _a.save,
    });
  }
  own.push({ id: "print", label: LOCALE.PRINT, icon: "app-print", service: "print" });
  sections.push(own);

  const file = [];
  if (media && !Visitor.inDmz) {
    file.push({ id: "copy", label: LOCALE.COPY, icon: "apps-copy", service: _e.copy });
  }
  if (media && (Visitor.inDmz || ui.canDownload())) {
    file.push({
      id: "download",
      label: LOCALE.DOWNLOAD,
      icon: "app-download",
      service: _e.download,
    });
  }
  if (editable) {
    file.push({
      id: "rename",
      label: LOCALE.RENAME,
      icon: "app-edit",
      service: "direct-rename",
    });
  }
  if (media && !Visitor.inDmz) {
    file.push({
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
  if (file.length) sections.push(file);

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
  const filename = ui.media ? ui.media.mget(_a.filename) : LOCALE.NOTE;

  return Topbar(ui, {
    left: {
      fileTypeIcon: "app-txt-file",
      title: filename,
    },
    right: {
      before: [
        {
          id: "acknowledgement-container",
          type: "custom",
          // Rebuilt verbatim: the player awaits both of these parts.
          component: Skeletons.Box.X({
            className: `${ui.fig.family}__acknowledgement-container`,
            sys_pn: "acknowledgement-container",
            kidsOpt: {
              radio: _a.on,
              uiHandler: ui,
            },
            kids: [
              Skeletons.Note({
                className: `${ui.fig.family}__acknowledgement`,
                sys_pn: "acknowledgement",
              }),
            ],
          }),
        },
      ],
    },
    defaults: {
      "folder-settings": { menu: menu(ui) },
      close: { service: _e.close },
    },
  });
};
