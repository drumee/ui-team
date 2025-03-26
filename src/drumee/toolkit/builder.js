/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ERR1 = "FAILED TO APPLY KIDS OPTIONS";
const ERR2 = "FAILED TO POLULATE";

const __core = require("./core");
class __skeleton_builder extends __core {
  render(opt){
    const a = _.merge({}, super.render(), opt);
     
    if (_.isObject(a.kidsOpt)) {
      if (_.isArray(a.kids)) {
        for (var k of Array.from(a.kids)) {
          _.merge(k, a.kidsOpt);
        }
      }
    }
      // catch e 
      //   console.warn ERR1, a, e

    if (_.isArray(a.populate)) {
      const o = a.populate.shift();
      if (o.ui && !o.signal) {
        o.signal = _e.ui.event; 
      }
      a.kids = a.kids || [];
      let append = 1;
      if (o._prepend) {
        append = 0;
        delete o._prepend;
      }
      try { 
        let el;
        if (append) {
          for (el of Array.from(a.populate)) {
            a.kids.push(_.merge({}, o, el));
          }
        } else { 
          for (el of Array.from(a.populate.reverse())) {
            a.kids.unshift(_.merge({}, o, el));
          }
        }

      } catch (e) { 
        console.warn(ERR2, a, e);
      }
    }
    return a;
  }
}
module.exports = __skeleton_builder;