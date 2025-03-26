// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : classes/button/icon
//   TYPE : class definition
// ==================================================================== *
const __builder = require("../../builder");

class __icon extends __builder {
  constructor(p, s) {
    super(p, s);
    const def_style = {
      width: _K.size.px40,
      height:_K.size.px40,
      padding : _K.size.px10
    };
    this.props    = p || {};
    this.style    = s || def_style;
    this.props.chartId = this.props.ico; 
    delete this.props.ico;
  }
}

module.exports = __icon;