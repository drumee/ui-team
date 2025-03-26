require('./skin');
const List = require("..")
class __list_table extends List {
  constructor(...args) {
    super(...args);
    this.template = this.template.bind(this);
  }

  /**
   * 
   */
  static initClass() {
    this.prototype.childViewContainer = '.table-body';
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
  responsive() {
    let id = `${this._id}-header`;
    let el = document.getElementById(id);
    try {
      let h = this.$el.height() - el.outerHeight();
      this.__container.style.height = `${h}px`;
    } catch (e) {
      this.debug(e)
    }
  }

  /**
   * 
   */
  initHeader(data) {
    if (_.isEmpty(data)) return;
    //if(this._headerInited) return;
    let id = `${this._id}-header`;
    let el = document.getElementById(id);
    this.__header = el;
    let { columns } = data;
    if (!columns) {
      return ``;
    }
    let keys = _.keys(columns);
    let grid = '';
    for (let k of keys) {
      grid = `1fr ${grid}`;
    }
    el.innerHTML = require("./template/head")(this, keys);
    el.style.gridTemplateColumns = grid;
    this._headerInited = 1;
    this.responsive()
  }

  /**
   * 
   */
  prepare(data) {
    const itemsOpt = this.mget(_a.itemsOpt);
    const map = this.mget(_a.itemsMap) || {};
    let i = 0;
    data = _.map(data, item => {
      i++;
      let columns = { ...item }
      item = {
        kind: 'list_table_row',
        columns,
        even: i % 2
      }
      if (!itemsOpt) {
        return item;
      }
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
    this.initHeader(data[0]);
    return data;
  }

}
__list_table.initClass();


module.exports = __list_table;
