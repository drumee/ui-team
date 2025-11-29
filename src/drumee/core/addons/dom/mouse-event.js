
MouseEvent.prototype.getService = function (el) {
  this.stopImmediatePropagation();
  this.stopPropagation();
  let service = null;
  let p = this.target;
  while (p) {
    let service = p.dataset?.service;
    if (service) return service;
    p = p.parentNode;
  }
  return service;
};