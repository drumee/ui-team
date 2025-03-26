// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/plans/pro-button.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {*} isCurrentPlan
 * @param {*} _ui_
*/
const __account_subscription_plan_pro_button = function (isCurrentPlan, _ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;
  const currentPlan = _ui_.currentPlan;
  let _btnContent, _btnService;

  if (_ui_.currentPlanName == 'advanced') {
    _btnContent = LOCALE.UPGRADE_NOW;
    _btnService = 'upgrade-plan';
    
    if (currentPlan.is_expired) {
      _btnContent = LOCALE.SUBSCRIBE_AGAIN;
      _btnService = 'subscribe-again';
    }
  } else {

    if (currentPlan.is_canceled) {
      _btnContent = LOCALE.RESUME_SUBSCRIPTION;
      _btnService = 'resume-subscription';

    } else if (currentPlan.is_expired) {
      _btnContent = LOCALE.SUBSCRIBE_AGAIN;
      _btnService = 'subscribe-again';

    } else if (_ui_.currentPlan.is_payment_failed) {
      _btnContent = LOCALE.RETRY_PAYMENT;
      _btnService = 'retry-payment';
      
    } else {
      _btnContent = LOCALE.VIEW_SUBSCRIPTION;
      _btnService = 'view-subscription';
    }
  }

  const btn = Skeletons.Note({
    className : `${plansFig}__btn-confirm pro ${isCurrentPlan}`,
    sys_pn    : 'pro-btn-wrapper',
    content   : _btnContent,
    service   : _btnService, 
    uiHandler : _ui_,
    dataset   : {
      wait : _a.no
    }
  })
  
  return btn;
};

export default __account_subscription_plan_pro_button;