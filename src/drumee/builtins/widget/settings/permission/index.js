
class settings_permission extends DrumeeMFS {


  /**
   * 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);

    this.formData = {}
    this.pendingChanges = {}
    this.declareHandlers();
    if (!opt.privilege) {
      this.mset({ mode: "maiden" })
    }
  }

  /**
   * 
   */
  data() {
    return {
      ...this.pendingChanges,
      ...this.getData(),
      expiry: this.mget(_a.expiry) || 0,
      privilege: this.mget(_a.privilege),
      hours: this.mget(_a.hours),
      days: this.mget(_a.days),
    }
  }

  /**
   * 
   */
  gatherData() {
    const { hours, days } = this.getData();
    const privilege = this.mget(_a.privilege)
    return {
      privilege,
      hours: hours || 0,
      days: days || 0
    }
  }

  /**
   * Toggle validity mode (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  _toggleValidityMode(cmd) {
    let formData = this.data()
    if (cmd.mget('expiry') == _a.infinity) {
      this.pendingChanges = this.getData()
      formData = {
        ...formData,
        days: 0,
        hours: 0,
        expiry: 0,
      }
    } else {
      formData = {
        ...formData,
        days: this.pendingChanges.days || 0,
        hours: this.pendingChanges.hours || 0,
        expiry: 1,
      }
      this.pendingChanges.expiry = 1;
    }
    this.mset(formData)
    this.feed(require("./skeleton").default(this, formData));
  }

  /**
 * 
 * @param {*} cmd 
 * @param {*} arg 
 */
  _changePermission(cmd) {
    let name = cmd.mget(_a.name);
    let state = cmd.mget(_a.state);
    let privilege = 0b0000;
    switch (name) {
      case _a.read:
        if (state) {
          privilege = _K.privilege.read;
        } else {
          privilege = _K.privilege.guest;
        }
        break
      case _a.write:
        if (state) {
          privilege = _K.privilege.write;
        } else {
          privilege = _K.privilege.read;
        }
        break
      case _a.modify:
        if (state) {
          privilege = _K.privilege.modify;
        } else {
          privilege = _K.privilege.write;
        }
        break
      default:
    }
    this.mset({ privilege })
    this.pendingChanges.privilege = privilege;
    this.feed(require("./skeleton").default(this, this.pendingChanges))
    this.ensurePart('validity-content').then((validity) => {
      let state = 0;
      if (privilege < _K.privilege.read) {
        state = 0;
      } else {
        state = 1;
      }
      validity.setState(state)
      this.triggerHandlers({ service: "permission-changed", valid: state, ...this.pendingChanges })
    })
  }

  /**
   * 
   */
  onDomRefresh() {
    let data = { ...this.data() }
    if (parseInt(data.days) || parseInt(data.hours)) data.expiry = 1;
    this.feed(require("./skeleton").default(this, data))
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    const service = cmd.mget(_a.service)

    this.debug("=== AAA126 ===", this, service);
    switch (service) {
      case "change-permission":
        this._changePermission(cmd)
        break;
      case 'toggle-validity-mode':
        return this._toggleValidityMode(cmd);
    }

  }

}


module.exports = settings_permission;