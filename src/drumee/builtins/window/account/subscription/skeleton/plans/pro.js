// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/plan/pro.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {*} _content 
 * @param {*} _hContent 
 * @param {*} _ui_
*/
const __plan_item_row = function (_content, _hContent = '', _ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;

  let highlightContent;
  if (!_.isEmpty(_hContent)) {
    highlightContent = Skeletons.Note({
      className : `${plansFig}__note plan-item highlight pro`,
      content   : _hContent
    })
  }

  const planWrapper = Skeletons.Box.X({
    className : `${plansFig}__plan-wrapper`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'desktop_check',
        className : `${plansFig}__icon bulletin pro`,
      }),

      Skeletons.Note({
        className : `${plansFig}__note plan-item`,
        content   : _content
      }),

      highlightContent
    ]
  })

  return planWrapper;
}


/**
 * @param {*} _ui_
*/
const __account_subscription_plan_pro = function(_ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;
  
  const basicData = _ui_.data.plans.find((d) => { return d.plan == 'pro'});
  const planDetail = basicData.plan_detail.find((p) => {return p.product == 'pro_month_recurring'});
  const planData = basicData.metadata[Visitor.language()];

  let planPrice = `${planDetail.price}€ ${LOCALE.EXCL_TAX}/${LOCALE.MONTH}`;

  let currentPlanWrapper, offerBanner, isCurrentPlan = '';
  if (_ui_.currentPlanName == 'pro') {
    isCurrentPlan = 'current-plan';

    currentPlanWrapper = Skeletons.Box.X({
      className : `${plansFig}__current-plan pro`,
      kids      : [
        Skeletons.Note({
          className : `${plansFig}__note current-plan pro`,
          content   : LOCALE.YOUR_CURRENT_PLAN
        })
      ]
    })

    if (planDetail.is_offer) {
      planPrice = `${planDetail.offer_price}€ ${LOCALE.EXCL_TAX} /${LOCALE.MONTH} - ${LOCALE.BETA_OFFER}`
    }
  }
  
  // Offer banner
  let originalPriceTextStroke = '';
  if ((_ui_._isInOffer) && (_ui_.currentPlanName != 'pro')) {
    originalPriceTextStroke = 'text-strike';

    offerBanner = Skeletons.Box.X({
      className : `${plansFig}__beta-offer pro`,
      kids      : [
        Skeletons.Note({
          className : `${plansFig}__note beta-offer pro`,
          content   : `${LOCALE.BETA_OFFER_LIMITED_TIME} ${planDetail.offer_price}€/${LOCALE.MONTH}`
        })
      ]
    })
  }

  const title = Skeletons.Box.X({
    className : `${plansFig}__title`,
    kids      : [
      Skeletons.Note({
        className : `${plansFig}__note title pro`,
        content   : planDetail.plan
      })
    ]
  })

  const subTitle = Skeletons.Box.X({
    className : `${plansFig}__sub-title`,
    kids      : [
      Skeletons.Note({
        className : `${plansFig}__note sub-title pro ${originalPriceTextStroke}`,
        content   : planPrice
      })
    ]
  })

  const header = Skeletons.Box.Y({
    className : `${plansFig}__header`,
    kids      : [
      title,
      subTitle
    ]
  })

  const featuresDesc = Skeletons.Box.X({
    className : `${plansFig}__features-desc`,
    kids      : [
      Skeletons.Note({
        className : `${plansFig}__note features-desc`,
        content   : LOCALE.ADVANCED_FEATURES_PLUS
      })
    ]
  })

  const plansList = Skeletons.Box.Y({
    className : `${plansFig}__plans-list`,
    kids      : [
      __plan_item_row(LOCALE.STORAGE_OR_SHARES, `(${LOCALE.UPTO} ${planData.storage})`, _ui_),
      __plan_item_row(LOCALE.EXTERNAL_SHAREBOX, `${planData.sharebox}`, _ui_),
      __plan_item_row(LOCALE.DATA_ROOM_TEAM, `${planData.teamroom}`, _ui_),
      __plan_item_row(LOCALE.VOICE_AND_VIDEO_CALL, `${planData.call_length}`, _ui_),
      __plan_item_row(LOCALE.VIRTUAL_MEETING_ROOM, `${planData.virtual_meeting_length}`, _ui_)
    ]
  })

  const plansContainer = Skeletons.Box.Y({
    className : `${plansFig}__plans-container pro`,
    kids      : [
      featuresDesc,
      plansList
    ]
  })

  const infoWrapper = require('./pro-info').default(_ui_);

  const btnWrapper = Skeletons.Box.Y({
    className : `${plansFig}__btn-wrapper pro ${isCurrentPlan}`,
    kids      : [
      require('./pro-button').default(isCurrentPlan, _ui_)
    ]
  })

  const a = Skeletons.Box.Y({
    className : `${plansFig}__main`,
    debug     : __filename,
    kids      : [
      currentPlanWrapper,
      offerBanner,
      header,
      plansContainer,
      infoWrapper,
      btnWrapper
    ]
  });

  return a; 
};

export default __account_subscription_plan_pro;
