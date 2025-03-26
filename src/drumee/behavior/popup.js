class __bhv_popup extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this.onBeforeRender = this.onBeforeRender.bind(this);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onOpen = this.onOpen.bind(this);
    this._reset = this._reset.bind(this);
  }

  onBeforeRender() {
    return RADIO_BROADCAST.on(_e.document.click, this._reset);
  }

  onBeforeDestroy() {
    return RADIO_BROADCAST.off(_e.document.click, this._reset);
  }
// ============================
//
// ============================

// ===========================================================
// onDomRefresh
//
// @return [Object] 
//
// ===========================================================
  onDomRefresh(){
    let $target, left, top;
    const target = this.view.model.get(_a.target); 
    if (_.isString(target)) {
      $target = $(target);
    } else if ((target == null)) {
      $target = this.$el;
    } else { 
      $target =  target;
    }
    switch (this.view.model.get(_a.anchor)) {
      case _a.context:
        this.view.showInViewPort();
        return;
        break;
      case _a.north:
        ({
          top
        } = $target.position());
        left = $target.position().left - $target.width();
        break;
      case _a.northEst:
        top = $target.position().top - this.$el.height();
        ({
          left
        } = $target.position());
        break;
      case _a.est:
        ({
          top
        } = $target.position());
        ({
          left
        } = $target.position());
        break;
      case _a.southEst:
        top = $target.position().top + $target.height();
        ({
          left
        } = $target.position());
        break;
      case _a.south:
        top = $target.position().top + $target.height();
        left = $target.position().left - ($target.width()/2);
        break;
      case _a.southWest:
        top = $target.position().top + $target.height();
        left = $target.position().left - this.$el.width();
        break;
      case _a.west:
        ({
          top
        } = $target.position());
        left = $target.position().left - this.$el.width();
        break;
      case _a.northWest:
        top = $target.position().top - this.$el.height();
        left = $target.position().left - this.$el.width();
        break;
      default:
        top = $target.position().top + $target.height();
        left = $target.position().left - $target.width();
    }
    top  = $target.offset().top + top;
    left = $target.offset().left + left;
    this.debug(`<<KK popup target top=${top}, left=${left}`, this.view.get(_a.anchor), this.view);
    return this.$el.css({left, top, position:_a.absolute});
  }

// ============================
//
// ============================

// ===========================================================
// onOpen
//
// @param [Object] content
//
// @return [Object] 
//
// ===========================================================
  onOpen(content){
    if (this.view._isOpening) {
      return;
    }
    return this._open();
  }
// ========================
//
// ========================

// ===========================================================
// _reset
//
// @param [Object] src
//
// @return [Object] 
//
// ===========================================================
  _reset(src){
    this.debug("<<KK _reset", src, this._content, this.view);
    switch (this.view._persistence) {
      case _a.always:
        return;
      case _a.none:
        return this.view.destroyChildren();
      case _a.self:
        try {
          if ((this.view._handler.ui.cid === src.cid) ||  (this.view._handler.ui.cid === (src.parent != null ? src.parent.cid : undefined))) {
            return;
          }
        } catch (error) {}
        return this.view.destroyChildren();
    }
  }
}
module.exports = __bhv_popup;
