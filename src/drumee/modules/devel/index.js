require('./skin');
class __devel_router extends LetcBox {


  initialize(opt) {
    super.initialize(opt);
    this._contextmenu = true;
    this._origin = {};
    this.model.set({
      device: _a.desktop,
      lang: Visitor.language(),
      flow: _a.vertical
    });

    this._page = {};
    this.declareHandlers();

    window.Devel = this;
  }


  /**
   * 
   */
  onDomRefresh() {
    this.route();
  }
  
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  route(opt) {
    if (opt == null) { opt = []; }
    opt = Visitor.parseModule();
    const tab = opt[1];

    switch (tab) {
      case "log":
        return this.feed({ kind: 'backend_log' });

      case "locale":
        return this.feed({ kind: 'locale' });

      case "icons":
        return this.feed({ kind: 'devel_icons' });

      default:
        return Butler.say(`<u>devel/${tab}</u>`.printf(LOCALE.MODULE_NOT_FOUND));
    }
  }
}
module.exports = __devel_router;
