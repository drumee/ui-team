// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/sandbox/ui
//   TYPE :
// ==================================================================== *


const __window_analytics = require('..');
/**
 * @class __window_search
 * @extends __window_interact
*/

class __window_analytics_transfer extends __window_analytics {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
   initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.mset(_a.title, "Drumee Transfer Analytics");
  }

  /**
   * 
   */
  onDomRefresh() {
    this.postService(SERVICE.analytics.transfer, { hub_id: Visitor.id }, { async: 1 })
      .then((data) => {
        this.debug("AAA:32", data);
        let margin = {
          top: 50,
          right: 20,
          bottom: 40,
          left: 60,
        };
        let time_format = '%y-%m-%d';
        let opt = [{
          title: {text:"Size of sent files (MB/day)", textAnchor: _a.left},
          color : "#18a3ac",
          kind : 'chart_line',
          time_format,
          rules: {
            x: 'day',
            y: 'size'
          },
          margin,
          data:data.usage
        }, {
          title: {text:"Numbers of transfers per day", textAnchor: _a.left},
          kind : 'chart_line',
          time_format,
          rules: {
            x: 'day',
            y: 'count'
          },
          margin,
          data:data.usage,
        },{
          title: {text:"Number of unique users", textAnchor: _a.left},
          kind : 'chart_line',
          time_format,
          rules: {
            x: 'day',
            y: 'senders'
          },
          margin,
          data:data.users,
        }]
        this.raise();
        this.feed(require('../skeleton')(this, opt));
      }).catch((e) => {
        this.warn(e);
        this.feed(require('../skeleton/forbiden')(this));
      })

  }

}
module.exports = __window_analytics_transfer;