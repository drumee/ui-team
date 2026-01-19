class __spinner_jump extends Marionette.View {

  static initClass() {
    this.prototype.templateName = '#--jump-loader'; //_T.wrapper.image
    this.prototype.behaviorSet =
      { modal: _K.char.empty };
    this.prototype.ui = {
      loader: '#--loader',
      circleL: '#--circleL',
      circleR: '#--circleR',
      jump: '#--jump'
    };
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    this._pluginLoaded = _.after(2, this._display);
  }

  _display(opt) {
    this._jumpRef = this.ui.jump.clone();
    this.ui.loader.append(this._jumpRef);
  }
  onDomRefresh() {
    this._pluginLoaded();
  }
}
__spinner_jump.initClass();
module.exports = __spinner_jump;
