
const { TweenMax, TimelineMax } = require("gsap/all");


/**
 * 
 * @param {*} p 
 * @returns 
 */
Backbone.View.prototype.mget = function(p) {
  return this.model.get(p);
};


Backbone.View.prototype.getAttr = function() {
  data = this.model.toJSON();
  delete data.kind;
  delete data.widgetId;
  delete data.uiHandler;
  delete data.partHander;
  return data;
}


/**
 * 
 * @param {*} k 
 * @param {*} v 
 * @param {*} o 
 * @returns 
 */
Backbone.View.prototype.mset = function(k, v, o) {
  return this.model.set(k, v, o);
};


/**
 * 
 * @param {*} p 
 * @returns 
 */
Backbone.View.prototype.get = function(p) {
  if (_.isString(p)) {
    if ((this.model != null ? this.model.get(p) : undefined) != null) {
      return this.model.get(p);
    }
    return this.getOption(p);
  }
  return null;
};


/**
 * 
 * @param {*} duration 
 * @param {*} anim 
 * @param {*} cb 
 * @returns 
 */
Backbone.View.prototype.softDestroy = function(duration, anim, cb) {
  if (duration == null) { duration = 0.5; }
  anim = anim || {autoAlpha:0, scale:0.3};
  return this.selfDestroy({duration, callback:cb, timeout:20}, anim);
};


/**
 * 
 * @param {*} args 
 * @param {*} anim 
 */
Backbone.View.prototype.goodbye = function(args={duration:0.5, timeout:2}, anim) {
  this.selfDestroy(args, anim);
};

/**
 * 
 * @param {*} o 
 * @param {*} a 
 * @returns 
 */
Backbone.View.prototype.selfDestroy = function(o={}, a={}) {
  o = {duration:0.5, timeout:2000, ...o}; 
  this.stopping = 1;
  const _fire = ()=> {
    this.destroy();
    try {
      this.parent.collection.remove(this.model, {silent:true});
      this.parent.triggerMethod(_e.removeChild, this);
      this.parent.trigger(_e.removeChild, this);
      this.undelegateEvents();
    } catch (e) { 
    }
    this.stopping = 0; 
    if (_.isFunction(o.callback)) { 
      o.callback(o.args); 
    }
    this.triggerMethod(_e.destroy);
    this.trigger(_e.destroy);
  };

  if (o.now) {
    _fire();
    return;
  }

  const timeout  = o.timeout  || Visitor.timeout();
  const go = ()=> {
    const {
      duration
    } = o;
    const trigger  = o.trigger  || this.mget(_a.trigger);
    let anim     = null; 
    if (trigger && typeof trigger.isDestroyed === "function" && !trigger.isDestroyed()) {
      anim = { 
        left  : trigger.$el.offset().left - this.parent.$el.offset().left,
        top   : trigger.$el.offset().top - this.parent.$el.offset().top
      };
      TweenMax.set(this.$el, {transformOrigin:"0 0"});
    }
      
    anim = {autoAlpha:0, scale:0.2, ...anim, ...a};

    const tl = new TimelineMax({onComplete: _fire});
    return tl.to(this.$el, duration, anim);
  };
  return _.delay(go, timeout);
};


/**
 * 
 * @param {*} map 
 * @returns 
 */
Backbone.View.prototype.highlight = map => console.warn("highlight DEPRCATED use extraClassName instead");

/**
 * 
 * @param {*} data 
 * @param {*} use_bg 
 * @param {*} target 
 * @returns 
 */
Backbone.View.prototype.renderVector=function(data, use_bg, target) {
  if (!data.responseText) {
    throw("No data to render");
  }  
  let h, w;
  if (use_bg == null) { use_bg = false; }
  if ((target != null) && _.isFunction(target.replaceWith)) {
    target = target;
  } else if (_.isString(target)) {
    target = document.getElementById(target);
  } else if (this.$icon && this.$icon[0] != null) {
    target = this.$icon[0];
  } else { 
    target = this.el; 
  }
  if (this.icon != null) {
    w = this.icon.get(_a.width); 
    h = this.icon.get(_a.height);
  } else {  
    w = this.style.get(_a.width)  || _K.size.full; 
    h = this.style.get(_a.height) || _K.size.full; 
  }
  if (/^</.test(data.responseText)) {
    for (let el of Array.from($(data.response))) {
      if ((el != null) && (el.tagName === _K.tag.svg)) {
        var h_done, w_done;
        try { 
          if (w.match(/^\d\w/)) {
            el.style.width = w; 
            w_done = 1;
          }
          if (h.match(/^\d\w/)) {
            el.style.height = h; 
            h_done = 1;
          }
        } catch (error) {}
        if (!w_done || !h_done) { //else 
          w = this.$el.width();
          h = this.$el.height();
          el.style.width  =  w.px();
          el.style.height =  h.px();
        }
        el.setAttribute(_a.id, `icon-${this._id}`);
        if (target != null) {
          target.replaceWith(el);
        }
        this.$icon = this.$el.find(`#icon-${this._id}`) || this.$el.find("svg");
        return true;
      }
    }
  }
  return false; 
};

/**
 * 
 */
Backbone.View.prototype.anim=function() {
    const args = Array.prototype.slice.call(arguments);
    const tl = new TimelineMax();
    for (let a of Array.from(args)) { 
      if (_.isArray(a)) { 
        tl.to(this.$el, a[0], a[1]);
      }
    }
  };

/**
 * 
 * @param {*} callback 
 * @returns 
 */
Backbone.View.prototype.exec=function(callback) {
  if (_.isEmpty(callback)) {
    return false;
  }

  if (callback.match(/^\#.+/)) {
    location.hash = callback;
  } else {
    let msg;
    const code = callback.match(/<exec.*>(.*)<\/exec>/);
    try {
      eval(code[1]);
      return true;
    } catch (e) {
      if ((code != null ? code[1] : undefined) != null) {
        msg = code[1];
      } else {
        msg = callback;
      }
      RADIO_BROADCAST.trigger(_e.error, `Failed to execute <b>${msg}</b>`);
    }
  }
  return true;
};

/**
 * 
 */
Backbone.View.prototype.spinner=function(state, timeout, cb) {
  const d = document.getElementById(this._id + '-loading-wrapper');
  if (state) {
    if (timeout) {
      this._spinTimer = _.delay(() => { 
        if(cb){
          cb(this, state);
        }else if(_.isFunction(this.wait)){
          this.wait(state, 0)
        }
      }, timeout);
      return;
    }
    if (d) {
      return;
    }
    let c = this.content || this;
    c.$el.append(require('./template/spinner')(this));
  } else {
    clearTimeout(this._spinTimer)
    if (d) d.remove();
  }
}

/**
 * 
 * @param {*} xhr 
 */
Backbone.View.prototype.onServerComplain = function (xhr) {
  this.warn("[ERROR:253] SERVER COMPLAINED", xhr);
  this.trigger('server:error', xhr);
}
