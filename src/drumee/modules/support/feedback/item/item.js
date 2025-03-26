const { timestamp } = require("core/utils")

const _default_class = "feedback__item";

class __feedback_item_ui extends LetcBox {
  constructor(...args) {
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._delete = this._delete.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className  = _default_class;
  
  // ===========================================================
  // initialize
  //
  // @param [Object] opt
  //
  // ===========================================================
    this.prototype.behaviorSet =
      {socket   : 1};
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    this.debug('user.view.model', this.model.get(_a.id));
    const id = this.model.get(_a.id) || this.model.get(_a.uid) || 'default';
    return this.model.atLeast({
      flow       : _a.x,
      innerClass : "",
      id
    });
  }


// # ===========================================================
// # onRender
// #
// # @param [Object] e
// #
// # ===========================================================
//   onRender: () ->
//     @$el.attr _a.title, @model.get(_a.name)

// ===========================================================
// onDomRefresh
//
// @param [Object] e
//
// ===========================================================
  onDomRefresh() { 
    this.debug("USER 115", this, this.model.attributes);
    return this.feed(require('./skeleton/main')(this));
  }


// ===========================================================
// _delete
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _delete(e) {
    const hub_id = this.model.get(_a.hub_id);
    const uid = this.model.get(_a.id);
    return this.postService({
      service : SERVICE.hub.delete_contributor,
      hub_id,
      users   : uid
    });
  }


// ===========================================================
// __dispatchRest
//
// @param [Object] method
// @param [Object] data
// @param [Object] socket
//
// @return [Object] 
//
// ===========================================================
  __dispatchRest(method, data, socket) {}
}
__feedback_item_ui.initClass();
    // switch method
    //   when SERVICE.hub.delete_contributor
    //     @debug "SERVICE.hub.delete_contributor", data
    //     list = []
    //     for i in data
    //       item =
    //         kind      : 'user'
    //         firstname : i.firstname
    //         lastname  : i.lastname
    //         privilege : i.privilege
    //         id        : i.id
    //       # item = require("./skeleton/project-room/contacts-list-item")(@, i)
    //       list.push item
    //     @parent.feed list

// # ===========================================================
// # _url
// #
// # @param [Object] e
// #
// # ===========================================================
//   _url: () ->
//     id   = @model.get(_a.id) 
//     url = "#{location.origin}#{location.pathname}avatar/#{id}?#{timestamp()}"
//     @debug "ZRZRZRZZRZR GSGSGSGSG", @, @el, url
//     return url 

module.exports = __feedback_item_ui;
