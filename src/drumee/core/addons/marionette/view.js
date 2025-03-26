
const { View } = Marionette;

View.prototype.getTemplate = () => _.template();

/**
 * 
 * @returns 
 */
View.prototype.cut = function () {
  if (this.parent && this.parent.collection) {
    this.parent.collection.remove(this.model);
    this.parent.triggerMethod(_e.removeChild, this);
    this.parent.trigger(_e.removeChild, this);
  }
  return this.destroy();
};

/**
 * 
 * @returns 
 */
View.prototype.suppress = function () {
  return this.cut();
};

View.prototype.template = id => _.template();
