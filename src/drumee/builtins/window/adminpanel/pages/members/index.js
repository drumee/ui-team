const { openUserMailAgent } = require("@drumee/ui-essentials")
const __progress = require('@drumee/ui-toolkit/templates/progress');
const { uploadFile } = require("@drumee/ui-essentials")

class ___members_page extends LetcBox {

  constructor(...args) {
    super(...args);
    this.uploadFile = uploadFile.bind(this);
  }


  /**
   * @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.organisation = this.mget('organisation')
    this.orgId = this.organisation.id;
    this.viewInstance = this.mget('viewInstance')
    this._view = this.mget('view')
    this.importResponse = {}
    this.declareHandlers();
  }


  /**
   * @param {any} child
   * @param {any} pn
  */
  async onPartReady(child, pn) {
    switch (pn) {
      case 'widget_members_list':
        await Kind.waitFor('members_room')
        let items = await child.getItems()
        if (items[0]) {
          items[0].setState(1)
          this.loadMemberDetail(items[0]);
        }
        break;
    }
    return null
  }

  /**
   * 
   */
  onDomRefresh() {
    this.loadSearchBar();
    this.feed(require('./skeleton').default(this));
  }


  /**
   * @param {LetcBox} cmd
   * @param {any} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'see-desktop':
        this.invokeSeeDesktop(cmd)
        break;

      case 'import-members':
        this.page = 'import-member';
        this.loadImportMembers()
        break;

      // case 'import-member-re-upload':
      //   this.loadImportDropPage()
      //   break;

      // case 'import-member-upload':
      //   this.importAllAccounts()
      //   break;

      case 'connection-log':
        return this.loadConnectionLog(cmd)

      case 'security':
        return this.loadSecurityOption(cmd)

      case 'toggle-double-authentication':
        return this.toggleDoubleAuthentication(cmd)

      case 'show-member-list':
        this.loadMembersList(args)
        break;

      case 'choose-who-can-see-member':
        return this.chooseWhoCanSeeMember(cmd)

      case 'member-added':
        this.addNewMember(args)
        this.loadMembersList()
        break;
      case 'show-member-detail':
        this.loadMemberDetail(cmd)
        break;

      case 'create-member':
        this.loadCreateMember()
        break

      case 'cancel-create-member':
        this.cancelCreateMemberForm()
        break

      // case 'add-member':
      //   this.addNewMember(cmd)
      //   break

      case _e.edit:
        this.loadEditMember(cmd)
        break

      case 'update-member':
        this.updateMember(cmd)
        break

      case 'prompt-delete-inactive-member':
      case 'prompt-delete-member':
      case 'prompt-remove-admin':
      case 'prompt-reset-member-password':
      case 'prompt-change-member-password':
      case 'prompt-kick-out':
      case 'prompt-toggle-archive-member':
        return this.promptAction(cmd, service);

      case 'commit-kick-out':
      case 'commit-delete':
      case 'commit-invite-delete':
      case 'commit-delete-inactive-member':
      case 'commit-delete-admin':
      case 'commit-reset-member-password':
      case 'commit-change-member-password':
      case 'commit-block-unblock':
      case 'commit-toggle-archive-member':
        return this.commitActionFromPopup(service)

      case 'choose-admins':
        this.loadChooseAdminLayer()
        break

      case 'trigger-all-admins':
        let allAdminEl = this.findPart('all-admins')
        this.waitElement(allAdminEl.el, () => {
          allAdminEl.triggerHandlers();
        });

        return this.closeOverlay()

      case 'previous-page':
        this.previousBreadcrumb()
        break

      case 'next-page':
        this.nextBreadcrumb()
        break

      case 'close-overlay':
        this.page = '';
        this.closeOverlay(cmd)
        break

      case 'download-members-template':
        let url = `${bootstrap().static}sample/users-list.csv`;
        window.open(url, '_blank');
        return;
    }
  }

  /**
   * to open the import members popup 
   * @param {LetcBox} cmd
   */
  invokeSeeDesktop(cmd) {
    let member = cmd.mget(_a.member);
    this.mset(_a.member, member)
    this.postService({
      service: SERVICE.adminpanel.mimic_new,
      orgid: this.organisation.id,
      user_id: member.drumate_id,
      //hub_id: Visitor.id,
    })
  }

  /**
   * to load the search bar at init
   */
  loadSearchBar() {
    this.mget(_a.parent).ensurePart(_a.search).then((p) => {
      p.el.dataset.status = _a.open;
    })

    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 3)
    } else {
      this.updateInstance(this.viewInstance = 2)
    }
    return
  }

  /**
   * to open the import members popup 
   */
  loadImportMembers() {
    this.openOverlay(require('./skeleton/import/index').default(this))
  }

  /**
   * to open the popup for connection log of a member
   */
  loadConnectionLog(cmd) {
    this.mset(_a.member, cmd.mget(_a.member))
    return this.openOverlay(require('./skeleton/connection-log/main').default(this))
  }

  /**
   * to open the popup for security option of a member
   */
  loadSecurityOption(cmd) {
    this.pendingRoom = cmd;
    this.mset(_a.member, cmd.mget(_a.member))
    return this.openOverlay(require('./skeleton/security/main').default(this))
  }

  /**
   * @param {LetcBox} cmd
   */
  toggleDoubleAuthentication(cmd) {
    let member = this.mget(_a.member)
    const _value = cmd.mget(_a.value)
    if ((member.drumate_id) && (member.authentification != _value)) {
      return this.postService({
        service: SERVICE.adminpanel.set_mfa,
        user_id: member.drumate_id,
        mfa: _value,
        //hub_id  : Visitor.get(_a.id)
      }).then((data) => {
        let { profile } = data
        member.otp = profile.mfa;
        member.mfa = profile.mfa;
        this.mset({ member })
        if (this.pendingMember) {
          this.pendingMember.mset({ otp: profile.mfa, mfa: profile.mfa })
        }
        if (this.pendingRoom) {
          member = { ...this.pendingRoom.mget(_a.member), otp: profile.mfa, mfa: profile.mfa }
          this.pendingRoom.mset({ member })
        }
      })
    }
    return null
  }

  /**
   * @param {LetcBox} cmd
  */
  chooseWhoCanSeeMember(cmd) {
    const overlayWrapper = this.getPart('overlay-wrapper')
    const dataOpt = {
      kind: 'widget_member_who_can_see',
      className: 'widget_member_who_can_see',
      orgId: this.orgId,
      memberData: cmd.mget(_a.member),
      autoSave: true,
      fetchService: true
    }
    overlayWrapper.el.dataset.mode = _a.open
    return this.getPart('wrapper-overlay-notifier').feed(dataOpt)
  }

  /**
   * @param {(any|null)} source
  */
  loadMembersList(args = {}) {
    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 2)
    } else {
      this.updateInstance(this.viewInstance = 1)
    }
    delete args.service;
    this.ensurePart('widget_members_list').then((p) => { p.reload(args) })
  }


  /**
   * @param {(any|null)} source
  */
  loadMemberDetail(cmd) {
    let data = {}
    if (cmd) {
      if (_.isFunction(cmd.data)) {
        data = cmd.data()
        this.pendingMember = cmd;
      } else {
        this.warn("Source has no data function", cmd)
        this.pendingMember = null;
        return
      }
    }
    const memberDetail = {
      ...data,
      kind: 'members_room',
      className: 'members_room',
      sys_pn: 'page_members_room',
      orgId: this.orgId,
      type: 'member_detail',
      currentTag: this._currentTag,
      parent: this
    }

    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 3)
    } else {
      this.updateInstance(this.viewInstance = 2)
    }

    return this.getBranch('member_room').feed(memberDetail);
  }


  /**
   * @param {(LetcBox|null)} source
   */
  async loadCreateMember(source = null) {
    const {
      isFreeSoloPlan,
      checkOrgSeatLimit,
      showFreeSoloLimit,
    } = require("libs/billing");
    // Org-member create only (member_add) — hub.invite is outside this budget.
    // Every refusal has to SAY something: a bare return leaves the button
    // looking broken. The card adapts to the viewer on its own (no Upgrade
    // button, "Ask your workspace owner…" for a non-owner), so it does not
    // need an owner gate here.
    if (isFreeSoloPlan()) return showFreeSoloLimit();
    const seat = await checkOrgSeatLimit(this);
    if (seat.blocked) {
      // Could not read the headcount: still refuse (the server would reject
      // at member_add anyway), but do not claim the plan is full — they may
      // have seats left and would be told to buy something they already own.
      if (seat.reason === "unknown") {
        if (typeof Wm !== "undefined" && Wm.alert) {
          Wm.alert(LOCALE.QX_SEAT_CHECK_FAILED
            || "Could not check how many seats are in use. Please try again.");
        }
        return;
      }
      if (typeof Wm !== "undefined" && Wm.openQuotaExceeded) {
        return Wm.openQuotaExceeded({ limit: "seat" });
      }
      return this.getBranch("member_room").feed({
        kind: "quota_exceeded",
        limit: "seat",
        inline: 1,
      });
    }
    const memberForm = {
      kind: 'members_room',
      className: 'members_room',
      sys_pn: 'page_member_create',
      orgId: this.orgId,
      type: 'member_create',
      source: source,
      parent: this
    }
    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 3)
    } else {
      this.updateInstance(this.viewInstance = 2)
    }
    return this.getBranch('member_room').feed(memberForm);
  }

  /**
   * 
  */
  cancelCreateMemberForm() {
    const memberList = this.getItemsByKind('widget_members_list')[0]
    memberList.triggerClick();
    return
  }

  /**
   * @param {LetcBox} cmd
   */
  addNewMember(data) {
    this.openOverlay(require('./skeleton/action-popup/member-acknowledgement').default(this))
    const memberList = this.getItemsByKind('widget_members_list')[0]
    if (memberList) {
      memberList.addMemberItem(data)
      let t = setInterval(() => {
        let item = memberList.getItemsByAttr(_a.email, data.member?.email)[0]
        if (item) {
          item.setState(1)
          this.loadMemberDetail(item);
          clearInterval(t)
        }
      }, 500)
    }
  }

  /**
   * @param {(LetcBox|null)} source
  */
  loadEditMember(source = null) {
    const memberForm = {
      kind: 'members_room',
      className: 'members_room',
      sys_pn: 'page_member_edit',
      orgId: this.orgId,
      type: 'member_edit',
      source: source.mget(_a.member),
      parent: this
    }
    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 3)
    } else {
      this.updateInstance(this.viewInstance = 2)
    }
    return this.getBranch('member_room').feed(memberForm);
  }

  /**
   * @param {(LetcBox|null)} cmd
  */
  updateMember(cmd) {
    const data = cmd.source.response
    const memberList = this.getItemsByKind('widget_members_list')[0]
    memberList.updateMemberItem(data, this)
    memberList.triggerClick(data.drumate_id)
  }

  /**
   * @param {LetcBox} cmd
   */
  promptAction(cmd, service) {
    const source = cmd.source
    const overlayWrapper = this.getPart('overlay-wrapper')
    overlayWrapper.el.dataset.mode = _a.open
    this.getPart('wrapper-overlay-notifier').feed(require('./skeleton/action-popup/confirmation').default(this))
    this.mset({
      member: cmd.mget(_a.member),
    })

    let _content;

    switch (service) {
      case 'prompt-delete-inactive-member':
        _content = require('./skeleton/action-popup/content/delete-invite-member').default(this)
        break

      case 'prompt-delete-member':
        _content = require('./skeleton/action-popup/content/delete-member').default(this)
        break

      case 'prompt-remove-admin':
        this.mset(_a.member, source.model.toJSON())
        _content = require('./skeleton/action-popup/content/remove-admin').default(this)
        break

      case 'prompt-reset-member-password':
        if (Platform.get('arch') == "cloud") {
          if (Organization.get('useEmail')) {
            _content = require('./skeleton/action-popup/content/reset-member-password').default(this)
          } else {
            _content = require('./skeleton/action-popup/content/reset-password-link').default(this)
            this.resetMemberPasswordByLocalEmail();
          }
        } else {
          _content = require('./skeleton/action-popup/content/reset-password-link').default(this)
          this.resetMemberPasswordByLocalEmail();
        }
        break

      case 'prompt-change-member-password':
        _content = require('./skeleton/action-popup/content/change-member-password').default(this)
        break

      case 'prompt-kick-out':
        // this.mset(_a.member, source.model.toJSON())
        _content = require('./skeleton/action-popup/content/kick-member').default(this)
        break

      case 'prompt-toggle-archive-member':
        _content = require('./skeleton/action-popup/content/archive-member').default(this)
        break


      default:
        _content = require('./skeleton/action-popup/content/delete-member').default(this)
    }

    return this.getPart('popup-body-content').feed(_content)
  }

  /**
   * commitActionFromPopup
  */
  commitActionFromPopup(service) {
    const data = this.mget(_a.member)
    if (!data || !data.drumate_id) {
      this.warn("Invalid data", data)
      return
    }
    switch (service) {
      case 'commit-delete-inactive-member':
        return this.deleteInviteMember(data)

      case 'commit-kick-out':
      case 'commit-delete-member':
        return this.deleteMember(data)

      case 'commit-remove-admin':
        return this.removeAdmin(data)

      case 'commit-reset-member-password':
        return this.resetMemberPassword(data)

      case 'commit-toggle-archive-member':
        let _status = _a.archived
        if (data.status == _a.archived) {
          _status = _a.locked
        }

        return this.updateMemberStatus(data, _status)

      case 'commit-change-member-password':
        return this.changeMemberPassword(data);

      default:
        return this.loadActionPopupAcknowledgement()
    }
  }

  /* 
   *
  */
  loadActionPopupAcknowledgement(data = {}) {
    this.getPart('popup-body-content').feed(require('./skeleton/action-popup/acknowledgement').default(this, data))
    const f = () => {
      this.closeOverlay()
    }
    return _.delay(f, 2000)

  }

  /* 
   *
  */
  deleteMember(data) {
    return this.postService({
      service: SERVICE.adminpanel.member_delete,
      orgid: this.orgId,
      user_id: data.drumate_id,
    }, { async: 1 }).then((data) => {
      this.deleteMemberResponse(data)
    })
  }


  /* 
  *
  */
  deleteInviteMember(data) {
    return this.postService({
      service: SERVICE.adminpanel.member_disconnect,
      orgid: this.orgId,
      user_id: data.drumate_id,
    }).then((res) => {
      this.disconnectMemberResponse(res)
    })
  }



  /* 
   *
  */
  removeAdmin(data) {
    return this.postService({
      service: SERVICE.adminpanel.member_admin_remove,
      orgid: this.orgId,
      users: [data.drumate_id],
      //hub_id  : Visitor.get(_a.id)
    })
  }

  /* 
   *
  */
  resetMemberPassword(data) {
    return this.postService({
      service: SERVICE.adminpanel.send_password_link,
      orgid: this.orgId,
      users: [data.drumate_id],
      //hub_id  : Visitor.get(_a.id)
    })
  }

  /* 
   *
  */
  resetMemberPasswordByLocalEmail() {
    const data = this.mget(_a.member);
    this.postService({
      service: SERVICE.adminpanel.send_password_link,
      orgid: this.orgId,
      users: [data.drumate_id],
    }, { async: 1 }).then((res) => {
      if (_.isEmpty(res) || !res[0]) return;
      let c = res[0].email;
      if (c.link) {
        let body = LOCALE.PASSWORD_RESET_LINK + "\n" + c.link + '\n'
        openUserMailAgent({ body, recipients: c.email, subject: LOCALE.CHANGE_PASSWORD });
      }
    })

  }

  /** */
  changeMemberPassword(data) {
    let password = this.__refPassword.getValue() || "";
    if (password.length < 8) {
      Wm.alert(LOCALE.PASSWORD_NOT_STRONG);
      return;
    }
    this.postService({
      service: SERVICE.adminpanel.setPassword,
      password,
      id: data.drumate_id,
    }).then((res) => {
      this.loadActionPopupAcknowledgement(res);
    })
  }


  /* 
   *
  */
  updateMemberStatus(data, _status) {
    return this.postService({
      service: SERVICE.adminpanel.member_change_status,
      orgid: this.orgId,
      user_id: data.drumate_id,
      status: _status,
      //hub_id   : Visitor.get(_a.id)
    })
  }

  /**
   * @param {any} data
   */
  updateMemberStatusResponse(data) {
    let memberList = this.getItemsByKind('widget_members_list')[0]
    const f = () => {
      const id = data.drumate_id || data.id
      return memberList.triggerClick(id)
    }
    if (data.status == _a.archived) {
      return this.removeMemberFromList()
    }
    // return _.delay(f, 500)
  }

  /**
   * @param { boolean | null } result
   */
  authenticationResponse(result, data = {}) {
    let _content = 'Impossible change. No Mobile number'
    let _status = 'failure'
    // @ts-ignore

    if (result) {
      _content = LOCALE.INFORME_SECURITY_CHANGE
      _status = 'success'
    }

    const dataOpt = Skeletons.Note({
      className: `${this.fig.family}-security__note response-msg ${_status}`,
      content: _content,
    })

    this.getPart('security-footer').feed(dataOpt)
    return this.updateMemberStatusResponse(data)
  }

  /**
   * 
  */
  removeMemberFromList() {
    const data = this.mget(_a.member)
    let memberList = this.getItemsByKind('widget_members_list')[0]

    memberList.deleteMemberItemById(data.drumate_id, this)
    const f = () => {
      return memberList.triggerClick()
    }

    // return _.delay(f, 500)
  }

  /**
   * 
  */
  previousBreadcrumb() {
    let viewInstance = this.viewInstance || 1
    if (viewInstance > 1)
      viewInstance = viewInstance - 1
    return this.updateInstance(viewInstance)
  }

  /**
   * 
  */
  nextBreadcrumb() {
    let viewInstance = this.viewInstance || 1
    if (viewInstance < 3)
      viewInstance = viewInstance + 1
    return this.updateInstance(viewInstance)
  }

  /**
   * @param {number} viewInstance
  */
  updateInstance(viewInstance) {
    this.service = 'updateInstance';
    this.viewInstance = viewInstance
    this.triggerHandlers();
    this.service = '';
  }

  /*
   *
  */
  loadChooseAdminLayer() {
    const overlayWrapper = this.getPart('overlay-wrapper')
    overlayWrapper.el.dataset.mode = _a.open
    const dataOpt = {
      kind: 'widget_member_choose_admins',
      className: 'widget_member_choose_admins',
      orgId: this.orgId,
      uiHandler: this
    }

    return this.getPart('wrapper-overlay-notifier').feed(dataOpt)
  }

  /**
   * @param {object|null} skeleton
   * @return {void} 
   */
  openOverlay(skeleton = null) {
    this.ensurePart('overlay-wrapper').then((p) => {
      setTimeout(() => {
        p.el.dataset.mode = _a.open;
      }, 100)
      if (skeleton) {
        this.getPart('wrapper-overlay-notifier').feed(skeleton)
      }
    })
  }

  /*
   *
  */
  closeOverlay(cmd = {}) {
    const overlayWrapper = this.getPart('overlay-wrapper')
    const notifierWrapper = this.getPart('wrapper-overlay-notifier')
    notifierWrapper.clear()
    setTimeout(() => {
      overlayWrapper.el.dataset.mode = _a.closed
      notifierWrapper.el.dataset.mode = _a.closed
    }, 100)
    return
  }

  /**
   * @param {string | any[]} f
  */
  insertMedia(f) {
    if (this.page != 'import-member') {
      return;
    }
    if (f.length != 1) {
      Wm.alert(LOCALE.ONLY_ONE_FILE_ALLOWED);
      return;
    }

    /**
     * @type {File}
    */
    let file = f[0].get(_a.file);
    if (file.isDirectory || !/(.+)\.csv(.*)$/.test(file.name)) {
      this.warn("REJECTED ", file, file.isDirectory, file.name, /(.+)\.xls*$/.test(file.name));
      Wm.alert('csv'.underline("required-type").printf(LOCALE.REQUIRES_FILE_TYPE));
      return;
    }
    let opt = {
      service: SERVICE.adminpanel.prepare_import,
      orgid: this.organisation.id,
      upload: 1,
      nid: '0' // Only to avoid uploader complain
    }
    this.$el.append(__progress(this));
    let id = `${this._id}-fg`;
    this.waitElement(id, () => {
      this.$progress = $(`#${id}`);
      this.uploadFile(file, opt)
    });
  }


  /**
   * @param {{ lengthComputable: any; loaded: number; total: number; }} e
   * @param {any} socket
  */
  onUploadProgress(e) {
    if (!e.lengthComputable) return;
    let rate = e.loaded / e.total;
    if (rate == 1) {
      document.getElementById(`${this._id}-main`).remove();
    }
  }

  /** 
   * 
  */
  onUploadResponse(data) {
    if (data.status == 'FILE_ERR') {
      Wm.alert('csv'.underline("required-type").printf(LOCALE.REQUIRES_FILE_TYPE));
      return;
    }
    if (data.status) {
      this.ensurePart('import-list-error-msg').then((p) => {
        setTimeout(() => { p.el.dataset.state = _a.open }, 300)
        p.set({ content: data.status })
      })
      return;
    }
    let members = data;
    let membersListKind = members.map(row => {
      return require('./skeleton/import/members-list').AddRow(this, row)
    })
    this.getPart('upload-body-wrapper').feed(require('./skeleton/import/members-list').default(this))
    this.getPart('import-list-table').append(membersListKind)
    let valid = members.filter(function name(p) {
      return !p.error
    })
    if (valid.length) {
      this.getPart('button-validate').setState(1)
    }
    // if (!status) {
    //   this.getPart('import-list-error-msg').el.dataset.state = _a.open
    // }

  }

  /*
   *
  */
  loadImportDropPage() {
    this.getPart('upload-body-wrapper').feed(require('./skeleton/import/drag-a-drop').default(this));
    let cancelBtn = Skeletons.Note({
      className: `${this.fig.family}__upload-member-button cancel-btn`,
      service: 'close-overlay',
      content: LOCALE.CANCEL, //"Cancel",
      uiHandler: [this]
    });
    // @ts-ignore
    this.getPart('upload-footer-wrapper').feed(cancelBtn);
    this.getPart('import-list-error-msg').el.dataset.state = _a.closed
  }


  /*
   *
  */
  importAllAccounts() {
    this.postService({
      service: SERVICE.adminpanel.member_import,
      secret: this.importResponse.secret,
      //hub_id   : Visitor.id, 
      orgid: this.organisation.id,
    })
  }


  /**
   * @param {Object} data
  */
  deleteMemberResponse(data) {
    this.loadActionPopupAcknowledgement(data)
    if (data.status == 'INVALID_STATUS') {
      Butler.say("Something went wrong")
      return
    }
    return this.removeMemberFromList()
  }

  /**
   * @param {Object} data
  */
  disconnectMemberResponse(data) {
    this.loadActionPopupAcknowledgement(data)
    if (data.status == 'INVALID_STATUS') {
      return
    }
    if (this.__memberRoom) {
      this.__memberRoom.feed({ kind: 'members_room', type: '' })
    }
    return this.removeMemberFromList()
  }

  /**
   * @param {Object} data
  */
  requestMimicNewVerify(data) {
    let msgSklChild = []
    let name = data.user_fullname
    if (!name && data.member && data.member.fullname) {
      name = data.member.fullname
    }
    msgSklChild.push({
      kind: 'note',
      className: "primary-color",
      content: name
    })
    if (data.status == 'INVALID_USER') {
      msgSklChild.push({ kind: 'note', content: LOCALE.INVALID_USER }) //"Invalid User"
    }
    if (data.status == 'NOT_ONLINE') {
      msgSklChild.push({ kind: 'note', content: LOCALE.NOT_ONLINE_ASK_LATER }) //Is not online ask him later
    }
    if (data.status == 'MIMIC_ALREADY') {
      msgSklChild.push({ kind: 'note', content: LOCALE.ALREADY_SHARED_ASK_HIM_LATER })//Is Already Shared, Please ask him later"
    }
    if (data.status == 'new') {
      msgSklChild.unshift({ kind: 'note', content: LOCALE.AUTHORIZATION_REQUEST_SENT })//An authorization request has been sent to "
    }
    if (data.status == 'active') {
      msgSklChild.push({ kind: 'note', content: LOCALE.DESK_LOADING });//"desk is loading"
      _.delay(() => location.reload(), 5000)
    }

    let message = {
      kind: 'window_info',
      message: {
        kind: 'box',
        flow: 'y',
        kids: msgSklChild
      }
    }

    Wm.alert(message)
  }


  /**
   * @param {_SVC} service
   * @param {object} data
   * @param {any} socket
  */
  __dispatchRest(service, data, socket) {
    switch (service) {
      // case SERVICE.adminpanel.member_delete:
      //   return this.deleteMemberResponse(data)

      // case SERVICE.adminpanel.member_disconnect:
      //   return this.disconnectMemberResponse(data)



      case SERVICE.adminpanel.member_admin_remove:
        this.loadActionPopupAcknowledgement(data)
        return this.removeMemberFromList()

      case SERVICE.adminpanel.member_authentification:
        if (data.status) {
          return this.authenticationResponse(false)
        }
        return this.authenticationResponse(true, data[0])

      case SERVICE.adminpanel.member_change_status:
      case SERVICE.adminpanel.send_password_link:
        this.loadActionPopupAcknowledgement(data[0])
        return this.updateMemberStatusResponse(data[0])


      case SERVICE.adminpanel.mimic_new:
        this.requestMimicNewVerify(data)
        break;

    }
  }
}


module.exports = ___members_page
