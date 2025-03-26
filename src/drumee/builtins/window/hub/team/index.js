// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/hub/team/index.js
//   TYPE : Component
// ==================================================================== *

const mfsInteract = require('../interact');
class __window_hub_team extends mfsInteract {

  /**
   * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.style.set({
      left: (window.innerWidth / 2) - (this.size.width / 2)
    });
    this._skeleton = require("./skeleton/main");
    this.contextmenuSkeleton = 'a';
  }


  /**
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section
  */
  onPartReady(child, pn, section) {
    switch (pn) {
      case "ref-name":
        return this._nameEntry = child;
      case "ref-commands":
        return this.commandsRef = child;
    }
  }

  /**
   * 
  */
  _checkSanity() {
    if (_.isEmpty(this._data.name)) {
      this._nameEntry.showError(LOCALE.REQUIRE_THIS_FIELD);
      return false;
    }
    if (this._data.error) {
      this._nameEntry.showError(this._data.error);
      return false;
    }
    return true;
  }

  /**
   * 
  */
  _create() {
    this.__refCommands.el.dataset.active = 0;
    if (this.phase === _a.creating) {
      this.warn("Waiting for hub to be instanciated");
      return;
    }
    this.phase = _a.creating;
    this.postService(SERVICE.desk.create_hub, {
      area: _a.private,
      filename: this._data.name,
      hub_id: Visitor.id,
      pid: this.mget(_a.nid)
    }).then((data) => {
      this._checkCreation(data);
    }).catch((err) => {
      this.onServerError(err);
    });
  }

  /**
   * 
   * @param {*} data 
   */
  _checkCreation(data) {
    if (_.isEmpty(this._data.users)) {
      this.softDestroy();
      this.onAfterHubCreation(data);
    } else {
      const opt = {
        service: SERVICE.hub.add_contributors,
        hub_id: data.id,
        message: this._data.message || '',
        users: this._data.users,
        days: this._data.days,
        hours: this._data.hours,
        expiry: this._data.expiry,
        privilege: this._data.permission || _K.privilege.write
      };

      this.postService(opt, { async: 1 }).then((d) => {
        this.onAfterHubCreation(data);
        this.softDestroy();
        return this.triggerHandlers();
      })
    }

    data.kind = _a.media;
    this.new_hub = data;

  }

  /**
   * 
  */
  _wait() {
    return this.getPart(_a.body).feed(require('./skeleton/wait')(this));
  }

  /**
   * @param {*} cmd 
   * @param {*} args
   */
  onUiEvent(cmd, args) {
    if (args == null) { args = {}; }
    const service = cmd.service || cmd.model.get(_a.service);
    switch (service) {
      case _e.close:
        return this.softDestroy();

      case _a.update:
        this.commandsRef.el.show();
        this.commandsRef.el.dataset.active = 1;
        return _.merge(this._data, cmd.getData());

      case _a.name:
        var data = cmd.getData();
        var filename = data.value || '';
        if (!filename.length) {
          this._data.error = LOCALE.REQUIRE_THIS_FIELD;
          this._nameEntry.showError(this._data.error);
          return this.commandsRef.el.dataset.active = 0;
        } else if (Wm.filenameExists(filename)) {
          this._data.error = (filename.printf(LOCALE.NAME_ALREADY_EXISTES));
          this._nameEntry.showError(this._data.error);
          return this.commandsRef.el.dataset.active = 0;
        } else {
          this._nameEntry.hideError();
          this._data.error = false;
          this._data.name = filename;
          return this.commandsRef.el.dataset.active = 1;
        }

      case _e.search:
        if (!this.el.contains(lastClick.target)) {
          return;
        }
        if (_.isEmpty(cmd.found)) {
          return this.commandsRef.el.dataset.active = 1;
        } else {
          return this.commandsRef.el.dataset.active = 0;
        }

      case "add-item":
      case "add-selection":
        this.commandsRef.el.dataset.active = 1;
        return this._data.users = cmd.getData().users;

      case "setup-message":
      case 'setup-permission':
        return;

      case _e.create:
        if (this._checkSanity()) {
          return this._create();
        }
        break;
    }
  }

}

module.exports = __window_hub_team;
