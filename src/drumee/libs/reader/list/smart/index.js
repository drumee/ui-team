require('./skin');
const List = require("..")
class __list_smart extends List {
  constructor(...args) {
    super(...args);
    this.template = this.template.bind(this);
  }

  /**
   * 
   */
  static initClass() {
    this.prototype.childViewContainer = '.smart-container';
  }

  /**
   * 
   */
  template() {
    return _.template(require('./template')(this));
  }



  /**
   * 
   */
  prepare(data) {
    const itemsOpt = this.mget(_a.itemsOpt);
    if (!itemsOpt) {
      return;
    }
    const map = this.mget(_a.itemsMap) || {};
    return _.map(data, item => {
      const ext = {};
      for (let k in map) {
        const v = map[k];
        ext[v] = item[k];
      }
      if (_.isFunction(itemsOpt)) {
        item = { ...item, ...itemsOpt(this, item) };
      } else {
        item = { ...item, ...itemsOpt };
      }
      item = { ...item, ...ext };
      return item;
    });
  }

}
__list_smart.initClass();


module.exports = __list_smart;
