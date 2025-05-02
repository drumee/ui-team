


const { TweenLite } = require("gsap/all");
// ====================================== *
// gateway
// ====================================== *
class __lib_page extends LetcBox {

  constructor(...args) {
    super(...args);
    this.renderContent = this.renderContent.bind(this);
    this._responsive = this._responsive.bind(this);
    this.getScaleOpt = this.getScaleOpt.bind(this);
    this._display = this._display.bind(this);
  }

  /**
   * 
   * @returns 
   */
  url(){
    let url;
    if(this.mget(_a.src)) return this.mget(_a.src);
    if(this.mget(_a.url)) return this.mget(_a.url);
    if (this.mget(_a.path)) {
      url = `/-/${bootstrap().instance_name}/${this.mget(_a.path)}`;
    } else { 
      url = `/letc/${this.mget(_a.nid)}/${this.mget(_a.hub_id)}`;
    }
    if (this.mget(_a.vhost)) {
      if(this.mget(_a.path)){
        url = this.mget(_a.path);
      }else{
        url = `${this.mget(_a.vhost)}/${url}`;
      } 
      if (!/^http/.test(url)) {
        url = `https://${this.mget(_a.vhost)}/${url}`;
      }
    }
    return url; 
  }

  /**
   * 
   */
  onDomRefresh(){
    this.fetch(this.url()).then((data)=>{
      this.debug("AAA:23", data);
      this.feed(data);
    })
  }

 
// ===========================================================
//
// ===========================================================
  // load: (name) =>
  //   if name.match(/^http/)
  //     url = name.replace(/(\#!|\#)/, _K.url.page_path)
  //   else 
  //     url = _K.url.page_path + name.replace(/^(\#!|\#)/, _K.char.empty)
  //   o = Visitor.parseLocation()
  //   o = 
  //     device : o.device   || Visitor.device()
  //     lang   : o.pagelang || Visitor.pagelang()
  //   url = url + "?pagelang=#{o.lang}&device=#{o.device}"
  //   if Settings.get(_a.cache_control) is _a.no_cache
  //     url = url + "&a=#{Utils.timestamp()}"
  //   Utils.fetch(url, @_renderContent.bind(@))
    // url = encodeURI(url)
    // ajax = new XMLHttpRequest()
    // ajax.allowCORS(ajax, url)
    // ajax.open("GET", url, true)
    // ajax.send()
    // ajax.onload = ()=>
    //   json = JSON.parse(ajax.responseText)
    //   @_renderContent json

// ===========================================================
//
// ===========================================================
  renderContent(letc) {
    this.debug("AAAAAAAAAA XX ", letc, this);
    const meta = letc.meta || letc;
    this._width  = letc.width || meta.buildOpt.width;
    this._height = letc.height || meta.buildOpt.height;
    const scale   =  this.el.innerWidth()/this._width;
    //scaleY   =  @el.innerHeight()/@_height
    this.feed(Skeletons.Box.Y({
      styleOpt : {
        width  : this._width,
        height : this._height
      },

      kids: letc.kids
    })
    ); 

    const wrapper = this.children.last();
    const opt = { 
      transformOrigin : "0% 0%",
      scale
    };
    TweenLite.set(wrapper.$el, opt);
    return this.$el.height(this._height*scale);
  }

// ===========================================================
// _responsive
//
// ===========================================================
  _responsive() {}


// ===========================================================
// getScaleOpt
//
// @param [Object] meta
//
// @return [Object]
//
// ===========================================================
  getScaleOpt(meta) { 
    const opt =
      {scale: 1};
    if (Utils.isMobile() && (Settings.get(_a.responsive) === _a.custom)) {
      return opt; 
    }
    if (meta != null ? meta.buildOpt : undefined) {
      //width =  ~~ (1280 - (window.outerWidth - window.innerWidth))
      const d = (window.outerWidth - window.innerWidth);
      opt.scale = window.innerWidth/(1280+d);
      opt.width =  Utils.px(1280);
    }
    Env.set(opt);
    return opt;
  }

// ===========================================================
// _display
//
// @param [Object] block
// @param [Object] target
//
// @return [Object]
//
// ===========================================================
  _display(block, target) {

    let dont_scale, pn, res, wrapper;
    const device = block.device || _a.desktop;
    block.className = block.className || '';
    block.className = block.className + ` creator__page creator__page--${device}`;
    block.dataset   = block.dataset || {};
    block.dataset.device = device;
    
    if (device === _a.mobile) {
      dont_scale = 1;
    }
    console.info(`RENDERING PAGE width device=${device}`);
    //base_width = 520
    if (block.meta != null) {
      this._curentBlock = block;
      this._curentTarget = target;
    }
    if (target != null) {
      wrapper = this.getPart(target, _a.usr);
      const state = hist_log.shift() || '#';
      this.debug(`_display state GOT =${state}`);
      history.replaceState({}, "", state);
      if (wrapper != null) {
        this.debug(`_display target GOT =${target}`);
        wrapper.feed(block);
      }
      return;
    }

    if (_.isArray(block)) {
      target = block[0].wrapper;
    } else {
      target = block.wrapper;
    }
    try {
      wrapper = target.split(/[@\/:]/);
      pn      = wrapper[0] || _a.content;
      const section = wrapper[1] || _a.sys;
      wrapper = this.getPart(pn, section);
      //@debug "_display target NO", wrapper
    } catch (error) {
      wrapper = this.getPart(_PN.content, _a.sys); //@getPart(_a.content)
    }
      //@debug "_display target DEFAUK", wrapper
    if ((wrapper == null)) {
      _c.error(_WARN.element.not_found.format(pn));
      return;
    }
    wrapper.clear();
    const meta = block.meta || {};
    this.debug("_display METATTTTTT", block.buildOpt, meta.buildOpt);
    this._meta = meta;
    let opt =
      {scale:1};
    this._parent.$el.attr('data-responsive', meta.responsive);
    switch (meta.responsive) {
      case "manual": case "css-based":
        res  = meta.responsive;
        dont_scale = 1;
        break;
      case "hybrid":
        var threshold = meta.threshold || meta.buildOpt.width;
        this.debug(`threshold====${threshold}`);
        if (parseInt(threshold) && (window.innerWidth < parseInt(threshold))) {
          opt = this.getScaleOpt(meta);
          res  = meta.responsive;
          this.debug(`threshold==== 111111 ${threshold}`);
        } else {
          this.debug(`threshold==== 222222 ${threshold}`);
          res  = localStorage.responsive || _a.auto;
          this._parent.$el.attr('data-responsive', _a.auto);
        }
        dont_scale = 1;
        break;
      default:
        res  = _a.auto;
        opt = this.getScaleOpt(meta);
    }
    this.debug("_display META", meta, res);
    this._parent.$el.attr('data-responsive', res);
    const start = Utils.timestamp();
    this.debug(`Chrono : Page renedring start time=${start}`);
    const data = Type.splitFixed(block);
    wrapper.feed(data.normal);
    if (dont_scale) {
      return;
    }
    if (!_.isEmpty(data.fixed)) {
      this.getPart('fixed-box').feed(data.fixed);
    }
    const inner = wrapper.children.findByIndex(0);
    const f = ()=> {
      let anchor;
      opt.transformOrigin = "0% 0%";
      const w =  1280 - (window.outerWidth - window.innerWidth);
      const scale = w/window.innerWidth; //window.outerWidth - window.innerWidth
      if (scale < 1) {
        //opt.width = "1280px"
        //opt.scale = scale
        TweenLite.set(wrapper.$el, opt);
      } else {
        //opt.scale = scale
        //opt.width = "1280px"
        TweenLite.set(wrapper.$el, {scale:1, width:"100%"});
        TweenLite.set(inner.$el, opt);
      }
      const stop = Utils.timestamp();
      this.debug(`Chrono :Page renedring stop time=${stop}`, stop - start);
      return anchor = Utils.getAnchor();
    };

    return Utils.waitForEl(inner.el, f);
  }
}



module.exports = __lib_page;
