
const { copyToClipboard } = require("core/utils");
class __devel_icons extends LetcBox {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    const icons = {
      normalized: [],
      raw: []
    };
    for (var el of Array.from($('svg [viewBox]'))) {
      var id = el.getAttribute(_a.id);
      id = id.replace('--icon-', '');
      if (id.match(/^raw-/)) {
        icons.raw.push(id);
      } else {
        icons.normalized.push(id);
      }
    }
    this.feed(require('./skeleton')(this, icons));
  }

  /**
   * 
   * @param {*} v 
   * @returns 
   */
  searchChildren(v) {
    const re = new RegExp(v);
    this.__normalized.children.forEach(function (n) {
      if (re.test(n.mget(_a.name))) {
        return n.setState(1);
      } else {
        return n.setState(0);
      }
    });
    return this.__raw.children.forEach(function (n) {
      if (re.test(n.mget(_a.name))) {
        return n.setState(1);
      } else {
        return n.setState(0);
      }
    });
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.mget(_a.service);
    switch (service) {
      case "search":
        var v = cmd.getValue();
        if (_.isEmpty(v)) {
          return;
        }
        return this.searchChildren(v);
      case _e.copy:
        let code = cmd.mget(_a.code);
        copyToClipboard(code);
        this.__dialog.feed(Skeletons.Note('Copied!'));
        setTimeout(() => { this.__dialog.clear() }, 3000);
        return;

    }
  }


  /**
   * 
   * @param {*} data 
   * @returns 
   */
  _prependRow(data) {
    this._acknowledge();
    const list = this.getPart(_a.list);
    list.prepend(require('./skeleton/row-view')(this, data));
  }

}

module.exports = __devel_icons;
