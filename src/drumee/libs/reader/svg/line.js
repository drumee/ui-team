// ==================================================================== *
//   Copyright Xialia.com  2011-2024
//   FILE : src/drumee/libs/reader/chart/gradient-circle
//   TYPE : 
// ==================================================================== *

const _path = function(cn, da, s, d){
  if (cn == null) { cn = 'path-class'; }
  if (da == null) { da = "20,10,5,5,5,10"; }
  if (s == null) { s = "red"; }
  if (d == null) { d = "M5 0 l215 0"; }
  const r = { 
    class              : cn,
    'stroke-dasharray' : da,
    stroke             : s,
    d
  };
  return r;
};

// ===========================================================
// _wrapper
// M10 10 l0 180"
//  x1 y1 x2 y2 
// ===========================================================
const _wrapper = function(id){
  return `<div id=\"${id}\" style=\"position:absolute;\" class=\"svg-wrapper\"></div>`;
};

const _defauldClass = "svg-line";
//-------------------------------------
//
// LightJumpSpinner
//-------------------------------------
class __svg_line extends LetcBox {
  constructor(...args) {
    super(...args);
    this._generate = this._generate.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.update = this.update.bind(this);
    this._shouldUpdate = this._shouldUpdate.bind(this);
  }

  static initClass() {
    this.prototype.className  = _defauldClass;
  }

  /**
   * 
   */
  initialize(opt) {
    this._id = _.uniqueId();
    super.initialize(opt);
    this.model.set({
      widgetId : this._id});
    this.model.atLeast({ 
      innerClass : 'svg-path'});
    return this.vector = new Backbone.Model(this.model.get('vectorOpt'));
  }


  /**
   * 
   * @param {*} size 
   * @returns 
   */
  _generate(size) {
    if ((size == null)) {
      return;
    }
    const h = require('virtual-hyperscript-svg');
    const opt = this.vector.toJSON();
    opt.x1 = "0";
    opt.y1 = Math.round(size.height/2);
    opt.x2 = size.width;
    opt.y2 = opt.y1;
    opt['stroke-width'] = size.height;
    //_.merge opt, {x1 : "0", y1 : "0", x2 : size.width, y2 : 0}
    const a = h('svg', {
      viewBox : `0 0 ${size.width} ${size.height}`,
      width  : size.width,
      height : size.height,
      class  : this.model.get(_a.innerClass)// + " full"
    }, [
      h('line', opt)
    ]);
    return require('vdom-to-html')(a);
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    //@debug "SVG  ZZZ", @, "<div id=\"#{@_id}\" class=\"fill-up\"></div>"
    //@$el.append @_generate()
    this.$el.addClass(_a.widget);
    this.$el.append(_wrapper(this._id));
    this.model.on(_e.change, this._shouldUpdate);
    this._wrapper = this.$el.find(`#${this._id}`);
    const f = ()=> {
      this.debug("SVG  ZZZ 5555", this);
      const size = {  
        width  : this.el.innerWidth()  || parseInt(this.style.get(_a.width))  || 100,
        height : this.el.innerHeight() || parseInt(this.style.get(_a.height)) || 100
      };
      return this._wrapper.append(this._generate(size));
    };
    return this.waitElement(this._wrapper[0], f); 
  }

// ===========================================================
// update
//
// ===========================================================
  update(size) {
    this.debug("SVG  ZZZ", this);
    return this._wrapper[0].innerHTML = this._generate(size);
  }
    //return null

// ===========================================================
// _shouldUpdate
//
// ===========================================================
  _shouldUpdate(m) {
    if (m.changed.percent) {
      return this._wrapper[0].innerHTML = this._generate();
    }
  }
}
__svg_line.initClass();

module.exports = __svg_line;
