/**
 * Hack, Composite collection fire 'show' twice on set
 * @param {*} a 
 * @returns 
 */
Backbone.Collection.prototype.cleanSet = function (a) {
  this.reset();
  return this.add(a);
};

/**
 * 
 * @param {*} a 
 * @returns 
 */
Backbone.Collection.prototype.replace = function (a) {
  this.reset();
  return this.add(a);
};

Backbone.Collection.prototype.sortByField = function (field, direction) {
  let sorted = _.sortBy(this.models, function (model) {
    return model.get(field);
  });

  if (/^des/.test(direction)) {
    sorted = sorted.reverse();
  }
  console.log("SOERT", this, direction, sorted)
  this.set(sorted);
};