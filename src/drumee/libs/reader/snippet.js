const _defauldClass = "snippet-loader";

//-------------------------------------
class __snippet extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._start = this._start.bind(this);
  }

  static initClass() {
    this.prototype.nativeClassName  = _defauldClass;
  }

    initialize(opt) {
    this.debug("AAAAA", this);
    this._id = _.uniqueId();
    super.initialize(opt);
    return this.buildGuestEnv();
  }

// ===========================================================
// loadVendor
//
// @param [Object] opt
//
// ===========================================================
  loadVendor(tagName, opt, cb) {
    const ajax = new XMLHttpRequest();
    const url  = opt.href || opt.src || opt.url;
    ajax.open("GET", url, true);
    ajax.send();
    this.debug(`RZRZEZEZEZE tag =${tagName}`);
    ajax.onload = function(e) {
      if ([_a.script, _a.style, _a.link].includes(tagName)) {
        const el = document.createElement(tagName);
        for (var k in opt) { 
          var v = opt[k];
          el.setAttribute(k, v);
        }
        const item = document.head.appendChild(el);
        if (_.isFunction(cb)) {
          return this.waitElement(item, cb);
        }
      }
    };
    return null;
  }

// ===========================================================
// loadSnippet
//
// @param [Object] opt
//
// ===========================================================
  loadSnippet(tagName, opt, cb) {
    const ajax = new XMLHttpRequest();
    const url  = opt.href || opt.src || opt.url;
    ajax.open("GET", url, true);
    ajax.send();
    ajax.onloadend = function(e) {
      if ([_a.script, _a.style, _a.link].includes(tagName)) {
        let id = opt.id || Host.get(_a.id);
        id = `--${tagName}-${id}`;
        let el = document.getElementById(id);
        if (el != null) {
            document.body.removeChild(e);
          }
        el = document.createElement(tagName);
        el.setAttribute('charset', "utf-8");
        if (k === _a.style) {     
          el.setAttribute(_a.text, 'text/css');
        } else {
          el.setAttribute(_a.text, 'text/javascript');
        }

        for (var k in opt) { 
          var v = opt[k];
          el.setAttribute(k, v);
        }
        //el.setAttribute('async', "")

        el.innerHTML = ajax.responseText;
        document.body.appendChild(el);

        if (_.isFunction(cb)) {
          return cb();
        }
      }
    };
    return null;
  }


// ===========================================================
// loadSnippet
//
// @param [Object] opt
//
// ===========================================================
  // loadSnippet: (tagName, opt, cb) ->
  //   if not tagName in [_a.script, _a.style, _a.link]
  //     return 
  //   # ajax = new XMLHttpRequest()
  //   #   headers: {
  //   #     "x-requested-with": "xhr" 
  //   #   }
  //   url  = opt.href || opt.src || opt.url
  //   # if Loader.get url
  //   #   if _.isFunction cb
  //   #     cb()
  //   #   return
  //   #ajax.open("GET", url, true)
  //   #ajax.send()
      
  //   onload = (e) ->
  //     id = opt.id || Host.get(_a.id)
  //     id = "--#{tagName}-#{id}"
  //     el = document.getElementById(id)
  //     if el?
  //         document.body.removeChild(e)
  //     el = document.createElement(tagName)
  //     el.setAttribute('charset', "utf-8")
  //     if k is _a.style     
  //       el.setAttribute(_a.text, 'text/css')
  //     else
  //       el.setAttribute(_a.text, 'text/javascript')

  //     for k,v of opt 
  //       el.setAttribute(k, v)
  //     el.setAttribute('async', "")

  //     el.innerHTML = ajax.responseText
  //     if k is _a.style
  //       document.body.appendChild el
  //     else
  //       document.head.appendChild el
  //     Loader.set url, 1
  //     if _.isFunction cb
  //       cb()
  //   onfailed = (jqXHR, textStatus) =>
  //     console.error(textStatus)
  //   opt = 
  //     url: url
  //     method: "GET",
  //     dataType: "json",
  //     headers: 
  //       "x-requested-with": "xhr" 
  //   $.ajax(opt).done(onload).fail(onfailed)
  //   return null

// ===========================================================
// buildGuestEnv
//
// @param [Object] opt
//
// ===========================================================
  buildGuestEnv() {
    let k, opt, v;
    let count      = 1;
    this.debug("RZRZEZEZEZE", this, count);
    const vendors    = this.mget(_a.vendors)  || this.mget(_a.vendorOpt) || [];
    const snippets   = this.mget(_a.snippets) || [];
    const src        = this.mget(_a.src)      || this.mget(_a.creator); 

    const f = ()=> {
      return this._countdown();
    };

    if (src != null) {
      count++;
      opt = { 
        src,
        crossorigin : ""
      };
      this.loadVendor(_a.script, opt, f);
    }

    for (opt of Array.from(vendors)) { 
      count++;
      for (k in opt) {
        v = opt[k];
        this.loadVendor(k, v, f);
      }
    }
          
    for (opt of Array.from(snippets)) { 
      count++;
      for (k in opt) {
        v = opt[k];
        try {
          this.loadSnippet(k, v, f);
        } catch (e) { 
          this.warn(`FAILED TO LOAD ${k} with options`, v);
          this.warn("STACK --->", e);
          f();
        }
      }
    }
    return this._countdown = _.after(count, this._start);
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.el.setAttribute(_a.id, this._id);
    this.feed({kind: 'spinner'}); //Skeletons.Note "Loading...", "drumee-spinner"
    const f = ()=> {
      return this._countdown();
    };
    return _.delay(f, 800); 
  }
// ===========================================================
// _start
//
// ===========================================================
  _start() {
    this.debug("STARTING 195");
    return this.triggerMethod(_e.start);
  }
}
__snippet.initClass();

module.exports = __snippet;
