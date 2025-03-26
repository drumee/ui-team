// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/pre-check-cancel-subscription.js
//   TYPE : Skeleton
// ==================================================================== *

const __account_subscription_pre_check_cancel_subscription = function(_ui_) {
  const cancelSubsFig = `${_ui_.fig.family}-pre-check-cancel-subscription`;

  const closeIcon = Skeletons.Box.X({
    className   : `${cancelSubsFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${cancelSubsFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]
  });

  const header = Skeletons.Box.X({
    className : `${cancelSubsFig}__header`,
    kids      : [
      Skeletons.Note({
        className : `${cancelSubsFig}__note header`,
        content   : LOCALE.HI_USER.format(Visitor.get(_a.firstname))
      }),

      closeIcon
    ]
  })

  const validity = Dayjs.unix(_ui_.currentPlan.next_renewal_time).format('MMMM Do YYYY');

  const content = Skeletons.Box.Y({
    className : `${cancelSubsFig}__content`,
    kids      : [
      Skeletons.Note({
        className : `${cancelSubsFig}__note content`,
        content   : LOCALE.PRE_CANCEL_SUBS_CONFIRM
      }),

      Skeletons.Note({
        className : `${cancelSubsFig}__note content sub-content`,
        content   : LOCALE.YOUR_SUBSCRIPTION_ENDS_IN.format(validity),
      })
    ]
  })

  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : LOCALE.CONTINUE,
    confirmService    : 'cancel-subscription',
    confirmBtnAction  : 'pre-check-cancel'
  });

  const a = Skeletons.Box.Y({
    className : `${cancelSubsFig}__main`,
    debug     : __filename,
    kids      : [
      header,
      content,
      buttons
    ]
  });

  return a; 
};

export default __account_subscription_pre_check_cancel_subscription;