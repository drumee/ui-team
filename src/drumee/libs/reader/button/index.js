// =============================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/note
//   TYPE :
// =============================================================== *
const { xhRequest } = require("core/socket/request");
const _default_icon  = "rating-star";
const _default_class = "drumee-widget button-reader";
const _id_tag        = 'button-';



class __drumee_button extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.template = this.template.bind(this);
    this.loadData = this.loadData.bind(this);
    this.renderVector = this.renderVector.bind(this);
  }

  static initClass() {
    this.prototype.nativeClassName  = _default_class;
  }
  
  /**
   * 
   * @returns 
   */
  initialize() {
    super.initialize();
    this.icon = this.icon || new Backbone.Model(this.model.get(_a.styleIcon));
    if (!_.isEmpty(this.model.get(_a.content))) {
      this.model.set(_a.label, this.model.get(_a.content));
    }
    this.model.atLeast({
      chartId      : _default_icon,
      innerClass   : _K.char.empty,
      label        : _a.button,
      iconPosition : _a.left
    });
    this._id = _.uniqueId(_id_tag);
    return this.model.set(_a.widgetId, this._id);
  }
    // @declareHandlers()

  template(){
    return require('./template')(this);
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.draw();
    if (this.model.get(_a.iconType) === _a.vector) {
      return this.loadData();
    }
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  draw(opt) {
    this.$el.attr(_a.data.state, this.model.get(_a.state));
    this.$el.attr(_a.data.iconPosition,  this.model.get(_a.iconPosition));
    switch (this.model.get(_a.iconPosition)) {
      case _a.top: case _a.bottom:
        this.model.set(_a.flow, _a.y);
        this.el.dataset.flow = _a.y;
        break;
      case _a.left: case _a.right:
        this.model.set(_a.flow, _a.x);
        this.el.dataset.flow = _a.x;
        break;
    }


    this.$content = this.$el.find(`#${this._id}-label`);
    const g = ()=> {
      return this.renderPseudo();
    };
    this.waitElement(this.$content[0], g);

    this.$icon = this.$el.find(`#${this._id}-icon`);
    const f = ()=> {
      this._width  = this.icon.get(_a.width)  || this.$el.innerWidth();
      this._height = this.icon.get(_a.height) || this.$el.innerHeight();
      const size = Math.min(this._width, this._height);
      let style = {
        width  : size.px(),
        height : size.px()
      };
      style = _.merge(style, this.icon.toJSON());
      this.icon.set(style);
      this.$icon.css(style); //@icon.toJSON()
      return this.$icon.attr(_a.data.hide, _a.no);
    };
    return this.waitElement(this.$icon[0], f);
  }


  /**
   * 
   */
  loadData() {
    const f =data => {
      this.waitElement(this.$icon[0], this.renderVector, data);
    };
    xhRequest(this.mget(_a.url)).then(f).catch((e)=>{
      this.warn("Failed to load", url, e);
    });
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  renderVector(data) {
    if (!super.renderVector(data)) {
      this.$icon = this.$el.find(`#${this._id}-icon`); //@$el.find("#icon-#{@_id}")                   
      const width  = this.icon.get(_a.width)  || this.$el.innerWidth();                                
      const height = this.icon.get(_a.height) || this.$el.innerHeight();                               
      //@debug "GSSSSSSSSSSS_renderData width=#{width} heught=#{height}", @icon.toJSON()  
      return this.$icon.css(this.icon.toJSON());
    }
  }

  /**
   * 
   * @param {*} refresh 
   * @returns 
   */
  mould(refresh) {
    if (refresh == null) { refresh = false; }
    this.setState();
    if (this.model.get(_a.url) != null) {
      return this.loadData();
    } else {
      this.el.innerHTML = _template(this.model.toJSON());
      return this.draw();
    }
  }
}
__drumee_button.initClass();

module.exports = __drumee_button;
