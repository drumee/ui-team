/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class ___disk_usage extends LetcBox {


  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }


  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    let { plan } = Visitor.get('plan_detail');
    this.plan = plan || 'trial';
    if (this.mget(_a.update)) {
      this.postService({
        service: SERVICE.desk.limit,
        hub_id: Visitor.id
      }, {sync:1}).then((data)=>{
        this.data = data;
        this.feed(require('./skeleton')(this, data));
      })
      return;
    }
    this.feed(require('./skeleton')(this, Visitor.get(_a.quota)));

  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
  }

}

module.exports = ___disk_usage
