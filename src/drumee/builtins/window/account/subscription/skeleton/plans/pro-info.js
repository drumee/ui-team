// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/plans/pro-info.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {*} isCurrentPlan
 * @param {*} _ui_
*/
const __account_subscription_plan_pro_info = function (_ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;
  const currentPlan = _ui_.currentPlan;
  let infoContent;

  if (_ui_.currentPlanName == 'advanced') {
    if (currentPlan.is_expired) {
      infoContent = Skeletons.Box.Y({
        className : `${plansFig}__info-content-wrapper pro`,
        kids      : [
          Skeletons.Note({
            className : `${plansFig}__note info`,
            content   : LOCALE.SUBSCRIPTION_EXPIRED
          })
        ]
      })
    } else {
      return
    }
  } else {
    if (currentPlan.is_canceled) {

      infoContent = Skeletons.Box.Y({
        className : `${plansFig}__info-content-wrapper pro`,
        kids      : [
          Skeletons.Note({
            className : `${plansFig}__note info`,
            content   : LOCALE.AUTOMATIC_RENEWAL_CANCELED
          }),

          Skeletons.Note({
            className : `${plansFig}__note info`,
            content   : `${LOCALE.SUBSCRIPTION_EXPIRES_AT} ${Dayjs.unix(_ui_.currentPlan.next_renewal_time).format('MMM Do YYYY')}`
          })
        ]
      })

    } else if (currentPlan.is_expired) {
      infoContent = Skeletons.Box.Y({
        className : `${plansFig}__info-content-wrapper pro`,
        kids      : [
          Skeletons.Note({
            className : `${plansFig}__note info`,
            content   : LOCALE.SUBSCRIPTION_EXPIRED
          })
        ]
      })
    } else if (currentPlan.is_payment_failed) {
      infoContent = Skeletons.Box.Y({
        className : `${plansFig}__info-content-wrapper pro`,
        kids      : [
          Skeletons.Note({
            className : `${plansFig}__note info`,
            content   : LOCALE.YOUR_PAYMENT_FAILED
          }),

          Skeletons.Note({
            className : `${plansFig}__note info`,
            content   : LOCALE.PLEASE_RETRY_PAYMENT
          })
        ]
      })
    } else {
      return
    }
  }


  const infoWrapper = Skeletons.Box.Y({
    className : `${plansFig}__info-wrapper pro`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'info',
        className : `${plansFig}__icon info`,
      }),
      infoContent
    ]
  })
  
  return infoWrapper;
};

export default __account_subscription_plan_pro_info;