const _id_tag        = 'entry-';

//-------------------------------------
//
//-------------------------------------
class __entry_text extends LetcBox {
  constructor(...args) {
    super(...args);
    this.reload = this.reload.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.getData = this.getData.bind(this);
  }

  static initClass() {
    this.prototype.events  = {
      'keyup .note-content'      : 'keyup',
      'click .note-content'  : 'edit'
    };
    this.prototype.figName  = "entry_text";
  
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      flow        : _a.wrap,
      placeholder : LOCALE.ENTER_TEXT,
      innerClass  : _K.char.empty,
      content     :  this.mget(_a.alt) || this.mget(_a.value)
    });
    this._id = _.uniqueId(_id_tag);
    this.mset({ 
      widgetId : this._id
    });
  }
      
  /**
   * 
   * @param {*} e 
   * @returns 
   */
  keyup(e){
    e.stopPropagation();
    this.checkPlaceholder();
    return false;
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  edit(e){
    if (this.$content[0]) {
      return this.$content[0].dataset.empty = 0;
    }
  }

  /**
   * 
   * @returns 
   */
  reload() {
    this.debug("OOOON 52 aa===>", this);
    return this.feed(Skeletons.Box.Y({
      className : `${this.fig.family} ${this.fig.family}__container`,
      sys_pn    : "ref-content",
      active    : 0,
      handler   : {
        part    : this
      }
    })
    );
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.declareHandlers(); 
    return this.reload();
  }


  /**
   * 
   * @param {*} e 
   * @returns 
   */
  checkPlaceholder(e){
    const v = this.$content.text().trim();
    if (_.isEmpty(v)) { 
      return this.$content[0].dataset.empty = 1;
    } else { 
      return this.$content[0].dataset.empty = 0;
    }
  }


  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "ref-content":
        this.content = child;
        return child.on(_e.show, ()=> {
          child.$el.append(require('./template/main')(this));
          return this.waitElement(this._id, ()=> {
            this.$content = this.$el.find(`#${this._id}`);
            this.checkPlaceholder();
            return this.$content.focus();
          });
        });
    }
  }

  /**
   * 
   * @returns 
   */
  getData(){
    const v = this.$content.text();
    const n = this.mget(_a.name);
    if (n != null) {
      return {name:n, value:v};
    }
    return {value:v};
  }
}
__entry_text.initClass();


module.exports = __entry_text;
