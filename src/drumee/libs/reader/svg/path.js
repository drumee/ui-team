// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/reader/chart/gradient-circle
//   TYPE : 
// ==================================================================== *

const VHS = require('virtual-hyperscript-svg');

/**
 * 
 * @param {*} cn 
 * @param {*} da 
 * @param {*} s 
 * @param {*} d 
 * @returns 
 */
const _path = function (cn, da, s, d) {
  if (cn == null) { cn = 'path-class'; }
  if (da == null) { da = "20,10,5,5,5,10"; }
  if (s == null) { s = "red"; }
  if (d == null) { d = "M5 0 l215 0"; }
  const r = {
    class: cn,
    'stroke-dasharray': da,
    stroke: s,
    d
  };
  return r;
};

/**
 * 
 * @param {*} id 
 * @returns 
 */
const _wrapper = function (id) {
  return `<div id=\"${id}\" style=\"position:absolute;\" class=\"svg-wrapper\"></div>`;
};

const _renderData = function (e, data) {
  let val;
  try {
    val = eval(e);
    val = val.toString();
  } catch (msg) {
    this.warn(`__svg_path : failed to render expression *${e}*`, data);
    val = e;
  }
  return val;
};


/**
 * 
 * @param {*} template 
 * @param {*} data 
 * @returns 
 */
const _renderShape = function (template, data) {
  const r = {};
  for (let k in template) {
    let v = template[k];
    let str = '';
    if (_.isString(v)) {
      v = v.replace(/\n+/g, '');
      v = v.replace(/\$\./g, 'data.');
      const tokens = v.split(/ *; */g);
      const a = [];
      for (let expr of Array.from(tokens)) {
        if (_.isEmpty(expr) || expr.match(/^ +$/)) {
          continue;
        }
        expr = expr.trim();
        if (expr != null ? expr.match(/^\{.+\}$/) : undefined) {
          a.push(_renderData(expr, data));
        } else {
          const t = expr.match(/^([a-z]+)(\{.+\})$/i);
          if (t != null) {
            a.push(t[1] + _renderData(t[2], data));
          } else {
            a.push(expr);
          }
        }
      }
      str = a.join(' ');
    } else {
      str = v.toString();
    }
    r[k] = str;
  }
  return r;
};


/**
 * 
 * @param {*} obj 
 * @param {*} data 
 * @param {*} exclude 
 * @returns 
 */
const _extractProps = function (obj, data, exclude) {
  const r = {};
  if (_.isArray(obj)) {
    return r;
  }
  for (let k in obj) {
    const v = obj[k];
    if (!_.isObject(v) && (k !== exclude)) {
      r[k] = v;
    }
  }
  return _renderShape(r, data);
};

/**
 * 
 * @param {*} obj 
 * @param {*} data 
 * @returns 
 */
var _extractChildren = function (obj, data) {
  let k, v;
  const r = [];
  if (_.isArray(obj)) {
    for (let child of Array.from(obj)) {
      if (_.isArray(child)) {
        return _extractChildren(child, data);
      }
      for (k in child) {
        v = child[k];
        if (_.isArray(v)) {
          r.push(VHS(k, {}, _extractChildren(v, data)));
        } else {
          r.push(VHS(k, _extractProps(v, data)));
        }
      }
    }
    return r;
  }
  for (k in obj) {
    v = obj[k];
    if (_.isArray(v)) {
      r.push(VHS(k, {}, _extractChildren(v, data))); //_extractProps(obj, data, k)
    }
  }
  return r;
};


const _defauldClass = "svg-path";
//-------------------------------------
//
// LightJumpSpinner
//-------------------------------------
class __svg_path extends LetcBox {
  constructor(...args) {
    super(...args);
    this._generate = this._generate.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.update = this.update.bind(this);
    this._shouldUpdate = this._shouldUpdate.bind(this);
  }

  static initClass() {
    this.prototype.className = _defauldClass;
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
      widgetId: this._id
    });
    this.model.atLeast({
      innerClass: 'svg-path'
    });
    this.schema = new Backbone.Model(this.model.get(_a.schemaOpt));
    this.data = new Backbone.Model(this.model.get(_a.dataOpt));
    return this.data.atLeast({
      color: 'black',
      strokeWidth: 1,
      fill: _a.none,
      dasharray: _a.none,
      filter: ""
    });
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _generate(data) {
    const schema = this.schema.toJSON();
    data = this.data.toJSON();
    schema.viewBox = schema.viewBox || `0 0 ${data.width} ${data.height}`;
    schema.width = schema.width || data.width;
    schema.height = schema.height || data.height;

    const a = VHS('svg', _extractProps(schema, data), _extractChildren(schema, data));
    return require('vdom-to-html')(a);
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.$el.addClass(_a.widget);
    this.$el.append(_wrapper(this._id));
    this.model.on(_e.change, this._shouldUpdate);
    this._wrapper = this.$el.find(`#${this._id}`);
    const f = () => {
      const size = {
        width: this.el.innerWidth() || parseInt(this.style.get(_a.width)) || 100,
        height: this.el.innerHeight() || parseInt(this.style.get(_a.height)) || 100
      };
      this.data.set(size);
      this.data.atLeast({
        rx: 0,
        ry: 0
      });
      return this._wrapper.append(this._generate(size));
    };
    return this.waitElement(this._wrapper[0], f);
  }

  /**
   * 
   * @param {*} size 
   * @returns 
   */
  update(size) {
    this.debug("SVG  ZZZ", this);
    if (_.isObject(size)) {
      this.data.set(size);
    }
    return this._wrapper[0].innerHTML = this._generate();
  }

  /**
   * 
   * @param {*} m 
   * @returns 
   */
  _shouldUpdate(m) {
    if (m.changed.percent) {
      return this._wrapper[0].innerHTML = this._generate();
    }
  }
}
__svg_path.initClass();

module.exports = __svg_path;
