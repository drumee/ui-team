/**
 * "End the meeting for everyone?" confirmation. Raised by the host picking
 * "End meeting" in the leave split-button menu (webrtc/skeleton/topbar.js) —
 * the ONLY path that broadcasts MEETING_END, so it is the one that gets a
 * confirm step. Plain "Leave" needs none: it costs the room nothing.
 *
 * Fed through window/utils.js `warning()`, which wraps this in a container
 * carrying `uiHandler: _ui_` — that is why the rows below need no uiHandler of
 * their own (same contract as ./confirm.js).
 */
const __window_meeting_end_confirm = function (_ui_) {
  const fig = _ui_.fig.family;

  const cancelButton = Skeletons.Box.X({
    className: `${fig}__row buttons`,
    sys_pn: "button-wrapper-cancel",
    service: "cancel-dialog",
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${fig}__button-confirm`,
        content: LOCALE.CANCEL,
      }),
    ],
  });

  const endButton = Skeletons.Box.X({
    className: `${fig}__row buttons danger`,
    sys_pn: "button-wrapper-end",
    service: "end-meeting-confirm",
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Note({
        className: `${fig}__button-confirm danger`,
        content: LOCALE.END_MEETING,
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${fig}__confirm-container end-meeting`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__confirm`,
        kids: [
          Skeletons.Note({
            className: `${fig}__note confirm-message`,
            content: LOCALE.CONFIRM_END_MEETING_FOR_ALL,
          }),
          Skeletons.Note({
            className: `${fig}__note confirm-hint`,
            content: LOCALE.CONFIRM_END_MEETING_FOR_ALL_HINT,
          }),
          Skeletons.Box.X({
            className: `${fig}__confirm action-btn`,
            kids: [cancelButton, endButton],
          }),
        ],
      }),
    ],
  });
};

module.exports = __window_meeting_end_confirm;
