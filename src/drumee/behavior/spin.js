class __bhv_spin extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._stop = this._stop.bind(this);
    this._start = this._start.bind(this);
    this.onSpinnerStop = this.onSpinnerStop.bind(this);
    this.onSpinnerStart = this.onSpinnerStart.bind(this);
  }

  initialize(opt) {
    const start = this.getOption(_a.start) || _a.auto;
    const color = this.getOption(_a.color) || _K.color.blue;
    const size  = this.getOption(_a.size)  || _a.small;
    return this._opt = require('utils/options/spin')(size, color);
  }

  onDomRefresh() {
    if (this.view.get(_a.spinner) === _a.off) {
      return;
    }
    if ((this.getOption(_a.start) === _a.auto) || this.view.get(_a.spin)) {
      return this.triggerMethod(_e.spinner.start);
    }
  }

// ===========================================================
// _stop
//
// @return [Object]
//
// ===========================================================
  _stop() {
    this.debug("_stop SSSSSSSXXXXXXX", this._spinner, this.view);
    if (this._spinner != null) {
      this._spinner.destroy();
      try {
        this.view.collection.remove(this._spinner.odel);
      } catch (error) {}
      return;
    }
    try {
      if (this._spin != null) {
        this._spin.stop();
      }
    } catch (error1) {}
    return this.view.$el.css({
      overflow : this._overflow});
  }

// ===========================================================
// _start
//
// ===========================================================
  _start() {
    this.triggerMethod(_e.spinner.stop);
    this._overflow = this.view.$el.css(_a.overflow._);
    switch (this.view.get(_a.spinner)) {
      case 'jumper':
        //@_spin = new WPP.Spinner.Jump()
        return this._spin = this.view.plug(WPP.Spinner.Jump);
      case 'wheel':
        this.view.$el.css({
          overflow : _a.hidden});
        var radius = (this._opt != null ? this._opt.radius : undefined) || 10;
        var min = (radius*2) + 40;
        var top = (this.view.$el.scrollTop() + (this.view.$el.height()/2)) - radius;
        if (top < min) {
          top = min;
        }
        var spinClass  = require("spin");
        this._spin = new spinClass(this._opt).spin(this.el);
        return $(this._spin.el).css({
          position : _a.aboslute,
          left : (this.view.$el.width()/2) - radius,
          top  : top({
            color : _K.color.blue})
        });
      default:
        if (_.isFunction(this.view.carry)) {
          if ((this._spinner == null) || this._spinner.isDestroyed()) {
            try {
              //w = require('widget/wrapper')
              //@_spinner = @view.carry w, require('skeleton/spinner/circles')()
              return this._spinner = this.view.children.findByIndex(this.view.collection.last());
            } catch (error) {}
          }
        }
    }
  }
              //@debug "DSDSDZDDZZD", @_spinner

// ===========================================================
// #  _start
//
// @return [Object]
//
// ===========================================================
//  _start: () =>
//    if localStorage.debug
//      return
//    @triggerMethod _e.spinner.stop
//    @_overflow = @view.$el.css _a.overflow._
//    if @view.get(_a.spinner) is 'jumper'
//      #@_spin = new WPP.Spinner.Jump()
//      @_spin = @view.plug WPP.Spinner.Jump
//    else
//      @view.$el.css
//        overflow : _a.hidden
//      radius = @_opt?.radius || 10
//      min = radius*2 + 40
//      top = @view.$el.scrollTop() + @view.$el.height()/2 - radius
//      if top < min
//        top = min
//      spinClass  = require("spin")
//      @_spin = new spinClass(@_opt).spin(@el)
//      $(@_spin.el).css
//        position : _a.aboslute
//        left : @view.$el.width()/2 - radius
//        top  : top
//        color : _K.color.blue
//      #_dbg "//> spin onSpinnerStart", top, @view.$el.scrollTop(), @_spin, @_opt, @

// ===========================================================
// onSpinnerStop
//
// ===========================================================
  onSpinnerStop() {
   return this._stop();
 }

// ===========================================================
// onPipeEnd
//
// ===========================================================
  onPipeEnd(){
    //_dbg "KKKK spinner... onPipeEnd"
    return this._stop();
  }

// ===========================================================
// onPipeFailed
//
// @param [Object] xhr
//
// ===========================================================
  onPipeFailed(xhr){
//      _dbg ">>QQHH SPINNER onPipeFailed, hash=#{location.hash}", xhr
    return this._stop();
  }

// ===========================================================
// onSpinnerStart
//
// ===========================================================
  onSpinnerStart() {
    return this._start();
  }

// ===========================================================
// onPipeStart
//
// ===========================================================
  onPipeStart(){
    _dbg("<<KKKK spinner... onPipeStart");
    return this._start();
  }
}

module.exports = __bhv_spin;
