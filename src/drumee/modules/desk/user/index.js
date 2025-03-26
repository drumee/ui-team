const { timestamp } = require("core/utils")

const _default_class = "project-room__list-item u-ai-center";//widget desk-contibutor project-room__list-item-wrapper"

class __desk_user extends LetcBox {
  constructor(...args) {
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._delete = this._delete.bind(this);
    this._rights = this._rights.bind(this);
    this.__dispatchRest = this.__dispatchRest.bind(this);
    super(...args);
  }

  static initClass() {
    this.prototype.nativeClassName  = _default_class;
    this.prototype.figName  = "desk_user";
    this.prototype.behaviorSet =
      {bhv_socket   : 1};
  }
    // bhv_parts    : 1

// ===========================================================
// onDomRefresh
//
// ===========================================================
  initialize(opt) {
    super.initialize();
    // @debug 'aaaaaa 31', @, @model.get(_a.id)
    const id = this.model.get(_a.id) || this.model.get(_a.uid) || 'default';
    this.model.atLeast({
      flow       : _a.x,
      innerClass : "",
      id
    });
    return this.url = `${bootstrap().mfsRootUrl}avatar/${id}?${timestamp()}`;
  }


// ===========================================================
// onRender
//
// @param [Object] e
//
// ===========================================================
  onRender() {
    super.onRender();
    this.$el.attr(_a.title, this.model.get(_a.name));
    this.el.innerHTML='';
    return this.$el.append(require('./template/user')(this));
  }

// ===========================================================
// onDomRefresh
//
// @param [Object] e
//
// ===========================================================
  onDomRefresh() { 
    this.debug("USER 115", this, this.model.attributes);
    this.$delete = this.$el.find(`#${this._id}-delete`);
    const g = ()=> {
      return this.$delete.on(_e.click, this._delete); 
    };
    this.waitElement(this.$delete[0], g);

    this.$rights = this.$el.find(`#${this._id}-rights`);
    const r = ()=> {
      return this.$rights.on(_e.click, this._rights);
    };
    return this.waitElement(this.$rights[0], r);
  }

// # ===========================================================
// # onUiEvent
// #
// # @return [Object] 
// #
// # ===========================================================
//   onUiEvent:(cmd) =>
//     service = cmd.model.get(_a.service) || cmd.model.get(_a.name)
//     @debug "AAAAAA FFF menuEvents service=#{service}", cmd
//     switch service
//       when "user-rights"
//         @debug "<<vvMANAGER rights", cmd, @


// ===========================================================
// _delete
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _delete(e) {
    this.debug("<<vvMANAGER _delete", e, this, this.model.get(_a.id));
    const hub_id = this.model.get(_a.hub_id);
    const uid = this.model.get(_a.id);
    return this.postService({
      service : SERVICE.hub.delete_contributor,
      hub_id,
      users   : uid
    });
  }

// ===========================================================
// _rights
//
// @param [Object] e
//
// @return [Object] 
//
// ===========================================================
  _rights(e) {
    this.debug("user-rights user", e, this, this.model.get(_a.id), this.model.get(_a.privilege));
    if (this.el.getAttribute(_a.data.state) === "opened") {
      this.el.setAttribute(_a.data.state, "");
      return Pr._resetSettingsModal(this);
    } else { 
      this.el.setAttribute(_a.data.state, "opened");
      const data = {
        privilege : this.model.get(_a.privilege),
        id        : this.model.get(_a.id)
      };
      return Pr.userRights(this, data);
    }
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
  __dispatchRest(method, data, socket) {
    switch (method) {
      case SERVICE.hub.delete_contributor:
        this.debug("SERVICE.hub.delete_contributor", data);
        var list = [];
        for (var i of Array.from(data)) {
          var item = {
            kind      : 'user',
            firstname : i.firstname,
            lastname  : i.lastname,
            privilege : i.privilege,
            id        : i.id
          };
          // item = require("./skeleton/project-room/contacts-list-item")(@, i)
          list.push(item);
        }
        this.parent.feed(list);
        return Pr._getRoomAdmins(data);
    }
  }
}
__desk_user.initClass();

// ===========================================================
// _url
//
// @param [Object] e
//
// ===========================================================




module.exports = __desk_user;
