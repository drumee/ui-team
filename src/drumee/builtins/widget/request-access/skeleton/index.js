/* Skeleton for the secure-share "You don't have permission" desk modal.
 * Renders one of three steps based on _ui_._step: denied / form / sent. */

const LEVEL_OPTIONS = [
  { level: 'can_download', label: 'SECURE_SHARE_CAN_DOWNLOAD' },
  { level: 'can_chat',     label: 'SECURE_SHARE_CAN_CHAT' },
  { level: 'can_edit',     label: 'SECURE_SHARE_CAN_EDIT' },
];

// Step 1 — "You don't have permission" card (Figma 1961:115796).
function deniedCard(_ui_, pfx) {
  return Skeletons.Box.Y({
    className : `${pfx}__card`,
    kids      : [
      Skeletons.Image.Svg({ ico: 'raw-logo-drumee-icon', className: `${pfx}__brand` }),
      Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.SECURE_SHARE_NO_PERMISSION_TITLE }),
      Skeletons.Note({ className: `${pfx}__body`,  content: LOCALE.SECURE_SHARE_NO_PERMISSION_BODY }),
      Skeletons.Note({
        className : `${pfx}__cta`,
        content   : LOCALE.SECURE_SHARE_REQUEST_ACCESS,
        service   : 'open-request-form',
        uiHandler : [_ui_],
      }),
    ],
  });
}

// Step 2 — choose access level + optional message.
function requestForm(_ui_, pfx) {
  const levelOptions = Skeletons.Box.X({
    className : `${pfx}__level-options`,
    kids      : LEVEL_OPTIONS.map(({ level, label }) => Skeletons.Note({
      className : `${pfx}__level-option`,
      content   : LOCALE[label],
      service   : 'select-request-level',
      // `level` must be a top-level prop: the handler reads `trigger.mget('level')`
      // (model prop), not the DOM dataset — without it `_level` stays null and
      // submit silently aborts.
      level,
      dataset   : { level, selected: '' },
      uiHandler : [_ui_],
    })),
  });

  const messageField = Skeletons.Textarea({
    className   : `${pfx}__message`,
    sys_pn      : 'ref-request-message',
    placeholder : LOCALE.SECURE_SHARE_REQUEST_MESSAGE_PLACEHOLDER,
    rows        : 3,
    ignoreEnter : true,
    partHandler : _ui_,
    uiHandler   : [_ui_],
  });

  const actions = Skeletons.Box.X({
    className : `${pfx}__actions`,
    kids      : [
      Skeletons.Note({
        className : `${pfx}__cancel-btn`,
        content   : LOCALE.CANCEL,
        service   : 'close-request-access',
        uiHandler : [_ui_],
      }),
      Skeletons.Note({
        className : `${pfx}__submit-btn`,
        content   : LOCALE.SECURE_SHARE_REQUEST_ACCESS,
        service   : 'submit-access-request',
        uiHandler : [_ui_],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className : `${pfx}__card ${pfx}__card-form`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__title`,      content: LOCALE.SECURE_SHARE_REQUEST_ACCESS }),
      Skeletons.Note({ className: `${pfx}__level-desc`, content: LOCALE.SECURE_SHARE_CHOOSE_LEVEL }),
      levelOptions,
      messageField,
      actions,
    ],
  });
}

// Step 3 — request-sent confirmation.
function requestSent(_ui_, pfx) {
  const email = _ui_._requestEmail || '';
  const level = _ui_._level || '';
  return Skeletons.Box.Y({
    className : `${pfx}__card ${pfx}__card-sent`,
    kids      : [
      Skeletons.Note({ className: `${pfx}__title`,   content: LOCALE.SECURE_SHARE_REQUEST_SENT }),
      Skeletons.Note({ className: `${pfx}__body`,    content: LOCALE.SECURE_SHARE_REQUEST_NOTIFIED }),
      email ? Skeletons.Note({ className: `${pfx}__email`, content: email }) : null,
      level ? Skeletons.Note({ className: `${pfx}__level`, content: `${LOCALE.SECURE_SHARE_REQUEST_LEVEL_LABEL} ${LOCALE[`SECURE_SHARE_${level.toUpperCase()}`] || level}` }) : null,
      Skeletons.Note({ className: `${pfx}__pending`, content: LOCALE.SECURE_SHARE_REQUEST_PENDING }),
      Skeletons.Note({
        className : `${pfx}__cta`,
        content   : LOCALE.DONE,
        service   : 'close-request-access',
        uiHandler : [_ui_],
      }),
    ],
  });
}

function __skl_request_access_modal(_ui_) {
  const pfx = _ui_.fig.family;
  // The desk wm `wrapper-modal` slot already supplies the centred, blurred
  // backdrop — this skeleton only renders the card itself.
  switch (_ui_._step) {
    case 'form': return requestForm(_ui_, pfx);
    case 'sent': return requestSent(_ui_, pfx);
    default:     return deniedCard(_ui_, pfx);
  }
}

module.exports = __skl_request_access_modal;
