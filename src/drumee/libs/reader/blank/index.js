class __widget_blank extends Marionette.View {
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      flow: _a.x
    });
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    const renderer = this.mget(_a.renderer);
    const content = this.mget(_a.content);
    if (content) {
      return this.el.innerHTML = content;
    } else if (_.isFunction(renderer)) {
      return this.$el.append(renderer(this));
    }
  }
}

module.exports = __widget_blank;
