class __bhv_responsive extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this.onParseEnd = this.onParseEnd.bind(this);
    this._register = this._register.bind(this);
    this._run = this._run.bind(this);
    this._isMobile = this._isMobile.bind(this);
    this._inRange = this._inRange.bind(this);
    this._atThreshold = this._atThreshold.bind(this);
    this.userClass = this.userClass.bind(this);
    this.addClass = this.addClass.bind(this);
    this.removeClass = this.removeClass.bind(this);
    this.self = this.self.bind(this);
    this.children = this.children.bind(this);
    this.selector = this.selector.bind(this);
    this.flow = this.flow.bind(this);
    this._property = this._property.bind(this);
    this._size = this._size.bind(this);
    this.height = this.height.bind(this);
    this.width = this.width.bind(this);
    this.hide = this.hide.bind(this);
    this.show = this.show.bind(this);
    this._default = this._default.bind(this);
  }

  onRender(){
    let responsive = this.view.get(_a.responsive);
    if ((responsive == null)) {
      this._default();
      return;
    }
    this._range = [];
    this._threshold = [];
    //_dbg "onDomRefresh UUUU responsive string", responsive
    responsive = this._parse(responsive);
    return this._register(responsive);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// onParseEnd
//
// ===========================================================
  onParseEnd() {
    const width = $(window).width();
    //_dbg ">>aaaa onDomRefresh UUUUUUUUUU width=#{width}", window.innerWidth
    this.debug("REEEEEEEEEEEE UUUUUUUUUU");
    return RADIO_BROADCAST.trigger(_e.responsive, width);
  }

// ==================== *
// Register triggers conditions
// ==================== *

// ===========================================================
// _register
//
// @param [Object] args
//
// ===========================================================
  _register(args){
    //_dbg ">>aaaa UUUU _register args=", args
    //if Visitor.isMobile()
    //  RADIO_BROADCAST.on _e.responsive, @_isMobile
    for (var a of Array.from(args)) {
      try {
        a.when.trim();
        a.when = a.when.replace(_USING.regexp.specials, _K.string.empty);
        if (a.when.match(/\d+ *: *\d+$/)) {
          if (_.isEmpty(this._range)) {
            //_dbg ">>aaaa _registering UUUUUUUUUU _range"
            RADIO_BROADCAST.on(_e.responsive, this._inRange);
          }
          a.width = a.when.split(_USING.regexp.colon);
          this._range.push(a);
        } else if (a.when.match(/^[=<>] *\d+$/)) {
          if (_.isEmpty(this._threshold)) {
            //_dbg ">>aaaa _registering UUUUUUUUUU _threshold"
            RADIO_BROADCAST.on(_e.responsive, this._atThreshold);
          }
          var w = a.when.split(/^[=<>] */);
          a.width = w[1];
          a.comparator = a.when[0];
          this._threshold.push(a);
        } else if (!_.isEmpty(a)) {
          this.warn("_register : ", WARNING.arguments.mal_formed, a);
        }
      } catch (err) {
          this.warn("_register : ", WARNING.arguments.mal_formed, a);
        }
    }
    return this.triggerMethod("parse:end");
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _run
//
// @param [Object] stmt
//
// ===========================================================
  _run(stmt){
    return (() => {
      const result = [];
      for (var func in stmt) {
        var args = stmt[func];
        switch (func) {
          case _a.self: case _a.children: case _a.selector:
            if (_.isEmpty(args)) {
              result.push(this.warn(WARNING.arguments.recommanded, `method = ${func}`));
            } else {
              result.push(this[func](args));
            }
            break;
          default:
            result.push(undefined);
        }
      }
      return result;
    })();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _isMobile
//
// @param [Object] width
//
// ===========================================================
  _isMobile(width){
    return Array.from(this._range).map((r) =>
      this._run(r));
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _inRange
//
// @param [Object] width
//
// ===========================================================
  _inRange(width){
    //_dbg ">>aaaa _inRange UUUUUUUUUU width=#{width}"
    return (() => {
      const result = [];
      for (var r of Array.from(this._range)) {
        if ((width >= r.width[0]) && (width <= r.width[1])) {
          result.push(this._run(r));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _atThreshold
//
// @param [Object] width
//
// ===========================================================
  _atThreshold(width){
    return (() => {
      const result = [];
      for (var r of Array.from(this._threshold)) {
        var comp = r.comparator;
        if (comp === '=') {
          comp = '==';
        }
        var exp = `${width} ${comp} ${r.width}`;
        //_dbg "Threshold => #{exp}"
        if (eval(exp)) {
          result.push(this._run(r));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// userClass
//
// @param [Object] klass
// @param [Object] target
//
// ===========================================================
  userClass(klass, target){
    return this.addClass(klass, target);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// addClass
//
// @param [Object] klass
// @param [Object] target=_a.self
//
// ===========================================================
  addClass(klass, target){
    if (target == null) { target = _a.self; }
    switch (target) {
      case _a.self:
        return this.$el.addClass(klass);
      case _a.children:
        return this.view.children.forEach(child=> {
          return child.$el.addClass(klass);
        });
      default:
        return this.$el.find(target).addClass(klass);
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// removeClass
//
// @param [Object] klass
// @param [Object] target=_a.self
//
// ===========================================================
  removeClass(klass, target){
    if (target == null) { target = _a.self; }
    switch (target) {
      case _a.self:
        return this.$el.removeClass(klass);
      case _a.children:
        return this.view.children.forEach(child=> {
          return child.$el.removeClass(klass);
        });
      default:
        return this.$el.find(target).removeClass(klass);
    }
  }
// ======================================================
// self => responsive_method:arg,  property:value; ...
// ======================================================

// ===========================================================
// self
//
// @param [Object] opt
//
// ===========================================================
  self(opt){
    let args = opt.trim();
    args = args.split(_USING.regexp.semiColon);  // make pairs {property:value}
    return (() => {
      const result = [];
      for (var arg of Array.from(args)) {
        var a = arg.split(_USING.regexp.colon);
        var method = a[0];
        if (_.isFunction(this[method])) {
          result.push(this[method](a[1], _a.self));
        } else {
          result.push(this._property(a, _a.self));
        }
      }
      return result;
    })();
  }
// ======================================================
// children => responsive_method:arg,  property:value; ...
// ======================================================

// ===========================================================
// children
//
// @param [Object] opt
//
// ===========================================================
  children(opt){
    let args = opt.trim();
    args = args.split(_USING.regexp.semiColon);
    //_dbg ">>>YYYaaaa children", args
    return (() => {
      const result = [];
      for (var arg of Array.from(args)) {
        var a = arg.split(_USING.regexp.colon);
        var method = a[0];
        if (_.isFunction(this[method])) {
          result.push(this[method](a[1], _a.children));
        } else {
          result.push(this._property(a, _a.children));
        }
      }
      return result;
    })();
  }
// ======================================================
// selector => css_selector @ property:value; ...
// ======================================================

// ===========================================================
// selector
//
// @param [Object] opt
//
// ===========================================================
  selector(opt){
    let args = opt.split(/\ *@\ */);
    const selector = args[0].trim();
    const list     = args[1].trim();
    args = list.split(_USING.regexp.semiColon);
    return (() => {
      const result = [];
      for (var arg of Array.from(args)) {
        var a = arg.split(_USING.regexp.colon);
        result.push(this._property(a, selector));
      }
      return result;
    })();
  }
// ======================================================
//
// ======================================================

// ===========================================================
// flow
//
// @param [Object] direction
// @param [Object] target=_a.self
//
// ===========================================================
  flow(direction, target){
    //_dbg ">>aaaa applying flow  #{direction} to #{target}"
    if (target == null) { target = _a.self; }
    switch (target) {
      case _a.self:
        return this.$el.attr(_a.data.flow, direction);
        //@view.changeFlow(direction)
      case _a.children:
        return this.view.children.forEach(child=> {
          return child.$el.attr(_a.data.flow, direction);
        });
          //child.changeFlow(direction)
      default:
        return this.warn("Wrong target ", target);
    }
  }
// ======================================================
// all available css property
// ======================================================

// ===========================================================
// _property
//
// @param [Object] args
// @param [Object] target=_a.self
//
// @return [Object] 
//
// ===========================================================
  _property(args, target){
    if (target == null) { target = _a.self; }
    if (args.length < 2) {
      return;
    }
    //_dbg ">>>YYYaaaa _property : applying  #{args[0]}: #{args[1]} to #{target}"
    switch (target) {
      case _a.self:
        return this.$el.css(args[0], args[1]);
      case _a.children:
        return this.view.children.forEach(child=> {
          //_dbg ">>YYYYaaaa"
          let value;
          if (args[1].match(/\ *(reset)\ */i)) {
            const styleOpt = child.model.get(_a.styleOpt);
            value = styleOpt[args[0]];
          } else {
            value = args[1];
          }
          return child.$el.css(args[0], value);
        });
      default:
        return this.warn("Invalid target");
    }
  }
        //if args[1].match(/\ *(reset)\ */i)
        //  styleOpt = @model.get _a.styleOpt
        //  value = styleOpt[args[0]]
        //else
        //  value = args[1]
        //@$el.find(target).css args[0], value
// ======================================================
// width | height : auto | xx | xx% | preserve
// ======================================================

// ===========================================================
// _size
//
// @param [Object] size
// @param [Object] target=_a.self
// @param [Object] attr
//
// @return [Object] 
//
// ===========================================================
  _size(size, target, attr){
    //_dbg ">>>bbbb setiing #{attr} to #{target}", size
    let min, styleOpt;
    if (target == null) { target = _a.self; }
    if (size.length < 2) {
      this.warn("_size : ", WARNING.arguments.mal_formed, size);
      return;
    }
    if (size.match(/0*\.\d+/)) {
      size = parseInt(size[1] * window.innerWidth);
      size = `${size}px`;
    }
    const preserve = size.match(/\ *(preserve)\ */i);
    const reset = size.match(/\ *(reset)\ */i);
    switch (target) {
      case _a.self:
        if (preserve) {
          min = this.$el.css(attr);
          this.$el.css(`min-${attr}`, min);
          size = _a.auto;
        }
        if (reset) {
          styleOpt = this.view.model.get(_a.styleOpt);
          size = styleOpt[attr];
        }
        return this.$el.css(attr, size);
      case _a.children:
        return this.view.children.forEach(child=> {
          if (preserve) {
            min = child.$el.css(attr);
            child.$el.css(`min-${attr}`, min);
            size = _a.auto;
          }
          if (reset) {
            styleOpt = child.model.get(_a.styleOpt);
            size = styleOpt[attr];
          }
          return child.$el.css(attr, size);
        });
      default:
        var children = this.$el.find(target);
        return (() => {
          const result = [];
          for (var child of Array.from(children)) {
            if (preserve | reset) {
              min = $(child).css(attr);
              $(child).css(`min-${attr}`, min);
              size = _a.auto;
            }
            result.push($(child).css(attr, size));
          }
          return result;
        })();
    }
  }
// ======================================================
//
// ======================================================

// ===========================================================
// height
//
// @param [Object] args
// @param [Object] target=_a.self
//
// ===========================================================
  height(args, target){
    if (target == null) { target = _a.self; }
    return this._size(args, target, _a.height);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// width
//
// @param [Object] args
// @param [Object] target=_a.self
//
// ===========================================================
  width(args, target){
    if (target == null) { target = _a.self; }
    return this._size(args, target, _a.width);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// hide
//
// @param [Object] opt
//
// ===========================================================
  hide(opt){
    //_dbg "DDDDDDDDDDDH HIDE ...........", opt
    return this.$el.css(_a.data.hide, _a.yes);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// show
//
// ===========================================================
  show(){
    return this.$el.css(_a.data.hide, _a.no);
  }
// ======================================================
//
// ======================================================

// ===========================================================
// _default
//
// @return [Object] 
//
// ===========================================================
  _default(){
    if (window.innerWidth > 800) {
      return;
    }
    switch (parseInt(this.view.get(_a.rank))) {
      case 1:
        return this.$el.attr(_a.data.flow, _a.vertical);
      case 2:
        return this.$el.css({
          width : _K.size.full});
    }
  }
}
module.exports = __bhv_responsive;
