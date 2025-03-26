const { openUserMailAgent } = require("core/utils")
const __progress = require('libs/template/progress');
const { uploadFile } = require("core/socket/upload")

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
  onPartReady(child, pn) { return null }

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

      case 'import-member-re-upload':
        this.loadImportDropPage()
        break;

      case 'import-member-upload':
        this.importAllAccounts()
        break;

      case 'connection-log':
        return this.loadConnectionLog(cmd)

      case 'security':
        return this.loadSecurityOption(cmd)

      case 'toggle-double-authentication':
        return this.toggleDoubleAuthentication(cmd)

      case 'show-member-list':
        this.loadMembersList(cmd.source)
        break;

      case 'choose-who-can-see-member':
        return this.chooseWhoCanSeeMember(cmd)

      case 'show-member-detail':
        this.loadMemberDetail(cmd)
        break;

      case 'create-member':
        this.loadCreateMember()
        break

      case 'cancel-create-member':
        this.cancelCreateMemberForm()
        break

      case 'add-member':
        this.addNewMember(cmd)
        break

      case _e.edit:
        this.loadEditMember(cmd)
        break

      case 'update-member':
        this.updateMember(cmd)
        break

      case 'delete-inactive-member':
      case 'delete-member':
      case 'remove-admin':
      case 'reset-member-password':
      case 'change-member-password':
      case 'block-unblock-member':
      case 'toggle-archive-member':
        return this.loadActionPopup(cmd, service);

      case 'confirm-delete':
      case 'confirm-invite-delete':
      case 'confirm-remove-admin':
      case 'confirm-reset-member-password':
      case 'confirm-change-member-password':
      case 'confirm-block-unblock':
      case 'confirm-toggle-archive-member':
        return this.confirmActionPopup()

      case 'choose-admins':
        this.loadChooseAdminLayer()
        break

      case 'trigger-all-admins':
        let allAdminEl = this.findPart('all-admins')
        this.waitElement(allAdminEl.el, () => {
          // allAdminEl.$el.trigger(_e.click);
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

      case 'download-member-sample-file':
        let url = `${bootstrap().static}sample/admin_member_upload_sample.xlsx`;
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
    this.mset(_a.member, cmd.mget(_a.member))
    return this.openOverlay(require('./skeleton/security/main').default(this))
  }

  /**
   * @param {LetcBox} cmd
   */
  toggleDoubleAuthentication(cmd) {
    if (cmd.mget('isMobile') == _a.no) {
      return null
    }

    const data = this.mget(_a.member)
    const _value = cmd.mget(_a.value)

    if ((data.drumate_id) && (data.authentification != _value)) {
      return this.postService({
        service: SERVICE.adminpanel.member_authentification,
        orgid: this.orgId,
        user_id: data.drumate_id,
        option: _value,
        //hub_id  : Visitor.get(_a.id)
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
  loadMembersList(source = null) {
    const memberList = {
      kind: 'widget_members_list',
      className: 'widget_members_list',
      sys_pn: 'widget_members_list',
      orgId: this.orgId,
      source: source
    }
    if (this._view == _a.min) {
      this.updateInstance(this.viewInstance = 2)
    } else {
      this.updateInstance(this.viewInstance = 1)
    }
    return this.getBranch('members_list').feed(memberList);
  }


  /**
   * @param {(any|null)} source
  */
  loadMemberDetail(cmd) {
    const source = cmd.source || null;

    const memberDetail = {
      kind: 'members_room',
      className: 'members_room',
      sys_pn: 'page_members_room',
      orgId: this.orgId,
      type: 'member_detail',
      source: source,
      currentTag: cmd._currentTag,
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
  loadCreateMember(source = null) {
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
  addNewMember(cmd) {
    this.openOverlay(require('./skeleton/action-popup/member-acknowledgement').default(this))
    const data = cmd.source.response
    const memberList = this.getItemsByKind('widget_members_list')[0]
    memberList.addMemberItem(data)
    memberList.triggerClick(data.drumate_id)
    return
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
  loadActionPopup(cmd, type) {
    const overlayWrapper = this.getPart('overlay-wrapper')
    overlayWrapper.el.dataset.mode = _a.open
    this.getPart('wrapper-overlay-notifier').feed(require('./skeleton/action-popup/confirmation').default(this))
    return this.loadActionPopupContent(cmd, type)
  }

  /**
   * 
  */
  loadActionPopupContent(cmd, type) {
    const source = cmd.source
    let _content;

    this.mset({
      member: cmd.mget(_a.member),
      serviceType: type
    })

    switch (type) {
      case 'delete-inactive-member':
        _content = require('./skeleton/action-popup/content/delete-invite-member').default(this)
        break

      case 'delete-member':
        _content = require('./skeleton/action-popup/content/delete-member').default(this)
        break

      case 'remove-admin':
        this.mset(_a.member, source.model.attributes)
        _content = require('./skeleton/action-popup/content/remove-admin').default(this)
        break

      case 'reset-member-password':
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

      case 'change-member-password':
        _content = require('./skeleton/action-popup/content/set-member-password').default(this)
        break

      case 'block-unblock-member':
        _content = require('./skeleton/action-popup/content/block-unblock-member').default(this)
        break

      case 'toggle-archive-member':
        _content = require('./skeleton/action-popup/content/archive-member').default(this)
        break


      default:
        _content = require('./skeleton/action-popup/content/delete-member').default(this)
    }

    return this.getPart('popup-body-content').feed(_content)
  }

  /**
   * 
  */
  confirmActionPopup() {
    const type = this.mget('serviceType')
    const data = this.mget(_a.member)
    let _status;
    if (data && data.drumate_id) {
      switch (type) {
        case 'delete-inactive-member':
          return this.deleteInviteMember(data)

        case 'delete-member':
          return this.deleteMember(data)

        case 'remove-admin':
          return this.removeAdmin(data)

        case 'reset-member-password':
          return this.resetMemberPassword(data)

        case 'block-unblock-member':
          _status = _a.locked
          if (data.status == _a.locked) {
            _status = _a.active
          }
          return this.updateMemberStatus(data, _status)

        case 'toggle-archive-member':
          _status = _a.archived
          if (data.status == _a.archived) {
            _status = _a.locked
          }

          return this.updateMemberStatus(data, _status)

        case 'change-member-password':
          return this.changeMemberPassword(data);

        default:
          return this.loadActionPopupAcknowledgement()
      }
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
      //hub_id  : Visitor.get(_a.id)
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
      ////hub_id  : Visitor.get(_a.id)
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
    return _.delay(f, 500)
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

    return _.delay(f, 500)
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
    if (file.isDirectory || !/(.+)\.xls(.*)$/.test(file.name)) {
      this.warn("REJECTED ", file, file.isDirectory, file.name, /(.+)\.xls*$/.test(file.name));
      Wm.alert('excel'.underline("required-type").printf(LOCALE.REQUIRES_FILE_TYPE));
      return;
    }

    let opt = {
      service: SERVICE.adminpanel.members_import,
      orgid: this.organisation.id,
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
   * @param {*} e
   * @param {any} socket
  */
  onUploadEnd(e, socket) {
    let data = e
    if (e.data) {
      data = e.data;
    }
    let status = data.valid;
    let members = data.members;
    this.importResponse = data;
    if (data.status == 'FILE_ERR') {
      Wm.alert('excel'.underline("required-type").printf(LOCALE.REQUIRES_FILE_TYPE));
      return;
    }
    let membersListKind = members.map(row => {
      return require('./skeleton/import/members-list').AddRow(this, row)
    })
    this.getPart('upload-body-wrapper').feed(require('./skeleton/import/members-list').default(this))
    this.getPart('import-list-table').append(membersListKind)
    let successService = 'import-member-re-upload';
    let successLabel = LOCALE.UPLOAD_AGAIN; //'Upload Again';
    let cancelService = 'close-overlay';
    if (status) {
      successService = 'import-member-upload'
      successLabel = LOCALE.CREATE_ALL_ACCOUNTS //'Create All Accounts'
      // cancelService   = 'import-member-re-upload'
    }

    this.getPart('upload-footer-wrapper').feed(Preset.ConfirmButtons(this, {
      cancelLabel: LOCALE.CANCEL || '',
      cancelService: cancelService,
      confirmLabel: successLabel,
      confirmService: successService
    }))
    if (!status) {
      this.getPart('import-list-error-msg').el.dataset.state = _a.open
    }

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
      service: SERVICE.adminpanel.members_import,
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
      case SERVICE.adminpanel.member_delete:
        return this.deleteMemberResponse(data)

      case SERVICE.adminpanel.member_disconnect:
        return this.disconnectMemberResponse(data)



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

      case SERVICE.adminpanel.members_import:
        if (data.valid) {
          // this.getItemsByKind("widget_member_tags")[0]
          // .getItemsByAttr('type','allMembers')[0]
          // .$el.trigger('click');
          this.getItemsByKind("widget_member_tags")[0]
            .getItemsByAttr('type', 'allMembers')[0]
            .triggerHandlers();
          this.closeOverlay();
        } else {
          this.onUploadEnd(data, '')
        }
        break;

      case SERVICE.adminpanel.mimic_new:
        this.requestMimicNewVerify(data)
        break;

    }
  }
}


module.exports = ___members_page
