
const _default =function(){
  const a = { 
    alwaysVisible : true,
    size       : "2px",
    opacity    : "1",
    color      : "#FA8540",
    distance   : "2px",    
    railColor  : "#E5E5E5"
  };
  return a;
};

const __builder = require("../../core");
class __stream extends __builder {
  constructor(p, s) {
    super(p, s);
    this._settings = _default();
  }

  render() {
    _.merge(this._settings, this.props.vendorOpt);
    const a = _.merge({}, super.render(), {
      kind      : KIND.list.smart,
      vendorOpt : this._settings
    });
    return a;
  }
}

module.exports = __stream;