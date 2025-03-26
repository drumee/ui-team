// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/sandbox/ui
//   TYPE :
// ==================================================================== *

const JSONEditor = require('jsoneditor');
require('jsoneditor/dist/jsoneditor.css');
require('./skin');
/**
 * 
 * @param {*} d 
 * @returns 
 */
function walk(d) {
  delete d.handler;
  delete d.uiHandler;
  delete d.partHandler;
  if (_.isArray(d.kids)) {
    d.kids.map((k) => {
      walk(k);
    });
  }
}

class __module_sandbox extends LetcBox {


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}

    window.Sandbox = this;
    this._draft = {};
  }


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this))
    this.setDefaultData();
  }
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  route(opt) {
    let data;
    opt = opt || Visitor.parseModule();
    if (!opt[1]) {
      return;
    }
    const name = opt[1];
    this._name = name || 'text';
    this.debug(`AAA:63 name = ${name}`, opt, this, data);
    switch (name) {
      case "text":
        data = this._draft[name] || require('./skeleton/text')(this);
        this.setData(name, data);
        break;

      case "buttons":
        data = this._draft[name] || require('./skeleton/buttons')(this);
        this.setData(name, data);
        break;

      case "charts":
        data = this._draft[name] || require('./skeleton/charts')(this);
        this.setData(name, data);
        break;

      case "kinds":
        this._preview.feed(require('./skeleton/kinds')(this));
        break;

      case "svg":
        data = this._draft[name] || require('./skeleton/svg')(this);
        this.setData(name, data);
        break;

      case "prebuilt":
        data = this._draft[name] || require('./skeleton/prebuilt')(this);
        this.setData(name, data);
        break;

      // when "jumper"
      //   data = @_draft[name] || require('./skeleton/jumper')(@)
      //   @setData name, data

      case "list":
        data = this._draft[name] || require('./skeleton/images-list')(this);
        this.setData(name, data);
        break;

      case "table":
        data = this._draft[name] || require('./skeleton/table')(this);
        this.setData(name, data);
        break;

      case "menu":
        data = this._draft[name] || require('./skeleton/menu')(this);
        this.setData(name, data);
        break;

      case "radio":
        data = this._draft[name] || require('./skeleton/radio')(this);
        this.setData(name, data);
        break;

      case "form":
        data = this._draft[name] || require('./skeleton/form')(this);
        this.setData(name, data);
        break;

      case "leaflet":
        data = this._draft[name] || require('./skeleton/leaflet')(this);
        this.setData(name, data, require('./skeleton/leaflet-tips')(this));
        break;

      case "page":
        data = this._draft[name] || require('./skeleton/page')(this);
        this.setData(name, data);
        break;

      case "countdown":
        data = this._draft[name] || require('./skeleton/countdown')(this);
        this.setData(name, data);
        break;

      case "trial":
        data = this._draft[name] || require('./skeleton/trial')(this);
        this.setData(name, data, require('./skeleton/trial-tips')(this));
        break;

      case "signup":
        this.feed([
          Skeletons.Box.Y({
            className: 'u-ai-center u-jc-center',
            kids: [
              Skeletons.Note('B to C Signup'),
              { kind: 'drumee_api_signup' }
            ]
          }),
          Skeletons.Box.Y({
            className: 'u-ai-center u-jc-center',
            kids: [
              Skeletons.Note('B to B Signup'),
              { kind: 'drumee_api_b2b_signup' }
            ]
          })
        ]);
        break;
    }

  }


  /**
   * 
   * @returns 
   */
  showSnippet() {
    var opt = opt || {};
    const ajax = new XMLHttpRequest();
    ajax.open("GET", "https://letc.io/file/orig/5bda11f97ed20ec8/edb90e08edb90e0c", true);
    ajax.send();
    const me = this;
    ajax.onload = function (e) {
      const el = document.createElement('code');
      for (let k in opt) {
        const v = opt[k];
        el.setAttribute(k, v);
      }
      el.innerHTML = ajax.responseText.replace(/\n/gim, "<br>");
      const item = document.head.appendChild(el);
      me._zz = item;
      me._preview.feed({
        kind: KIND.note,
        content: item.outerHTML
      });
    };
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "editor":
        this._editorWrapper = child;
        return
      case "header":
        this._draft.header = child.collection.toJSON()[0];
        return;

      case "tips":
        return this._tips = child;

      case "preview":
        return this._preview = child;
    }
  }

  /**
   * 
   */
  async setDefaultData() {
    await this.ensurePart("preview");
    await this.ensurePart("intro");
    let editor = await this.ensurePart("editor");
    await this.ensureElement(editor.el);
    this._editor = new JSONEditor(editor.el, {
      onChange: this._onChange.bind(this),
      onModeChange: this._onModeChange.bind(this)
    });

    this._name = "text";
    this._draft.text = require('./skeleton/text')(this);
    this._editor.set(this._draft.text);
    let el = this._editor.contentOuter.firstElementChild;
    el.className = `${el.className} box`;
    this.route();
  }

  /**
   * 
   * @param {*} name 
   * @param {*} data 
   * @param {*} tips 
   * @returns 
   */
  async setData(name, data, tips) {
    name = name || 'text';
    data = data || this._draft[name];
    const letc = _.clone(data);
    walk(letc);
    if (data.tips) {
      this.__intro.set({ content: data.tips });
    }
    this._editor.set(letc);
    this._preview.feed(data);
    this._name = name;
    if ((tips != null) && (this._tips != null)) {
      this._tips.feed(tips);
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = cmd.model.get(_a.service) || args.service;
    this.debug(` service=${service} -->`, cmd, args);
    switch (service) {
      case 'run':
        this._preview.feed(this._editor.get());
        if (this._name != null) {
          return this._draft[this._name] = this._editor.get();
        }
        break;
      case 'load':
        this.route(['', cmd.mget(_a.name)])
        this._preview.feed(this._editor.get());
        if (this._name != null) {
          return this._draft[this._name] = this._editor.get();
        }
        break;
      case 'show-tooltips':
        Butler.message(require('./skeleton/tips')(this));
        break;
      default:
        let content = cmd.mget(_a.content) || cmd.mget(_a.service) || cmd.mget(_a.kind)
        if (content) {
          this.__console.set({ content: `Widget ${content} was triggered` });
          //this.__console.el.dataset.poke = 1;
          let s1 = { scale: 1.1, background: "lightgreen" };
          let s2 = { scale: 1, background: "white" };
          this.__console.anim([0.3, s1], [0.3, s2]);
          setTimeout(() => {
            this.__console.el.dataset.poke = 1;
          }, 200)
          setTimeout(() => {
            this.__console.el.dataset.poke = 0;
          }, 2000)
        }
        this.debug("AAA:277", cmd);
        break;
    }
  }

  /**
   * 
   * @returns 
   */
  _onChange() {
    return this.debug("AAA:283 _onChange", this._editor.get());
  }

  /**
   * 
   * @returns 
   */
  _onModeChange() {
    return this.debug("AAA:291 _onModeChange");
  }




}
module.exports = __module_sandbox;