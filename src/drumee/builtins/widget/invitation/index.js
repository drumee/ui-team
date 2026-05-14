const __recipient = require('./core');
const { validity } = require("../settings/hub/skeleton/toolkit")

const SVC_OPT = { async: 1 }

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
   * Toggle loading state while submitting invite:
   * - disable Invite button (sys_pn: add-member-button)
   * - show/hide settings overlay (sys_pn: settings)
   */
  _setInviteLoading(state) {
    const s = state ? 1 : 0;
    // Enable/disable Invite button
    if (this.addButton && this.addButton.el) {
      this.addButton.el.dataset.state = state ? 0 : 1;
    }
    if (this.__addMemberButton && this.__addMemberButton.el) {
      this.__addMemberButton.el.dataset.state = state ? 0 : 1;
    }
    // Show/hide overlay while loading
    if (this.settingsWrapper && this.settingsWrapper.el) {
      this.settingsWrapper.el.dataset.loading = s;
      this.settingsWrapper.el.style.display = state ? 'block' : 'none';
    }
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      flow: _a.y
    });
    this._sharees = {};
    this._recipients = {};
    this._data = {
      privilege: this.mget(_a.default_privilege) || _K.privilege.write,
      limit: 0,
      days: 0,
      hours: 0
    };
    this.declareHandlers();

    this.model.atLeast({
      action_bar: 1,
      members: 1
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
    this.formData = {}
    this.pendingChanges = {}
    this.defaultPermission = {
      privilege: _K.privilege.write,
      days: 0,
      hours: 0
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

  }

  /**
   * 
   */
  async onDomRefresh() {
    await this._buildDefaults();
    this.feed(require("./skeleton").default(this));
    this.postService(SERVICE.hub.get_settings,
      { hub_id: this.mget(_a.hub_id) }, SVC_OPT
    ).then(async (data) => {
      this.mset({ sharees: data.users })
      if (this.mget('members')) {
        let p = await this.ensurePart("existing-members");
        p.feed(data.users)
      }
    })
  }


  /**
   * 
   * @returns 
   */
  async reload() {
    this.feed(require("./skeleton").default(this));
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
            // this.feed(this._skeleton(this));
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
    if (this.__addMemberButton) {
      this.__addMemberButton.el.dataset.state = s;
    }
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
        const email = c.get(_a.email);
        const id = c.get(_a.id);
        emails.push(email);
        if (id != null) {
          users.push(id);
        } else if (email != null && (typeof email === "string" ? email.indexOf("@") !== -1 : (email && typeof email.isEmail === "function" && email.isEmail()))) {
          users.push(typeof email === "string" ? email : (email.email || String(email)));
        }
      }
    });
    const input = this.searchBox.getData() || {};
    if ((input.email != null) && !(Array.from(emails).includes(input.email))) {
      const emailVal = input.email;
      if (typeof emailVal === "string" && emailVal.indexOf("@") !== -1 || (emailVal && typeof emailVal.isEmail === "function" && emailVal.isEmail())) {
        emails.push(emailVal);
        users.push(typeof emailVal === "string" ? emailVal : (emailVal.email || String(emailVal)));
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
    this.el.dataset.extendheight = '0';
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
   * Gọi hub.add_contributors để invite vào hub.
   * add_contributors kiểm tra email, xử lý pending_invitation và gửi email khi cần.
   */
  addContributors() {
    const args = { ...this.defaultPermission, ...this.getData() };
    args.hub_id = args.hub_id || this.mget(_a.hub_id);

    // Enable loading state: disable button + show overlay
    this._setInviteLoading(1);

    this.postService(SERVICE.hub.add_contributors, args, {})
      .then((usersList) => {
        this.mset({ sharees: usersList });
        if (this.__existingMembers) this.__existingMembers.feed(usersList);
        this.recipientsRoll.clear();
        this.triggerHandlers({ service: "contributors-added" });
      })
      .catch((err) => {
        this.warn("[invitation] hub.add_contributors failed", err);
      })
      .finally(() => {
        this._setInviteLoading(0);
      });
  }

  /**
   * Toggle validity mode (only update pendingChanges, don't save)
   * @param {*} cmd 
   */
  toggleValidityMode(cmd) {
    let formData = this.pendingMember.data()
    formData.days = this.pendingChanges.days || formData.days;
    formData.hours = this.pendingChanges.hours || formData.hours;
    if (cmd.mget('expiry') == _a.infinity) {
      formData = {
        days: 0,
        hours: 0
      }
    } else if (!formData.expiry) {
      formData = {
        days: 0,
        hours: 1
      }
    }
    this.pendingChanges = this.__settings.getData();

    // Re-render immediately to show the change
    const part = this.getPart('validity-content');
    if (part && part.softClear) {
      part.softClear();
    }
    part.feed(validity(this, formData));
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} arg 
   */
  _changePermission(cmd, args) {
    if (!this.pendingMember) {
      return``
    }
    this.ensurePart("settings").then((p) => {
      let { name, state } = args
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
      this.pendingMember.mset({ privilege })
      p.feed(require("./skeleton/permission").default(this, this.pendingMember))
      const validity = this.getPart('validity-content');
      this.ensurePart('update-permission').then((p) => {
        if (this._tab == "set-default-permission") {
          this.ensurePart('update-permission').then((p) => {
            p.set({ content: "OK", service: "save-default-permission" })
          })
        } else {
          if (privilege < _K.privilege.read) {
            p.set({ content: LOCALE.REMOVE, service: "revoke-member" })
            validity.setState(0)
          } else {
            p.set({ content: LOCALE.SAVE, service: "save-pending-permission" })
            validity.setState(1)
          }
        }
      })
    })
  }

  /**
   * 
   */
  set_member_privilege() {
    let args = {
      ...this.__permissionForm.gatherData(),
      uid: this.pendingMember.mget(_a.id),
      hub_id: this.mget(_a.hub_id),
    }
    this.__settings.clear();
    this.postService(SERVICE.hub.set_member_privilege, args).then((users) => {
      this.mset({ sharees: users })
      if (this.__existingMembers) {
        this.__existingMembers.restart()
        this.__existingMembers.feed(users)
      }
    })
  }

  /**
   * 
   */
  set_recipients_privilege() {
    this.warn("TO BE DONE")
    // let args = {
    //   ...this.__permissionForm.gatherData(),
    //   uid: this.pendingMember.mget(_a.id),
    //   hub_id: this.mget(_a.hub_id),
    // }
    // this.__settings.clear();
    // this.postService(SERVICE.hub.set_member_privilege, args).then((users) => {
    //   this.mset({ sharees: users })
    //   this.__existingMembers.feed(users)
    // })
  }

  /**
   * not_owner
   */
  onUiEvent(cmd, args = {}) {
    let s;
    const service = args.service || cmd.service || cmd.mget(_a.service);
    this.service = service;
    switch (service) {
      case _e.update:
        return this._updateData(cmd);

      case "add-item":
        return this._addInvitee(cmd);

      case "add-guest":
        const email = args.email || cmd.email;
        if (email && !this._emailExists(email)) {
          const data = { email: typeof email === "string" ? email.trim() : email, ...this.recipientItem };
          this.recipientsRoll.append(data);
          this._actionState(1);
        }
        return;

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
          list.push({ ...s, ...this.recipientItem })
        }
        return this.mset(_a.sharees, list);

      case "set-recipients-permission":
        this.defaultPermission = cmd.gatherData()
        break;

      case 'prompt-default-permission':
        this._service = "set-recipients-permission"
        this.ensurePart("settings").then((p) => {
          this.pendingMember = this.recipientsRoll.children.first();
          p.feed(require("./skeleton/permission").default(this, this.pendingMember, this._service))
        })
        break;

      case "set-user-permission":
        this.set_member_privilege()
        break;

      case "prompt-permission":
        this._service = "set-user-permission"
        this.ensurePart("settings").then((p) => {
          this.pendingMember = cmd;
          p.feed(require("./skeleton/permission").default(this, cmd, this._service))
        })
        break;

      case "revoke-member":
        this.__settings.clear();
        let opt = {
          users: this.pendingMember.mget(_a.id),
          hub_id: this.mget(_a.hub_id)
        }
        this.postService(SERVICE.hub.delete_contributor, opt)
          .then((users) => {
            this.mset({ sharees: users })
            if (this.__existingMembers) {
              this.__existingMembers.feed(users)
            }
          })
        return

      case "permission-changed":
        if (this._service == "set-recipients-permission") {
          return this.__updatePermission.setState(args.valid)
        }
        this.__updatePermission.setState(1)
        if (!args.valid) {
          this.__updatePermission.set({ content: LOCALE.REMOVE })
          this.__updatePermission.mset({ service: "revoke-member" })
        } else {
          this.__updatePermission.set({ content: LOCALE.SAVE })
          this.__updatePermission.mset({ service: this._service })
        }
        // this._tab = service;
        // this._changePermission(cmd, args)
        break;

      case "cancel-share":
      case _a.back:
      case _e.close:
        return this.softDestroy();

      case _a.back:
        return this.__settings.clear();


      // case 'toggle-validity-mode':
      //   return this.toggleValidityMode(cmd);

      case _e.found:
        this.service = _e.search;
        this.found = cmd.results;
        return this.triggerHandlers();

      case "add-members":
        this.addContributors();
        return

      // case "update-permission":
      //   this._data = { ...this._data, ...args.data }
      //   return

      // case 'cancel-share':
      //   this.service = service;
      //   return this.triggerHandlers();

      // case 'revoke':
      //   return this.deleteList.push(cmd.mget(_a.id));

      case _e.cancel:
        return this.recipientsRoll.clear();


      case "invite-contacts":
        Wm.launch({
          kind: 'window_addressbook',
          source: this.__addressbookLauncher
        }, { explicit: 1, singleton: 1 });
        return

      case "show-contacts-list":
        return this.el.dataset.extendheight = args.state;

    }
  }
}


module.exports = __invitation_settings;
