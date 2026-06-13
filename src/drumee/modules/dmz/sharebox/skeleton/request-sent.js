
function __skl_dmz_sharebox_request_sent(_ui_) {
  const sentFig = `${_ui_.fig.family}-request-sent`;
  const email   = _ui_.mget('_request_email') || '';
  const level   = _ui_.mget('_request_level') || '';
  const message = _ui_.mget('_request_message') || '';
  // Map the raw grant token (can_download/can_chat/can_edit) to its human label —
  // the modal was showing the raw "can_download" enum (Figma 61 shows "Can download").
  const LEVEL_LABELS = {
    can_download: LOCALE.SECURE_SHARE_CAN_DOWNLOAD,
    can_chat    : LOCALE.SECURE_SHARE_CAN_CHAT,
    can_edit    : LOCALE.SECURE_SHARE_CAN_EDIT,
  };
  const levelLabel = LEVEL_LABELS[level] || level;

  return Skeletons.Box.Y({
    className : `${sentFig}__panel`,
    debug     : __filename,
    kids      : [
      Skeletons.Note({ className: `${sentFig}__title`,   content: LOCALE.SECURE_SHARE_REQUEST_SENT }),
      Skeletons.Note({ className: `${sentFig}__body`,    content: LOCALE.SECURE_SHARE_REQUEST_NOTIFIED }),
      email  ? Skeletons.Note({ className: `${sentFig}__email`,  content: email }) : null,
      level  ? Skeletons.Note({ className: `${sentFig}__level`,  content: `${LOCALE.SECURE_SHARE_REQUEST_LEVEL_LABEL} ${levelLabel}` }) : null,
      message ? Skeletons.Note({ className: `${sentFig}__message`, content: message }) : null,
      Skeletons.Note({ className: `${sentFig}__pending`, content: LOCALE.SECURE_SHARE_REQUEST_PENDING }),
      Skeletons.Note({
        className : `${sentFig}__close-btn`,
        content   : LOCALE.SECURE_SHARE_BACK_TO_DRUMEE,
        service   : 'close-request-sent',
        uiHandler : [_ui_],
      }),
    ]
  });
}

export default __skl_dmz_sharebox_request_sent;
