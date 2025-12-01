const __builder = require("../../builder");

class __svg extends __builder {
  constructor(p, s) {
    super(p, s);
    this.props = p || {};
    if (this.props.ico) {
      this.props.chartId = this.props.ico;
      delete this.props.ico;
    }
  }
}

module.exports = __svg;