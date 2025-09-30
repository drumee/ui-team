// ============================================================ *
//   Copyright Xialia.com  2011-2019
//   FILE : libs/reader/text/rich.coffee
//   TYPE :
// ============================================================ *


const _id_tag = 'note-';
const _default_class = "drumee-widget rich-text";
const AUTOFOCUS = "autofocus";
const MULTI_LINE = "multi_line";
const { Autolinker } = require("autolinker");
const { isSelected } = require("../text")

/**
 * 
 */
class __text_editable extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.keydown = this.keydown.bind(this);
    this.keyup = this.keyup.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
    this.getData = this.getData.bind(this);
    this.getText = this.getText.bind(this);
    this.reset = this.reset.bind(this);
    this.set = this.set.bind(this);
  }

  static initClass() {
    this.prototype.nativeClassName = _default_class;
    this.prototype.figName = "text_editable";
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    this._id = _.uniqueId(_id_tag);
    super.initialize(opt);
    this.model.atLeast({
      flow: _a.wrap,
      innerClass: _K.char.empty,
      use_mask: 0,
      content: this.mget(_a.alt) || this.mget(_a.value)
    });
    this.attribute.set({
      placeholder: this.mget(_a.placeholder) || LOCALE.ENTER_TEXT
    });

    this.escapeContextmenu = true;
    if (this.mget(_a.mode) === _a.interactive) {
      this.interactive = 1;
    }
    this.bindEvent('live');
  }

  /**
   * 
   */
  onDestroy() {
    this.el.onblur = null;
    this.el.onkeyup = null;
    if(!this.content) return;
    this.content.onkeydown = null;
    this.content.onkeyup = null;
    this.content.onblur = null;
    this.content.onclick = null;
  }

  /**
   * 
   */
  draw() {
    this.el.dataset.state = this.mget(_a.state);
    const id = `${this._id}`;
    return this.waitElement(id, () => {
      this.content = document.getElementById(id);
      this.renderPseudo();
      this.sync();
      this.$content = $(this.content);
      if (this.mget('html')) {
        this.setHTML();
      } else if (this.mget(_a.content)) {
        this.content.innerText = this.mget(_a.content);
      } else {
        this.content.innerText = "";
      }
      this.content.onpaste = this._onpaste.bind(this);
      this.content.onkeydown = this.keydown.bind(this);
      this.content.onblur = this.blur.bind(this);
      this.content.onclick = e => {
        e.stopPropagation();
        if (e.target && e.target.tagName == "A") {
          return true;
        }
        if (this.mget('readwrite')) {
          setTimeout(() => {
            this.content.setAttribute('contenteditable', true);
          }, 200);
        }
        return false;
      };

      if (this.mget(AUTOFOCUS)) {
        const f = () => {
          this.content.focus();
          if (this.mget(_a.content)) {
            // To move the cursur to the end 
            document.execCommand('selectAll', false, null);
            // collapse selection to the end
            document.getSelection().collapseToEnd();
          }
        };
        return _.delay(f, Visitor.timeout(1000));
      }
    });
  }

  /**
   * 
   * @param {*} opt 
   */
  onDomRefresh(opt) {
    this.el.innerHTML = require('./template')(this);
    this.draw();

    this.el.onblur = this.blur;
    this.el.onkeyup = this.keyup;
  }

  /**
   * 
   * @param {*} e 
   */
  _onpaste(e) {
    if (e.clipboardData.types.indexOf('text/html') != -1) {
      e.preventDefault()
      let data = e.clipboardData.getData('text').withoutTag();
      document.execCommand('insertText', false, data);
      this.triggerHandlers({
        service: `paste-text`,
        text: this.getText(),
      });
      return;
    }

    if (e.clipboardData.types.indexOf('text/plain') != -1) {
      let text = this.getText();
      if (this.mget('autolink')) text = Autolinker.link(text);
      this.triggerHandlers({
        service: `paste-text`,
        text,
      });
      return;
    }
    if (e.clipboardData.types.indexOf('Files') != -1) {
      var items = e.clipboardData.items;
      if (items == undefined) {
        return;
      }
      for (var i = 0; i < items.length; i++) {
        if ((items[i].kind == 'file')) {
          var f = items[i].getAsFile();
          this.triggerHandlers({
            service: `paste-file`,
            file: f
          });
        }
      }
      e.preventDefault()
    }
  }

  /**
   * 
   * @param {*} arg 
   * @param {*} raw 
   * @returns 
   */
  insert(arg, raw) {
    if (raw == null) { raw = 0; }
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    if (range.startOffSet === range.endOffSet) {
      range.startOffSet = range.startOffSet + 1;
    }

    let el = document.createElement(_K.tag.span);
    if (_.isString(arg)) {
      el.innerText = arg;
    } else if (_.isFunction(arg.mget)) {
      el.innerHTML = arg.mget(_a.content);
    } else if (arg.el && arg.el.nodeType) {
      el = arg.el
    }
    // if /(<.+>.*<\/.+>)+/.test(c)
    //   el.innerHTML = c
    // else 
    //   el.innerText = c
    range.insertNode(el);

    // to move the caret(cursor) after new node
    range.setStartAfter(el);
    range.setEndAfter(el);
    sel.removeAllRanges();
    sel.addRange(range);
    return this.sync();
  }

  // ===========================================================
  //
  // ===========================================================
  reselect() {
    try {
      const s = window.getSelection();
      s.setBaseAndExtent(this._base.node, this._base.offset, this._extend.node, this._extend.offset);
      return true;
    } catch (error) { }
    return false;
  }

  // ===========================================================
  //
  // ===========================================================
  clearSelection(e) {
    if (document.selection) {
      document.selection.empty();
    } else if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    this._base = null;
    return this._extend = null;
  }

  // ===========================================================
  //
  // ===========================================================
  trim() {
    const {
      content
    } = this;
    while (content.firstElementChild && _.isEmpty(content.firstElementChild)) {
      content.firstElementChild.remove();
    }
    return (() => {
      const result = [];
      while (content.lastElementChild && _.isEmpty(content.lastElementChild)) {
        result.push(content.lastElementChild.remove());
      }
      return result;
    })();
  }

  /**
   * 
   */
  isEmpty() {
    return (_.isEmpty(this.content.innerText.trim()));
  }

  /**
   * 
   */
  hasBeenChanged(reset = 1) {
    if (reset === 0) this.changed = 0;
    return (this.changed);
  }

  // ===========================================================
  //
  // ===========================================================
  sync() {
    let content;
    const value = this.content.innerText.trim();
    if (this.content.innerHTML != null) {
      content = this.content.innerHTML.trim();
    }
    this.mset(_a.content, content);
    this.mset(_a.value, value);
    if (_.isEmpty(value)) {
      this.el.dataset.placeholder = 1;
      return this.content.innerText = "";
    } else {
      return this.el.dataset.placeholder = 0;
    }
  }

  // ===========================================================
  //
  // ===========================================================
  resetContentStyle() {
    this.model.set(_a.content, this.content.innerHTML.trim());
    return this.$el.find(_top_nodes).each((i, e) => e.innerHTML = e.innerText);
  }

  // ===========================================================
  //
  // ===========================================================
  blur(e) {
    if (isSelected()) {
      const s = window.getSelection();
      this._base = {
        node: s.baseNode,
        offset: s.baseOffset
      };
      return this._extend = {
        node: s.extentNode,
        offset: s.extentOffset
      };
    }
    //this.debug("AAA:310", e);
    if (this.mget('readwrite')) {
      setTimeout(() => {
        this.content.setAttribute('contenteditable', false);
      }, 200);
    }

  }

  // ===========================================================
  //
  // ===========================================================
  keydown(e) {
    e.stopPropagation();
    // this.debug("AAAA:114", e, e.keycode);
    if (/^(enter)$/i.test(e.code)) {
      if (this.mget(_a.role) == 'editor') {
        return true;
      }
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) {
        return true;
      }
      e.preventDefault();
      return false;
    }
    return true;
  }

  // ===========================================================
  // 
  //
  // ===========================================================
  keyup(e) {
    window.pointerDragged = false;
    //this.debug("AAAA:307", this.content.innerText);
    e.stopPropagation();
    this.sync();
    let service = this.mget(_a.service);
    if (/^(enter)$/i.test(e.code)) {
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) {
        service = _a.interactive;
      }
      if (this.mget(_a.role) == 'editor') {
        service = 'newLine';
        //this.debug("AAAA:307", e, this.content);
      }

      this.triggerHandlers({
        service,
        text: this.getText(),
        event: e
      });
    } else {
      if (this.interactive) {
        //this.debug("AAAA:103 329")
        this.triggerHandlers({
          service: _a.interactive,
          text: this.getText(),
          event: e
        });
      } else {
        this.trigger(_e.keyup);
      }
    }
    this.changed = 1;

    if (this.mget(MULTI_LINE)) {
      return;
    }
    if (this.content.outerHeight() > this.$el.height()) {
      this.$el.css({ height: _a.auto });
    }
    return true;
  }


  // ===========================================================
  //
  // ===========================================================
  superscript(state) {
    if (state) {
      return this.$content.css({ "vertical-align": "super", "font-size": "smaller" });
    } else {
      return this.$content.css({ "vertical-align": "initial", "font-size": "initial" });
    }
  }

  // ===========================================================
  //
  // ===========================================================
  applyBullets(style) {
    this.debug("Apply Desig --> applyBullets QQQQ", style);
    if ((style == null)) {
      this.warn(ERROR.attr_required.format(_a.style));
      return;
    }
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    let found = false;
    for (let c of Array.from(range.commonAncestorContainer.childNodes)) {
      if ((c.nodeType === 1) && (range.isPointInRange(c, 0) || range.isPointInRange(c, 1))) {
        if (style.marginLeft != null) {
          _shiftLeft(c, style);
        } else {
          c.pseudoStyle(_a.before, style);
        }
        found = true;
      }
    }
    if (!found) {
      const el = document.getSelection().focusNode.parentElement;
      if (style.marginLeft != null) {
        _shiftLeft(el, style);
      } else {
        el.pseudoStyle(_a.before, style);
      }
    }
    //el.pseudoStyle(_a.before, style)
    return this.model.set(_a.pseudo, this.$el.find("[data-pseudo]").length);
  }

  // ===========================================================
  //
  // =============================>
  applyToNodes(style) {
    let k, range, v;
    if ((style == null)) {
      this.warn(ERROR.attr_required.format(_a.style));
      return;
    }
    const sel = window.getSelection();
    try {
      range = sel.getRangeAt(0);
    } catch (e) {
      this.updateStyle(style);
      return;
    }
    let found = false;
    this.debug("Apply to nodes", style);
    for (let c of Array.from(range.commonAncestorContainer.childNodes)) {
      if (c.nodeType === 1) {
        // if c.nodeType is 1 and (range.isPointInRange(c, 0) or range.isPointInRange(c, 1))
        for (k in style) {
          v = style[k];
          c.style[k] = v;
        }
        found = true;
      }
    }
    if (!found) {
      const el = document.getSelection().focusNode.parentElement;
      return (() => {
        const result = [];
        for (k in style) {
          v = style[k];
          result.push(el.style[k] = v);
        }
        return result;
      })();
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} keyevt 
   */
  applyLink(cmd, keyevt) {
    let value = "";
    this.debug("toAnchor : ", cmd);
    if (cmd.model.get(_a.name) === _a.vars) {
      value = cmd.model.get(_a.vars).href;
    } else {
      value = cmd.model.get(_a.value) || _K.char.empty;
    }

    if (value.isEmail()) {
      this.debug("Link is Email : ", value);
      value = 'mailto:' + value;
    } else if (value.isPhoneNumber()) {
      this.debug("Link is Phone : ", value);
      value = "tel:" + value;
    } else if (value.isUrl()) {
      value = value;
    } else {
      if (cmd.get(_a.hashtag)) {
        value = "#!" + cmd.get(_a.hashtag);
      } else {
        value = value;
      }
    }

    if (isSelected() || this.reselect()) {
      this.applyToSelection(cmd, value);
    } else {
      if (_.isEmpty(value)) {
        this.model.unset(_a.href);
      } else {
        this.model.set(_a.href, value);
      }
    }
    this.sync();
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} arg 
   * @returns 
   */
  applyToSelection(cmd, arg) {
    let block, el, tagName;
    const s = window.getSelection();
    const r = s.getRangeAt(0);
    const same_node = s.anchorNode.parentNode === s.focusNode.parentNode;
    if (cmd.model.get(_a.service) === _insert_link) {
      tagName = _K.tag.a;
    } else {
      tagName = _K.tag.span;
    }

    var walk = function (n) {
      if (!n.childElementCount || (cmd.model.get(_a.service) === _a.href)) {
        _apply(n, cmd, arg);
        return;
      }
      return (() => {
        const result = [];
        for (let c of Array.from(n.childNodes)) {
          if (c.nodeType === 1) {
            _apply(c, cmd, arg);
          }
          if (c.childElementCount) {
            result.push(walk(c));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    };

    // Selection on the same node
    if (same_node) {
      if ((s.anchorNode.nodeType === 3) && (s.focusNode.nodeType === 3)) {
        if (this._lastNodeInserted === s.anchorNode.parentElement) {
          this.debug("applyToSelection TEXT same node");
          walk(this._lastNodeInserted);
        } else {
          const contents = r.extractContents();
          el = document.createElement(tagName);
          _apply(el, cmd, arg);
          el.appendChild(document.createTextNode(contents.textContent));
          this._lastNodeInserted = el;
          r.insertNode(el);
          _selectText(el);
        }
        return;
      }
      if ((s.anchorNode.nodeType === 1) && (s.focusNode.nodeType === 1)) {
        if (s.anchorNode === this._lastNodeInserted) {
          return walk(this._lastNodeInserted);
        } else {
          block = r.extractContents();
          el = document.createElement(tagName);
          el.appendChild(block);
          walk(el);
          this._lastNodeInserted = el;
          r.insertNode(el);
          return _selectText(el);
        }
      }
      // Selection spans over several nodes
    } else {
      block = r.extractContents();
      walk(block);
      el = document.createElement(tagName);
      _apply(el, cmd, arg);
      el.appendChild(block);
      this._lastNodeInserted = el;
      return r.insertNode(el);
    }
  }

  /**
   * 
   */
  startNewBlock() {
    this.debug("PSEUDOSTYLEPSEUDOSTYLE Remove", cl);
    var cl = document.getSelection().focusNode.parentElement;
    cl.removePseudoStyle();
    cl.classList.remove(_a.bullet);
    cl.removeAttribute(_a.data.pseudo);
    cl.removeAttribute(_a.data.position);
    this.model.set(_a.pseudo, 0);
    this.sync();
  }

  // ===========================================================
  //
  // ===========================================================
  getMarkup(word) {

    if (word == null) { word = false; }
    let markup = this.$el.find('.' + this._markupClass);
    this.debug("_getMarkup", markup);
    if (!markup.length) {
      // select at least the current word
      if (word) {
        const sel = window.getSelection();
        if (_.isFunction(sel.modify)) {
          sel.modify("move", "backward", "word");
          sel.modify("extend", "forward", "word");
          markup = this.$el.find('.' + this._markupClass);
          this.applyToSelection();
          return markup;
        }
      }
      return null;
    }
    return markup;
  }


  // ===========================================================
  // applyClass
  //
  // @param [Object] cmd
  //
  // @return [Object]
  //
  // ===========================================================
  applyClass(cmd) {
    this.debug("GOT SELECTION : AapplyClass", this, cmd);
    const cname = cmd.get(_a.value);
    switch (cmd.get(_a.scope)) {
      case _a.global:
        this.$el.removeClass(this.mget(_a.className));
        this.model.set(_a.className, cname);
        this.$el.addClass(cname);
        break;
      case _a.selection:
        if (isSelected() || this.reselect()) {
          this.applyToSelection(cmd);
        } else {
          this.$el.removeClass(this.get(_a.className));
          this.model.set(_a.className, cname);
          this.$el.addClass(cname);
        }
        break;
      default:
        this.warn(WARNING.method.unprocessed.format(cmd.get(_a.scope)));
    }
    return this.sync();
  }

  // ===========================================================
  // setTextProps
  //
  // @param [Object] style
  // @param [Object] cmd
  //
  // @return [Object]
  //
  // ===========================================================
  setTextProps(style, cmd) {
    this.debug("TTTTTT 1111 setTextProps ", style, cmd);
    if (_.isEmpty(style)) {
      this.warn(WARNING.argument.recommanded.format(_a.style));
      return;
    }
    if (cmd.get(_a.scope)) {
      this.applyDesign(style, cmd);
      return;
    }
    return this.warn("DEPRECATED : Should have scope");
  }

  // ===========================================================
  // getConsistentStyle
  //
  // @return [Object]
  //
  // ===========================================================
  getConsistentStyle() {
    let style;
    try {
      style = this.style.attributes;
    } catch (e) {
      style = window.getComputedStyle(this.content);
    }
    return style;
  }

  // ===========================================================
  //
  // ===========================================================
  hasUniformProperty(name, value) {
    let same;
    if (window.getComputedStyle(this.$el[0])[name].match(value)) {
      same = true;
    } else {
      same = false;
    }
    if (!same) {
      return false;
    }
    var walk = function (el, name) {
      if (window.getComputedStyle(el)[name].match(value)) {
        same = true;
      } else {
        same = false;
      }
      if (!same) {
        return false;
      }
      $(el).find('*').each(function (i, e) {
        if (same) {
          return same = walk(e, name);
        }
      });
      return same;
    };
    this.$el.find('*').each(function (i, e) {
      if (same) {
        if (window.getComputedStyle(e)[name].match(value)) {
          same = true;
        } else {
          same = false;
        }
        return walk(e, name);
      }
    });
    return same;
  }

  // ===========================================================
  //
  // ===========================================================
  onUpdate(src) {
    const object = this.mget('cast');
    for (let k in object) {
      const v = object[k];
      let val = v;
      if (v != null) {
        if (_.isFunction(v)) {
          val = v(src.get(k));
        } else {
          try {
            val = eval(v)(src.get(k));
          } catch (error) { }
        }
      }
      this.model.set(k, val);
    }
    this.render();
  }

  /**
   * 
   * @returns 
   */
  getData() {
    const v = this.mget(_a.value) || this.mget(_a.content);
    if (this.mget(_a.name) != null) {
      return { name: this.mget(_a.name), value: v };
    }
    return null;
  }

  /**
   * 
   * @returns 
   */
  getText() {
    const v = this.el.innerText.trim();
    return v;
  }

  /**
   * 
   */
  getHTML() {
    for (let c of Array.from(this.content.childNodes)) {
      if (c.nodeType === 3) {
        const el = document.createElement(_K.tag.div);
        el.innerText = c.textContent;
        c.replaceWith(el);
      }
    }
    return this.content.innerHTML;
  }

  /**
   * 
   * @param {*} html 
   */
  setHTML(html) {
    let c = html || this.mget('html');
    if (this.mget('autolink')) {
      c = Autolinker.link(c);
    }
    let tags = this.mget(_a.tags) || _K.allowed_tag;
    const dompurify = require('dompurify');
    this.content.innerHTML = `${dompurify.sanitize(c, { ADD_ATTR: ['target'], ALLOWED_TAGS: tags })}`;
  }

  /**
   * 
   * @param {*} opt 
   */
  reset(opt) {
    this.set({
      value: '',
      content: ''
    });
  }

  /**
   * 
   * @param {*} opt 
   */
  set(opt) {
    this.model.set(opt);
    this.mould();
  }


  /**
   * 
   */
  mould() {
    this.$el.attr(_a.data.state, this.mget(_a.state));
    try {
      this.render();
      this.draw();
    } catch (error) { }
  }

  onWsMessage(service, data, options = {}) {
    this.verbose("AAA:875", options.service, data.socket_id, data, options);
  }
}
__text_editable.initClass();


module.exports = __text_editable;
