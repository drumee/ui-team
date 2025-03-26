// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /ui/src/drumee/modules/dmz/sharebox/skeleton/header.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_dmz_sharebox_header(_ui_) {
  const headerFig = `${_ui_.fig.family}-header`

  let _uploadModeState, _downloadModeState;

  const title = Skeletons.Box.Y({
    className: `${headerFig}__title`,
    sys_pn: _a.title,
    kids: [
      Skeletons.Note({
        className: `${headerFig}__note title`,
        content: _ui_.mget(_a.title)
      })
    ]
  })


  if (_ui_.havePermission(_K.permission.upload)) {
    _uploadModeState = _a.open
  } else {
    _uploadModeState = _a.closed
  }

  const uploadBtn = Skeletons.Box.X({
    className: `${headerFig}__buttons-wrapper action-btn`,
    sys_pn: 'upload-button-wrapper',
    service: _e.upload,
    uiHandler: _ui_,
    state: 0,
    dataset: {
      mode: _uploadModeState
    },
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${headerFig}__button upload`,
        content: LOCALE.UPLOAD
      })
    ]
  })

  if (_ui_.havePermission(_K.permission.download, _ui_.mget(_a.privilege))) {
    _downloadModeState = _a.open
  } else {
    _downloadModeState = _a.closed
  }

  const downloadBtn = Skeletons.Box.X({
    className: `${headerFig}__buttons-wrapper action-btn`,
    sys_pn: 'download-button-wrapper',
    service: _e.download,
    uiHandler: _ui_,
    state: 0,
    dataset: {
      mode: _downloadModeState
    },
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${headerFig}__button download`,
        content: LOCALE.DOWNLOAD
      })
    ]
  })

  let _actionBtnMode = _a.closed
  if (_ui_.mget('is_verified')) {
    _actionBtnMode = _a.open
  }

  const actionButtons = Skeletons.Box.X({
    className: `${headerFig}__item action-buttons`,
    sys_pn: 'action-buttons',
    dataset: {
      mode: _actionBtnMode
    },
    kids: [
      uploadBtn,
      downloadBtn
    ]
  })

  const infoIcon = Skeletons.Box.X({
    className: `${headerFig}__item info`,
    kids: [
      require('./info-menu').default(_ui_)
    ]
  })

  let actionBox = Skeletons.Box.X({
    className: `${headerFig}__action-box`,
    kids: [
      infoIcon,
      actionButtons
    ]
  })

  if (_ui_.mget(_a.status) == "REQUIRED_PASSWORD") {
    actionBox = Skeletons.Box.X({})
  }

  let kids = [
    { kind: 'custom_logo' },
    title,
    actionBox
  ]
  if (Visitor.isMobile()) {
    kids = [
      { kind: 'custom_logo' },
      actionBox,
      title,
    ]
  }
  _ui_.debug("AAA:124", kids, Visitor.isMobile())
  return Skeletons.Box.G({
    debug: __filename,
    className: `${headerFig}__container`,
    kids
  });
};

export default __skl_dmz_sharebox_header;
