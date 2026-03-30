class __tooltips extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.update = this.update.bind(this);
    this.move = this.move.bind(this);
  }

  /**
   * 
   * @returns 
   */
  initialize() {
    super.initialize();
    if ((this.model.get(_a.content) == null)) {
      const c = this.getOption(_a.content) || _K.string.empty;
      return this.model.set(_a.content, c);
    }
  }

  /**
   * 
   * @param {*} content 
   * @returns 
   */
  update(content){
    this.model.set(_a.content, content);
    return this.render();
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  move(e){
    const left = e.clientX || e.pageX;
    let top = e.clientY || e.pageY;
    top = top + window.scrollY;
    this.$el.css({
      left,
      top
    });
  }
}

module.exports = __tooltips;
