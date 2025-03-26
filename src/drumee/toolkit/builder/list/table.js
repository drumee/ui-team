
const __builder = require("../../core");
class __table extends __builder {

  render() {
    const { vendorOpt } = this.props || {}
    const _default = require("./options");
    return {
      ...super.render(), 
      vendorOpt: {..._default(), vendorOpt},
      kind: KIND.list.table,
    };
  }
}

module.exports = __table;