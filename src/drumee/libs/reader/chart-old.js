class __chart extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._start = this._start.bind(this);
    this._load = this._load.bind(this);
    this.onModelUpdate = this.onModelUpdate.bind(this);
    this._onDataAvailable = this._onDataAvailable.bind(this);
    this.onParentResized = this.onParentResized.bind(this);
    this._draw = this._draw.bind(this);
  }

  static initClass() { //Marionette.View
  //   templateName: "#--wrapper-chart" #_T.wrapper.raw
  //   #templateName: "#chart-c3"
  //   className: "chart"
  // 
  //   regions:
  //   behaviorSet
  //     bhv_spin     : _K.char.empty
  // 
    this.prototype.templateName = "#--wrapper-chart"; //_T.wrapper.raw
    //templateName: "#chart-c3"
    this.prototype.className = "chart";
    this.prototype.regions =
      {contentRegion  : "#--region-content"};
  }
    
// ========================
//
// ========================

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    this._countDown = _.after(2, this._start);
    require.ensure(['application'], ()=> {
      require('c3/c3.min.css');
      window.d3 = require('d3');
      window.c3 = require('c3');
      return this._countDown();
    });
    this._flow = _a.widget;
    if ((this.model == null)) {
      this.model = new Backone.Model();
    }
    this.model.atLeast({
      innerClass  : _K.string.empty,
      width       : 400,
      height      : 250,
      type        : 'line'
    });
    this._widgetId = _.uniqueId('chart-');
    return this.model.set(_a.widgetId, this._widgetId);
  }
// ========================
// onDomRefresh
// ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    return this._countDown();
  }
// ========================
// _start
// ========================

// ===========================================================
// _start
//
// @return [Object] 
//
// ===========================================================
  _start() {
    this.debug(">>ssss dataset???", this, this.$el.parent().height(), this.$el.parent().width());
    if (this.get(_a.data._) != null) {
      this.debug(">>ssss dataset???", this, this.$el.parent().height(), this.$el.parent().width());
      this._draw();
      return;
    }
    const source = this.get(_a.source);
    if (_.isString(source) && source.match(/^http.*:/)) {
      this._load();
    }
    const size = this.get(_a.size) || {};
    this._height = size.height || this.$el.parent().height();
    return this._width = size.width || this.$el.parent().width();
  }
//    @_height = @get(_a.height) || @$el.parent().height()
//    @_width = @get(_a.width) || @$el.parent().width()
// ======================================================
//
// ======================================================

// ===========================================================
// _load
//
// @return [Object] 
//
// ===========================================================
  _load() {
    this.triggerMethod(_e.spinner.start);
    const source = this.get(_a.source);
    if ((source == null)) {
      return;
    }
    //spinner = new LightSpinner()
    //@spinnerRegion.show spinner
    return $.getJSON(source, this._onDataAvailable, this.$el.height(), this.$el.width());
  }
// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// onModelUpdate
//
// @param [Object] model
//
// ===========================================================
  onModelUpdate(model) {
    _dbg(">>>>ssss onModelUpdate???", model);
    if (model.get(_a.source) != null) {
      this.model.set(_a.source, model.get(_a.source));
      this._load();
    }
    if (model.get(_a.type) != null) {
      this.model.set(_a.type, model.get(_a.type));
      return this._draw();
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _onDataAvailable
//
// @param [Object] data
//
// ===========================================================
  _onDataAvailable(data) {
    this.triggerMethod(_e.spinner.stop);
    this._data = data;
    return this._draw();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onParentResized
//
// @param [Object] parent
//
// ===========================================================
  onParentResized(parent) {
    const bbox = parent.guessSize();
    this._width  = bbox.width;
    this._height = bbox.height;
    return this._draw();
  }
// ========================
// _draw
// ========================

// ===========================================================
// _draw
//
// ===========================================================
  _draw() {
    let chart;
    this._data = this._data || this.get('dataset') || {};
    this.debug(">>ssss _draw", options, this);
    var options = {
      bindto : `#${this._widgetId}`,
      size: {
        width  : 300, //@_width - 20
        height : 150
      }, //@_height - 60
      data : {
        type : 'line'
      },
      axis : {
        x: {
          show:true
        }
      }
    };
    this.debug(">>ssss _draw", options, this);
    if (this.get(_a.size) != null) {
      _.merge(options.size, this.get(_a.size));
    }
    if (this.get(_a.data._) != null) {
      _.merge(options.data, this.get(_a.data._));
    }
    if (this.get(_a.axis) != null) {
      _.merge(options.axis, this.get(_a.axis));
    }
    if (this.get('policy') != null) {
      _.extend(options, this.get('policy'));
    }
    this.debug(">>ssss _draw", options);
    return chart = c3.generate(options);
  }
}
__chart.initClass();
//    chart = c3.generate({
//      size:
//        width  : 250 #@_width - 20
//        height : 120 #@_height - 60
//      axis:
//        x:
//          show:false
//          label :
//            text: ''
//        y:
//          show:false
//
//      bindto : "##{@_widgetId}"
//      data: {
//        type : 'spline'
//        columns: [
//          ['data1', 30, 200, 100, 400, 150, 250],
//        ]
//      }
//    });
module.exports = __chart;
