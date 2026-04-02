function __skl_dmz_sharebox_header(ui) {
  const headerFig = `${ui.fig.family}-header`;

  let _uploadModeState, _downloadModeState;

  const title = Skeletons.Box.Y({
    className: `${headerFig}__title`,
    sys_pn: _a.title,
    kids: [
      Skeletons.Note({
        className: `${headerFig}__note title`,
        content: ui.mget(_a.title),
      }),
    ],
  });

  if (ui.havePermission(_K.permission.upload, ui.mget(_a.privilege))) {
    _uploadModeState = _a.open;
  } else {
    _uploadModeState = _a.closed;
  }

  const uploadBtn = Skeletons.Box.X({
    className: `${headerFig}__buttons-wrapper action-btn`,
    sys_pn: "upload-button-wrapper",
    service: _e.upload,
    uiHandler: ui,
    state: 0,
    dataset: {
      mode: _uploadModeState,
    },
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Note({
        className: `${headerFig}__button upload`,
        content: LOCALE.UPLOAD,
      }),
    ],
  });

  if (ui.havePermission(_K.permission.download, ui.mget(_a.privilege))) {
    _downloadModeState = _a.open;
  } else {
    _downloadModeState = _a.closed;
  }

  const downloadBtn = Skeletons.Box.X({
    className: `${headerFig}__buttons-wrapper action-btn`,
    sys_pn: "download-button-wrapper",
    service: _e.download,
    uiHandler: ui,
    state: 0,
    dataset: {
      mode: _downloadModeState,
    },
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Note({
        className: `${headerFig}__button download`,
        content: LOCALE.DOWNLOAD,
      }),
    ],
  });

  const navBtn = Skeletons.Box.X({
    className: `${headerFig}__buttons-wrapper action-btn`,
    // sys_pn: "download-button-wrapper",
    // service: _e.download,
    // uiHandler: ui,
    // state: 0,
    // dataset: {
    // mode: _downloadModeState,
    // },
    // kidsOpt: {
    // active: 0,
    // },
    kids: [
      Skeletons.Note({
        className: `${headerFig}__button-note`,
        content: "Get your own workspace",
      }),
      Skeletons.Button.Svg({
        ico: "arrow-right",
        className: `${headerFig}__button-icon`,
      }),
    ],
  });

  let _actionBtnMode = _a.closed;
  if (ui.mget("is_verified")) {
    _actionBtnMode = _a.open;
  }
  _actionBtnMode = _a.open;
  const actionButtons = Skeletons.Box.X({
    className: `${headerFig}__item action-buttons`,
    sys_pn: "action-buttons",
    dataset: {
      mode: _actionBtnMode,
    },
    kids: [
      // uploadBtn, downloadBtn,
      navBtn,
    ],
  });

  const expiry = Skeletons.Box.X({
    className: `${headerFig}__expiry-info`,
    kids: [
      Skeletons.Box.X({
        className: `${headerFig}__expiry title`,
        kids: [
          Skeletons.Note({
            className: `${headerFig}__note menu-item title expires-in`,
            content: LOCALE.EXPIRES_IN, //'Expires In'
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${headerFig}__expiry-time`,
        kids: [
          Skeletons.Note({
            className: `${headerFig}__note days expires-in-value`,
            content: ui.mget(_a.days) || "∞",
          }),

          Skeletons.Note({
            className: `${headerFig}__note menu-item days expires-in-label`,
            content: LOCALE.DAYS,
          }),

          Skeletons.Note({
            className: `${headerFig}__note hours expires-in-value`,
            content: ui.mget(_a.hours) || "∞",
          }),

          Skeletons.Note({
            className: `${headerFig}__note menu-item hours expires-in-label`,
            content: LOCALE.HOURS,
          }),
        ],
      }),
    ],
  });

  const infoIcon = Skeletons.Box.X({
    className: `${headerFig}__item info`,
    kids: [require("./info-menu").default(ui)],
  });

  let actionBox = Skeletons.Box.X({
    className: `${headerFig}__action-box`,
    kids: [
      // infoIcon,
      actionButtons,
    ],
  });

  if (ui.mget(_a.status) == "REQUIRED_PASSWORD") {
    actionBox = Skeletons.Box.X({});
  }
  const logo = Skeletons.Box.X({
    active: 0,
    className: `${headerFig}__logo-content`,
    kids: [
      Skeletons.Button.Svg({
        ico: "raw-logo-drumee-full",
        lassName: `${headerFig}__logo-icon`,
      }),
    ],
  });

  let kids = [
    logo,
    title,
    actionBox,
    // expiry
  ];
  if (Visitor.isMobile()) {
    kids = [
      // { kind: 'custom_logo' },
      logo,
      title,
      actionBox,
    ];
  }
  return Skeletons.Box.G({
    debug: __filename,
    className: `${headerFig}__container`,
    kids,
  });
}

export default __skl_dmz_sharebox_header;
