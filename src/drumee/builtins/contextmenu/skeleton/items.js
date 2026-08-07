

const __button = function (ui, trigger, k) {

  // Item row classes (group + shared). BEM elements (__icon / __label /
  // __submenu / __chevron) MUST use the single-token root `contextmenu-item`
  // — concatenating `${itemCn}__icon` used to produce
  // `window__contextmenu-item contextmenu-item__icon`, so icons and the
  // submenu panel incorrectly inherited the item-row class and sizing.
  const itemCn = `${ui.fig.group}__contextmenu-item contextmenu-item`;
  const pfx = "contextmenu-item";

  // let button = Skeletons.Button.content;

  const icon = require('./icons')(ui);



  const cn = require('./classes')(ui);





  let canPaste = _a.disable;

  if (window.Wm && !_.isEmpty(window.Wm.clipboard.files)) {

    canPaste = _a.open;

  }





  let button = Skeletons.Note;



  let a = {

    account: button({ content: LOCALE.MY_ACCOUNT, service: _a.account }),

    // "+ New" parent: hover-expand submenu (same pattern as `organize`).
    // Mirrors the topbar's "Add new" menu item-for-item so the desk
    // background right-click offers the same creation flows. Services are
    // Desk flows — Wm.onUiEvent delegates them up (wm/index.js).
    addNew: Skeletons.Box.X({
      content: LOCALE.ADD_NEW,
      service: 'add-new',
      kids: [
        Skeletons.Note({ content: LOCALE.ADD_NEW, className: `${pfx}__label` }),
        Skeletons.Note({ content: '›', className: `${pfx}__chevron` }),
        Skeletons.Box.Y({
          className: `${pfx}__submenu`,
          // Same icons as the topbar Add-new menu (addmenu-* sprites carry
          // their own colors). Interaction props live on the Box.X row;
          // kids are inert (active: 0) so clicks resolve to the row.
          kids: [
            { ico: 'addmenu-folder', label: LOCALE.WORKSPACE, service: 'new-workspace', iconClass: 'ico-workspace' },
            { ico: 'addmenu-note', label: LOCALE.NOTE, service: 'new-note', iconClass: 'ico-note' },
            { ico: 'addmenu-document', label: LOCALE.DOCUMENT, service: 'new-document', name: 'document.docx', iconClass: 'ico-document' },
            { ico: 'addmenu-spreadsheet', label: LOCALE.SPREADSHEET, service: 'new-spreadsheet', name: 'spreadsheet.xlsx', iconClass: 'ico-spreadsheet' },
            { ico: 'addmenu-presentation', label: LOCALE.PRESENTATION, service: 'new-presentation', name: 'presentation.pptx', iconClass: 'ico-presentation' },
          ].map((it) => Skeletons.Box.X({
            className: `${itemCn} submenu-item ${it.iconClass}`,
            service: it.service,
            name: it.name,
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Image.Svg({ ico: it.ico, className: `${pfx}__icon` }),
              Skeletons.Note({ content: it.label, className: `${pfx}__label` }),
            ],
          })),
        }),
      ],
    }),

    background: button({ content: LOCALE.SET_AS_BACKGROUND, service: 'set-as-background' }),

    // "Chat Threads" parent: hover-expand submenu (same pattern as `organize`).
    // Children → View (scope chat to this file, service _a.chat) and Download
    // (file-scoped export modal, service 'download-file-chat'). The parent row
    // itself is a no-op (interact.js `case 'chat-threads'`); the submenu opens on
    // hover via CSS (.contextmenu-item:hover > &__submenu).
    seeChatThreads: Skeletons.Box.X({
      content: LOCALE.CHAT_THREADS,
      service: 'chat-threads',
      kids: [
        Skeletons.Note({ content: LOCALE.CHAT_THREADS, className: `${pfx}__label` }),
        Skeletons.Note({ content: '›', className: `${pfx}__chevron` }),
        Skeletons.Box.Y({
          className: `${pfx}__submenu`,
          kids: [
            button({ content: LOCALE.VIEW_CHAT_THREADS, service: _a.chat, className: `${itemCn} submenu-item`, uiHandler: [ui] }),
            button({ content: LOCALE.DOWNLOAD_CHAT_THREADS, service: 'download-file-chat', className: `${itemCn} submenu-item`, uiHandler: [ui] }),
          ],
        }),
      ],
    }),

    copy: button({ content: LOCALE.COPY, service: _e.copy }),

    // Opens the create-workspace modal (media_form: internal / external /
    // personal type options) — the same flow as the topbar +New → Workspace.
    createWorkspace: button({ content: LOCALE.CREATE_WORKSPACE, service: 'new-workspace' }),

    delete: button({ content: LOCALE.DELETE, service: _e.delete }),

    deleteMeeting: button({ content: LOCALE.DELETE_MEETING, service: 'delete-meeting' }),

    deletePermanently: button({ content: LOCALE.DELETE_PERMENANTLY, service: 'delete-permanently' }),

    designationLink: button({ content: LOCALE.DESIGNATION_LINK, service: 'designation-link' }),

    directUrl: button({ content: LOCALE.URL_ADDRESS, service: 'direct-url' }),

    download: button({ content: LOCALE.DOWNLOAD, service: _e.download }),

    duplicate: button({ content: LOCALE.DUPLICATE, service: _a.duplicate }),

    edit: button({ content: LOCALE.EDIT, service: 'open-node', mode: _a.edit }),

    execute: button({ content: LOCALE.EXCUTE, service: 'load-script' }),

    exitFullScreen: button({ content: LOCALE.EXIT_FULLSCREEN, service: 'toggle-fullscreen' }),

    export: button({ content: LOCALE.EXPORT_TO_SERVER, service: 'export-to-server', type: _a.export }),

    exportHidden: button({ content: LOCALE.EXPORT_TO_SERVER, service: _a.none, type: _a.export, dataset: { state: _a.disable } }),

    fullscreen: button({ content: LOCALE.FULLSCREEN, service: 'toggle-fullscreen' }),

    helpdesk: button({ content: LOCALE.HELPDESK, service: _a.helpdesk }),

    import: button({ content: LOCALE.IMPORT_FROM_SERVER, service: 'import-from-server', type: _a.import }),

    importHidden: button({ content: LOCALE.IMPORT_FROM_SERVER, service: _a.none, type: _a.import, dataset: { state: _a.disable } }),

    info: button({ content: LOCALE.GET_INFO, service: _e.settings, type: _a.info }),

    // Desk-background variant of the topbar Invite button: opens the
    // invite-members popup (Desk._openInvitePopup via wm delegation).
    inviteMember: button({ content: LOCALE.INVITE, service: 'invite-member' }),

    link: button({ content: LOCALE.SHARE_LINK, service: _a.link }),

    linkToTaskTracker: button({ content: LOCALE.LINK_TO_TASK_TRACKER, service: 'link-to-task-tracker' }),

    lock: button({ content: LOCALE.PROHIBIT_CHANGE, service: _e.lock }),

    makeACopy: button({ content: LOCALE.MAKE_A_COPY, service: _a.duplicate }),

    manageAccess: button({ content: LOCALE.SHARE, service: 'manage-access' }),

    meetingLink: button({ content: LOCALE.COPY_MEETING_LINK, service: 'copy-meeting-link' }),

    modify: button({ content: LOCALE.MODIFY, service: _a.modify }),

    move: button({ content: LOCALE.MOVE, service: 'move' }),

    newFolder: button({ content: LOCALE.NEW_FOLDER, service: 'add-folder' }),

    openFileLocation: button({ content: LOCALE.OPEN_FILE_LOCATION, service: 'open-file-location' }),

    openInWindow: button({ content: LOCALE.OPEN_IN_WINDOW, service: 'open-in-window' }),

    organize: Skeletons.Box.X({

      content: LOCALE.ORGANIZE,

      service: 'organize',

      kids: [

        Skeletons.Note({ content: LOCALE.ORGANIZE, className: `${pfx}__label` }),

        Skeletons.Note({ content: '›', className: `${pfx}__chevron` }),

        Skeletons.Box.Y({

          className: `${pfx}__submenu`,

          kids: [

            button({ content: LOCALE.MOVE, service: 'move', className: `${itemCn} submenu-item`, uiHandler: [ui] }),

            button({

              content: LOCALE.LINK_TO_TASK_TRACKER,

              service: 'link-to-task-tracker',

              className: `${itemCn} submenu-item`,

              uiHandler: [ui],

            }),

          ],

        }),

      ],

    }),

    paste: button({ content: LOCALE.PASTE, service: _e.paste, dataset: { state: canPaste } }),

    pinOn: button({ content: LOCALE.PIN_ON, service: 'pin-on' }),

    preferences: button({ content: LOCALE.PREFERENCES, service: _a.preferences }),

    print: button({ content: LOCALE.PRINT, service: 'print' }),

    properties: button({ content: LOCALE.SHOW_PROPERTIES, service: _a.properties }),

    qrcode: button({ content: LOCALE.SHOW_QRCODE, service: "show-qrcode" }),

    remove: button({ content: LOCALE.REMOVE, service: _e.remove }),

    rename: button({ content: LOCALE.RENAME, service: 'direct-rename' }),

    restoreToDesk: button({ content: LOCALE.RESTORE_TO_DESK, service: 'restore-to-desk' }),

    // "Rotate" parent: hover-expand submenu (same pattern as `organize`).
    // Children carry the angle in `value`, which the image player reads off
    // the clicked row (see player/image `onUiEvent` case _e.rotate). The
    // parent row itself is a no-op — the submenu opens on hover via CSS.
    rotate: Skeletons.Box.X({
      content: LOCALE.ROTATE,
      service: 'rotate-menu',
      kids: [
        Skeletons.Note({ content: LOCALE.ROTATE, className: `${pfx}__label` }),
        Skeletons.Note({ content: '›', className: `${pfx}__chevron` }),
        Skeletons.Box.Y({
          className: `${pfx}__submenu`,
          kids: [
            Skeletons.Box.X({
              className: `${itemCn} submenu-item rotate-left`,
              service: _e.rotate,
              value: -90,
              uiHandler: [ui],
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Image.Svg({ ico: 'desktop_rotate', className: `${pfx}__icon` }),
                Skeletons.Note({ content: LOCALE.ROTATE_LEFT, className: `${pfx}__label` }),
              ],
            }),
            Skeletons.Box.X({
              className: `${itemCn} submenu-item rotate-right`,
              service: _e.rotate,
              value: 90,
              uiHandler: [ui],
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Image.Svg({ ico: 'desktop_rotate', className: `${pfx}__icon` }),
                Skeletons.Note({ content: LOCALE.ROTATE_RIGHT, className: `${pfx}__label` }),
              ],
            }),
          ],
        }),
      ],
    }),

    rotateLeft: button({ content: LOCALE.ROTATE_LEFT, service: _e.rotate, value: -90 }),

    rotateRight: button({ content: LOCALE.ROTATE_RIGHT, service: _e.rotate, value: 90 }),

    seo_index: button({ content: LOCALE.CREATE_SEO_INDEX, service: 'seo-index' }),

    separator: Skeletons.Element({ className: 'separator' }),

    setAsHomepage: button({ content: LOCALE.SET_AS_HOMEPAGE, service: 'set-as-homepage' }),

    settings: button({ content: LOCALE.SETTINGS, service: _e.settings }),

    // Label "Invite": service _a.share opens the invite-members popup (per-file/
    // folder shortcut into the invite flow). Keeps it distinct from `secureShare`
    // (the outside-world "Share" link) so share-area menus don't show two "Share".
    share: button({ content: LOCALE.INVITE, service: _a.share }),

    secureShare: button({ content: LOCALE.SHARE, service: 'secure-share' }),

    share_qrcode: button({ content: LOCALE.SHOW_QRCODE, service: "share-qrcode" }),

    shortcut: button({ content: LOCALE.CREATE_SHORTCUT, service: _a.shortcut }),

    startMeeting: button({ content: LOCALE.START_MEETING, service: 'start-meeting' }),

    pricing: button({ content: "Pricing", service: "pricing" }),

    trash: button({ content: LOCALE.MOVE_TO_TRASH, service: _e.remove }),

    unlock: button({ content: LOCALE.UNPROTECTED, service: _e.lock }),

    update: button({ content: LOCALE.UPDATE, service: _e.update }),

    upload: button({ content: LOCALE.UPLOAD, service: _e.upload })

  };

  if (localStorage.getItem("showHidden")) {

    a.showHidden = button({ content: LOCALE.HIDE_HIDDEN_FILES, service: 'hide-hidden-files' });

  } else {

    a.showHidden = button({ content: LOCALE.SHOW_HIDDEN_FILES, service: 'show-hidden-files' });

  }



  if (a[k]) {

    const r = a[k];

    const cls = cn[k] ? `${itemCn} ${cn[k]}` : `${itemCn}`;

    // separator: a 1px divider — never an icon row.

    if (k === 'separator') {

      r.className = cls;

      return r;

    }

    // organize / seeChatThreads / addNew / rotate: already a Box.X submenu; its first
    // kid is the __label Note. Just prepend the icon when one is mapped.

    if (k === 'organize' || k === 'seeChatThreads' || k === 'addNew' || k === 'rotate') {

      r.className = cls;

      r.uiHandler = [ui];

      if (icon[k]) {

        r.kids.unshift(Skeletons.Image.Svg({

          ico: icon[k],

          className: `${pfx}__icon`,

        }));

      }

      return r;

    }

    // Regular item: wrap the Note into a Box.X of [icon?, label].

    // Interaction props move onto the Box.X so onUiEvent reads them

    // off the clicked element; children are inert (active: 0).

    return Skeletons.Box.X({

      className: cls,

      service: r.service,

      mode: r.mode,

      type: r.type,

      value: r.value,

      dataset: r.dataset,

      uiHandler: [ui],

      kidsOpt: { active: 0 },

      kids: [

        icon[k]

          ? Skeletons.Image.Svg({ ico: icon[k], className: `${pfx}__icon` })

          : null,

        Skeletons.Note({ content: r.content, className: `${pfx}__label` }),

      ],

    });

  }

  return null;

};



module.exports = __button;