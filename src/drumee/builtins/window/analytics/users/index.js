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

class __window_analytics_users extends __window_analytics {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
   initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.mset(_a.title, "Drumates growth");
  }

  /**
   * 
   */
  onDomRefresh() {
    this.postService(SERVICE.analytics.users, { hub_id: Visitor.id }, { async: 1 }).then((data) => {
      //this.debug("AAAA:DATA", data);
      let opt = [{
        kind: 'chart_line',
        title: {text:"Drumates Growth", textAnchor: _a.left},
        time_format: '%y-%m-%d',
        margin: {
          top: 50,
          right: 20,
          bottom: 40,
          left: 60,
        },
        rules: {
          x: 'date',
          y: 'users'
        },
        data
      }];
      this.raise();
      this.feed(require('../skeleton')(this, opt));
    }).catch(() => {
      this.feed(require('../skeleton/forbiden')(this));
    })

  }

}
module.exports = __window_analytics_users;