// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/libs/reader/text
//   TYPE :
// ==================================================================== *

const dompurify = require('dompurify');

const _id_tag = 'note-';
const _default_class = "drumee-widget note-reader";

class ___drumee_text extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onUpdate = this.onUpdate.bind(this);
    this.getData = this.getData.bind(this);
    this.getText = this.getText.bind(this);
    this.set = this.set.bind(this);
  }

  static initClass() {
    this.prototype.nativeClassName = _default_class;
    this.prototype.figName = "drumee_text";
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      flow: _a.wrap,
      placeholder: LOCALE.ENTER_TEXT,
      innerClass: _K.char.empty,
      use_mask: 0,
      content: this.mget(_a.alt) || this.mget(_a.value)
    });
    this._id = _.uniqueId(_id_tag);
    this.model.set(_a.widgetId, this._id);
    this.escapeContextmenu = this.mget('escapeContextmenu') || false;
  }


  /**
   * 
   *  */
  onDomRefresh() {
    this.cleanText();
    this.draw();
  }


  /**
   * 
   */
  draw() {
    this.$el.attr(_a.data.state, this.mget(_a.state));
    this.$content = this.$el.find(`#${this._id}`);
    const g = () => {
      this.renderPseudo();
    };
    this.waitElement(this.$content[0], g);
  }


  /**
   * 
   * @param {*} src 
   */
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
    if (this.mget(_a.name) != null) {
      return { 
        name: this.mget(_a.name), 
        value: this.mget(_a.value)
      };
    }
    return null;
  }

  /**
   * 
   */
  cleanText() {
    let m = this.model.toJSON();
    let c = m.content || m.value || m.label || m.text || '';
    let tags = this.mget(_a.tags) ||  _K.allowed_tag;
    
    this.el.innerHTML = `
      <div id="${m.widgetId}-inner" class="${m.innerClass} ${this.fig.family} inner note-content">
        ${dompurify.sanitize(c, {ADD_ATTR: ['target'], ALLOWED_TAGS: tags})}
      </div>`

  }

  /**
   * 
   * @returns 
   */
  getText() {
    return this.el.innerText;
  }


  /**
   * 
   * @param {*} opt 
   * @param {*} val 
   */
  set(opt, val) {
    if (_.isString(opt)) {
      this.model.set(opt, val);
    } else {
      this.model.set(opt);
    }
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
}
___drumee_text.initClass();


module.exports = ___drumee_text;
