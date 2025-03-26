// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/view-subscription.js
//   TYPE : Skeleton
// ==================================================================== *

/**
 * @param {*} _ui_ 
 * @param {*} opt
*/
const __plan_item_row = function (_ui_, opt = {}) {
  const viewSubsFig = `${_ui_.fig.family}-view-subscription`;
  
  let optionalItemWrapper;
  if (!_.isEmpty(opt.optionalItem)) {
    optionalItemWrapper = opt.optionalItem;
  }

  const itemContainer = Skeletons.Box.X({
    className : `${viewSubsFig}__item-container ${opt.type}`,
    kids      : [
      Skeletons.Box.X({
        className : `${viewSubsFig}__label-wrapper ${opt.type}-label`,
        kids      : [
          Skeletons.Note({
            className : `${viewSubsFig}__note subs-label ${opt.type}-label`,
            content   : opt.label
          })
        ]
      }),

      Skeletons.Box.X({
        className : `${viewSubsFig}__item-wrapper ${opt.type}`,
        kids      : [
          Skeletons.Note({
            className : `${viewSubsFig}__note item ${opt.type} ${opt.textOpt}`,
            content   : opt.content,
            ...opt.serviceOpt
          })
        ]
      }),

      optionalItemWrapper
    ]
  })

  return itemContainer;
}


const __account_subscription_view_subscription = function(_ui_) {
  const viewSubsFig = `${_ui_.fig.family}-view-subscription`;

  const header = Skeletons.Box.X({
    className : `${viewSubsFig}__header`,
    kids      : [
      Skeletons.Note({
        className : `${viewSubsFig}__note header`,
        content   : LOCALE.YOUR_SUBSCRIPTION
      }),
      
      Skeletons.Note({
        className : `${viewSubsFig}__note return text-underline`,
        content   : LOCALE.RETURN,
        service   : 'return-to-plans',
        uiHandler : _ui_
      })
    ]
  })


  let _modifyBtnState = _a.closed;
  if (_ui_._currentSubsType == _a.month) {
    _modifyBtnState = _a.open;
  }

  const modifyButtonWrapper = Skeletons.Box.X({
    className : `${viewSubsFig}__buttons-wrapper modify-btn buttons`,
    sys_pn    : 'modify-subscription-button-wrapper',
    service   : 'modify-subscription',
    uiHandler : [_ui_],
    kidsOpt   : {
      active : 0
    },
    dataset   : {
      mode  : _modifyBtnState,
      wait  : _a.no
    },
    kids      : [
      Skeletons.Note({
        className  : `${viewSubsFig}__button-modify modify-btn`,
        content    : LOCALE.MODIFY
      })
    ]
  })

  const planNameWrapper = {
    type    : 'plan-name',
    label   : LOCALE.PLAN,
    content : `Drumee ${_ui_.currentPlan.plan}`,
  }

  const validityWrapper = {
    type    : 'validity',
    label   : LOCALE.VALIDITY,
    content : `${Dayjs.unix(_ui_.currentPlan.next_renewal_time).format('MMMM Do YYYY HH:mm')}`,
    textOpt : 'highlight'
  }

  const subsTypeWrapper = {
    type          : 'subs-type',
    label         : LOCALE.PERIOD,
    content       : `${_ui_.currentPlan.period}ly`,
    optionalItem  : modifyButtonWrapper
  }

  const cancelSubsWrapper = {
    type          : 'cancel-subs',
    label         : LOCALE.AUTOMATIC_RENEWAL,
    content       : LOCALE.CANCEL_RENEWAL,
    serviceOpt    : {
      service   : 'pre-check-cancel-subscription',
      uiHandler : _ui_ 
    },
    textOpt       : 'text-underline'
  }

  const invoiceWrapper = {
    type          : 'invoice',
    label         : LOCALE.INVOICE,
    content       : LOCALE.SEE_INVOICES,
    serviceOpt    : {
      service   : 'see-invoices',
      uiHandler : _ui_ 
    },
    textOpt       : 'text-underline',
  }


  const subsInfoWrapper = Skeletons.Box.X({
    className : `${viewSubsFig}__info-container`,
    kids      : [
      Skeletons.Box.Y({
        className : `${viewSubsFig}__info-wrapper`,
        kids      : [
          __plan_item_row(_ui_, planNameWrapper),
          __plan_item_row(_ui_, validityWrapper),
          __plan_item_row(_ui_, subsTypeWrapper),
          __plan_item_row(_ui_, cancelSubsWrapper),
          __plan_item_row(_ui_, invoiceWrapper)
        ]
      })
    ]
  })

  const content = Skeletons.Box.Y({
    className : `${viewSubsFig}__container`,
    kids      : [
      header,
      subsInfoWrapper,
    ]
  })

  const a = Skeletons.Box.Y({
    className : `${viewSubsFig}__main`,
    debug     : __filename,
    kids      : [
      content
    ]
  });

  return a; 
};

export default __account_subscription_view_subscription;
