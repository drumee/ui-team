/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class Subscribe {
  constructor(props, style) {
    this.props = props;
    this.style = style;
  }

  render() {
    return {
      handler  : { 
        ui     : this.props.handler
      },
      service  : this.props.service,
      signal   : _e.ui.event,
      styleOpt : this.style
    };
  }
}

module.exports = Subscribe;