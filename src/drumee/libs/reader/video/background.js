class __video_background extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.initialize = this.initialize.bind(this);
    this.onRender = this.onRender.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.play = this.play.bind(this);
    this._mouseenter = this._mouseenter.bind(this);
    this._mouseleave = this._mouseleave.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "vdo-bg fill-up margin-auto";
    this.prototype.tagName  = 'video';
    this.prototype.events  = {
      mouseenter : '_mouseenter',
      mouseleave : '_mouseleave',
      click      : 'play'
    };
  }

// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    super.initialize();
    return this.model.atLeast({
      autobuffer : 'autobuffer',
      autoplay   : 'true',
      preload    : 'auto',
      loop       : 'true'
    });
  }

// ==================================================================== *
//
// ==================================================================== *

// ===========================================================
//
// ===========================================================
  onRender() {
    super.onRender();
    this._flow = _a.layer._;
    if ((this.model == null)) {
      return;
    }
    return this._renderVideo();
  }

// ===========================================================
//
// ===========================================================
  onDomRefresh() {
    //@debug "aaaa 69", @
    return this.waitElement(this.el, ()=> {
      if (this.mget(_a.rate) != null) {
        this.el.playbackRate = this.mget(_a.rate);
      }

      const promise = this.el.play();
      
      if (promise) {
        return this.debug("DOOOO");
      } else {
        this.debug("DAAAAAAA");
        return this.$el.append("<div>click</div>");
      }
    });
  }

// ===========================================================
// _renderVideo
//
// ===========================================================
  _renderVideo(){
    const nid = this.model.get(_a.nodeId);
    const oid = this.model.get(_a.ownerId);
    const object = this.model.toJSON();
    for (var k in object) {
      var v = object[k];
      if (k.match(/loop|autoplay|autobuffer|muted|preload/)) {
        this.el.setAttribute(k, v); 
      }
    }
        //@el[k]=v
    const mfsRoot = bootstrap().mfsRootUrl;
    if (oid != null) {
      return this.$el.attr({
        src : `${mfsRoot}/file/video/${nid}/${oid}&ext.mp4`, //require('options/url/file', _a.video) + '.mp4'
        img : `${mfsRoot}/file/slide/${nid}/${oid}`
      }); //require('options/url/file', _a.card)
    } else { 
      return this.$el.attr({
        src : `${mfsRoot}/file/video/${nid}&ext.mp4`, //require('options/url/file', _a.video  ) + '.mp4'
        img : `${mfsRoot}/file/slide/${nid}`
      }); //require('options/url/file', _a.card)
    }
  }



 
// ============================
//
// ============================
  play(){
    return this.$el.trigger(_e.play);
  }

// ===========================================================
// _mouseenter
//
// ===========================================================
  _mouseenter(){
    if (this.mget('autoplay')) {
      return this.$el.trigger(_e.play);
    }
  }

// ============================
//
// ============================

// ===========================================================
// _mouseleave
//
// ===========================================================
  _mouseleave(){
    if (this.mget('autoplay') === 'autopause') {
      return this.$el.trigger('pause');
    }
  }
}
__video_background.initClass();

module.exports = __video_background;
