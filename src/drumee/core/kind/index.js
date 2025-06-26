// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/type
//   TYPE :
// ==================================================================== *

let __singleton;
const SYSTEM_CLASSES = require('./seeds/static');
const USER_CLASSES = {};
const Addons = require("./seeds/addons");
const Builtins = require('./seeds/builtins');
// ---------------------------------
//
// ---------------------------------
class __kind extends Backbone.Model {

  initialize() {
    this.loader = require('./loader.js').default;
    this.trigger(_e.ready);
    this._isReady = 1;
  }

  /**
   * 
   * @param {*} t 
   */
  exists(t) {
    return SYSTEM_CLASSES[t] || USER_CLASSES[t];
  }

  /**
   * 
   * @returns 
   */
  isReady(){
    if(this.loader) return true;
    return false;
  }

  /**
   * 
   * @param {*} n 
   * @param {*} d 
   * @returns 
   */
  ensure(n, d) {
    if (this.exists(n)) {
      return this.get(n);
    }
    return this.register(n, d);
  }

  /**
   * 
   * @param {*} args (string or object) 
   * @param {*} ref (import promise)
   * @returns 
   */
  registerAddons(args, ref) {
    if(_.isString(args)){
      Addons.register(args, ref);
    }else if(_.isObject(args)){
      for(let kind in args){
        Addons.register(kind, args[kind])
      }
    }else if(_.isArray(arg)){
      for(let item of args){
        if(_.isObject(item)){
          for(let kind in item){
            Addons.register(kind, item[kind])
          }
        }else if(_.iaArray(item)){
          Addons.register(item[0],item[1])
        }
      }
    }
  }

  /**
   * 
   * @param {*} k 
   * @param {*} v 
   * @param {*} verbose 
   * @returns 
   */
  register(k, v, verbose = 0) {
    if (USER_CLASSES[k]) {
      if (verbose) {
        this.warn(`Kind ${k} already exists. Use method replace`);
      }
      return;
    }
    //@warn "FORCE OVERWRITING KIND #{k}"
    if (SYSTEM_CLASSES[k]) {
      this.warn(`Kind *${k}* is reserved, it cannot be reused.`);
      return;
    }
    return USER_CLASSES[k] = v;
  }

  /**
   * 
   * @param {*} k 
   * @param {*} v 
   * @returns 
   */
  replace(k, v) {
    if (SYSTEM_CLASSES[k] || Builtins.get(k)) {
      this.warn(`Kind ${k} is reserved. It cannot be resused`);
      return;
    }
    return USER_CLASSES[k] = v;
  }


  /**
   * 
   * @param {*} name 
   * @returns 
   */
  get(name) {
    let f = SYSTEM_CLASSES[name] || USER_CLASSES[name];
    if (_.isFunction(f)) {
      return f;
    }
    f = Builtins.get(name) || Addons.get(name);
    if (_.isFunction(f != null ? f.then : undefined)) {
      return this.loader(f);
    }
    this.warn(`Failed to find kind for ${name}`);
    return null;
  }

  /**
   * 
   */
  export_builtins(pfx = 'letc') {
    let n;
    for (let k in SYSTEM_CLASSES) {
      n = _.camelCase(`${pfx}-${k}`);
      if (!window[n]) {
        this.debug(`Exporting ${n}`);
        window[n] = SYSTEM_CLASSES[k];
      } else {
        this.warn(`Failed to export kind ${n}. Name is already in use`);
      }
    }
  }

  /**
   * 
   * @param {*} name 
   * @returns 
   */
  async waitFor(name) {
    const self = this;
    let f = SYSTEM_CLASSES[name] || USER_CLASSES[name];
    if (_.isFunction(f)) {
      return f;
    }

    f = Builtins.get(name) || Addons.get(name);
    if (!f) {
      this.warn(`Could not wait for kind ${name}`);
      //console.trace();
      return null;
    }
    if (_.isFunction(f.then)) {
      let r = await f.then((e) => {
        if (SYSTEM_CLASSES[name]) return SYSTEM_CLASSES[name];
        SYSTEM_CLASSES[name] = e;
        return e;
      });
      return r;
    }
  }

  /**
   * 
   * @param {*} letc 
   * @param {*} map 
   * @param {*} clone 
   * @returns 
   */
  convert(letc, map, clone) {
    let data, f;
    if (clone == null) { clone = false; }
    if (!letc) {
      return null;
    }
    if (!(map != null ? map.match(/designer|reader/) : undefined)) {
      _c.error("Type.convert requires map name");
      return null;
    }
    if (clone) {
      data = _.clone(letc);
    } else {
      data = letc;
    }
    if ((map != null ? map.match(/designer/) : undefined)) {
      f = this.toDesigner;
    } else {
      f = this.toReader;
    }
    var walk = function (item) {
      //_dbg "AAAAA ---------> ", item.kind
      let i;
      item.kind = f(item.kind, map);
      if (item.kids != null) {
        for (i of Array.from(item.kids)) {
          walk(i);
        }
      }
      if (item.items != null) {
        for (i of Array.from(item.items)) {
          walk(i);
        }
      }
      if (item.trigger != null) {
        for (i of Array.from(item.trigger)) {
          walk(i);
        }
      }
      if (item.triggers != null) {
        return (() => {
          const result = [];
          for (i of Array.from(item.triggers)) {
            result.push(walk(i));
          }
          return result;
        })();
      }
    };
    if (_.isArray(data)) {
      for (let d of Array.from(data)) {
        if (d != null) {
          walk(d);
        }
      }
    } else {
      if (data != null) {
        walk(data);
      }
    }
    data.kind = f(data.kind, map);
    return data;
  }

  // ===========================================================
  // splitFixed
  // Because it's not possible to mix transform and fixed position,
  // We have to split fixed_position object from the renderering tree
  // @param [Object] letc
  //
  // @return [Object]
  //
  // ===========================================================
  splitFixed(letc) {
    const fixed = [];
    var walk = function (item) {
      if (item.fixed_position) {
        fixed.push(_.clone(item));
        item.kind = KIND.wrapper;
        item.className = "fixed-fixed";
      }
      //_dbg "AAAAA ---------> ", item.kind
      if (item.kids != null) {
        return Array.from(item.kids).map((i) =>
          walk(i));
      }
    };
    if (_.isArray(letc)) {
      for (let d of Array.from(letc)) {
        walk(d);
      }
    } else {
      walk(letc);
    }
    const data = {
      normal: letc,
      fixed
    };
    return data;
  }

}

if ((__singleton == null)) {
  __singleton = new __kind();
}

module.exports = __singleton;
