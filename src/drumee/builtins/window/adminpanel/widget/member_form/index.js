
class ___widget_member_form extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this._source = this.mget(_a.source)
    this._type = this.mget(_a.type)
    this.rolesSelected = []
    this.membersSelected = []
    this.declareHandlers();
  }

  /**
   * 
   */
  onDomRefresh() {
    this.setFormData()
    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'choose-who-can-see-member':
        return this.chooseWhoCanSeeMember()

      case 'close-who-can-see':
        this.membersSelected = cmd.membersSelected
        return this.triggerHandlers({ service: 'close-overlay' })

      case _e.submit:
        this._submitMember()
        break

      case _e.cancel:
        this._cancelMemberForm()
        break

      case 'close-overlay':
        return this.triggerHandlers({ service: 'close-overlay' })

      // default:
      //   this.debug("Created by kind builder");
    }
  }

  /**
   * 
   * @returns 
   */
  setFormData() {
    if (this._type == 'member_edit') {
      this._memberData = this._source.mget(_a.member);
      this.fetchMembersSelected();
    } else {
      this._memberData = {
        firstname: '',
        lastname: '',
        address: {
          street: '',
          city: '',
          country: ''
        },
        ident: '',
        email: '',
        areacode: '',
        mobile: '',
        comment: '',
        privilege: 1
      }
    }

    return
  }

  /**
   *
  */
  fetchMembersSelected() {
    return this.fetchService({
      service: SERVICE.adminpanel.members_whocansee,
      orgid: this.mget('orgId'),
      user_id: this._memberData.drumate_id,
      //hub_id  : Visitor.get(_a.id)
    }).then(data => {
      return this.membersSelected = data[0].member
    }).catch(this.debug('Something went wrong'))
  }

  /**
   * 
  */
  chooseWhoCanSeeMember() {
    const parent = this._source.mget(_a.parent)
    const overlayWrapper = parent.getPart('overlay-wrapper')

    let dataOpt = {
      kind: 'widget_member_who_can_see',
      className: 'widget_member_who_can_see',
      sys_pn: 'who-can-see-member',
      uiHandler: this,
      orgId: this.mget('orgId'),
      autoSave: false,
      fetchService: false
    }

    if (this._type == 'member_edit') {
      dataOpt.memberData = this._memberData
      dataOpt.fetchService = true
    }

    overlayWrapper.el.dataset.mode = _a.open
    return parent.getPart('wrapper-overlay-notifier').feed(dataOpt)
  }

  /**
   * 
   * @returns 
   */
  _submitMember() {
    if(!(Organization.get(_a.privilege) & _K.permission.admin)){
      Wm.alert(LOCALE.WEAK_PRIVILEGE);
      return;
    }
    this.validateData()
    if (this.formStatus == _a.error) {
      this.debug('invalid data')
      return
    }

    let data = this.getData(_a.formItem);

    // to validate ident with regular expression
    const regExpr = /[a-z0-9\-_\.@]+$/;
    if (!regExpr.test(data.ident)) {
      this.__identInput.showError(LOCALE.ONLY_ALPHANUMERIC_AND_SPECIAL_ALLOWED);
      return
    }

    if (data.otp && (_.isEmpty(data.areacode) || _.isEmpty(data.mobile))) {
      if (_.isEmpty(data.areacode)) {
        this.__areaCodeInput.showError(LOCALE.AREA_CODE_REQUIRED);
      }

      if (_.isEmpty(data.mobile)) {
        this.__mobileInput.showError(LOCALE.PHONE_NO_REQUIRED_AUTH);
      }
      return
    }

    this.rolesSelected = this._source.getPart('member-role-menu').rolesSelected
    data.role = this.rolesSelected.map((row) => row.role_id)
    data.users = this.membersSelected // holds Authorized contacts list
    if (data.areacode && !data.areacode.includes('+')) {
      data.areacode = '+' + data.areacode  // to add + to the area code --  do not change/remove
    }

    if (data.otp === 1) {
      data.option = _a.sms;
    } else {
      data.option = 'O';
    }

    let service = SERVICE.adminpanel.member_add
    if (this._type == 'member_edit') {
      service = SERVICE.adminpanel.member_update
      data.user_id = this._memberData.drumate_id
    }

    this.postService({
      service: service,
      orgid: this._source.mget('orgId'),
      ...data
    })

    return
  }

  /**
   * 
   */
  _cancelMemberForm() {
    this.source = this._source
    this.service = 'cancel-member'
    this.triggerHandlers()
    this.service = ''
  }

  /**
   *
  */
  renderMessage(msg) {
    const msgBox = Skeletons.Note({
      className: `${this.fig.family}__note error-msg`,
      content: msg
    })

    this.__messageBox.el.dataset.mode = _a.open;
    this.__messageBox.feed(msgBox);

    const f = () => {
      this.__messageBox.el.dataset.mode = _a.closed;
      this.__messageBox.clear();
    }
    return _.delay(f, Visitor.timeout(3000));
  }


  /**
   * @param {*} method
   * @param {*} data
   * @param {*} socket
  */
  __dispatchRest(method, data) {

    switch (method) {
      case SERVICE.adminpanel.member_add:
      case SERVICE.adminpanel.member_update:
        //error handling
        switch (data.status) {
          case 'EMAIL_NOT_AVAILABLE':
            return this.__emailInput.showError(LOCALE.THIS_EMAIL_ALREADY_EXISTS); //'This email already exists.'

          case 'IDENT_NOT_AVAILABLE':
            return this.__identInput.showError(LOCALE.IDENT_ALREADY_EXISTS); //'This ident already exists.'

          case 'INVALID_SECURITY':
            return this.renderMessage(LOCALE.ADMIN_DOUBLE_AUTH_REQUIRED);

          case 'MOBILE_EMPTY':
            return this.renderMessage(LOCALE.PHONE_NO_REQUIRED_AUTH);

          case 'AREACODE_EMPTY':
            return this.renderMessage(LOCALE.AREA_CODE_REQUIRED_AUTH);
        }

        if (data.status != _a.active) {
          Butler.say(LOCALE.INTERNAL_ERROR + `[${data.status}]`)
          return;
        }
        // response
        this.service = 'add-member'
        this.response = { _type: this._type, ...data }
        if (method == SERVICE.adminpanel.member_update) {
          this.service = 'update-member'
        }
        this.triggerHandlers()

        break

      default:
        this.debug(`${method} not available !!!`)
    }
  }
}


module.exports = ___widget_member_form
