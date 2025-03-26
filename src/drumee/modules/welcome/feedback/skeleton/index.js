/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/reset/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_reset  (_ui_) {
  const pfx = _ui_.fig.family;

  let a = Skeletons.Box.Y({
    className  : `${pfx}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Note({
        className  : `${pfx}__note header`,
        content    : LOCALE.ACCOUNT_DELETE
      }),

      Skeletons.Note({
        className  : `${pfx}__note message`,
        content    : LOCALE.ACCOUNT_DELETION_GOODBYE
      }),

      Skeletons.EntryBox({
        className     : `${pfx}__entry `,
        sys_pn        : 'ref-textarea',
        type          : _a.textarea,
        placeholder   : LOCALE.LEAVE_COMMENTS,
        uiHandler     : [_ui_],
        errorHandler  : [_ui_],
      }),
      require('./button').default(_ui_, _e.submit, LOCALE.SUBMIT)
    ]
  })

  return a;

}

export default __skl_welcome_reset