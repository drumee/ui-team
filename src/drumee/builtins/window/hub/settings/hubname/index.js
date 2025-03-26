
const __core = require('../core');
class __hub_name extends __core {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.hub = opt.hub;
    let name = this.hub.mget(_a.hubName) || opt.media.mget(_a.filename)

    this.model.set({
      label: LOCALE.ROOM_NAME,
      name,
      settingsId: `${opt.hub_id}.hubname`
    });
  }


  /**
   * 
   */
  onDestroy() {
    RADIO_CLICK.off(_e.click, this._onDocumentClick);
  }

  /**
   * 
   */
  onDomRefresh() {
    this.reload();
  }

  /**
   * 
   */
  reload(data) {
    if (this.hub.media.mget(_a.privilege) & _K.permission.admin) {
      this.feed(require("../skeleton/common/edit")(this));
    } else {
      this.feed(require("../skeleton/common/view")(this));
    }
    this._isEditing = 0;
    this.el.dataset.edit = 0;
  }


  /**
   * 
   * @param {*} cmd 
   */
  edit(cmd) {
    this._isEditing = 1;
    const wf = this.getPart("wrapper-field");
    wf.feed(Skeletons.Entry({
      className: `${this.fig.family}__input--name input--name`,
      value: this.mget(_a.name),
      active: 1,
      preselect: 1,
      interactive: 0,
      uiHandler: [this]
    })
    );
    this._input = wf.children.first();
    this.getPart("wrapper-cmd").feed(Skeletons.Note({
      content: 'Ok',
      className: `${this.fig.family}__button--ok button--ok`,
      uiHandler: [this],
      service: _e.commit
    })
    );
    this.el.dataset.edit = 1;
  }

  /**
   * 
   * @param {*} msg 
   */
  showError(msg) {
    this.append(Skeletons.Note({
      className: `${this.fig.family}__error`,
      content: msg
    }))
    let err = this.children.last();
    setTimeout(() => { err.goodbye() }, 3000)
  }

  /**
   * 
   * @param {*} data 
   */
  doCommit(data) {
    let name = data.value;
    this.postService({
      service: SERVICE.hub.update_name,
      hub_id: this.hub.media.mget(_a.hub_id),
      name,
    }).then((data) => {
      this.debug("AAA:90", data)
      if (data.error) {
        let msg = LOCALE[data.error] || data.error;
        return this.showError(msg.format(name))
      }
      this.mset(data);
      this.onDomRefresh();
      this.hub.mget(_a.source).update_name(_a.hubName, data.name);
    });
  }


  /**
   * 
   */
  commit() {
    this.el.dataset.edit = 0;
    if ((this._input == null)) {
      return false;
    }

    const data = this._input.getData();
    if (_.isEmpty(data.value)) {
      this._input.showError(LOCALE.REQUIRE_THIS_FIELD);
      return false;
    }

    if (data.value === this.mget(_a.name)) {
      this.reload();
      return false;
    }
    this.doCommit(data);

  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.status || cmd.service || cmd.model.get(_a.service);
    this.debug(`AAAA:130 96service=${service}`, cmd.model.get(_a.state), this, cmd);
    switch (service) {
      case _e.edit:
        this.edit(cmd);
        break;

      case _e.cancel:
        this.reload();
        break;

      case _e.commit:
      case _e.Enter:
        this.commit(cmd);
        break;
    }
    return super.onUiEvent(cmd);
  }


}

module.exports = __hub_name;
