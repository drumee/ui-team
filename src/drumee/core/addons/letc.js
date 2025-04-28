
const { isNumeric } = require("core/utils")
const { View } = Backbone;
// ========================
// A Drumee view two mandatory models :
// @model      : the one required by Marionnette for rendering
// @style      : handles css properties through (styleOpt)
// @mobile     : handles css properties in mobile screen (styleMob)
// @attribute : handles view HTML attributes (id, data-*, etc)
// @icon       : handles icon style (styleIcon)
// @pseudo     : handles pseudo style of the view (stylePseudo)
//
// ========================

const { timestamp, log } = require("core/utils");
const ORIENTATION = {
  'landscape-primary': 'x',
  'landscape': 'x',
  'portrait-primary': 'y',
  'portrait': 'y'
}

/**
 * 
 * @returns 
 */
function setDeviceSpecs(target) {
  window.currentDevice = window.currentDevice || Visitor.device();
  try {
    target.el.dataset.device = window.currentDevice;
    window.currentOrientation = screen.orientation.type;
    target.el.dataset.orientation = ORIENTATION[currentOrientation] || 'x';
  } catch (e) {
    target.el.dataset.device = window.currentDevice;
    window.currentOrientation = 'x';
  }
}

/**
 * 
 * @returns 
 */
function deviceChanged() {
  let type = window.currentDevice !== Visitor.device();
  let orientation = false;
  try {
    orientation = window.currentOrientation !== screen.orientation.type;
    if (orientation) {
      window.currentOrientation = screen.orientation.type;
    }
  } catch (e) {
  }
  if (type) {
    window.currentDevice = Visitor.device();
  }
  return (type || orientation)
}

const Timer = new Map();

const { buildContextmenu } = require('../utils/contextmenu');
let _clickTimestap = timestamp();


/** Common addons */
//let p = Backbone.View.prototype;
View.prototype.initialize = function (opt) {
  opt = opt || this.options;
  if ((this.model == null)) {
    this.model = new Backbone.Model(opt);
  }
  this._id = this._id || _.uniqueId();
  this.model.set(_a.widgetId, this._id);
  const style = opt.style || opt.styleOpt;

  if (_.isEmpty(style)) {
    this.style = new Backbone.Model();
  } else {
    this.style = new Backbone.Model(style);
  }

  const attr = opt.attribute || opt.attrOpt;
  if (attr) {
    this.attribute = new Backbone.Model(attr);
    if (opt.debug && log()) {
      opt.dataset = { ...opt.dataset, debug: opt.debug }
    }
    if (opt.dataset != null) {
      for (let k in opt.dataset) {
        const v = opt.dataset[k];
        this.attribute.set(`data-${k}`, v);
      }
    }
  } else {
    this.attribute = new Backbone.Model();
  }

  let { kids, styleIcon, stylePseudo } = opt;
  if (styleIcon != null) {
    this.icon = new Backbone.Model(styleIcon);
  }

  if (stylePseudo != null) {
    this.pseudo = new Backbone.Model(stylePseudo);
  }

  if (_.isArray(kids)) {
    this.mergeKidsOptions(kids);
    opt.kids = kids.filter(e => { return (e && e.kind) });
    this.collection = new Backbone.Collection(kids);
  } else if (kids && kids.kind) {
    this.mergeKidsOptions([kids]);
    this.collection = new Backbone.Collection([kids]);
  }

  this._className = this.nativeClassName || this.className;
  this.figName = this.figName || this.constructor.name;

  const family = this.figName.replace(/^(_+)/, '').replace(/_/g, '-');
  const f = family.split(/-/);
  const group = f.shift();
  const name = family.replace(group, '').replace(/^-+/, '');
  this.fig = {
    group,
    family,
    name
  };
  if (_.isObject(this.mget(_a.fig))) {
    this.fig = { ...this.fig, ...this.mget(_a.fig) }
    return this.fig;
  }
};

/**
 * 
 */
View.prototype.mergeKidsOptions = function (kids) {
  let kidsOpt = this.mget(_a.kidsOpt) || this.mget(_a.itemsOpt);

  if (!kidsOpt) {
    return;
  }
  const map = this.mget(_a.kidsMap) || this.mget(_a.itemsMap);
  kids.map((item) => {
    const ext = {};
    if (map) {
      for (let k in map) {
        const v = map[k];
        ext[v] = item[k];
      }
    }
    if (_.isFunction(kidsOpt)) {
      item = { ...item, ...ext }
      item = { ...item, ...kidsOpt(this, item) }
    } else {
      item = { ...item, ...ext, ...kidsOpt }
    }
  })
}


/**
 * 
 * @returns 
 */
View.prototype.tagName = function () {
  let e, tag;
  try {
    const href = this.model.get(_a.href) || this.getOption(_a.href);
    if (!_.isEmpty(href)) {
      return _K.tag.a;
    }
  } catch (error) {
    e = error;
    return _K.tag.div;
  }
  try {
    tag = this.model.get(_a.tagName) || this.getOption(_a.tagName);
    if (!_.isEmpty(tag)) {
      return tag;
    }
  } catch (error1) {
    e = error1;
    return _K.tag.div;
  }

  return _K.tag.div;
};

/**
 * 
 * @param {*} child 
 * @param {*} name 
 * @returns 
 */
View.prototype.registerPart = function (child, name) {
  if ((this._branches == null)) {
    this._branches = {}
  }
  this._branches[name] = child;
  child.el.dataset.partname = name;
  const k = "__" + _.camelCase(name);
  this[k] = child;
  return this.triggerMethod(_e.part.ready, child, name);
};


/**
 * 
 * @returns 
 */
View.prototype.onBeforeRender = function () {
  if (!this.model) {
    this.warn("NO MODEL", this);
    return;
  }
  let v = this.mget(_a.volatility);
  if (this.isLazyClass) {
    return;
  }
  if (v) {
    var f = e => {
      v = this.mget(_a.volatility); // In case of change since rendering
      switch (v) {
        // Click outside
        case 0:
          return;
        case 1:
          if ((e == null) || !this.el.contains(e.currentTarget)) {
            this.goodbye();
            return;
          }
          return RADIO_CLICK.once(_e.click, f);
        // Click anywhere
        case 2:
          this.goodbye();
          return;
        case 3:
          this.trigger("click:outside", e);
          return;
        // Click anywhere
        // Anywhere after timeout v
        case 4:
          if (e.shiftKey || e.ctrlKey) {
            return;
          }
          this.selfDestroy({ timeout: 300 });
          return;
        default:
          return this.selfDestroy({ timeout: v });
      }
    };
    const g = () => {
      if (v == 4) {
        return RADIO_MOUSE.once(_e.mousedown, f);
      }
      return RADIO_CLICK.once(_e.click, f);
    };
    setTimeout(g, 500);
  }

  const name = this.mget(_a.sys_pn);
  if (!name) {
    return;
  }
  const handlers = this.getHandlers(_a.part);
  for (var h of handlers) {
    if (h !== this) h.registerPart(this, name)
  }
};


/**
 * 
 * @param {*}
 */
View.prototype.__handleClick = function (e) {
  this._doubleClicked = 0;
  this._target = e;
  if (mouseDragged) {
    return true;
  }
  if (this.mget(_a.haptic)) {
    this.el.dataset.haptic = "1";
    if (_.isNumber(this.mget(_a.haptic))) {
      setTimeout(() => {
        this.el.dataset.haptic = "0";
      }, this.mget(_a.haptic));
    }
  }

  if ((timestamp() - _clickTimestap) < 1000) {
    return;
  }
  _clickTimestap = timestamp();
  e.stopPropagation();
  this.triggerHandlers(e);
  e.stopImmediatePropagation();
  if (this.__tooltips && this.__tooltips.el) {
    if (this.__tooltips.state) {
      $(this.__tooltips.el).hide();
      this.__tooltips.state = 0;
    } else {
      this.__tooltips.state = 1;
      $(this.__tooltips.el).show();
    }
  }
  return true;
};

/**
 * 
 * @param {*} e 
 */
View.prototype.__handleDblclick = function (e) {
  lastDblClick = e;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  return false;
}

/**
 * 
 * @param {*} e 
 */
View.prototype.__handleContextmenu = function (e) {
  e.stopPropagation();
  e.stopImmediatePropagation();
  if (e.shiftKey || e.ctrlKey) {
    this.debug(`SKELETON=${this.el.dataset.debug}`, this, this.el, e);
    return;
  }
  if (this.escapeContextmenu || this.mget('escapeContextmenu')) {
    return
  }
  let p = null;
  if (this.contextmenuSkeleton || _.isFunction(this.onContextmenu)) {
    p = this;
  } else {
    p = this.parent;
    while (p) {
      if (p.contextmenuSkeleton || _.isFunction(p.onContextmenu)) break;
      p = p.parent;
    }
  }
  if (p) {
    this.triggerMethod(_a.toggle);
    e.preventDefault();
    if (p.contextmenuSkeleton) {
      if (drumeeDialog || !drumeeDialog.isDestroyed()) {
        drumeeDialog.feed(buildContextmenu(p, this, e));
        let l = drumeeDialog.children.last();
        let offsetY = window.innerHeight - (e.pageY + l.$el.height())
        let offsetX = window.innerWidth - (e.pageX + l.$el.width())
        if (offsetY < 0) l.el.style.top = `${window.innerHeight - l.$el.height()}px`;
        if (offsetX < 0) l.el.style.left = `${window.innerWidth - l.$el.width()}px`;
        return false;
      };
      p.append(buildContextmenu(p, this, e));
      if (p.__contextmenu__ && !p.__contextmenu__.isDestroyed()) p.__contextmenu__.suppress();
      p.__contextmenu__ = p.children.last();
      return false;
    }
    p.onContextmenu(this, e);
    return false;
  }
}

/**
 * 
 * @param {*} e 
 */
View.prototype.__handleMouseenter = function (e) {
  if (this.__tooltips) {
    let tt = this.__tooltips;
    this.__tooltips.state = 1;
    $(tt.el).show();
  }
  let helper = this.mget(_a.helper);
  if (helper) {
    if (this.__helper) {
      this.__helper.el.show();
      return;
    }
    if (_.isFunction(helper)) {
      helper = helper(this);
    }
    if (helper.kind) {
      Kind.waitFor(helper.kind).then(() => {
        try {
          this.append(helper);
          this.__helper = this.children.last();
        } catch (e) {
          this.parent.append(helper);
          this.__helper = this.parent.children.last();
        }
      })
    }
  }
  return true;
}

/**
 * 
 * @param {*} e 
 */
View.prototype.__handleMouseleave = function (e) {
  if (this.__tooltips) {
    let tt = this.__tooltips;
    this.__tooltips.state = 1;
    $(tt.el).hide();
    if (_.isObject(tt.out)) {
      $(tt.el).css(tt.out);
    } else if (_.isString(tt.out)) {
      tt.el.classList.remove(tt.out);
    }
  }
  if (this.__helper) {
    this.__helper.el.hide();
  }

  return true;
}

/**
 * 
 * @param {*} e 
 */
View.prototype.__addTooltips = function (e) {
  let tt;
  const t = this.mget(_a.tooltips);
  if (_.isString(t)) {
    tt =
      { content: t };
  } else if (_.isObject(t)) {
    tt = t;
  } else {
    return;
  }
  const tag = tt.tagName || _K.tag.div;
  const el = document.createElement(tag);
  el.innerHTML = tt.content;
  el.setAttribute("class", (tt.className || _a.tooltips));
  el.style.display = _a.none;
  this.__tooltips = tt;
  this.__tooltips.el = el;
  let ox = 0;
  let oy = 0;
  this.__el = el;
  this.waitElement(this.el, () => {
    if (tt.parent || tt.sibling) {
      this.parent.$el.append(el);
      el.style.position = _a.absolute;
    } else {
      this.$el.append(el);
    }
    if (tt.anchor === _a.self) {
      ox = this.$el.offset().left - tt.parent.$el.offset().left;
      oy = this.$el.offset().top - tt.parent.$el.offset().top;
      ox = ox + ((this.$el.width() - el.outerWidth()) / 2) + (tt.offsetX || 0);
      oy = oy + this.$el.height() + (tt.offsetY || 0);
      el.style.left = ox.px();
      el.style.top = oy.px();
    }

    if (_.isObject(tt.over)) {
      $(el).css(tt.over);
    } else if (_.isString(tt.over)) {
      el.classList.add(tt.over);
    }

  });
  return true;
}


/**
 * 
 * @param {*} e 
 */
View.prototype.__handleHelper = function (e) {
  if (!e.shiftKey) {
    e.stopPropagation();
  }
  if (e.ctrlKey) {
    this.debug("ELEMENT ->", this.el);
  }
  this.debug(`SKELETON=${this.el.dataset.debug}`, this);
  return true;
}

/**
 * 
 */
View.prototype.onRender = function () {
  this.$el.addClass(this._className);
  if (this.mget(_a.className) != null) {
    this.$el.addClass(this.mget(_a.className));
  }

  if (this.fig != null) {
    const b = this.fig;
    this.$el.addClass(`${b.group} ${b.family} ${b.group}__item ${b.group}__ui ${b.family}__ui`);
    this.el.dataset.kind = this.mget(_a.kind);
  }

  if (this.mget(_a.dataset) != null) {
    const object = this.mget(_a.dataset);
    for (let k in object) {
      const v = object[k];
      this.el.setAttribute(`data-${k}`, v);
    }
  }

  if (this.mget(_a.target) != null) {
    this.el.setAttribute(_a.target, this.mget(_a.target));
  }

  if (this.mget(_a.href) != null) {
    const hrefcontent = this.mget(_a.content);
    if (/href=/.test(hrefcontent)) {
      this.el.style.cursor = _a.initial;
    } else {
      this.el.setAttribute(_a.href, this.mget(_a.href));
    }
  }

  for (let i of [_a.flow, _a.axis, _a.position]) {
    if (this.mget(i)) {
      this.el.dataset[i] = this.mget(i);
    }
  }

  setDeviceSpecs(this);

  this.refresh();
  this.trigger(_e.show, this);

  let a = this.mget(_a.active);
  if ((a == null)) {
    a = 1;
  }
  const active = ~~a;

  if (log()) {
    this._inspectSkeleton();
  }

  if (this.skeleton) {
    let s;
    if (_.isFunction(this.skeleton)) {
      s = this.skeleton(this);
    } else {
      s = this.skeleton;
    }
    this.waitElement(this.el, () => {
      if ((s == null)) {
        return;
      }
      return this.feed(s);
    });
  }

  if (!active) {
    return;
  }
  if (this.mget(_a.tooltips)) this.__addTooltips();
  if (this.mget('onlyKeyboard')) return;
  this.el.onclick = this.__handleClick.bind(this);
  this.el.ondblclick = this.__handleDblclick.bind(this);
  this.el.oncontextmenu = this.__handleContextmenu.bind(this);
  this.el.onmouseenter = this.__handleMouseenter.bind(this);
  this.el.onmouseleave = this.__handleMouseleave.bind(this);
};

View.prototype._responsive = function (refresh = 1) {
  if (!deviceChanged()) return;
  setDeviceSpecs(this)
  refresh && this.refresh();
};

/**
 * 
 * @returns 
 */
View.prototype._inspectSkeleton = function () {
  this.$el.on(_e.mouseover, e => {
    if (!e.shiftKey) {
      return;
    }
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.stopPropagation();
    return RADIO_BROADCAST.trigger(_a.debug, this);
  });
};


/**
 * 
 * @param {*} c 
 * @returns 
 */
function __raw(c) {
  const m = c.model;
  const attr = m.toJSON() || { kind: KIND.blank };
  delete m.uiHandler;
  delete m.partHandler;
  if (c.style) {
    attr.styleOpt = c.style.toJSON();
  }

  if (c.mobile) {
    attr.styleMobile = c.mobile.toJSON();
  }

  if (c.icon) {
    attr.styleIcon = c.icon.toJSON();
  }

  if (c.data) {
    attr.dataOpt = c.data.toJSON();
  }

  if (c.pseudo) {
    attr.stylePseudo = c.pseudo.toJSON();
  }

  if (c.attributes) {
    attr.attrOpt = c.attributes.toJSON();
  }
  if (c.$el) {
    attr.width = c.$el.width();
    attr.height = c.$el.height();
    const p = c.$el.position();
    attr.x = p.left;
    attr.y = p.top;
  }

  return attr;
};


/**
 * 
 * @param {*} c 
 * @returns 
 */
function __clean(c) {
  const attr = __raw(c);
  let r = new RegExp(/\[ *native code *\]/i);
  for (let k in attr) {
    let item = attr[k];
    if (item && item.constructor && !r.test(item.constructor.toString())) {
      delete attr[k]
    }
  }
  if (attr.kidsOpt) {
    let opt = attr.kidsOpt;
    for (let k in opt) {
      let item = opt[k];
      if (item && item.constructor && !r.test(item.constructor.toString())) {
        delete opt[k]
      }
    }

  }
  delete attr.respawnOpt;
  delete attr.respawn;
  delete attr.mapName;
  return attr;
};

/**
 * 
 * @param {*} raw 
 * @returns 
 */
View.prototype.toLETC = function (raw) {
  let __serialize;
  if (raw == null) { raw = 1; }
  if (raw) {
    __serialize = __raw;
  } else {
    __serialize = __clean;
  }
  if (this.isDestroyed() || (this.model == null)) {
    return null;
  }
  const r = __serialize(this);
  if ((this.children == null)) {
    return r;
  }
  let i = 1000;
  r.kids = [];
  this.children.each(function (c) {
    const kid = c.toLETC(raw);
    if (!kid) {
      return null;
    }
    if (r.rank != null) {
      kid.rank = r.rank + 1;
    }
    let index = c.getActualStyle(_a.zIndex);
    if (isNumeric(index)) {
      index = ~~index;
    } else {
      index = i;
    }
    i = Math.max(i + 1, index);
    kid.styleOpt = kid.styleOpt || {};
    kid.styleOpt.zIndex = index;
    return r.kids.push(kid);
  });
  return r;
};


/**
 * 
 * @returns 
 */
View.prototype.renew = function () {
  if (!this.parent || !this.parent.children) {
    this.render();
    return;
  }
  const index = this.parent.collection.findIndex(this.model);
  const l = this.toLETC();
  this.parent.collection.remove(this.model);
  this.parent.collection.add(l, { at: index });
  return index;
};

/**
 * 
 * @param {*} opt 
 * @returns 
 */
View.prototype.declareHandlers = function (opt = {}) {
  const defaults = {
    part: _a.single,
    ui: _a.single
  };
  this._handledEvents = { ...defaults, ...opt };
  if (this._handledEvents.part) {
    this._branches = {};
  }
};

/**
 * 
 * @returns 
 */
View.prototype.refresh = function () {
  // Refresh the object
  let opt;
  if (this.attribute) {
    const object = this.attribute.toJSON();
    for (let k in object) {
      const v = object[k];
      this.el.setAttribute(k, v);
    }
  }

  if (this.pseudo != null) {
    const pos = this.model.get(_a.pseudo) || _a.before;
    opt = this.pseudo.toJSON();
    if (!_.isEmpty(opt)) {
      this.el.pseudoStyle(pos, opt);
    }
  }
  if (this.style) {
    opt = this.style.toJSON() || {};
  } else {
    opt = this.model.get(_a.style) || this.model.get(_a.styleOpt) || {};
  }

  try {
    return this.$el.css(opt);
  } catch (e) {
    return this.warn("Failed to refres with", this, opt, e);
  }
};

/**
 * 
 * @param {*} e 
 * @returns 
 */
View.prototype.triggerHandlers = function (e) {
  if (this.mget(_a.active) === 0) {
    return;
  }
  var source = source || this;
  if (e && (e.type === _e.click)) {
    RADIO_CLICK.trigger(_e.click, e, source);
  }
  const handlers = this.getHandlers(_a.ui);
  if (mouseDragged || _.isEmpty(handlers)) {
    return;
  }
  const cb = this.mget(_a.on_click);
  if (cb != null) {
    if (_.isFunction(cb)) {
      return cb(source);
    }
    try {
      const f = eval(cb);
      if (_.isFunction(f)) {
        f(source);
      }
    } catch (error) {
      e = error;
      this.debug(e);
    }
  }

  const signal = this.mget(_a.signal) || _e.ui.event;
  let fired = 0;
  for (var ui of Array.from(handlers)) {
    if (ui === source) {
      continue;
    }
    try {
      if (e != null) {
        this.triggerMethod(_e.also.click, source, e);
        fired = 1;
      }
      if (_.isString(signal)) {
        ui.triggerMethod(signal, source, e);
      } else if (_.isArray(signal)) {
        for (var s of Array.from(signal)) {
          ui.triggerMethod(s, source, e);
        }
      }
    } catch (error1) {
      e = error1;
      this.warn("UI_SERVICE_ERROR", e);
      console.trace();
      return false;
    }
  }
  if (!fired && (this.isToggle || this.isRadio)) {
    this.triggerMethod(_e.also.click, source, e);
  }

  const bubble = this.mget(_a.bubble);
  if ([false, 0, "0"].includes(bubble)) {
    try {
      e.stopImmediatePropagation();
      e.stopPropagation();
    } catch (error2) { }
    return false;
  } else {
    this.status = this.status || _e.bubble;
    if (_.isArray(bubble)) {
      for (var sig of Array.from(bubble)) {
        this.trigger(sig, source);
      }
    } else if (_.isString(bubble)) {
      this.trigger(bubble, source);
    } else {
      this.trigger(_e.bubble, source);
    }
  }
  return true;
};

/**
 * 
 * @param {*} name 
 * @returns 
 */
View.prototype.getHandlers = function (name) {
  if ((name == null)) {
    this.warn("getHandlers : requires `name`");
    return [];
  }

  /** Explicit handlers. Must be array defining the events andlers */
  let h = [];
  switch (name) {
    case _a.ui:
      h = this.mget(_a.uiHandler);
      break;
    case _a.part:
      h = this.mget(_a.partHandler);
      break;
    default:
      this.warn(`getHandlers : unsupported name '${name}'`, _a.ui);
      return [];
  }

  /* Explicit handlers are set as array*/
  if (_.isArray(h)) {
    return h;
  } else if (h && h.model) {
    h = [h];
  }

  if (!h) h = [];
  /** Implicit handlers. Walk upward until a parent declared as handler, If a handeler is already set, parent's ones shall be added too */
  let p = this.parent;
  let stop = 0;
  while (p && !stop) {
    if (p._handledEvents) {
      let policy = p._handledEvents[name];
      switch (policy) {
        case _a.single:
          h.push(p);
          stop = 1;
          break;
        case _a.multiple:
          h.push(p);
          break;
        default:
          this.warn(`getHandlers : unsupported handler policy ${policy}, type=${name}`, p);
      }
    }
    p = p.parent;
  };

  let dedup = {};
  for (let item of h) {
    dedup[item.cid] = item
  }
  return _.values(dedup);
}

/**
 * 
 * @param {*} name 
 * @returns 
 */
View.prototype.getData = function (name) {
  if (this._data != null) {
    return this._data;
  }
  if (this.mget(_a.name) != null) {
    let val = this.mget(_a.value);
    if (_.isString(val) && /<code.*>/.test(val)) {
      val = Utils.evalCode(val);
    }
    return { name: this.mget(_a.name), value: val };
  }
  return (this.mget(_a.vars) || this.mget(_a.values));
};

/**
 * 
 * @param {*} format 
 * @returns 
 */
View.prototype.actualNode = function (format = _a.orig) {
  let attr = this.model.toJSON();
  let {
    nid, home_id, hub_id, vhost, isalink,
    ownpath, filetype, filepath, md5Hash, mtime, ctime,
    filename, ext, geometry, area, filesize
  } = attr;
  if ([null, undefined, '0', 0, '*'].includes(nid)) {
    nid = home_id;
  }
  if (isalink && _.isFunction(this.metadata)) {
    let { target } = this.metadata() || { target: "" };
    try {
      target = JSON.parse(target) || {};
    } catch (e) {
      target = {};
    }
    hub_id = target.hub_id || hub_id;
    nid = target.nid || nid;
    vhost = target.vhost || vhost;
    home_id = target.home_id || home_id;
  }
  let href;
  filepath = ownpath || filepath || this.media?.mget(_a.filepath);
  filetype = filetype || this.media?.mget(_a.filetype);

  const changed = Math.abs(mtime - ctime);
  let killCache;
  if (_.isNaN(changed) || changed === 0) {
    killCache = null;
  } else {
    killCache = md5Hash || changed;
  }

  const { keysel, endpoint } = bootstrap();
  if (vhost && filepath) {
    href = `https://${vhost}${filepath}`;
  } else {
    href = `${endpoint}file/${_a.orig}/${nid}/${hub_id}`;
  }

  let url = `${endpoint}file/${format}/${nid}/${hub_id}`;

  if (keysel && area != _a.public) {
    url = `${url}?keysel=${keysel}`;
    href = `${href}?keysel=${keysel}`;
  }
  if (killCache) {
    if (/\?/.test(url)) {
      url = `${url}&v=${killCache}`;
      href = `${href}&v=${killCache}`;
    } else {
      url = `${url}?v=${killCache}`;
      href = `${href}?v=${killCache}`;
    }
  }

  let fullUrl;
  if (/^http.+\/\//i.test(url)) {
    fullUrl = url;
  } else {
    fullUrl = `https://${vhost}${url}`;
  }
  href = encodeURI(href);

  if (ext) {
    filename = `${filename}.${ext}`
  }

  return {
    hub_id,
    nid,
    vhost,
    url,
    changed,
    home_id,
    href,
    publicUrl: href,
    fullUrl,
    filetype,
    filepath,
    ownpath,
    md5Hash,
    filename,
    filesize,
    geometry,
  };
}

/**
 * Wait until the DOM element actually exists, then call the handler by passing argumemts args, if any
 * @param {*} el 
 * @param {*} handler 
 * @param {*} args 
 */
View.prototype.ensureElement = function (el) {
  return new Promise((resolve, reject) => {
    const timerId = _.uniqueId();
    const max = 5;
    let i = 0;
    const clearTimer = function () {
      const timer = Timer.get(timerId)
      if (timer) {
        clearInterval(timer)
        Timer.delete(timerId);
      }
    }
    var f = function () {
      i++;
      if (_.isString(el)) {
        el = document.getElementById(el);
      } else if (el && el.jquery) {
        el = el[0];
      }
      if (el != null) {
        clearTimer();
        resolve(el);
        return;
      }
      if (i > max) {
        clearTimer();
        reject()
      }
    };
    Timer.set(timerId, setInterval(f, 200));
  })
}

/**
 * Legacy -- shall be replaced by ensureElement
 * @param {*} el 
 * @param {*} handler 
 * @param {*} args 
 */
View.prototype.waitElement = function (el, handler, args) {
  this.ensureElement(el).then(handler).catch(() => {
    // this.warn("Too loong wait for", this, el)
    // console.trace()
  })
}


