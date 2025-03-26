// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/button/icon
//   TYPE : class definition
// ==================================================================== *
const __builder = require("../../builder");

class __label extends __builder {
  constructor(p, s) {
    super(p, s);
    this.props    = p || {};
    if (this.props.ico) { 
      this.props.chartId  = this.props.ico; 
      delete this.props.ico;
    }
  }
}

module.exports = __label;