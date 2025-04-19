/*
   Copyright Xialia.com  2011-2019
   FILE : src/drumee/router/gateway
   TYPE :
 */

const HANDLER = {};
class __drumee_bridge extends Backbone.Model {
  start(target) {
    for (var c in this.toJSON()) {
      let name = this.get(c);
      if (!name) {
        this.warn(`Could not find handler ${name} of the event ${c}`);
        continue;
      }
      if (_.isFunction(target[name])) {
        let sig = `${c}-${target.cid}`;
        HANDLER[sig] = target[name].bind(target);
        edBridge.on(c, HANDLER[sig]);
      }
    }
    target.on(_e.destroy, () => {
      this.debug("AAA:23 DESTROY");
      for (var c in this.toJSON()) {
        let name = this.get(c);
        if (!name) {
          continue;
        }
        if (_.isFunction(target[name])) {
          let sig = `${c}-${target.cid}`;
          edBridge.off(c, HANDLER[sig]);
        }
      }
    })
  }

  /**
   * 
   */
  destroy() {
    for (var c in this.toJSON()) {
      edBridge.off(c, HANDLER[c]);
    }
    this.clear();
    super.destroy();
  }
}

module.exports = function (target, events) {
  if (!events || !target) return;
  let o = new __drumee_bridge(events);
  o.start(target);
  return o;
};
