// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/sharebox/skeleton/desk-content.js
//   TYPE : Skeleton
// ==================================================================== *

const {
  windowHeader,
  dialog,
  tooltips,
  tabBar,
  chatPanel,
  visioMenu,
  getAreaLabel,
} = require("../../../../builtins/window/skeleton/toolkit/index");

function dmzTopbar(ui) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnTopbarTitle = `${ui.fig.group}-topbar-title`;
  const figname = "topbar";
  const area = ui.mget(_a.area);
  const name = ui.mget(_a.title) || ui.mget(_a.filename) || ui.mget(_a.name) || "";
  const canUpload = ui.havePermission(_K.permission.upload, ui.mget(_a.privilege));
  const canEdit = ui.havePermission(_K.permission.write, ui.mget(_a.privilege));

  const titleWrapper = Skeletons.Box.X({
    className: `${cnTopbarTitle}__wrapper`,
    kids: [
      require("../../../../builtins/window/skeleton/topbar/folder-icon")(area),
      Skeletons.Note({
        sys_pn: "ref-window-name",
        className: _a.name,
        content: name,
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__badge`,
        kids: [
          Skeletons.Note({
            content: getAreaLabel(area) || LOCALE.SHARED || "Shared",
          }),
        ],
      }),
    ],
  });

  const settingsBtn = Skeletons.Button.Svg({
    ico:
     "setting",
    className: `${cnWindowButton}__icon-button`,
    service: "show-settings",
    uiHandler: ui,
    partHandler: ui,
    sys_pn: "ref-window-icon",
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      // visioMenu(ui),
      // "Add new" in DMZ creates a sub-folder (media.make_dir) — a plain
      // button, not a dropdown: __dmz_wm only supports folders here, and a
      // direct-service button routes reliably to __dmz_wm.onUiEvent (a
      // menu_topic item does not deliver its service through the bubble
      // chain). Shown only to guests whose role grants write permission.
      canEdit
        ? Skeletons.Button.Label({
            className: `${cnWindowButton}__label-button secondary`,
            label: LOCALE.ADD_NEW || "Add new",
            ico: "editbox_list-plus",
            service: "add-folder",
            uiHandler: ui,
          })
        : null,
      canUpload
        ? Skeletons.Button.Label({
            className: `${cnWindowButton}__label-button`,
            label: LOCALE.UPLOAD,
            ico: "desktop_upload",
            service: _e.upload,
            uiHandler: ui,
          })
        : null,
      // Download (folder) — shown only when the share grants download (Figma 3.1
      // header has a download icon). Routes to the existing _e.download → wm.download()
      // path already wired in the sharebox; gated so a view-only recipient never sees it.
      ui.mget('can_download')
        ? Skeletons.Button.Svg({
            className: `${cnWindowButton}__icon-button`,
            ico: "desktop_download",
            service: _e.download,
            uiHandler: ui,
            tooltips: LOCALE.DOWNLOAD,
          })
        : null,
      settingsBtn,
    ],
  });

  return Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container ${area || ""}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title`,
        kids: [titleWrapper, buttons],
      }),
      Skeletons.Wrapper.Y({
        className: `${ui.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: ui,
        partHandler: ui,
      }),
    ],
  });
}

function dmzSplitBody(ui) {
  let privilege = ui.mget(_a.privilege);
  if (privilege & _K.permission.admin) privilege = _K.privilege.write;

  let api = null;
  if (ui.nodeInfoService === SERVICE.media.show_node_by) {
    const fileNid = ui.mget('file_nid');
    api = {
      service: ui.nodeInfoService,
      nid: ui.mget(_a.nid),
      hub_id: ui.mget(_a.hub_id),
      // For file-specific shares include DMZ auth params so the server filters
      // to only the shared file. For workspace shares (no file_nid) omit them —
      // sending share_id/recipient_id without file_nid triggers file-specific
      // filtering on the server and returns an empty list.
      ...(fileNid ? {
        share_id: ui.mget(_a.share_id),
        recipient_id: ui.mget(_a.user_id),
        file_nid: fileNid,
      } : {}),
      page: 1,
    };
  }

  const filesPanel = Skeletons.Box.Y({
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: "files-panel",
    kids: [
      {
        kind: "dmz_window_manager",
        className: `${ui.fig.family} desk-content`,
        sys_pn: "desk-content",
        origin: _a.dmz,
        desk: ui,
        uiHandler: ui,
        hub_id: ui.mget(_a.hub_id),
        home_id: ui.mget(_a.home_id),
        nid: ui.mget(_a.nid),
        token: ui.mget(_a.token),
        privilege,
        api,
      },
    ],
  });

  // Chat panel (Figma "conversation"): produces `.dmz__chat-panel` (group `dmz`),
  // which the SCSS reveals when the split body's data-view flips to "chat". Was
  // missing entirely — the Chat tab only hid the files panel, so it showed blank
  // (d11). Access to the Chat tab is gated upstream (anonymous → sign-up;
  // signed-in without can_chat → Request Access), so rendering it here is safe.
  // Figma 3.1: a chat-enabled share shows the conversation on the RIGHT (fixed
  // ~320px) alongside the file grid in the default Files view; shares without
  // the chat grant stay files-only. `data-chat="1"` opts the Files view into the
  // side-by-side (the conversation panel is fixed-width so it can't collapse the
  // file grid — see skin). The Chat tab still switches to a full-width view.
  // Box.X (explicit flex row), NOT Box.G (grid): the DMZ files view shows files +
  // conversation SIDE BY SIDE (Figma 3.1's 3:1). Box.G renders display:grid, which
  // fights the stylesheet's flex layout and collapsed one panel — the bug behind the
  // chat filling the whole row. The authenticated window-folder gets away with Box.G
  // only because it shows one panel at a time (tabs).
  return Skeletons.Box.X({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    sys_pn: "folder-view",
    partHandler: ui,
    dataset: { view: "files", chat: ui.mget('can_chat') ? '1' : '' },
    // Only MOUNT the conversation when the share grants chat. Rendering it
    // unconditionally let the chat widget load/subscribe to the channel even on a
    // view-only share — the "chat visible before permission" leak. The Chat tab is
    // likewise hidden without the grant (tabBar opt.chat below).
    kids: ui.mget('can_chat') ? [filesPanel, chatPanel(ui)] : [filesPanel],
  });
}

function __skl_dmz_sharebox_desk_content(_ui_) {
  const topbar    = dmzTopbar(_ui_);
  const privilege = _ui_.mget(_a.privilege) || 0;
  // Figma flow: the "limited access → Request Access" banner is for SIGNED-IN
  // non-members. An anonymous visitor instead meets a sign-up/login gate when
  // they attempt an action beyond their grant (chat/edit), so they get no banner.
  //  • is_guest is true ONLY for the anonymous system guest (server: guest_id ===
  //    user.id) → exclude them here.
  //  • exclude the share's own creator (viewer `uid` === `creator_id`; distinct
  //    server columns).
  //  • exclude real workspace MEMBERS (server `is_member`) — they already have
  //    standing access, so the guest "request access" banner doesn't apply.
  //  • only when the grant is below full access (privilege < write).
  const isAnonymous = !!_ui_.mget('is_guest');
  const isOwner     = !!_ui_.mget('creator_id') && (_ui_.mget('uid') === _ui_.mget('creator_id'));
  const isMember    = !!_ui_.mget('is_member');
  const showBanner  = !!_ui_.mget('is_secure') && !isAnonymous && !isMember && (privilege < _K.privilege.write) && !isOwner;

  const limitedBanner = showBanner ? Skeletons.Box.X({
    className : `${_ui_.fig.family}__limited-access-banner`,
    kids      : [
      Skeletons.Note({ className: `${_ui_.fig.family}__limited-access-text`, content: LOCALE.SECURE_SHARE_LIMITED_ACCESS }),
      Skeletons.Note({
        className : `${_ui_.fig.family}__limited-access-btn`,
        content   : LOCALE.SECURE_SHARE_REQUEST_ACCESS,
        service   : 'open-request-access',
        uiHandler : [_ui_],
      }),
    ]
  }) : null;

  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [
      windowHeader(_ui_, topbar),
      limitedBanner,
      tabBar(_ui_, { chat: !!_ui_.mget('can_chat') }),
      dmzSplitBody(_ui_),
      dialog(_ui_),
      tooltips(_ui_),
      Skeletons.FileSelector({
        partHandler: _ui_,
      }),
    ],
  });
}

export default __skl_dmz_sharebox_desk_content;
