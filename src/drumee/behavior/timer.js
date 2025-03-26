/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/behavior/timer
//   TYPE : 
// ==================================================================== *

class __behavior_timer extends Marionette.Behavior {
// ======================================================
//
// ======================================================

// ===========================================================
// onDomRefresh
//
// @return [Object] 
//
// ===========================================================
  onDomRefresh() {
    //_dbg 'TIMER START'
    const t = this.view.get(_a.timer);
    _dbg('TIMER', t);
    if (!(t != null ? t.delay : undefined)) {
      return;
    }
    const f = ()=> {
      if (this.view.isDestroyed()) {
        return;
      }
      for (var k in t) {
        var v = t[k];
        _dbg('TIMER RUNNING', k, v);
        switch (k) {
          case 'delay':
            noOperation();
            break;
          case _a.userAttributes:
            if (_.isObject(v)) {
              this.$el.attr(v);
            } else {
              this.$el.attr(k, v);
            }
            break;
          default:
            if (_.isObject(v)) {
              this.view.model.extend(k,v);
            } else {
              this.view.model.set(k, v);
            }
        }
      }
      return this.view.render();
    };
    return _.delay(f, t.delay);
  }
}
module.exports = __behavior_timer;
