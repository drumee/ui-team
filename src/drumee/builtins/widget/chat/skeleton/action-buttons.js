const __skl_chat_action_button = function(ui, type, count, canForAll) {

  const chatBtnFig = `${ui.fig.family}`;
  // Selected-message count now lives in the action labels (Figma 2308-115864),
  // replacing the separate "N selected message(s)" line.
  const suffix = count ? ` (${count})` : '';

  const fowardButton = Skeletons.Note({
    className : `${chatBtnFig}__button-confirm button-confirm button clickable`,
    content   : `${LOCALE.FORWARD}${suffix}`,
    service   : 'forward-message',
    uiHandler : ui
  });

  const deleteForMeButton = Skeletons.Note({
    className : `${chatBtnFig}__button-delete button-delete delete-for-me button clickable`,
    content   : `${LOCALE.FOR_ME}${suffix}`,
    service   : 'delete-for-me',
    uiHandler : ui
  });

  const deleteForAllButton = Skeletons.Note({
    className : `${chatBtnFig}__button-delete button-delete delete-for-all button clickable`,
    sys_pn    : 'delete-for-all-button',
    // "For all" is only allowed when every selected message is the user's own;
    // computed by the caller (showMsgCount) and baked in at render so we don't
    // need a post-feed DOM poke.
    dataset   : { active: canForAll === false ? _a.no : _a.yes },
    content   : `${LOCALE.FOR_ALL}${suffix}`,
    service   : 'delete-for-all',
    uiHandler : ui
  });

  // Select mode (5th hover icon) shows a single "Delete" that maps to delete-for-all
  // (same service + canForAll guard as the For-all button, just a plainer label).
  const deleteButton = Skeletons.Note({
    className : `${chatBtnFig}__button-delete button-delete delete-for-all button clickable`,
    sys_pn    : 'delete-for-all-button',
    dataset   : { active: canForAll === false ? _a.no : _a.yes },
    content   : `${LOCALE.DELETE}${suffix}`,
    service   : 'delete-for-all',
    uiHandler : ui
  });

  const cancelButton = Skeletons.Note({
    className : `${chatBtnFig}__button-cancel button-cancel button clickable`,
    content   : LOCALE.CANCEL, //'Cancel'
    service   : 'cancel-message-selection',
    uiHandler : ui
  });

  const isForward = type === _a.forward;
  const isDelete  = type === 'chat-item-delete';
  const isSelect  = type === 'select-mode';

  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${chatBtnFig}__buttons-wrapper buttons ${type}`,
    kids      : [
      cancelButton,

      // Forward icon flow + select mode both offer Forward.
      (isForward || isSelect) ? fowardButton : undefined,

      // Dedicated delete icon flow offers For me / For all.
      isDelete ? deleteForMeButton : undefined,
      isDelete ? deleteForAllButton : undefined,

      // Select mode offers a single Delete (= delete for all).
      isSelect ? deleteButton : undefined,
    ]});

  return a;
};

module.exports = __skl_chat_action_button;
