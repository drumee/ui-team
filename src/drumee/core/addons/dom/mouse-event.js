
MouseEvent.prototype.getService = function(el){
  this.stopImmediatePropagation();
  this.stopPropagation();
  let max = 0;
  let {
    target
  } = this;
  let {
    service
  } = target.dataset;
  while ((target !== el) && (service == null) && (max < 20)) {
    ({
      service
    } = target.dataset);
    target = this.target.parentNode;
    max++;
  }
  return service;
};