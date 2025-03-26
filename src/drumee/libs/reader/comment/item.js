class __comment_item extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this._enter = this._enter.bind(this);
    this._leave = this._leave.bind(this);
    this._delete = this._delete.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
  //   templateName: "#comment-item"
  //   className: _C.flow.y
  // 
  //   regions:
  //   ui:
  //     _delete        : '.delete'
  // 
  //   events:
  //     'mouseenter'    : '_enter'
  //     'mouseleave'    : '_leave'
  //     'click .delete' : '_delete'
  // 
  //   behaviorSet
  //     socket:1
    this.prototype.templateName = "#comment-item";
    this.prototype.className = _C.flow.y;
    this.prototype.regions = {
      spinnerRegion   : '#region-spinner',
      ratingRegion    : '#region-rating'
    };
    this.prototype.ui =
      {_delete        : '.delete'};
    this.prototype.events = {
      'mouseenter'    : '_enter',
      'mouseleave'    : '_leave',
      'click .delete' : '_delete'
    };
    behaviorSet({
      socket:1});
  }
    //bhv__dispatchRest : _K.char.empty
// =================== *
//
// =================== *

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    const m = Dayjs.unix(this.model.get('ctime'));
    this.model.set('moment', m.fromNow());
    return this.model.set(_a.area, xui.site.get(_a.area));
  }
// ============================================
//
// ============================================

// ===========================================================
// onRender
//
// ===========================================================
  onRender() {
    return this.ui._delete.attr(_a.data.hide, _a.yes);
  }
// ============================================
//
// ============================================

// ===========================================================
// _enter
//
// ===========================================================
  _enter() {
    const uid = xui.visitor.get(_a.id);
    const privilege = xui.visitor.get(_a.privilege) & 0x18;
    if ((uid === this.model.get(_a.author_id)) || (privilege > 0)) {
      return this.ui._delete.attr(_a.data.hide, _a.no);
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// _leave
//
// ===========================================================
  _leave() {
    this.ui._delete.attr(_a.data.hide, _a.yes);
// ============================================
//
// ============================================

// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
//
// ===========================================================
    ({__dispatchRest:(method, data) => {}});
//      if json.data?
//        data = json.data
//      else
//        data = json
//
//      method = data[_a.acknowledge]
//      _m.debug ">>KK __dispatchRest method='#{method}'", json, @model
//
    switch (method) {
      case _RPC.media.rm_comment:
        //RADIO_BROADCAST.trigger _e.media.update, @model
        return this.trigger(_e.deleted);
      default:
        return _m.debug(">>KK __dispatchRest NONE", json, this.model);
    }
  }
// ============================================
//
// ============================================

// ===========================================================
// _delete
//
// ===========================================================
  _delete() {
    _m.debug("<<ggCOMMENT Item onDomRefresh", this.model);
    return this.triggerMethod(_e.rpc.post, {
      m: _RPC.media.rm_comment,
      id : this.model.get(_a.id),
      oid : xui.site.get(_a.id)
    }
    );
  }
// ============================================
//
// ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    _m.debug("<<ggCOMMENT Item onDomRefresh", this.model);
    this.rating = new xui.Rating.Item({
      className: _a.none,
      passive:true,
      modelArgs: {
        content: _K.string.empty,
        rating: this.model.get(_a.rating),
        count : _K.string.empty
      }
    });
    return this.ratingRegion.show(this.rating);
  }
}
__comment_item.initClass();
module.exports = __comment_item;
