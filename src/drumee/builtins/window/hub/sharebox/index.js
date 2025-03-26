// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : src/drumee/builtins/window/hub/sharebox/index.js
//   TYPE : Component
// ==================================================================== *

const mfsInteract = require('../interact')
class __window_hub_sharebox extends mfsInteract {

  static initClass() {
    this.prototype.figName = "window_hub_sharebox";
    this.prototype.isStream = 1;
    this.prototype.acceptMedia = 1;
    this.prototype.fig = 1;
  }

  /**
   * 
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
    this.validityMode = _a.infinity;
    this.mset(_a.privilege, _K.privilege.upload);
    this.contextmenuSkeleton = 'a';
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
      case "ref-name":
        return this._nameEntry = child;
      case "ref-commands":
        return this.commandsRef = child;
      case "password-input":
        this.waitElement(child.el, () => _.delay(() => child._entry.setValue(''), 1000))
      case "permissions-icon":
        return;
    }
  }

  /**
   * 
   * @returns 
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
   * @returns 
   */
  _create() {
    if (this.phase === _a.creating) {
      this.warn("Waiting for hub to be instanciated");
      return;
    }
    this.__refCommands.el.dataset.active = 0;
    let widgetEmail = this.getItemsByKind('widget_simple_invitation')[0]
    if (!widgetEmail.submitEmail()) {
      return;
    }

    this.phase = _a.creating;
    this.formData = this.getData(_a.formItem)

    this.postService(SERVICE.desk.create_hub, {
      area: _a.share,
      filename: this.formData.name,
      hub_id: Visitor.id,
      pid: this.mget(_a.nid)
    }).then((data) => {
      this.debug("AAAA:955", data)
      this._checkCreation(data);
    }).catch((err) => {
      this.onServerError(err);
    });
  }

  /**
   * 
   */
  _checkCreation(data) {
    let formData = this.getData(_a.formItem)
    formData.emails = this.getPart('widget_invitation-email').getMembersList();
    let emails = formData.emails.map((row) => row.email);
    const opt = {
      service: SERVICE.hub.update_external_room,
      hub_id: data.id,
      emails: emails,
      password: formData.password,
      hours: formData.hours,
      days: formData.days,
      validity_mode: this.validityMode,
      permission: this.mget(_a.privilege)
    };

    this.postService(opt, { async: 1 }).then((d) => {
      this.onAfterHubCreation(data);
      this.softDestroy();
      this.triggerHandlers();
    })

    this.new_hub = data;

  }
  /**
   * 
   */
  _wait() {
    return this.getPart(_a.body).feed(require('./skeleton/wait')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
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
          this._data.error = (`<u>${filename}</u>`.printf(LOCALE.NAME_ALREADY_EXISTES));
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

      case "add-item": case "add-selection":
        this.commandsRef.el.dataset.active = 1;
        return this._data.users = cmd.getData().users;

      case "setup-message": case 'setup-permission':
        return this.commandsRef.el.dataset.active = 0;

      case 'toggle-validity-mode':
        return this.toggleValidityMode(cmd);

      case _e.create:
        this.debug("aaaa CR", cmd);
        if (this._checkSanity()) {
          return this._create();
        }
        break;

      case 'change-options':
        return this.switchOptions(cmd.mget(_a.value));

      case 'change-permission':
        return this.triggerChangePermission(cmd)

    }
  }

  /**
   * @param {String} part
   */
  switchOptions(part = '') {
    if (this.currentOption == part) {
      this.getPart(part).el.dataset.state = _a.closed;
      return this.currentOption = '';
    }

    this.currentOption = part;
    if (part != 'permissions-setting') {
      this.getPart('permissions-setting').el.dataset.state = _a.closed;
    }
    if (part != 'validity-setting') {
      this.getPart('validity-setting').el.dataset.state = _a.closed;
    }
    if (part != 'password-setting') {
      this.getPart('password-setting').el.dataset.state = _a.closed;
    }
    if (part && this.getPart(part)) {
      this.getPart(part).el.dataset.state = _a.open;
    }
  }

  /**
   * @param {any} check
   */
  permissionCheck(check) {
    let result = 0
    if (this.mget(_a.privilege) >= check) {
      result = 1
    }
    return result
  }

  /**
   * @param {Letc} cmd
   */
  triggerChangePermission(cmd) {
    let val = cmd.mget('_value')
    let oldPrivilege = this.mget(_a.privilege);
    if (val > 1 && val === oldPrivilege) {
      let p = val >> 1
      this.mset(_a.privilege, p)
    } else {
      this.mset(_a.privilege, val)
    }
    return this.updatePermissionItem()
  }

  /**
   * 
   */
  updatePermissionItem() {
    this.getPart('permissions-setting').feed(require('./skeleton/permissions').default(this));
  }

  /**
   * @param {*} cmd 
  */
  toggleValidityMode(cmd) {
    this.validityMode = cmd.mget(_a.value);

    if (this.validityMode == 'limited') {
      this.__setValidityWrapper.el.dataset.mode = _a.open;
    } else {
      this.__setValidityWrapper.el.dataset.mode = _a.closed;
    }
    return
  }
}
__window_hub_sharebox.initClass();

module.exports = __window_hub_sharebox;
