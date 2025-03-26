// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/modules/desk/wm/skeleton/payment/status-info.js
//   TYPE : Skeleton
// ==================================================================== *

const __desk_wm_payment_subscription_status = function(_ui_, data) {
  const statusInfoFig = `${_ui_.fig.family}-payment-status-info`;
  
  let _headerContent, _content;
  let _btnService = 'close-info-popup';

  switch (data.status) {
    case _a.paid: //payment success
      data.plan = 'Pro';
      _headerContent = LOCALE.PAYMENT_SUCCESSFUL;
      _content = LOCALE.CONGRATULATIONS_ON_NEW_SUBSCRIPTION.format(data.plan);
      break;
    
    case _a.cancel: //transaction canceled
      _headerContent = LOCALE.TRANSACTION_CANCELED;
      _content = LOCALE.PLEASE_TRY_AGAIN_LATER;
      break;
    
    case _a.open: //payment failure
      _headerContent = LOCALE.PAYMENT_FAILED;
      _content = LOCALE.PLEASE_RETRY_PAYMENT;
      break;
    
    case _a.deleted: //subscription canceled
      _headerContent = LOCALE.SUBSCRIPTION_CANCELED;
      _content = LOCALE.SUBSCRIPTION_CANCELED_CONTENT;
      break;
    
    default:
      _headerContent = '';
      _content = LOCALE.SOMETHING_WENT_WRONG;
  }

  const closeIcon = Skeletons.Box.X({
    className   : `${statusInfoFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${statusInfoFig}__icon close account_cross`,
        service     : _btnService,
        uiHandler   : _ui_
      })
    ]
  });

  const header = Skeletons.Box.X({
    className : `${statusInfoFig}__header window__header`,
    kids      : [
      Skeletons.Note({
        className : `${statusInfoFig}__note header`,
        content   : _headerContent
      }),

      closeIcon
    ]
  })
  
  const content = Skeletons.Box.Y({
    className : `${statusInfoFig}__content`,
    kids      : [
      Skeletons.Note({
        className : `${statusInfoFig}__note content confirm-cancel`,
        content   : _content
      })
    ]
  })

  const buttons = Skeletons.Note({
    className : `${statusInfoFig}__btn-ok button`,
    content   : LOCALE.OK,
    service   : _btnService,
    uiHandler : _ui_
  })

  const footer = Skeletons.Box.X({
    className : `${statusInfoFig}__footer`,
    kids      : [
      buttons
    ]
  })

  const a = Skeletons.Box.Y({
    className : `${statusInfoFig}__main window__main`,
    debug     : __filename,
    kids      : [
      header,
      content,
      footer
    ]
  });

  return a; 
};

export default __desk_wm_payment_subscription_status;