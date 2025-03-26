function parseGeometry(arg) {
  const size = {};
  if (_.isObject(arg)) {
    size.height = parseInt(arg.height);
    size.width = parseInt(arg.width);
    return size;
  }
  if (_.isString(arg) && arg.match(/(\d+x\d+)/)) {
    const t = arg.split("x");
    size.width = parseInt(t[0]);
    size.height = parseInt(t[1]);
    return size;
  }
  this.warn("Invalid geometry");
  return size;
}
Backbone.View.prototype.guessSize = function() {
  // Guessing size of an element
  //
  // @return [Array] size Height and Width of Object
  //
  const size = {};
  if (this._isShown) {
    size.width  = parseInt(this.$el.width());
    size.height = parseInt(this.$el.height());
    return size;
  }
  // set by the user
  if (this.model != null) {
    const styleOpt = this.model.get(_a.styleOpt);
    if (styleOpt != null) {
      size.height = parseInt(styleOpt.height);
      size.width  = parseInt(styleOpt.width);
      if (_.isFinite(size.height) && _.isFinite(size.width)) {
        return size;
      }
    }
  }
  const geo = parseGeometry(this.geometry);
  size.height = size.height || geo.height;
  size.width  = size.width  || geo.width;
  return size;
};

// =================================== *
// get dimensions considering paddings& margins
// =================================== *
Backbone.View.prototype.getBounds = function() {
  // Getting bounds of an element
  //
  // @return [Array] Left, Right, Top and Bottom
  //
  let styleOpt = this.model.get(_a.styleOpt);
  let top    = 0;
  let right  = 0;
  let bottom = 0;
  let left   = 0;
  if (this._isShown) {
    left   = parseInt(this.$el.css(_a.padding.left))    || 0;
    right  = parseInt(this.$el.css(_a.padding.right))   || 0;
    top    = parseInt(this.$el.css(_a.padding.top))     || 0;
    bottom = parseInt(this.$el.css(_a.padding.bottom))  || 0;
    left   += parseInt(this.$el.css(_a.border.left))    || 0;
    right  += parseInt(this.$el.css(_a.border.right))   || 0;
    top    += parseInt(this.$el.css(_a.border.top))     || 0;
    bottom += parseInt(this.$el.css(_a.border.bottom))  || 0;
  } else if ((this.model != null) && (styleOpt != null)) {
    styleOpt = this.model.get(_a.styleOpt);
    left   = parseInt(styleOpt[_a.padding.left])    || 0;
    right  = parseInt(styleOpt[_a.padding.right])   || 0;
    top    = parseInt(styleOpt[_a.padding.top])     || 0;
    bottom = parseInt(styleOpt[_a.padding.bottom])  || 0;
    left   += parseInt(styleOpt[_a.border.left])    || 0;
    right  += parseInt(styleOpt[_a.border.right])   || 0;
    top    += parseInt(styleOpt[_a.border.top])     || 0;
    bottom += parseInt(styleOpt[_a.border.bottom])  || 0;
  }
  return {top, right, bottom, left};
};


// =============================================================
//
// =============================================================
Marionette.View.prototype.showInViewPort = function(viewPortWidth, offset) {
  // Position the view by making it always visible in the viewport
  //
  // @param [Number] viewPortWidth
  // @param [Number] offset
  //
  let e, pageX, pageY;
  if (offset == null) { offset = 0; }
  try {
    e = this._currentEvent || this.model.get(_a.currentEvent); // router.get(_a.currentEvent)
  } catch (error) {}
    // Take out from router
  if ((e == null)) {
    console.warn("showInViewPort : no currentEvent");
    return;
  }
  if (e.pageY != null) {
    ({
      pageX
    } = e);
    ({
      pageY
    } = e);
  } else {
    pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
  }
  const rect = e.target.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  const pos = {
    client: { x: e.clientX, y: e.clientY },   // relative to the viewport
    screen: { x: e.screenX, y: e.screenY },   // relative to the physical screen
    offset: { x: offsetX,     y: offsetY },       // relative to the event target
    page:   { x: pageX,       y: pageY }         // relative to the html document
  };
  const _height = this.$el.height() || this.$el.children().height();
  const _width  = this.$el.width()  || this.$el.children().width();
  const top = _.min([pos.page.y, ((window.innerHeight + window.scrollY) - _height)]);
  const left = _.min([pos.page.x, ((window.innerWidth + window.scrollX) - _width)]);
  return this.$el.css({left, top, position:_a.absolute});
};
