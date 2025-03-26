
// ============================================================ *
//   Copyright Xialia.com  2011-2019
//   FILE : builtins/hub/admin/settings/settings
//   TYPE : Module
// ============================================================ *

class __hub_settings extends LetcBox {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.declareHandlers();
    this.model.set({
      flow: _a.y
    });
    this._recipients = {};
    this._data = {
      privilege: _K.privilege.read,
      limit: 0,
      days: 0,
      hours: 0
    };
    const handler = this.getHandlers(_a.ui)[0];
    this.owner = handler.owner;
    this.visitor = handler.visitor;
    this.prefix = this.mget(_a.figPrefix) || "";
    this.hub = handler;
    for (let n of [_a.name, _a.home_id, _a.hub_id, _a.privilege]) {
      this[n] = handler.mget(n);
    }
    let m = opt.media;
    if (m) {
      this.model.atLeast({
        home_id: m.mget(_a.home_id),
        actual_home_id: m.mget(_a.actual_home_id),
        hub_id: m.mget(_a.hub_id),
        nid: m.mget(_a.nid),
        actual_hub_id: m.mget(_a.actual_hub_id),
        area: m.mget(_a.area),
        isalink: m.mget(_a.isalink),
        metadata: m.get(_a.metadata),
      })
      this.media = m;
    }


    this.contextmenuSkeleton = 'a';
  }



  /**
   * 
   */
  onDomRefresh() {
    const { hub_id } = this.actualNode();
    this.hub_id = hub_id;
    this.fetchService({
      service: SERVICE.hub.get_settings,
      hub_id
    }).then((data) => {
      this.mset(data);
      this.owner.set(data.owner);
      this.visitor.set(data.visitor);
      this.reload();
    })
  }

  /**
   * 
   * @returns 
   */
  reload() {
    this.feed(require("./skeleton/main")(this));
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "wrapper-dialog":
        return this.dialogWrapper = child;
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = args.service || cmd.service || cmd.mget(_a.service);
    let data;
    switch (service) {
      case _e.close:
        return this.goodbye();

      case _e.share:
        var deleteList = cmd.getDeletedList();
        data = cmd.getData();
        this.deleteUser(deleteList).then(res => {
          return this.addContributors(data).then(resUser => {
            return this.findPart("container-invitation").feed(require('./skeleton/invitation')(this));
          });
        });
        return;

      case 'cancel-share':
        return this.findPart("container-invitation").feed(require('./skeleton/invitation')(this));

      case "edit-owner":
      case "edit-admin":
        if (args.state) {
          return this.__containerInvitation.el.hide();
        } else {
          return this.__containerInvitation.el.show();
        }

      default:
        this.triggerHandlers({ ...args, service, trigger: this })
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  addContributors(data) {
    return new Promise((resolve, reject) => {
      if (_.isEmpty(data.users) && _.isEmpty(data.email)) {
        resolve(true);
        return;
      }
      data.hub_id = this.hub_id;
      this.postService(SERVICE.hub.add_contributors, data).then(usersList => {
        this.mset(_a.users, usersList);
        return resolve(usersList);
      })
    });
  }

  /**
   * 
   * @param {*} deleteList 
   * @returns 
   */
  deleteUser(deleteList) {
    return new Promise((resolve, reject) => {
      let existingUser = this.mget(_a.users);
      if (_.isEmpty(deleteList)) {
        resolve(true);
        return;
      }
      const deleteOpt = {
        service: SERVICE.hub.delete_contributor,
        hub_id: this.hub_id,
        users: deleteList
      };
      return this.postService(deleteOpt).then(res => {
        existingUser = existingUser.filter(row => {
          return !(deleteList.includes(row.id));
        });
        existingUser = existingUser.map(row => {
          delete row.kind;
          delete row.uiHandler;
          return row;
        });

        this.mset(_a.users, existingUser);
        return resolve(existingUser);
      });
    });
  }

}


module.exports = __hub_settings;
