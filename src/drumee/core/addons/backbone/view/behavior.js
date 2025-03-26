//-----------------------------------
//  Copyright Thidima SA
//  Proxy module
//  Mixins export, to be imported as on demand methods
//-----------------------------------
const __preset = {
  bhv_radio: require("behavior/radio"),
  bhv_radiotoggle: require("behavior/radio-toggle"),
  bhv_toggle: require("behavior/toggle"),
  bhv_wrapper: require("behavior/wrapper")
};

const __configured = {
  flyover: require("behavior/flyover"),
  radio: require("behavior/radio"),
  radiotoggle: require("behavior/radio-toggle"),
  state: require("behavior/toggle"),
  toggle: require("behavior/toggle"),
  wrapper: require("behavior/wrapper")
};


Backbone.View.prototype.behaviors = function () {
  let behaviorSet, k, sel, v;
  if (_.isFunction(this.behaviorSet)) {
    behaviorSet = this.behaviorSet();
  } else {
    ({ behaviorSet } = this);
  }

  const list = {};
  for (k in behaviorSet) {
    v = behaviorSet[k];
    sel = __preset[k];
    if (sel != null) {
      if (!_.isObject(v)) {
        v = { args: v };
      }
      list[sel.name] = { ...v, behaviorClass: sel };
    }
  }
  for (k in this.options) {
    v = this.options[k];
    sel = __configured[k];
    if (sel != null) {
      var tmp = list[sel.name] || {};
      if (!_.isObject(v)) {
        v = { args: v };
      }
      list[sel.name] = { ...tmp, ...v, behaviorClass: sel };
    }
  }
  if(list.behavior_radio && list.behavior_toggle){
    delete list.behavior_toggle
  }
  return _.values(list);
};
