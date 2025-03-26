class __core_skeleton {
  constructor(props, style) {
    this.props = props;
    this.style = style;
  }

  render() {
    const a = {};
    for (var k in this.props) {
      var v = this.props[k];
      switch (k) {
        case 'ui':
          a.uiHandler = v; 
          delete this.props[k];
          break;

        case 'part':
          a.partHandler = v; 
          delete this.props[k];
          break;
          
        // when 'uiHandler', 'partHandler', 'client', 'error'
        //   a.handler = a.handler || {}
        //   a.handler[k] = v

        // when 'uiHandler', 'partHandler', 'client', 'error'
        //   a.handler = a.handler || {}
        //   a.handler[k] = v

        case 'api':
          if (_.isString(v)) {
            a.api = 
              {service : v};
          } else { 
            a.api = v;
          }
          break;

        case 'cn':
          a.className = v.bem();
          delete this.props.cn;
          break;

        case 'item':
          a.itemsOpt = this.props.item;
          delete this.props.item;
          break;

        default: 
          a[k] = v; 
      }
    }

    if (a.handler) {
      a.signal   = _e.ui.event;
    }

    if (this.props.service) {
      a.service  = this.props.service;
    }

    a.className = a.className || '';

    if (this.style) {
      a.styleOpt = a.styleOpt || {};
      _.merge(a.styleOpt, this.style);
    }

    return a;
  }
}
module.exports = __core_skeleton;