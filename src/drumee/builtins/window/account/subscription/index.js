// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/index.js
//   TYPE : Component
// ==================================================================== *

class __account_subscription extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
  }

  static initClass() {
    this.prototype.behaviorSet = { bhv_socket: 1 };
  }

  /**
   * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    this.currentPlan = Visitor.get('plan_detail');
    this.currentPlanName =  this.currentPlan.plan.toLowerCase() || 'advanced';
    this._currentSubsType = this.currentPlan.period;

    this.bindEvent(_a.live);

    return super.initialize(opt);
  }

  /**
   * 
  */
  onDomRefresh() {
    this.declareHandlers();
    return this.fetchPlanData();
  }

  /**
   *
  */
  fetchPlanData () {
    return this.postService({
      service : SERVICE.subscription.get_plans,
      hub_id  : Visitor.id
    }).then((data) => {
      this.data = data;
      this.currentPlan = data.renewal;
      this.currentPlanName = data.renewal.plan.toLowerCase() || 'advanced';
      this._currentSubsType = data.renewal.period;

      Visitor.set('plan_detail', data.renewal); // to set the Visitor plan_detail - do not remove

      this.debug('plan data', data, this);
      return this.feed(require('./skeleton').default(this));
    }).catch((e) => {
      return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
    });
  }

  /**
   * 
  */
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.content:
        return this.waitElement(child.el, () => {
          child.feed(require('./skeleton/plans').default(this));
          // this.viewSubscription();
          // this.modifySubscription();
        });
    }
  }

  /**
   * @param {any} cmd
   * @param {any} args
  */
  onUiEvent (cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)

    switch(service) {
      case 'upgrade-plan': case 'subscribe-again':
        return this.upgradePlan();
      
      case 'payment-subscription':
        return this.paymentSubscription();
      
      case 'view-subscription':
        return this.viewSubscription();
      
      case 'modify-subscription':
        return this.modifySubscription();
      
      case 'change-subscription':
        return this.changeSubscription();
      
      case 'retry-payment':
        return this.retryPayment();
      
      case 'redirect-to-plans':
        this.closeOverlay();
        return this.fetchPlanData();
      
      case 'see-invoices':
        return this.seeInvoices();
      
      case 'return-to-plans':
        return this.goToPlans();

      case 'toggle-subscription-type':
        return this.toggleSubscriptionType(cmd);
      
      case 'pre-check-cancel-subscription':
        return this.preCheckCancelSubscription();
      
      case 'cancel-subscription':
        return this.cancelSubscription();
      
      case 'confirm-cancel-subscription':
        return this.confirmCancelSubscription(cmd);

      case 'resume-subscription':
        return this.resumeSubscription();
      
      case 'close-overlay':
        return this.closeOverlay();
      
      default:
        return this.debug('No service found!')
    }
  }

  /**
   * 
  */
  toggleSubscriptionType (cmd) {
    const val = cmd.mget(_a.value);
    if (this.selectedPlanType == val) {
      return
    }

    this.selectedPlanType = val;
    return this.__content.feed(require('./skeleton/pre-payment-summary').default(this, _a.new));
  }

  /**
   *
  */
  upgradePlan () {
    this.selectedPlanType = _a.year;
    return this.__content.feed(require('./skeleton/pre-payment-summary').default(this, _a.new));
  }

  /**
   * 
  */
  paymentSubscription () {
    this.__paymentSubscriptionButtonWrapper.el.dataset.wait = _a.yes;
    return this.postService({
      service : SERVICE.subscription.new,
      period  : this.selectedPlanType,
      hub_id  : Visitor.id
    }).then((data) => {
      if (_.isEmpty(data) || (_.isEmpty(data.session))) {
        return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      }

      // to redirect to stripe checkout page
      window.location.href = data.session.url;
      return this.__paymentSubscriptionButtonWrapper.el.dataset.wait = _a.no;
    }).catch((e) => {
      this.__paymentSubscriptionButtonWrapper.el.dataset.wait = _a.no;
      return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
    });
  }

  /**
   *
  */
  viewSubscription () {
    return this.__content.feed(require('./skeleton/view-subscription').default(this));
  }

  /**
   * 
  */
  modifySubscription () {
    this.__modifySubscriptionButtonWrapper.el.dataset.wait = _a.yes;

    return this.postService({
      service : SERVICE.subscription.proration,
      period  : _a.year,
      hub_id  : Visitor.id
    }).then((data) => {
      if (_.isEmpty(data)) {
        return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      }
      return this.prorateCalculation(data);
    }).catch((e) => {
      return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
    });
    
  }

  /**
   * @param {*} data
  */
  prorateCalculation (data) {
    this._prorationData = data;
    const prorateAmount = (data.proration_item.amount/100);
    const subsAmount = (data.subscription_item.amount/100);
    const finalPrice = subsAmount + prorateAmount;

    this._prorationCal = {
      prorated_amount     : prorateAmount,
      subscription_amount : subsAmount,
      final_price         : finalPrice
    }

    this.selectedPlanType = _a.year;
    this.__modifySubscriptionButtonWrapper.el.dataset.wait = _a.no; //to remove the btn-wait state

    return this.__content.feed(require('./skeleton/pre-payment-summary').default(this, _a.change));
  }

  /**
   * 
  */
  changeSubscription () {
    this.__paymentSubscriptionButtonWrapper.el.dataset.wait = _a.yes;
    
    return this.postService({
      service : SERVICE.subscription.update,
      period  : _a.year,
      hub_id  : Visitor.id
    }).then((data) => {
      if (_.isEmpty(data)) {
        return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      }

      this.debug('change subscription response', data, this);
      this._newValidityEndDate = data.current_period_end;
      this.openOverlay(require('./skeleton/change-subscription-ack').default(this));

      const f = () => {
        this.__paymentSubscriptionButtonWrapper.el.dataset.wait = _a.no;
        this.closeOverlay();
        return this.fetchPlanData();
      }
      return _.delay(f, 5000);
    }).catch((e) => {
      this.__paymentSubscriptionButtonWrapper.el.dataset.wait = _a.no;
      return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
    });
  }

  /**
   * 
  */
  retryPayment () {
    if (this.currentPlan.is_payment_failed) {
      return window.open(this.currentPlan.payment_link, '_blank');
    } else {
      return
    }
  }

  /**
   * 
  */
  goToPlans () {
    return this.__content.feed(require('./skeleton/plans').default(this));
  }

  /**
   *
  */
  seeInvoices () {
    return this.openOverlay(require('./skeleton/invoices').default(this));
  }

  /**
   * 
  */
  preCheckCancelSubscription () {
    return this.openOverlay(require('./skeleton/pre-check-cancel-subscription').default(this));
  }

  /**
   * 
  */
  cancelSubscription () {
    return this.openOverlay(require('./skeleton/cancel-subscription').default(this));
  }

  /**
   * 
  */
  confirmCancelSubscription (cmd) {
    cmd.el.dataset.wait = _a.yes;
    return this.postService({
      service : SERVICE.subscription.cancel,
      period  : this.currentPlan.period,
      hub_id  : Visitor.id
    }).then((data) => {
      if (_.isEmpty(data)) {
        return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      }
      this.debug('cancel subscription', data, this);
      this.closeOverlay();
      cmd.el.dataset.wait = _a.no;
      return this.fetchPlanData();
    }).catch((e) => {
      cmd.el.dataset.wait = _a.no;
      return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
    });
  }

  /**
   * 
  */
  resumeSubscription () {
    this.__proBtnWrapper.el.dataset.wait = _a.yes;
    return this.postService({
      service : SERVICE.subscription.active,
      hub_id  : Visitor.id
    }).then((data) => {
      if (_.isEmpty(data)) {
        return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      }
      this.__proBtnWrapper.el.dataset.wait = _a.no;
      this.debug('resume subscription', data, this);
      return this.fetchPlanData();
    }).catch((e) => {
      this.__proBtnWrapper.el.dataset.wait = _a.no;
      return Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
    });
  }

  /**
   * @param {object|null} skeleton
   * @return {void} 
  */
  openOverlay (skeleton = null) {
    const overlayWrapper = this.getPart('overlay-wrapper');
    overlayWrapper.el.dataset.mode = _a.open;
    if(skeleton) {
      return this.getPart('wrapper-overlay-container').feed(skeleton);
    }
  }

  /*
   *
  */
  closeOverlay (cmd = {}) {
    const overlayWrapper = this.getPart('overlay-wrapper');
    const overlayContainerWrapper = this.getPart('wrapper-overlay-container');
    overlayContainerWrapper.feed('');
    overlayWrapper.el.dataset.mode = _a.closed;
    overlayContainerWrapper.el.dataset.mode = _a.closed;
    return
  } 

  /**
   * @param {*} service
   * @param {*} data
   * @param {*} options
  */
  onWsMessage(service, data, options={}) {
    switch (options.service) {
      case 'subscription.paid':
      case 'subscription.failed':
      case 'subscription.deleted':
        return this.fetchPlanData();
    }
  }

}
__account_subscription.initClass();

module.exports = __account_subscription;
