class __empty_wrapper extends Marionette.View {
  // static initClass() {
  //   this.prototype.className = "flow-v empty-wrapper";
  //   this.prototype.templateName = "#--empty-view";
  // }

  /**
   * 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      content: ""
    });
    if (opt && opt.modelArgs) {
      this.model.set(opt.modelArgs);
    }
  }
}
//__empty_view.initClass();
module.exports = __empty_wrapper;
