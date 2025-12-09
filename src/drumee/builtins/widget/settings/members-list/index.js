require('./skin');
class settings_members_list extends DrumeeMFS {
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    if (opt.media) {
      this.copyPropertiesFrom(opt.media)
    }
    this.mset({
      api: {
        service: SERVICE.hub.get_members_by_type,
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.actual_home_id),
        type: 'all'
      }
    })
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }


}

module.exports = settings_members_list;
