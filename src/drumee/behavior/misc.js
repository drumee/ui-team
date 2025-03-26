  Behavior.NoDrop = class NoDrop extends Marionette.Behavior {

    initialize(opt) {
      return $(document).on(_e.drop, this._forbiden);
    }
  // ========================
  //
  // ========================

// ===========================================================
// onDestroy
//
// ===========================================================
    onDestroy(){
      _m.debug("onDestroy");
      return $(document).off(_e.drop, this._forbiden);
    }
      
    _forbiden(e){
      if (xui.Helper.byPass()) {
        return;
      }
      $(document).css({
        background: 'black'});
      return RADIO_BROADCAST.trigger(_e.warn, _I.WRONG_DROP_AREA);
    }
  };
  //########################################
  // CLASS : Behavior Scrolling
  //
  //########################################
  Behavior.Scrolling = class Scrolling extends Marionette.Behavior {
  // ========================
  // onDomRefresh
  // ========================

// ===========================================================
// onDomRefresh
//
// ===========================================================
    constructor(...args) {
      this.onDomRefresh = this.onDomRefresh.bind(this);
      this._scroll = this._scroll.bind(this);
      super(...args);
    }

    onDomRefresh() {
      return this.$el.on(_e.scroll,  _.throttle(this._scroll, 200));
    }
  // ========================
  // _scroll
  // ========================

// ===========================================================
// _scroll
//
// @param [Object] e
//
// ===========================================================
    _scroll(e){
      return this.view.fireEvent(_e.scroll, e);
    }
  };
  //########################################
  // CLASS : Behavior Style
  //
  //########################################
  Behavior.Slider = class Slider extends Marionette.Behavior {
  // ========================
  //
  // ========================

// ===========================================================
// onRender
//
// ===========================================================
    constructor(...args) {
      this.onRender = this.onRender.bind(this);
      super(...args);
    }

    onRender() {
      //_m.debug ">>==ee onRender  Behavior.Slider", @view
      const styleOpt = this.view.get(_a.styleOpt);
      if (styleOpt != null) {
        this.$el.css(styleOpt);
      }
      if (this.view._anim_data != null) {
        const anim = this.view.get(_a.anim);
        if (anim != null) {
          let str = '';
          for (var k in anim) {
            var v = anim[k];
            str = `${str}${k}: ${v}; `;
          }
          //_m.debug ">>==ee onRender ANIM", str
          return this.$el.attr(this.view._anim_data, str);
        }
      }
    }
  };
