const __recipient = require('./core');

class __invitation_settings extends __recipient {
  constructor(...args) {
    super(...args);
    this.onDestroy = this.onDestroy.bind(this);
    this._buildDefaults = this._buildDefaults.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this._actionState = this._actionState.bind(this);
    this.hasActiveRecipent = this.hasActiveRecipent.bind(this);
    this._updateData = this._updateData.bind(this);
    this.getData = this.getData.bind(this);
    this._setupMessage = this._setupMessage.bind(this);
    this._setupPermission = this._setupPermission.bind(this);
    this._emailExists = this._emailExists.bind(this);
    this._addInvitee = this._addInvitee.bind(this);
    this._partialReload = this._partialReload.bind(this);
    this.getState = this.getState.bind(this);
    this._addSelection = this._addSelection.bind(this);
    this._showResults = this._showResults.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      flow: _a.y
    });
    this._sharees = {};
    this._recipients = {};
    this._data = {
      privilege: this.mget(_a.default_privilege) || _K.privilege.read,
      limit: 0,
      days: 0,
      hours: 0
    };
    this.declareHandlers();

    this.model.atLeast({
      action_bar: 1
    });

    this.media = this.mget(_a.media);
    Selector.disable();
    this.declareHandlers();
    this.deleteList = [];
    if (this.mget(_a.persistence) === _a.once) {
      this._auto_close = e => {
        if ((e == null)) {
          return;
        }
        if (!this.el.contains(e.target)) {
          return this.goodbye();
        }
      };
      RADIO_CLICK.on(_e.click, this._auto_close);
    }
  }

  /**
   * 
   * @returns 
   */
  onDestroy() {
    Selector.enable();
    if (this._auto_close != null) {
      return RADIO_CLICK.off(_e.click, this._auto_close);
    }
  }

  /**
   * 
   * @returns 
   */
  async _buildDefaults() {
    // The one that will receive invitation
    await Kind.waitFor('invitation_recipient');
    await Kind.waitFor('invitation_contact');
    await Kind.waitFor('invitation_search');
    await Kind.waitFor('invitation_shareeroll');
    this.recipientItem = {
      kind: 'invitation_recipient',
      className: _a.destination,
      type: 'existing',
      uiHandler: [this]
    };

    if (this.mget('recipientItem')) {
      this.recipientItem = {
        ...this.recipientItem,
        ...this.mget('recipientItem')
      };
    }

    // The one being fetched by search request
    this.contactItem = {
      kind: "invitation_contact",
      service: "add-item"
    };

    if (this.mget('contactItem')) {
      this.contactItem = {
        ...this.contactItem,
        ...this.mget('contactItem')
      }
    }

    if ((this.mget(_a.authority) == null)) {
      this.warn(WARNING.attribute.recommanded.format(_a.authority));
    }

    if (this.mget(_a.authority) & (_K.permission.owner | _K.permission.admin)) {
      return this.editable = 1;
    } else {
      return this.editable = 0;
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.reload();
  }


  /**
   * 
   * @returns 
   */
  async reload() {
    let skl;
    const mode = this.mget(_a.mode);
    await this._buildDefaults();
    this._skeleton = require("./skeleton/sharees/list");
    this._pending = require("./skeleton/pending");
    switch (mode) {
      case 'mini':
        skl = require("./skeleton/mini");
        this._skeleton = skl;
        this._pending = skl;
        break;
      case 'direct':
        skl = require("./skeleton/direct");
        this._skeleton = skl;
        this._pending = skl;
        break;
      case 'share-in':
        skl = require("./skeleton/direct");
        this._skeleton = skl;
        this._pending = skl;
        break;
      case _a.projects:
        this._pending = this._skeleton;
        skl = this._skeleton;
        break;
      default:
        skl = this._skeleton;
    }
    return this.feed(skl(this));
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "container-commands":
        return this._commands = child;

      case "roll-recipients":
        this.recipientsRoll = child;
        var c = child.collection;
        c.on(_e.remove, () => {
          if (c.length === 0) {
            this.feed(this._skeleton(this));
            return this._actionState(0);
          }
        });
        return c.on(_e.add, () => {
          let s = 0;
          const f = c.filter(m => !m.get(_a.idle));
          if (f.length) {
            s = 1;
          }
          return this._actionState(s);
        });

      case "wrapper-results":
        this.resultsWrapper = child;
        return child.on(_e.show, () => child.el.hide());

      case "roll-results":
        return this.resultsRoll = child;


      case "ref-actions-bar":
        return this.actionsBar = child;

      case "wrapper-options":
        return this.optionsWrapper = child;

      case "wrapper-settings":
        this.settingsWrapper = child;
        return child.collection.on(_e.remove, () => {
          const f = () => {
            const d = this.getData();
            if (!_.isEmpty(d.email)) {
              this._actionState(1);
            }
            if (child.isEmpty() && (this._lastCmd != null)) {
              return this._lastCmd.setState(0);
            }
          };

          // wait to see wether child is really empty
          _.delay(f, 100);
          return (this.actionsBar != null ? this.actionsBar.el.show() : undefined);
        });

      case "ref-options-bar":
        return this.optionsBar = child;

      case "ref-addbutton":
        return this.addButton = child;

      case "invitation-search":
        return this.searchBox = child;
    }
  }

  /**
   * 
   * @param {*} s 
   * @returns 
   */
  _actionState(s) {
    if (this.actionsBar != null) {
      this.actionsBar.el.dataset.active = s;
    }
    if (this.optionsBar != null) {
      this.optionsBar.el.dataset.active = s;
    }
    return this.el.dataset.recipient = s;
  }

  /**
   * 
   * @returns 
   */
  hasActiveRecipent() {
    let f;
    if (this.recipientsRoll.isEmpty()) {
      return false;
    }
    return f = this.recipientsRoll.collection.filter(m => !m.get(_a.idle));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _updateData(cmd) {
    const data = cmd.getData();
    _.merge(this._data, data);
    this._data.expiry = this._data.hours;
    if (this.optionsWrapper != null) {
      this.optionsWrapper.clear();
    }

    if (this._messageIcon) this._messageIcon.el.dataset.state = 0

    this.triggerHandlers();
    if ((this.recipientsRoll != null) && this.recipientsRoll.isEmpty()) {
      if (data.email && data.email.isEmail()) {
        return this._actionState(1);
      } else {
        return this._actionState(0);
      }
    } else {
      return this._actionState(1);
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  getData(cmd) {
    const emails = [];
    const users = [];
    this.recipientsRoll.collection.each(c => {
      if (!c.get(_a.idle)) {
        emails.push(c.get(_a.email));
        const id = c.get(_a.id);
        if (id != null) {
          return users.push(id);
        }
      }
    });
    const input = this.searchBox.getData() || {};
    if ((input.email != null) && !(Array.from(emails).includes(input.email))) {
      if (input.email.isEmail()) {
        emails.push(input.email);
      }
    }
    this._data.email = emails;
    this._data.users = users;
    return this._data;
  }

  /**
   * 
   * @returns 
   */
  getDeletedList() {
    return _.uniq(this.deleteList);
  }


  /**
   * 
   * @param {*} cmd 
   */
  _setupMessage(cmd) {
    if (this._lastCmd && this._lastCmd != cmd) {
      this._lastCmd.setState(0);
    }
    this._lastCmd = cmd;
    this._messageIcon = cmd;
    if (cmd.mget(_a.state)) {
      this.settingsWrapper.feed({
        kind: 'invitation_message',
        trigger: cmd,
        signal: _e.ui.event,
        service: _e.update,
        message: this._data.message,
        uiHandler: [this]
      });
    } else {
      this.settingsWrapper.clear();
    }
  }

  /**
   * 
   * @param {*} cmd 
   */
  _setupPermission(cmd) {
    let p;
    if (this.mget(_a.mode) === _a.admin) {
      p = _K.privilege.admin;
    } else {
      p = this._data.privilege;
    }
    if (this._lastCmd && this._lastCmd != cmd) {
      this._lastCmd.setState(0);
    }
    this._lastCmd = cmd;
    if (cmd.mget(_a.state)) {
      this.settingsWrapper.feed({
        kind: 'invitation_permission',
        sys_pn: 'permission',
        source: cmd,
        service: _e.update,
        privilege: p,
        mode: this.mget(_a.mode),
        days: this._data.days,
        hours: this._data.hours,
        limit: this._data.limit,
        modify: this.mget(_a.modify),
        uiHandler: [this]
      });
    } else {
      this.settingsWrapper.clear();
    }
  }

  /**
   * 
   * @param {*} email 
   * @returns 
   */
  _emailExists(email) {
    const a = this.recipientsRoll.collection.pluck(_a.email);
    return _.includes(a, email);
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _addInvitee(cmd) {
    let data;
    if ((cmd.source == null)) {
      this.warn("No source bound to", cmd);
      return;
    }
    if (cmd.source.model) {
      data = cmd.source.model.toJSON();
      _.merge(data, this.recipientItem);
    } else if (_.isString(cmd.source)) { // Got email instead of contact
      data = { email: cmd.source };
      _.merge(data, this.recipientItem);
    }
    if (_.isEmpty(data) || this._emailExists(data.email)) {
      return;
    }
    this.recipientsRoll.append(data);
    this.triggerHandlers(data);
    cmd.focus();
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _partialReload(cmd) {
    for (let s of Array.from(cmd.selection)) {
      const data = s.model.toJSON();
      _.merge(data, this.recipientItem);
      this.recipientsRoll.append(data);
    }
    return this.addButton.setState(1);
  }

  /**
   * 
   * @returns 
   */
  getPending() {
    if ((this.recipientsRoll == null) || this.recipientsRoll.isEmpty()) {
      return null;
    }
    return this.recipientsRoll.collection.toJSON();
  }

  /**
   * 
   * @returns 
   */
  getState() {
    if ((this.recipientsRoll == null) || this.recipientsRoll.isEmpty()) {
      return 0;
    }
    return 1;
  }

  /**
   * 
   * @param {*} cmd 
   */
  _addSelection(cmd) {
    let data;
    for (let s of Array.from(cmd.selection)) {
      data = s.model.toJSON();
      if (!s.excluded) {
        _.merge(data, this.recipientItem);
        this.recipientsRoll.append(data);
      }
    }
    this.triggerHandlers({ items: data });
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _showResults(cmd) {
    const data = cmd.results;
    if (_.isEmpty(data)) {
      this.resultsWrapper.el.hide();
      this.service = _e.update;
      return this.triggerHandlers();
    } else {
      this.resultsWrapper.el.show();
      if (this.actionsBar != null) {
        this.actionsBar.el.hide();
      }
      // PERFO ISSUE ?
      for (let r of Array.from(data)) {
        _.merge(r, this.contactItem);
        for (let s of Array.from(this._sharees)) {
          if (r.email === s.email) {
            r.state = 1;
            r.preselect = 1;
          }
        }
        if ((r.role == null)) {
          r.role = _a.found;
        }
      }
      return this.resultsRoll.feed(data);
    }
  }

  /**
   * 
   */
  onUiEvent(cmd, args = {}) {
    let s;
    const service = args.service || cmd.service || cmd.mget(_a.service);
    this.service = service;
    let state = cmd.mget(_a.state);
    switch (service) {
      case _e.update:
        return this._updateData(cmd);

      case "add-item":
        return this._addInvitee(cmd);

      case "add-selection":
        return this._addSelection(cmd);

      case "item-deleted":
        var cur_sharees = this.mget(_a.sharees);
        if (_.isEmpty(cur_sharees)) {
          return;
        }
        var list = [];
        for (s of Array.from(cur_sharees)) {
          if ((s.id === cmd.mget(_a.id)) || (s.email === cmd.mget(_a.email))) {
            continue;
          }
          list.push({...s, ...this.recipientItem})
        }
        return this.mset(_a.sharees, list);
        recipientItem
      case "new-invitation":
        if (this.mget(_a.mode) === 'mini') {
          this.feed(require("./skeleton/mini")(this));
        } else {
          this.feed(require("./skeleton/direct")(this));
          cur_sharees = this.mget(_a.sharees);
          if (_.isEmpty(cur_sharees)) {
            return;
          }
          list = [];
          for (s of Array.from(cur_sharees)) {
            if (s.email === "*") {
              continue;
            }
            list.push({...s, ...this.recipientItem, idle:1})
          }
          this.recipientsRoll.once(_e.started, ()=>{
            this.debug("AAA:561", this.recipientsRoll._ready, "READY", list);
            this.recipientsRoll.feed(list);
            // setTimeout(()=>{
            // }, 50)
          })
        }
        return this.triggerHandlers();

      case 'setup-message':
        this._setupMessage(cmd);
        return this.triggerHandlers({ service, state });

      case 'setup-permission':
        Kind.waitFor('invitation_permission').then(() => {
          this._setupPermission(cmd);
          this.triggerHandlers({ service, state });
        });
        return;

      case _e.close:
        return this.softDestroy();

      case _e.found:
        this.service = _e.search;
        this.found = cmd.results;
        return this.triggerHandlers();

      case _e.share:
        this.service = service;
        return this.triggerHandlers({ service });

      case 'cancel-share':
        this.service = service;
        return this.triggerHandlers();

      case 'revoke':
        return this.deleteList.push(cmd.mget(_a.id));

      case _e.cancel:
        return this.recipientsRoll.clear();

      default:
        return this.triggerHandlers({ ...args, service });
    }
  }
}


module.exports = __invitation_settings;
