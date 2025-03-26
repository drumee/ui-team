class __drumee_iframe extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.parse = this.parse.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
    //templateName: _T.iframe.reader
    this.prototype.nativeClassName = "widget iframe-reader";
    this.prototype.figName = "drumee_iframe";
  
  
    this.prototype.template  = null;
  }

// ===========================================================
//
// ===========================================================
  initialize(opt){
    this.model.atLeast({
      source : _K.char.empty,  //"#{location.pathname}/html/iframe-maiden.html"
      option : 'allowfullscreen',
      border : 0,
      callbacks : _K.char.empty
    });

    this._id = _.uniqueId('iframe-');

    this.model.set({ 
      widgetId : this._id});

    return super.initialize(opt);
  }
    //@parse()
    
// ===========================================================
// parse
//
// ===========================================================
  parse() {
    let src = this.mget(_a.url) || this.model.get(_a.source);
    if (_.isEmpty(src)) {
      this.warn("NO SOURCE for IFRAME", this);
      return;
    }
    this.debug(`initialize src=${src} / '${this.model.get(_a.source)}'`, this);

    if (src.match(/<iframe(.+i)frame>/)) {
      src = src.replace(_K.tag.iframe, _K.tag.div);
      const el  = $(src)[0];
      src = el.getAttribute(_a.src);
      const height = el.getAttribute(_a.height);
      const width  = el.getAttribute(_a.width);
      const allow  = el.getAttribute(_a.allow) || el.getAttribute(_a.option);
      if (parseInt(height)) {
        this.style.set(_a.height, height);
      }
      if (parseInt(width)) {
        this.style.set(_a.width, width);
      }
      if (allow) {
        this.model.set(_a.allow, allow);
      }
    }
    //   protocol = src.replace(/^.+src=\"|:\/\/.+$/g, _K.char.empty)
    // else if src.match(/http.*:\/\//)
    //   protocol = src.replace(/^.+src=\"|:\/\/.+$/g, _K.char.empty)
    // else
    //   protocol = location.protocol.replace(/:/,_K.char.empty)
    const uri = src.replace(/^.+:\/\/|\" .+$/g, _K.char.empty);
    if (src.match(/^\/\//)) {
      src = src;
    } else {
      src = `https://${uri}`;
    }
    this.model.set(_a.source, src);
    // if(this.mget(_a.url))
    //   @model.set _a.source, this.mget(_a.url)
    if (_.isObject(this.model.get('callbacks'))) {
      let cb = '';
      const object = this.model.get('callbacks');
      for (var k in object) {
        var v = object[k];
        cb = `${k}=\"${v}()\" ${cb}`;
      }
      return this.model.set('callbacks', cb);
    }
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    const src = this.model.get(_a.url) || this.model.get(_a.source);
    this.debug(`Iframe.Designer src='${src}'`, _.isEmpty(src), this);
    if (_.isEmpty(src)) {
      this.$el.append(require('./template/placeholder')(this));
      this.debug("Iframe.Designer isEmpty", this);
    } else { 
      this.el.innerHTML = require('./template')(this);
    }

    const iframe = this.$el.find(`#${this._id}`);//[0]
    const f = ()=> {
      this.debug(`Iframe.Designer src='${src}'`, iframe);
      iframe.attr(_a.height, this.$el.height());
      iframe.attr(_a.width, this.$el.width());
      return iframe.attr(_a.allow, this.model.get(_a.allow));
    };
    this.waitElement(iframe[0], f);
    return this._iframe = iframe;
  }
}
__drumee_iframe.initClass();
module.exports = __drumee_iframe;
