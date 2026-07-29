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
  newFileMenu,
  getAreaLabel,
} = require("../../../../builtins/window/skeleton/toolkit/index");

const { isSharedArea } = require("../area");

function dmzTopbar(ui) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnTopbarTitle = `${ui.fig.group}-topbar-title`;
  const figname = "topbar";
  const area = ui.mget(_a.area);
  const name = ui.mget(_a.title) || ui.mget(_a.filename) || ui.mget(_a.name) || "";
  const canUpload = ui.havePermission(_K.permission.upload, ui.mget(_a.privilege));
  const canEdit = ui.havePermission(_K.permission.write, ui.mget(_a.privilege));
  // A single-FILE share exposes only the shared file: the recipient may open/edit it,
  // but "+ Add new" and Upload have no valid target (only the file was shared, not a
  // container), so hide them. Folder/workspace shares have no file_nid → unchanged.
  // Server enforcement (media._secureShareWriteAllowed) is the real guard; this just
  // stops offering actions that would 403. (Download stays — it targets the shared file.)
  const isFileShare = !!ui.mget('file_nid');

  const titleWrapper = Skeletons.Box.X({
    className: `${cnTopbarTitle}__wrapper`,
    kids: [
      require("../../../../builtins/window/skeleton/topbar/folder-icon")(area),
      // Header breadcrumb for in-place sub-folder navigation (Cases 3+4), mirroring
      // the desk folder window's `folder-breadcrumb-path`: ancestors render here as
      // clickable crumbs (+ a trailing "›") and the current folder is the title
      // (ref-window-name). Empty at the share root. Fed by sharebox._refreshBreadcrumb.
      Skeletons.Box.X({
        className: `${ui.fig.family}__breadcrumb-path`,
        sys_pn: "dmz-breadcrumb-path",
        partHandler: ui,
        dataset: { state: 0 },
      }),
      Skeletons.Note({
        sys_pn: "ref-window-name",
        className: _a.name,
        content: name,
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__badge`,
        kids: [
          Skeletons.Note({
            // Public/shared/dmz links show the "SHARED" badge; only true
            // restricted workspaces fall back to their own (e.g. "RESTRICTED")
            // label. Keeps prod (area='public') matching test (area='share').
            content: isSharedArea(area)
              ? (LOCALE.SHARED || "Shared")
              : (getAreaLabel(area) || LOCALE.SHARED || "Shared"),
          }),
        ],
      }),
    ],
  });

  
  const buttons = Skeletons.Box.X({
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      // visioMenu(ui),
      // "Add new" — the same dropdown the desk folder window uses (newFileMenu).
      // A can_edit recipient can create a sub-folder, a markdown Note, or an office
      // document (Document / Spreadsheet / Presentation) inside the share. The
      // office editor + note editor work in the DMZ view; creates are scoped to the
      // recipient's node-grant (+ server-gated for office via euroffice.new_doc).
      // Each menu item dispatches its service via its own uiHandler:[ui] to this
      // sharebox's onUiEvent, which delegates "add-folder" / "add-note" /
      // "new-document" to the window manager. Shown only to guests whose role
      // grants write permission.
      canEdit && !isFileShare
        ? newFileMenu(ui, {
            items: ["add-folder", "add-note", "new-document"],
            triggerIco: "plus-header",
            // Tint the (monochrome) folder glyph with the share accent so it
            // matches the colored office icons + the header/badge instead of the
            // neutral "personal" default (which renders ~black). The DMZ is always
            // a share view, so force the "dmz" accent (toolkit common.scss maps
            // data-area=dmz -> --area-share); a non-share value wouldn't match any
            // icon color rule and would stay dark. Office icons are brand-colored
            // SVGs and ignore this.
            area: _a.dmz,
          })
        : null,
      canUpload && !isFileShare
        ? Skeletons.Button.Label({
            className: `${cnWindowButton}__label-button`,
            label: LOCALE.UPLOAD,
            ico: "app-upload",
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
            ico: "app-download",
            service: _e.download,
            uiHandler: ui,
          })
        : null,
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
  // The "limited access → Request Access" banner. It originally showed ONLY to
  // signed-in non-members: members were excluded as already having standing access,
  // and anonymous viewers were excluded because they meet the sign-up gate on action.
  // Both exclusions are gone — see below. It still only appears when the grant is
  // below full access (privilege < write).
  //
  // A LINK IS ITS OWN PERMISSION DOMAIN (Duy 2026-07-29). Whoever opens it is capped
  // by the link's level in this view — a member on a view-only link can only view
  // here, independently of the rights their membership gives them elsewhere. So both
  // the notice AND the request follow the LINK, not the viewer's other access: the
  // person who controls this domain is the link's creator, which makes "request more
  // access" a coherent ask even for a member, and it keeps the recipient UI honest
  // instead of looking like broken permissions.
  //  • MEMBERS are included (they used to be excluded, so they saw nothing at all).
  //  • ANONYMOUS viewers are included too. Clicking through routes them to the
  //    sign-up overlay rather than the request popup (sharebox onUiEvent
  //    'open-request-access' keys on is_authenticated), which is the same funnel
  //    chat and edit already use — nothing is granted on that path.
  //  • The CREATOR is the one exception: they would be requesting access from
  //    themselves. They still get the notice (useful when previewing their own
  //    link — it is what recipients see) but no action.
  // ⚠️ Use the SERVER's is_owner, which already requires an authenticated identity.
  // Do NOT derive ownership from `uid === creator_id` alone: a PUBLIC link binds the
  // ANONYMOUS guest session to the creator, so that comparison is true for anonymous
  // viewers too — they would be treated as the creator and lose the action. That is
  // the exact trap _gateInteraction documents ("an anonymous viewer ALSO has
  // uid === creator_id"). Falls back to the guarded comparison only if the server
  // field is absent, so an older payload still cannot mistake anonymous for the owner.
  const isOwner    = _ui_.mget('is_owner') != null
    ? !!_ui_.mget('is_owner')
    : (!!_ui_.mget('is_authenticated') && !!_ui_.mget('creator_id')
       && _ui_.mget('uid') === _ui_.mget('creator_id'));
  const isCapped   = !!_ui_.mget('is_secure') && (privilege < _K.privilege.write);
  const showBanner = isCapped;
  const canRequest = isCapped && !isOwner;

  const limitedBanner = showBanner ? Skeletons.Box.X({
    className : `${_ui_.fig.family}__limited-access-banner`,
    kids      : [
      Skeletons.Note({
        className : `${_ui_.fig.family}__limited-access-text`,
        content   : canRequest
          ? LOCALE.SECURE_SHARE_LIMITED_ACCESS
          : LOCALE.SECURE_SHARE_LINK_LIMITED_NOTICE,
      }),
      canRequest ? Skeletons.Note({
        className : `${_ui_.fig.family}__limited-access-btn`,
        content   : LOCALE.SECURE_SHARE_REQUEST_ACCESS,
        service   : 'open-request-access',
        uiHandler : [_ui_],
      }) : null,
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
