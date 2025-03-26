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

class __window_chart_timeseries extends __window_analytics {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
   initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.model.atLeast({title: "Drumee Transfer Analytics"});
  }

  /**
   * 
   */
  onDomRefresh() {
    let api = this.mget(_a.api);
    let vars = this.mget(_a.vars);
    this.postService(api, { hub_id: Visitor.id, vars }, { async: 1 })
      .then((data) => {
        let margin = {
          top: 50,
          right: 20,
          bottom: 40,
          left: 60,
        };
        let time_format = '%y-%m-%d';
        let opt = _.map(this.mget(_a.view), (item)=>{
          if(!data[item.data]){
            this.warn(`Dataset not found for key ${item.data}`, item);
          };
          let r = {
            title: {
              text:item.title, 
              textAnchor: _a.left
            },
            kind : 'chart_line',
            time_format,
            rules: item.rules,
            margin,
            data : data[item.data]
          }
          return r;
        })
        this.raise();
        //let aaa = [];
        //opt.shift()
        //opt.shift()
        //aaa.push(opt.shift());
        //aaa.push(opt);
        //this.debug("AAA:58 aaa", opt[0],opt[1], opt[2]);
        this.feed(require('../skeleton')(this, opt));
      }).catch((e) => {
        this.warn(e);
        this.feed(require('../skeleton/forbiden')(this));
      })

  }

}
module.exports = __window_chart_timeseries;