// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/cancel-subscription.js
//   TYPE : Skeleton
// ==================================================================== *

const __account_subscription_cancel_subscription = function(_ui_) {
  const cancelSubsFig = `${_ui_.fig.family}-cancel-subscription`;

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
        className : `${cancelSubsFig}__note content confirm-cancel`,
        content   : LOCALE.RESUME_SUBSCRIPTION_BEFORE.format(validity)
      }),

      Skeletons.Note({
        className : `${cancelSubsFig}__note content confirm-cancel`,
        content   : LOCALE.CANCEL_SUBSCRIPTION_SUB_CONTENT
      }),
    ]
  })

  const buttons = Preset.ConfirmButtons(_ui_, {
    cancelLabel       : LOCALE.CANCEL || '',
    cancelService     : 'close-overlay',
    confirmLabel      : LOCALE.CONFIRM,
    confirmService    : 'confirm-cancel-subscription',
    confirmBtnAction  : 'cancel-subs'
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

export default __account_subscription_cancel_subscription;