class __spinner_jump extends Marionette.View {

  static initClass() {
    this.prototype.templateName = '#--jump-loader'; //_T.wrapper.image
    behaviorSet({
      bhv_modal : _K.char.empty,
      bhv_greensock : _K.char.empty
    });
    this.prototype.ui = {
      loader  : '#--loader',
      circleL : '#--circleL',
      circleR : '#--circleR',
      jump    : '#--jump'
    };
  }
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    this._pluginLoaded = _.after(2, this._display);
    return require.ensure(['application'], ()=> {
      require('gsapp/plugins/DrawSVGPlugin');
      return this._pluginLoaded();
    });
  }

// ----------------------
//
// ----------------------
  _display(opt){}
    // # @_jumpRef = @ui.jump.clone()
    // # @ui.loader.append(@_jumpRef)

    // # o1 = 
    // # 	position : _a.absolute
    // # 	top : _K.size.half
    // # 	left: _K.size.half
    // # 	xPercent: -50
    // # 	yPercent: -50

    // # TweenMax.set [@$el, @ui.loader], o1
    // # o2 = 
    // # 	transformOrigin: '50% 110%'
    // # 	scaleY: -1
    // # 	alpha: 0.05

    // TweenMax.set @_jumpRef, o2

    // tl = new TimelineMax({
    // 	repeat: -1
    // 	yoyo: false
    // })
    // tl.timeScale(3);
    // tl.set([@ui.jump, @_jumpRef], {drawSVG: '0% 0%'})
    // .set([@ui.circleL, @ui.circleR], {attr: {rx: 0,ry: 0,}})
    // .to([@ui.jump, @_jumpRef], 0.4, {drawSVG: '0% 30%',ease: Linear.easeNone})
    // .to(@ui.circleL, 2, {attr: {rx: '+=30',ry: '+=10'}, alpha: 0, ease: Power1.easeOut}, '-=0.1')
    // .to([@ui.jump, @_jumpRef], 1, {drawSVG: '50% 80%', ease: Linear.easeNone}, '-=1.9')
    // .to([@ui.jump, @_jumpRef], 0.7, {drawSVG: '100% 100%',ease: Linear.easeNone}, '-=0.9')
    // .to(@ui.circleR, 2, {attr: {rx: '+=30',ry: '+=10'},alpha: 0,ease: Power1.easeOut}, '-=.5')
// ============================
//
// ============================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    return this._pluginLoaded();
  }
}
__spinner_jump.initClass();
module.exports = __spinner_jump;
