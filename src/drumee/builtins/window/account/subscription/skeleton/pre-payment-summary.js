// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/pre-payment-summary.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {*} _ui_ 
 * @param {*} opt
*/
const __summary_item_row = function (_ui_, opt = {}) {
  const summaryFig = `${_ui_.fig.family}-pre-payment-summary`;
  
  let contentWrapper;
  if (_.isEmpty(opt.contentItem)) {
    contentWrapper = Skeletons.Box.X({
      className : `${summaryFig}__item-wrapper ${opt.type}`,
      kids      : [ 
        Skeletons.Note({
          className : `${summaryFig}__note item ${opt.type} ${opt.textOpt}`,
          content   : opt.content
        }),
        ...opt.contentItemsOpt
      ]
    })
  } else {
    contentWrapper = opt.contentItem
  }

  const itemContainer = Skeletons.Box.X({
    className : `${summaryFig}__item-container ${opt.type}`,
    kids      : [
      Skeletons.Box.X({
        className : `${summaryFig}__label-wrapper ${opt.type}-label`,
        kids      : [
          Skeletons.Note({
            className : `${summaryFig}__note subs-label ${opt.type}-label`,
            content   : opt.label
          })
        ]
      }),

      contentWrapper
    ]
  })

  return itemContainer;
}


const __account_subscription_pre_payment_summary = function(_ui_, type = _a.new) {
  const summaryFig = `${_ui_.fig.family}-pre-payment-summary`;

  const basicData = _ui_.data.plans.find((d) => { return d.plan == 'pro'});
  const monthlyPlanDetail = basicData.plan_detail.find((p) => {return p.product == 'pro_month_recurring'});
  const yearlyPlanDetail = basicData.plan_detail.find((p) => {return p.product == 'pro_year_recurring'});

  let selectedPlan = yearlyPlanDetail;
  let switchToggleState = 0;
  if (_ui_.selectedPlanType == _a.month) {
    selectedPlan = monthlyPlanDetail;
    switchToggleState = 1;
  }

  const header = Skeletons.Box.X({
    className : `${summaryFig}__header`,
    kids      : [
      Skeletons.Note({
        className : `${summaryFig}__note header`,
        content   : LOCALE.YOUR_SUBSCRIPTION_PREVIEW
      }),
      
      Skeletons.Note({
        className : `${summaryFig}__note return text-underline`,
        content   : LOCALE.RETURN,
        service   : 'return-to-plans',
        uiHandler : _ui_
      })
    ]
  })

  let offerPriceWrapper, inOfferPrice, textStrike;
  if (selectedPlan.is_offer) {
    inOfferPrice = 'in-offer';
    textStrike = 'text-strike';

    offerPriceWrapper = Skeletons.Note({
      className : `${summaryFig}__note item monthly-price offer-price`,
      content   : `${selectedPlan.offer_price}€`
    })
  }

  const taxLabel = Skeletons.Note({
    className : `${summaryFig}__note item tax-label ${inOfferPrice}`,
    content   : LOCALE.EXCL_TAX
  })

  
  const monthlyPriceWrapper = {
    type            : 'monthly-price',
    label           : LOCALE.MONTHLY_PRICE,
    content         : `${selectedPlan.price}€`,
    textOpt         : textStrike,
    contentItemsOpt : [
      offerPriceWrapper,
      taxLabel
    ]
  }

  const subsTypeSwitch = Skeletons.Box.X({
    className : `${summaryFig}__item-wrapper subs-type`,
    kids      : [
      Skeletons.Box.X({
        className : `${summaryFig}__switch-container`,
        sys_pn    : 'subscription-type-switch-wrapper',
        kids      : [
          Skeletons.Switch({
            className   : `${summaryFig}__switch-wrapper`,
            sys_pn      : 'subscription-type-switch',
            service     : 'toggle-subscription-type',
            uiHandler   : _ui_,
            state       : switchToggleState,
            values      : [_a.year, _a.month],
            vendorOpt   : [
              {label  : LOCALE.YEARLY},
              {label  : LOCALE.MONTHLY}
            ]
          })
        ]
      })
    ]
  })
 
  let subsTypeWrapper = {
    type            : 'subs-type',
    label           : LOCALE.PERIOD,
    content         : `${_ui_.selectedPlanType}ly`,
    textOpt         : 'text-capitalize',
    contentItemsOpt : []
  }
  if (type == _a.new) {
    subsTypeWrapper.contentItem = subsTypeSwitch;
  }

  
  const totalPriceWrapper = {
    type            : 'total-price',
    label           : LOCALE.TOTAL_PRICE,
    content         : LOCALE.ALL_TAXES_INCL.format(selectedPlan.unit_price),
    contentItemsOpt : []
  }

  let prorationCalWrapper = [];
  let paymentBtnService = 'payment-subscription';

  if (type == _a.change) {
    paymentBtnService = 'change-subscription';

    const endDate = Dayjs.unix(_ui_.currentPlan.next_renewal_time);
    const today = Dayjs();
    const remainingDays = endDate.diff(today, 'days');

    const prorationInfo = Skeletons.Box.X({
      className : `${summaryFig}__item-wrapper prorated-price`,
      kids      : [
        Skeletons.Note({
          className  : `${summaryFig}__note item prorated-price`,
          content    : `${_ui_._prorationCal.prorated_amount}€`
        }),

        Skeletons.Button.Svg({
          ico       : 'info',
          className : `${summaryFig}__icon info`,
          tooltips  : {
            content   : LOCALE.REMAINING_DAYS_CURRENT_SUBSCRIPTION.format(remainingDays)
          }
        })
      ]
    })
    
    const proratedPrice = {
      type            : 'prorated-price',
      label           : LOCALE.PRORATED_AMOUNT,
      contentItem     : prorationInfo
    }

    const finalPrice = {
      type            : 'final-price',
      label           : LOCALE.FINAL_PRICE,
      content         : LOCALE.ALL_TAXES_INCL.format(_ui_._prorationCal.final_price),
      contentItemsOpt : []
    }

    prorationCalWrapper = [
      __summary_item_row(_ui_, proratedPrice),
      __summary_item_row(_ui_, finalPrice),
    ]
  }

  const paymentButton = Skeletons.Box.X({
    className : `${summaryFig}__buttons-wrapper payment-btn buttons`,
    sys_pn    : 'payment-subscription-button-wrapper',
    service   : paymentBtnService,
    uiHandler : [_ui_],
    kidsOpt   : {
      active : 0
    },
    dataset   : {
      wait  : _a.no
    },
    kids      : [
      Skeletons.Note({
        className  : `${summaryFig}__button-payment payment-btn`,
        content    : LOCALE.PAY_NOW
      })
    ]
  })

  const subsInfoWrapper = Skeletons.Box.X({
    className : `${summaryFig}__info-container`,
    kids      : [
      Skeletons.Box.Y({
        className : `${summaryFig}__info-wrapper`,
        kids      : [
          __summary_item_row(_ui_, monthlyPriceWrapper),
          __summary_item_row(_ui_, subsTypeWrapper),
          __summary_item_row(_ui_, totalPriceWrapper),
          ...prorationCalWrapper,
          paymentButton
        ]
      })
    ]
  })


  const footer = Skeletons.Box.X({
    className : `${summaryFig}__footer`,
    kids      : [
     
    ]
  })

  const content = Skeletons.Box.Y({
    className : `${summaryFig}__container`,
    kids      : [
      header,
      subsInfoWrapper,
      footer
    ]
  })

  const a = Skeletons.Box.Y({
    className : `${summaryFig}__main`,
    debug     : __filename,
    kids      : [
      content
    ]
  });

  return a; 
};

export default __account_subscription_pre_payment_summary;
