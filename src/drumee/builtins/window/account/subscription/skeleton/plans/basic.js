// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/plans/basic.js
//   TYPE : Skeleton
// ==================================================================== *

const __plan_item_row = function (_content, _hContent = '', _ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;

  let highlightContent;
  if (!_.isEmpty(_hContent)) {
    highlightContent = Skeletons.Note({
      className : `${plansFig}__note plan-item highlight basic`,
      content   : _hContent
    })
  }

  const planWrapper = Skeletons.Box.X({
    className : `${plansFig}__plan-wrapper`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'desktop_check',
        className : `${plansFig}__icon bulletin basic`,
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
const __account_subscription_plan_basic = function(_ui_) {
  const plansFig = `${_ui_.fig.family}-plan`;

  const basicData = _ui_.data.plans.find((d) => { return d.plan == 'advanced'});
  const planDetail = basicData.plan_detail[0];
  const planData = basicData.metadata[Visitor.language()];

  let currentPlan;
  if (_ui_.currentPlanName == 'advanced') {
    currentPlan = Skeletons.Box.X({
      className : `${plansFig}__current-plan basic`,
      kids      : [
        Skeletons.Note({
          className : `${plansFig}__note current-plan basic`,
          content   : LOCALE.YOUR_CURRENT_PLAN
        })
      ]
    })
  }

  const title = Skeletons.Box.X({
    className : `${plansFig}__title`,
    kids      : [
      Skeletons.Note({
        className : `${plansFig}__note title basic`,
        content   : planDetail.plan
      })
    ]
  })

  const subTitle = Skeletons.Box.X({
    className : `${plansFig}__sub-title`,
    kids      : [
      Skeletons.Note({
        className : `${plansFig}__note sub-title basic`,
        content   : LOCALE.ALWAYS_FREE
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
        content   : LOCALE.DESK_FEATURES_INCL
      })
    ]
  })

  const plansList = Skeletons.Box.Y({
    className : `${plansFig}__plans-list`,
    kids      : [
      __plan_item_row(LOCALE.STORAGE_OR_SHARES, `(${LOCALE.UPTO} ${planData.storage})`, _ui_),
      __plan_item_row(LOCALE.EXTERNAL_SHAREBOX, `(${LOCALE.UPTO} ${planData.sharebox})`, _ui_),
      __plan_item_row(LOCALE.DATA_ROOM_TEAM, `(${LOCALE.UPTO} ${planData.teamroom})`, _ui_),
      __plan_item_row(LOCALE.CHAT_AND_CONTACT_MANAGER, '', _ui_),
      __plan_item_row(LOCALE.VOICE_AND_VIDEO_CALL, `(${LOCALE.UPTO} ${planData.call_length})`, _ui_),
      __plan_item_row(LOCALE.VIRTUAL_MEETING_ROOM, `(${LOCALE.UPTO} ${planData.virtual_meeting_length})`, _ui_),
      __plan_item_row(LOCALE.MOBILE_AND_DESKTOP_APP, '', _ui_),
      __plan_item_row(LOCALE.ANTI_RANSOMWARE_SYSTEM, '', _ui_),
      __plan_item_row(LOCALE.HYBRID_LOCAL_AND_CLOUD, '', _ui_)
    ]
  })

  const plansContainer = Skeletons.Box.Y({
    className : `${plansFig}__plans-container basic`,
    kids      : [
      featuresDesc,
      plansList
    ]
  })

  let btnWrapper;
  if (_ui_.currentPlanName == 'advanced') {
    btnWrapper = Skeletons.Box.X({
      className : `${plansFig}__btn-wrapper basic`,
      kids      : [
        Skeletons.Note({
          className : `${plansFig}__btn-confirm basic`,
          sys_pn    : 'upgrade-btn-basic',
          content   : LOCALE.SWITCH_TO_PRO,
          type      : 'advanced',
          switch    : 'pro',
          service   : 'upgrade-plan',
          uiHandler : _ui_
        })
      ]
    })
  }

  const a = Skeletons.Box.Y({
    className : `${plansFig}__main`,
    debug     : __filename,
    kids      : [
      currentPlan,
      header,
      plansContainer,
      btnWrapper
    ]
  });

  return a; 
};

export default __account_subscription_plan_basic;
