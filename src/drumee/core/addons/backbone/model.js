/**
 * 
 * @param {*} attr 
 * @param {*} ext 
 * @returns 
 */
Backbone.Model.prototype.extend = function(attr, ext) {
  this.set(attr, {...this.get(attr), ...ext});
};

/**
 * Ensure required attributes are set to a default value
 * 
 * @param {*} opt 
 */
Backbone.Model.prototype.atLeast = function(opt) {
  for (let k in opt) {
    var v = opt[k];
    if ((this.get(k) == null)) {
      this.set(k, v)
    }
  }
};

