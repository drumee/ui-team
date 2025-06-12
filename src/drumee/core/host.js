// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : 
//   TYPE : 
// ==================================================================== *

//########################################
class __core_site extends Backbone.Model {

  /**
   * 
   * @param {*} o 
   * @returns 
   */
  initialize(o) {
    if (document.head.dataset.preserveTitle !== null) {
      return;
    }
    let name = this.get(_a.name);
    if (name) {
      document.title = name;
    }
    if (this.get(_a.hostname)) {
      localStorage.getItem('org_name', this.get(_a.hostname));
      localStorage.getItem('user_domain', this.get(_a.hostname));
    }
  }


  /**
   * 
   * @param {*} attr 
   * @returns 
   */
  data(attr) {
    let l;
    try {
      l = this.setting()[attr] || {};
    } catch (error) {
      l = {};
    }
    return l;
  }


  /**
   * 
   * @param {*} l 
   * @returns 
   */
  setPagelang(l) {
    localStorage.pagelang = l;
    this.set({
      pagelang: l
    });
    return l;
  }

  /**
   * 
   * @param {*} data 
   */
  respawn(data) {
    this.set(data);
    for (var k of [_a.settings]) {
      if (_.isString(data[k])) {
        this.set(k, JSON.parse(data[k]));
      } else if (_.isObject(data[k])) {
        this.set(k, data[k]);
      }
    }
  }

  /**
   * 
   * @param {*} l 
   * @returns 
   */
  changePagelang(l) {
    localStorage.pagelang = l;
    this.set({
      pagelang: l
    });
    location.reload();
    return l;
  }

  /**
   * 
   * @returns 
   */
  settings() {
    const a = this.get(_a.settings);
    if (_.isString(a)) {
      try {
        this.set(_a.settings, JSON.parse(a));
        return this.get(_a.settings);
      } catch (e) {

      }
    }
    return a || {};
  }



  /**
   * 
   * @param {*} s 
   * @returns 
   */
  parseLocation(s) {
    let loc = s || location.search;
    const blocks = loc.replace('?', '').split('&');
    const opt = {};
    for (let b of Array.from(blocks)) {
      const a = b.split('=');
      while (a.length) {
        const k = a.shift();
        let v = a.shift();
        if ((v != null) && !_.isEmpty(k)) {
          v = v.replace(/\/+/, '');
          opt[k] = decodeURI(v);
        }
      }
    }
    return opt;
  }

  /**
   * 
   * @param {*} l 
   * @returns 
   */
  parseModule(l) {
    let b;
    if (l != null) {
      b = l.split(/[\#\/&\?]/g);
    } else {
      b = location.hash.split(/[\#\/&\?]/g);
    }

    while (b.length && _.isEmpty(b[0])) {
      b.shift();
    }
    return b;
  }

  /**
   * 
   * @returns 
   */
  parseModuleArgs() {
    const b = location.hash.split(/[\#\/&\?]/g);
    const o = {};
    for (let a of Array.from(b)) {
      const c = a.split(/( *= *)/);
      if (!_.isEmpty(c[0])) {
        o[c[0]] = c[2];
      }
    }
    return o;
  }


  /**
   * 
   */
  name() {
    return this.get(_a.hostname) || bootstrap().main_domain;
  }

  /**
   * 
   * @returns 
   */
  domain_name() {
    return this.get(_a.domain) || bootstrap().main_domain;
  }

  /**
   * 
   * @param {*} url 
   * @returns 
   */
  makeUrl(url = '') {
    return `${protocol}://${this.get(_a.vhost) || this.get(_a.domain) || bootstrap().main_domain}/${url}`;
  }

  /**
   * 
   * @returns 
   */
  languageClassName() {
    const n = "user-language-" + this.language();
    return n;
  }

  /**
   * 
   * @param {*} id 
   * @returns 
   */
  favicon(id, type = _a.vignette) {
    if (id) {
      return `${bootstrap().mfsRootUrl}avatar/${id}?type=${type}`;
    }

    const a = this.get(_a.avatar);
    if (/^http/.test(a)) {
      return a;
    }
    const ts = `?${this.get(_a.mtime)}` || "";
    const n = `${bootstrap().mfsRootUrl}avatar/${this.id}${ts}&type=${type}`;
    return n;
  }

}

let Host;
function f(opt) {
  if(Host) return Host;
  Host = new __core_site(opt);
  return Host;
};

module.exports = f;
