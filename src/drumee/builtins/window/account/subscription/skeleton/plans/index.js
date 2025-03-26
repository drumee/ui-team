// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/plans/index.js
//   TYPE : Skeleton
// ==================================================================== *

const __account_subscription_plans = function(_ui_) {
  const plansFig = _ui_.fig.family;

  let isBasicPlan = '', isProPlan = '';
  if (_ui_.currentPlanName == 'pro') {
    isProPlan = 'current-plan';
  } else if (_ui_.currentPlanName == 'advanced') {
    isBasicPlan = 'current-plan';
  }

  const drumeeDeskPlans = Skeletons.Box.Y({
    className : `${plansFig}__plan-container`,
    kids      : [
      Skeletons.Box.X({
        className : `${plansFig}__plan-items-wrapper`,
        kids      : [
          Skeletons.Box.X({
            className : `${plansFig}__plan-item ${isBasicPlan} basic`,
            kids      : [
              require('./basic').default(_ui_)
            ]
          }),

          Skeletons.Box.X({
            className : `${plansFig}__plan-item ${isProPlan} pro`,
            kids      : [
              require('./pro').default(_ui_)
            ]
          }),

          Skeletons.Box.X({
            className : `${plansFig}__plan-item company`,
            kids      : [
              require('./company').default(_ui_)
            ]
          })
        ]
      })
    ]
  })

  const subscriptionsPlanBox = Skeletons.Box.X({
    className : `${plansFig}__container`,
    kids      : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__items`,
        kids      : [
          drumeeDeskPlans
        ]
      })
    ]
  })

  const a = Skeletons.Box.Y({
    className : `${plansFig}__main`,
    debug     : __filename,
    kids      : [
      subscriptionsPlanBox
    ]
  });

  return a; 
};

export default __account_subscription_plans;
