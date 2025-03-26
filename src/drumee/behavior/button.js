class __behavior_button extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this._mouseOver = this._mouseOver.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
    this.prototype.events = {
      "click @ui.close"  : "_close",
      "click @ui.cancel" : "_cancel",
      click              : '_click',
      mouseover          : '_mouseOver'
    };
    this.prototype.ui = {
      picto          : '.picto',
      label          : '.label'
    };
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// _click
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _click(e) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    const {
      model
    } = this.view;
    //model.set _a.currentEvent, e
    router.set(_a.currentEvent, e);
    //_dbg "<<FFFFFF Behavior _click ", @view
    if (model.get(_a.active)) {
      //_dbg "__dispatchRest'onClick ", @view, _e.click, model
      this.view.triggerMethod(_e.click, model);
      RADIO_BROADCAST.trigger(_e.item.click, this.view);
      return;
    }
    return this.warn("Not active", this.view);
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// onBeforeRender
//
// @param [Object] e
//
// ===========================================================
  onBeforeRender(e) {
    //_dbg "<<FFFFFF Behavior onBeforeRender ", @view
    let label = this.view.model.get(_a.label);
    if (_.isString(label)) {
      label = LOCALE[label];
    } else {
      label =  _K.char.empty;
    }
    this.view.model.set({
      label});
    return this.view.model.atLeast({
      listClass : _K.char.empty,
      flow      : _a.horizontal,
      picto     : _p.bars,
      justify   : _a.left,
      url       : _K.char.empty,
      href      : _K.char.empty
    });
  }
//    @view.initHandlers()
  // ============================================
  //
  // ============================================

// ===========================================================
// onBubble
//
// @param [Object] e
//
// ===========================================================
  onBubble(e) {
    return this._click(e);
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// _close
//
// @param [Object] e
//
// ===========================================================
  _close(e) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    return this.view.trigger(_e.close);
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// _cancel
//
// @param [Object] e
//
// ===========================================================
  _cancel(e) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    return this.view.trigger(_e.cancel);
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// _mouseOver
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _mouseOver(e) {
    e.stopPropagation();
    //_dbg "item:over", @model
    this.view.trigger("item:over", this.view);
    return true;
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh(){
    this.$el.mousedown(() => !Utils.Text.isSelected());
      // Prevent deselection in designer
    //_dbg ">>aaaa Behavior.Button", @view
    this.$el.attr(_a.data.visible, _a.on);
    if (this.view.get(_a.innerClass) != null) {
      try {
        this.ui.label.addClass(this.view.get(_a.innerClass));
      } catch (error) {}
    }
    this.view.model.set('outerHeight', this.$el.outerHeight());
    return this.view.model.set('outerWidth', this.$el.outerWidth());
  }
}
__behavior_button.initClass();
module.exports = __behavior_button;
