// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/analytics/main-website/index.js
//   TYPE : Component
// ==================================================================== *


const __window_analytics = require('..');
/**
 * @class __window_analytics_main_website
 * @extends __window_analytics
 */

class __window_analytics_main_website extends __window_analytics {

  /** 
   * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    let {title} = this.mget(_a.vars);
    this.mset({title : title || "Drumee Analytics"});

    // For Filter configuration
    this.selectedValue = 'monthly';
    this.selectedFilterOption = [];
    if (this.mget('filterOptions')) {
      this.analyticsFilter = this.mget('filterOptions');
      this.filterOptions = this.analyticsFilter.options || [];
      this.filterType = this.analyticsFilter.type || 'page';
      this.filterLabel = this.analyticsFilter.label || 'Select Page';

      const selVal = this.filterOptions.find((d) => { if(d.selected) {return d;}})
      this.selectedFilterOption = [selVal.value];

      this.secondFilter = this.analyticsFilter.secondFilter;
      if (this.secondFilter) {
        this.secondFilter = this.mget('areaFilter');
        this.secondFilterOptions = this.secondFilter.options || [];
        this.secondFilterType = this.secondFilter.type || 'page';
        this.secondFilterLabel = this.secondFilter.label || 'Select Page';

        const selVal2 = this.secondFilterOptions.find((d) => { if(d.selected) {return d;}})
        this.selectedAreaOption = [selVal2.value];
      }
    }

    this.customStartDate = Dayjs().subtract(29, 'days').format("Y-MM-DD");
    this.customEndDate = Dayjs().format("Y-MM-DD");
    this.customLabel = 'Last 30 Days'; // do not change

    this._setSize({ minHeight: 600, minWidth: 400 });
    this.declareHandlers();
  }

  /**
   * 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        this._content = child;
        child.feed(require('./skeleton').default(this));
        this.setupInteract();
        this.raise();
        break;
      case 'chart-container':
        this.waitElement(child.el, () => {
          return this.submit();
        })
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
  */
  onDomRefresh() {
    this.feed(require('../skeleton')(this));
  }


  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.status);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent", service, status, this)
    switch (service) {
      case 'change_option':
        this.changeOption(cmd);
        return
      
      case 'select-date':
        return this.selectDate(cmd);

      case _e.submit:
        this.submit();
        break;
      
      default:
        super.onUiEvent(cmd, args);
    }

    return cmd = null;
  }

  /**
   *
  */
  changeOption(cmd) {
    const role = cmd.mget(_a.role)
    const selectedValue = cmd.selected.value;
    switch (role) {
      case _a.origin:
        return this.selectedFilterOption = [selectedValue ] || ['www.google.com'];
      
      case _a.page:
        return this.selectedFilterOption = [selectedValue ] || ['home'];

      case _a.button:
        return this.selectedAreaOption = [selectedValue ] || ['drumee'];
    }
    this.debug('change options dropdown', cmd, this);
  }

  /**
   * 
  */
  selectDate (cmd) {
    this.debug('selectDate 111', cmd, this);
    this.customStartDate = cmd.mget('startDate');
    this.customEndDate = cmd.mget('endDate');
    this.customLabel = cmd.mget('selectedLabel');
    return
  }

  /**
   * 
  */
  async submit () {
    this.debug('submit form', this.selectedValue, this);
    let opt = this.calculatePeriod();

    opt.toDate = moment(opt.toDate).add(1, 'days').format("Y-MM-DD"); // to match with the UTC time data - do not remove

    let vars = {
      start: opt.startDate,
      end: opt.toDate,
      cycle: opt.cycle,
      // page: this.selectedFilterOption,
      time_format: opt.time_format
    }

    if (this.secondFilter) {
      vars.page = this.selectedFilterOption;
      vars.section = _a.all;
      vars.area = this.selectedAreaOption || ['drumee'];
    } else if (this.filterType == _a.page) {
      vars.page = this.selectedFilterOption;
    } else if (this.filterType == _a.origin) {
      vars.domain = this.selectedFilterOption;
    }

    this.dataOpt = opt;

    return this.submitApiService(vars);
  }

  /**
   * 
  */
  calculatePeriod() {
    let opt = {
      startDate: this.customStartDate.format("Y-MM-DD"),
      toDate: this.customEndDate.format("Y-MM-DD"),
      cycle: 'daterange',
      time_format: '%Y-%m-%d',
      tick_format: '%Y-%m-%d',
      tickInterval: 2
    }

    switch (this.customLabel) {
      case 'Yesterday': case 'Last Week':
        opt.tickInterval = 1;
        break;
      
      case 'Last 30 Days': case 'This Month': case 'Last Month':
        opt.tickInterval = 2;
        break;
      
      case 'Last Year':
        opt.cycle = 'year';
        opt.tick_format = "%Y-%b";
        opt.tickInterval = 31;
        break;
      
      case 'Custom Range':
        const dateDiff = this.customEndDate.diff(this.customStartDate, 'days');
        const val = dateDiff/2;
        if((val > 30) && val > 60) {
          opt.tickInterval = 3
        } else {
          opt.tickInterval = 7
        }
        break;
    }
    return opt;
  }

  /**
   * 
  */
  submitApiService(vars) {
    let api = this.mget(_a.api);

    return this.postService(api, {
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      vars
    }, {async:1}).then((data)=> {
      if (_.isEmpty(data)) {
        return this.__chartContainer.feed(require('./skeleton/empty-data-message').default(this));
      }
      return this.prepareChart(data);
    }).catch((e)=>{
      this.warn("Failed to extrac", e);
      let msg = e.error || e.toString();
      Wm.alert(`Ooops! (${msg})`);
    });
  }

  /**
   * 
  */
  prepareChart (data) {
    // to find and set yInterval
    let yMax = 0;
    data = data.map((d) => { d.cnt = parseInt(d.cnt); if(yMax < d.cnt){ yMax = d.cnt} return d});
    const yDivider = Math.ceil(yMax/10);
    const yTickInterval = Math.ceil(yMax/yDivider);

    let margin = {
      top: 40,
      right: 80,
      bottom: 100,
      left: 80,
    };
    const view = this.mget(_a.view);

    let opt = _.map(view, (item)=> {
      this.debug('checking the opt value', item);
      let r = {
        title: {
          text: item.title, 
          textAnchor: _a.left
        },
        kind : 'chart_bar',
        time_format: this.dataOpt.time_format,
        tick_format: this.dataOpt.tick_format,
        xTickInterval: this.dataOpt.tickInterval,
        yTickInterval,
        rules: item.rules,
        cycle: this.dataOpt.cycle,
        margin,
        data,
        uiHandler: this
      }
      return r;
    })
    this.raise();
    return this.__chartContainer.feed(opt);
  }

  // ===========================================================
  //
  // ===========================================================
  clearMessage() {
    this.getPart('error-message-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message').set({ content: '' })
    this.getPart('go-button-wrapper').el.dataset.state = _a.open
  }

  // ===========================================================
  //
  // ===========================================================
  showErrorMessage(msg) {
    this.getPart('go-button-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message-wrapper').el.dataset.state = _a.open
    this.getPart('error-message').set({ content: msg })
    _.delay(this.clearMessage.bind(this), Visitor.timeout(2500))
    return;
  }


  // ======================= Window Interact methods ====================

  /**
   * 
  */
  _setSize (opt={}) {
    let ww = Wm.$el.width();
    let w = ww;
    let h = Math.max(_K.docViewer.height/2, window.innerHeight / 1.5);
    if(opt.minHeight && (h < opt.minHeight)) {
      h = opt.minHeight;
    }

    let x = 0 ;

    if(w > _K.iconWidth * 7.2) {
      x = (w - _K.iconWidth * 7.2)/2;
      w = _K.iconWidth * 7.2;
    }
    if(this.style.get(_a.left)){
      x = this.style.get(_a.left);
    }

    let y = 0;
    if(this.style.get(_a.top)) {
      y = this.style.get(_a.top);
    }
    if(this.style.get(_a.width)) {
      w = this.style.get(_a.width);
    }
    if(this.style.get(_a.height)) {
      h = this.style.get(_a.height);
      if(_.isEmpty(opt.minHeight)) {
        opt.minHeight = h
      }
    }

    if(w > ww) {w = ww - 20};
    if(x > ww) {x = ww - w};

    if(y <= 0) {y += 90};
    
    this.size = {
      left        : x,
      top         : y,
      height      : Math.round(h),
      minHeight   : opt.minHeight || _K.docViewer.height/2,
      minWidth    : opt.minWidth || 300,
      width       : opt.width ||  Math.round(w),
    }

    this.size = _.merge(this.size, opt);
    return this.style.set(this.size);
  }

}
module.exports = __window_analytics_main_website;