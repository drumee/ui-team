// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : /src/drumee/builtins/player/audio/skeleton/topbar.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * Audio-player header — the shared topbar widget, configured.
 *
 * The title stays `LOCALE.MUSIC_PLAYER` rather than the filename: this
 * player owns a playlist, and the current track is shown by the metadata
 * block below. The other players title themselves by file because they
 * show exactly one.
 *
 * Download lives in the gear menu, not the header. It is still offered
 * unconditionally — in a DMZ share without the download grant the click is
 * gated (sign-up / Request Access) in the player's onUiEvent rather than
 * the row being hidden.
 *
 * Move & Resize is off: this window is a compact transport, and tiling it
 * to half the screen was never a useful thing to offer.
 */

const Topbar = require("builtins/player/widget/topbar");

/**
 * The gear menu. Every row is either forwarded to the source MFS view
 * (see `DELEGATED_SERVICES` in ../index.js) or handled by the base player.
 *
 * Print and Edit are absent: the base's "print" calls `printPdf()`,
 * meaningless for audio, and there is no editor.
 */
function menu(ui) {
  const media = ui.media;
  // The node is editable only when we still have the MFS view to forward
  // to and the session may write.
  const editable = !!media && !Visitor.inDmz && !!ui.canUpload();
  const sections = [];

  // Unconditional, unlike the other players' download rows — see the
  // header comment.
  const file = [
    {
      id: "download-button",
      label: LOCALE.DOWNLOAD,
      icon: "app-download",
      service: _e.download,
    },
  ];
  if (media && !Visitor.inDmz) {
    file.push({ id: "copy", label: LOCALE.COPY, icon: "apps-copy", service: _e.copy });
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

  const details = [];

  // Share is offered wherever the file lives, as in the Figma
  // (3228:281742), NOT only from an external workspace. Asking to share an
  // internal file is a fair thing to try, and `widget/share` answers it:
  // external hands the row to the MFS view that owns the real flow,
  // internal explains that an external workspace is needed first. Gating
  // the row on the area instead would leave that explanation unreachable.
  if (editable) {
    details.push({
      id: "secure-share",
      label: LOCALE.SHARE,
      icon: "ctxmenu-share",
      service: "secure-share",
    });
  }

  // The link flavour on top of that is area-dependent. `share` has none of
  // its own — the Share row above already covers it.
  if (editable) {
    switch (ui.mget(_a.area)) {
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
  // "info" is this player's own case, not the base's.
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

function __player_audio_topbar(ui) {
  return Topbar(ui, {
    left: {
      fileTypeIcon: "app-audio-file",
      title: LOCALE.MUSIC_PLAYER,
    },
    defaults: {
      "folder-settings": { menu: menu(ui) },
      "move-resize": { visible: false },
      close: { service: _e.close },
    },
  });
}

module.exports = __player_audio_topbar;
