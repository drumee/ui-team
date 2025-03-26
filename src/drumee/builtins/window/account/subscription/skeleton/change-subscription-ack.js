// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/change-subscription-ack.js
//   TYPE : Skeleton
// ==================================================================== *

const __account_subscription_change_subscription_ack = function(_ui_) {
  const changeSubAckFig = `${_ui_.fig.family}-change-subscription-ack`;
  
  const close = Skeletons.Box.X({
    className   : `${changeSubAckFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${changeSubAckFig}__icon close account_cross`,
        service     : 'redirect-to-plans',
        uiHandler   : _ui_
      })
    ]
  });

  const successIcon = Skeletons.Button.Svg({
    ico       : 'editbox_checkmark',
    className : `${changeSubAckFig}__icon success green big`
  })

  const newValidityEndDate = Dayjs.unix(_ui_._newValidityEndDate).format('MMMM Do YYYY');
  const content = Skeletons.Note({
    className : `${changeSubAckFig}__note content`,
    content   : LOCALE.SUBSCRIPTION_CHANGED_ACK.format(newValidityEndDate)
  })


  const buttons = Skeletons.Note({
    className : `${changeSubAckFig}__btn-ok button`,
    content   : LOCALE.OK,
    service   : 'redirect-to-plans',
    uiHandler : _ui_
  })

  const a = Skeletons.Box.Y({
    className : `${changeSubAckFig}__main`,
    debug     : __filename,
    kids      : [
      close,
      successIcon,
      content,
      buttons
    ]
  });

  return a; 
};

export default __account_subscription_change_subscription_ack;