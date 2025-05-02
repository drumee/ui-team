
const __core = require('../core');
class __account_preferences extends __core {

  static initClass() {
    this.prototype.figName = 'account_preferences';
    this.prototype.behaviorSet =
      { bhv_socket: 1 };
  }

  // ===========================================================
  // initialize
  // ===========================================================

  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    const wp = Platform.get('wallpaper');
    this._api = {
      service: SERVICE.media.get_by_type,
      page: 1,
      type: _a.image,
      nid: wp.path,
      sort: _a.rank,
      order: 'desc',
      vhost: wp.vhost,
      timer: 2000
    };
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton/main')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    let service;
    if (cmd.status === _e.submit) {
      service = cmd.model.get(_a.service) || cmd.status;
    } else if (cmd.source != null) {
      service = cmd.source.model.get(_a.service);
    } else {
      service = cmd.model.get(_a.service);
    }

    switch (service) {
      case 'set-wallpaper':
        var opt = {
          wallpaper: {
            nid: cmd.model.get(_a.nodeId),
            hub_id: cmd.model.get(_a.hub_id) || cmd.model.get(_a.ownerId),
            vhost: cmd.model.get(_a.vhost)
          }
        };
        return this.postService({
          service: SERVICE.drumate.update_settings,
          settings: opt,
          hub_id: Visitor.id
        }, { async: 1 }).then((data) => {
          Visitor.set({ settings: JSON.parse(data.settings) });
          uiRouter.setWallpaper(Visitor.wallpaper());
        });

      case 'change-lang':
        var l = cmd.model.get(_a.value);
        localStorage.lang = l;
        localStorage.setItem('UIlanguage', l);
        return this.postService({
          service: SERVICE.drumate.set_lang,
          Xlang: cmd.model.get(_a.value),
          hub_id: Visitor.id
        }).then(()=>{
          Drumee.locale(l);
          setTimeout(()=>{
            uiRouter.restart();
          }, 2000);
        })
    }
  }

  /**
   * Do not remove
   */
  __responsive() { }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "roll-wallpaper":
        return this.wallpaper = child;

      case "roll-language":
        return this.language = child;
    }
  }

}
__account_preferences.initClass();

module.exports = __account_preferences;
