class __section extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.on_mousewheel = this.on_mousewheel.bind(this);
  }

  static initClass() {
    this.prototype.nativeClassName  = _a.section;
  }

// ===========================================================
//
// ===========================================================
  initialize(opt) {
    super.initialize(opt);
    return this.model.atLeast({ 
      anchor_id : _.uniqueId('section-')});
  }


// ===========================================================
//
// ===========================================================
  onRender(c) {
    super.onRender();
    if (this.model.get(_a.parallax)) {
      const f = ()=> {
        this.el.onmousewheel = this.on_mousewheel;
        return this._posY = parseInt(this.getActualStyle('background-position-y') || 0);
      };
      return this.waitElement(this.el, f);
    }
  }

// ===========================================================
//
// ===========================================================
  onDomRefresh() {
    return this.el.setAttribute(_a.id, this.model.get(_a.anchor_id));
  }


// ===========================================================
//
// ===========================================================
  on_mousewheel(e) {
    this._posY = this._posY;
    const h = this.$el.height();
    if (e.deltaY < 0) {
      this._posY =  this._posY + ((h*this.model.get(_a.parallax))/10000);
      if (this._posY > 100) {
        this._posY = 100;
      }
    } else {
      this._posY =  this._posY - ((h*this.model.get(_a.parallax))/10000);
      if (this._posY < 0) {
        this._posY = 0;
      }
    }
    return this.el.style['background-position-y'] = this._posY + '%';
  }
}
__section.initClass();


module.exports = __section;
