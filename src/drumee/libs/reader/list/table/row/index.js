/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

class __list_table_row extends LetcBlank {

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
    let columns = this.mget('columns');
    let keys = _.keys(columns);
    let grid = '';
    for (let k of keys) {
      grid = `1fr ${grid}`;
    }

    this.waitElement(this.el, () => {
      this.el.innerHTML = require("./template")(this, columns);
      this.el.dataset.even = this.mget('even');
      this.el.style.gridTemplateColumns = grid;
    });
  }
}
module.exports = __list_table_row;