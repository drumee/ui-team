
class __widget_members_search extends LetcBox {


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize();
    this.type = this.mget(_a.type);
    this.declareHandlers();
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.feed(require('./skeleton').default(this));
  }

  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);

    if (pointerDragged) {
      return;
    }

    switch (service) {
      case _a.close:
        this.goodbye();
        this.service = 'close-search-bar';
        return this.triggerHandlers();

      case 'show-member-detail':
        /** Handler expect function data */
        this.data = () => {
          return cmd.data()
        }
        this.triggerHandlers({ service });
        return this.goodbye();

      default:
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
    }
  }


  /**
   * 
   * @returns 
   */
  getCurrentApi() {

    const api = {
      service: SERVICE.adminpanel.member_list,
      orgid: this.mget('orgId'),
      key: this.mget(_a.search),
      order: 'desc',
      //hub_id  : Visitor.get(_a.id)
    };

    return api;
  }

}

__widget_members_search.initClass();

module.exports = __widget_members_search;
