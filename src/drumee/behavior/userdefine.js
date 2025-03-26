let __bhv_renderer;
!!!!DEPRECACTED(!!!!(__bhv_renderer = (function() {
  __bhv_renderer = class __bhv_renderer extends Marionette.Behavior {
    constructor(...args) {
      super(...args);
      this.onBeforeRender = this.onBeforeRender.bind(this);
      this.onDestroy = this.onDestroy.bind(this);
      this.onRender = this.onRender.bind(this);
      this._registerListeners = this._registerListeners.bind(this);
      this._registerTriggers = this._registerTriggers.bind(this);
      this._applyClass = this._applyClass.bind(this);
      this._run = this._run.bind(this);
      this.onUserClass = this.onUserClass.bind(this);
      this._forward = this._forward.bind(this);
      this._click = this._click.bind(this);
    }

    static initClass() {
    //   events:
    //     click: "_click"
    // 
      this.prototype.events =
        {click: "_click"};
    }
  // ============================================
  //
  // ============================================

  // ===========================================================
  // initialize
  //
  // ===========================================================
    initialize() {
      return this._className = this.view.className;
    }
  // ==================== *
  //
  // ==================== *

  // ===========================================================
  // onBeforeRender
  //
  // @return [Object] 
  //
  // ===========================================================
    onBeforeRender(){
      if ((this.view.model == null)) {
        return;
      }
      return this.view.extendFromModel([_a.template, _a.className]);
    }
      //_dbg ">>aaaa Behavior.UserDefine model", @view
  // ==================== *
  //
  // ==================== *

  // ===========================================================
  // onDestroy
  //
  // @return [Object] 
  //
  // ===========================================================
    onDestroy(){
      if (_.isEmpty(this._d_listeners)) {
        return;
      }
      //_dbg ">>aaaa  listen-to", @view.cid, @_d_listeners
      return Array.from(this._d_listeners).map((l) =>
        RADIO_BROADCAST.off(l, this._forward));
    }
  // ==================== *
  //
  // ==================== *

  // ===========================================================
  // onRender
  //
  // @return [Object] 
  //
  // ===========================================================
    onRender(){
      this.$el.addClass(this._className);
      if (this.view.get(_a.className)) {
        this.$el.addClass(this.view.get(_a.className));
      }
      if (this.view.get(_a.anchor) != null) {
        this.$el.attr(_a.data.anchor, this.view.get(_a.anchor));
      } else if (this.view.get(_a.justify) != null) {
        this.$el.attr(_a.data.justify, this.view.get(_a.justify));
      }
      const href = this.view.get(_a.href);
      if (href != null) {
        this.$el.attr(_a.href, href);
      }
      const dir  = this.view.get(_a.direction);
      const flow = this.view.get(_a.flow);
      if (dir != null) {
        this.$el.attr(_a.data.direction, dir);
      } else if (flow) {
        this.$el.attr(_a.data.flow, flow);
      }
      this.view.syncStyle();
      this._run();
      const usrAttr = this.view.get(_a.userAttributes);
      if ((usrAttr == null)) {
        return;
      }
      //_dbg ">123userAttributes=", usrAttr, @view.$el
      this.$el.attr(usrAttr);
      this._registerListeners(usrAttr);
      return this._registerTriggers(usrAttr);
    }
  // ============================
  //
  // ============================

  // ===========================================================
  // _registerListeners
  //
  // @param [Object] attr
  //
  // @return [Object] 
  //
  // ===========================================================
    _registerListeners(attr){
      const listeners  = attr['listen-to'];
      if ((listeners == null)) {
        return;
      }
      this._d_listeners = listeners.split(_USING.regexp.comma);
      if (_.isEmpty(this._d_listeners)) {
        return;
      }
      return Array.from(this._d_listeners).map((l) =>
        //_dbg ">>aaaa  listen-to #{l}", @view.cid, l
        RADIO_BROADCAST.on(l, this._forward));
    }
  // ============================
  //
  // ============================

  // ===========================================================
  // _registerTriggers
  //
  // @param [Object] attr
  //
  // @return [Object] 
  //
  // ===========================================================
    _registerTriggers(attr){
      //_dbg ">>aaaa  _registerEvents", attr, @view.cid
      let triggers  = attr['on-click'];
      if ((triggers == null)) {
        return;
      }
      triggers = triggers.replace(/\ *\),\ */g, ')|');
      triggers = triggers.split(_USING.char.pipe);
      this._triggers = [];
      return (() => {
        const result = [];
        for (var event of Array.from(triggers)) {
          if (event.length >0) {
            var a = event.split(_USING.regexp.bracket);
            if (a != null) {
              var _instr = [];
              var o =
                {signal : a[0]};
              if (a[1] != null) {
                o.args = a[1].split(/\ *,\ */);
              }
              result.push(this._triggers.push(o));
            } else {
              result.push(this.warn("Syntax error, expect channel(arguments)"));
            }
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
      //_dbg ">>aaaa  _registered", @view.cid, @_triggers
  // ==================== *
  //
  // ==================== *

  // ===========================================================
  // _applyClass
  //
  // @param [Object] custom
  //
  // ===========================================================
    _applyClass(custom){
      return (() => {
        const result = [];
        for (var c of Array.from(custom)) {
          if (c.children != null) {
            this.$el.children().removeClass();
            result.push(this.$el.children().addClass(c.children));
          } else if (c.self != null) {
            this.$el.removeClass();
            result.push(this.$el.addClass(`${this.view.className} ${c.self}`));
          } else {
            var selector = _.keys(c)[0];
            var _class   = _.values(c)[0];
            this.$el.find(selector).removeClass();
            result.push(this.$el.find(selector).addClass(`${selector} ${_class}`));
          }
        }
        return result;
      })();
    }
  // ==================== *
  //
  // ==================== *

  // ===========================================================
  // _run
  //
  // @return [Object] 
  //
  // ===========================================================
    _run(){
      const userClass = this.view.get(_a.userClass);
      if ((userClass == null) || !_.isString(userClass)) {
        return;
      }
      if (userClass.match(_USING.regexp.arrow)) {
        const uclass = this._parse(userClass);
        return this._applyClass(uclass);
      } else {
        this.$el.removeClass();
        return this.$el.addClass(`${this.view.className} ${userClass}`);
      }
    }
  // ==================== *
  //
  // ==================== *

  // ===========================================================
  // onUserClass
  //
  // @param [Object] args
  //
  // ===========================================================
    onUserClass(args){
      //_dbg ">>aaaa", @view.className, args
      if ((args != null) && _.isString(args)) {
        this.view.model.set(_a.userClass, args);
        return this._run();
      } else {
        this.view.model.unset(_a.userClass);
        this.$el.removeClass();
        return this.$el.addClass(this.view.className);
      }
    }
  // ============================
  //
  // ============================

  // ===========================================================
  // _forward
  //
  // @param [Object] trigger
  //
  // @return [Object] 
  //
  // ===========================================================
    _forward(trigger){
      //_dbg ">>aaaa -- forwarding...",  @view.cid, trigger
      if (((trigger != null ? trigger.signal : undefined) == null) || (this._d_listeners == null)) {
        return;
      }
      const signal = trigger.signal.replace(/^.+[>!+]/, `${_a.user}:`);
      //_dbg ">>aaaa forwarding *#{trigger.signal}* -> #{signal}", @view.cid,  trigger
      return this.view.triggerMethod(signal, trigger);
    }
  // ============================
  //
  // ============================

  // ===========================================================
  // _click
  //
  // @param [Object] e
  //
  // @return [Object] 
  //
  // ===========================================================
    _click(e){
      if (_.isEmpty(this._triggers) || router.designing) {
        //_dbg ">>aaaa EMPTY ", @_triggers
        return;
      }
      e.stopPropagation();
      //_dbg ">>aaaa _click ", @_triggers
      return (() => {
        const result = [];
        for (var trigger of Array.from(this._triggers)) {
          trigger.src = this.view;
          _dbg(`>>aaaa triggering *${trigger.signal}*`, trigger, this.view.cid);
          result.push(RADIO_BROADCAST.trigger(trigger.signal, trigger));
        }
        return result;
      })();
    }
  };
  __bhv_renderer.initClass();
  return __bhv_renderer;
})())
);
module.exports = __bhv_renderer;
