// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/reader/chart/gradient-circle
//   TYPE : 
// ==================================================================== *

/**
 * 
 * @param {*} stroke_array 
 * @param {*} stroke 
 * @param {*} moreClass 
 * @returns 
 */
const _path = function(stroke_array, stroke, moreClass){
  if (moreClass == null) { moreClass = ''; }
  const r = { 
    class : `gc-arc ${moreClass}`,
    'stroke-dasharray': stroke_array,
    stroke,
    d : `M18 4 \
a 15.9155 15.9155 0 0 1 0 31.831 \
a 15.9155 15.9155 0 0 1 0 -31.831` 
  };
  return r;
};


/**
 * 
 */
class __gradient_circle extends LetcBox {
  constructor(...args) {
    super(...args);
    this._draw = this._draw.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.update = this.update.bind(this);
    this._shouldUpdate = this._shouldUpdate.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    this._id = _.uniqueId();
    super.initialize(opt);
    this.model.set({
      widgetId : this._id});
    return this.model.atLeast({ 
      gradient   : [['#dde2e8', '#879cff'],["#35d6ab", "#cfe1e3"]],   
      percent    : 50,
      cursor     : "#35d6ab",
      innerClass : 'circular-chart'
    });
  }

  /**
   * 
   * @returns 
   */
  _draw() {
    const grd = this.model.get(_a.gradient);
    const h = require('virtual-hyperscript-svg');
    const lg1 = h('linearGradient', {
      id : `lg1-${this._id}`
    }, [
      h('stop', { offset: '0%', 'stop-color': grd[0][0] }),
      h('stop', { offset: '100%', 'stop-color': grd[0][1] })
    ]);
    const lg2 = h('linearGradient', {
      id : `lg2-${this._id}`
    }, [
      h('stop', { offset: '0%', 'stop-color': grd[1][0] }),
      h('stop', { offset: '100%', 'stop-color': grd[1][1] })
    ]);
    const lg11 = h('linearGradient', {
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1',
      id : `lg1-link-${this._id}`,
      "xlink:href":`#lg1-${this._id}`
    });
    const lg22 = h('linearGradient', {
      x1: '0',
      y1: '0',
      x2: '0',
      y2: '1',
      id: `lg2-link-${this._id}`,
      "xlink:href":`#lg2-${this._id}`
    });
    const pc = this.model.get(_a.percent);
    const a = h('svg', {viewBox:"0 0 44 44", class:this.model.get(_a.innerClass)}, [
      lg1,
      lg2,
      lg11,
      lg22,
      h('path', _path(`0, ${pc}, 100`, `url(#lg2-link-${this._id})`)),    // lower circle
      h('path', _path(`${pc}, 100`, `url(#lg1-link-${this._id})`)),       // upper circle
      h('path', _path("0, 99.9, 100", this.model.get('cursor'), "gc-end"))    
    ]);
    return require('vdom-to-html')(a);
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.$el.append(this._draw());
    return this.model.on(_e.change, this._shouldUpdate);
  }

  /**
   * 
   * @returns 
   */
  update() {
    this.debug("SVG  ZZZ", this);
    return this.el.innerHTML = this._draw();
  }

  /**
   * 
   * @param {*} m 
   * @returns 
   */
  _shouldUpdate(m) {
    if (m.changed.percent) {
      return this.el.innerHTML = this._draw();
    }
  }
}
__gradient_circle.initClass();

module.exports = __gradient_circle;
