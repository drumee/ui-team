
const DEAD_LOCK = "Potential deadlock due to wrong kind returned!!!";

//########################################

class ___window_launcher extends LetcBox {
  static initClass() {
    this.prototype.fig  = 1;
    this.prototype.behaviorSet =
      {bhv_socket     : 1};
  }


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  async onRender(opt) {
    if (opt == null) { opt = {}; }
    let api = this.mget(_a.api);
    let args  = _.clone(this.mget(_a.args));
    const hub_id = this.mget(_a.hub_id);
    if (api != null ? api.service : undefined) {
      await this.fetchService(api);
    } else if (hub_id) {
      api = { 
        service : SERVICE.media.attributes,
        nid     : this.mget(_a.nid) || '0',
        hub_id
      };
      if (['me', "*"].includes(hub_id)) {
        api.hub_id = Visitor.id;
      }
    } else { 
      args = _.merge(args, require('./applications')(args));
      this.model.set(require('./applications')(args));
      if (args.kind === 'window_launcher') {
        this.warn(DEAD_LOCK);
        return;
      }
      Kind.waitFor(args.kind).then(this.renew.bind(this));
      return;
    }
    this.fetchService(api).then((res)=>{
      this.run(res, args, opt);
    })
  }

  /**
   * 
   * @param {*} data 
   * @param {*} args 
   * @param {*} opt 
   * @returns 
   */
  run(data, args, opt) {
    this.debug("AAA:68 -- run", data, args, opt, this);
    this.model.clear();
    opt = _.merge(data, args);
    data = require('./applications')(opt);
    this.model.set(require('./applications')(opt));
    if (data.kind === 'window_launcher') {
      this.warn(DEAD_LOCK);
      return;
    }
    Kind.waitFor(data.kind).then(this.renew.bind(this));
  }

  /**
   * 
   * @param {*} e 
   */
  failed(e) {
    this.warn("XXX launch FAILED", e, this);
    let data = {

    }
  }
}
___window_launcher.initClass();

module.exports = ___window_launcher;