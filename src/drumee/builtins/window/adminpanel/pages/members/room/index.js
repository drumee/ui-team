class ___members_room extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._type = this.mget(_a.type)
    // this._currentData = this.mget(_a.source)
    this._currentTag = this.mget('currentTag') || null;
    this._drumateId = ''
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.header:
        if (this._type == 'member_create') {
          this.waitElement(child.el, () => {
            this.__header.feed(require('./skeleton/header').default(this))
          });
        }
        break;

      case _a.content:
        this._content = child
        if (this._type == 'member_create') {
          this.waitElement(child.el, this.routeContent.bind(this));
        }
        break;
    }
  }

  /**
   * 
   * @returns 
   */
  routeContent() {
    let memberRoomOpt
    const type = this._type || this.mget(_a.type)

    switch (type) {
      case 'member_detail':
        memberRoomOpt = {
          kind: 'widget_member_detail',
          className: 'widget_member_detail',
          sys_pn: 'member_detail_page',
          memberData: this.mget(_a.member)
        }
        break

      case 'member_create':
        memberRoomOpt = {
          kind: 'widget_member_form',
          className: 'widget_member_form',
          sys_pn: 'member_form_page',
          orgId: this.mget('orgId'),
          type: type,
          source: this
        }
        break

      case 'member_edit':
        memberRoomOpt = {
          kind: 'widget_member_form',
          className: 'widget_member_form',
          sys_pn: 'member_form_page',
          orgId: this.mget('orgId'),
          type: type,
          source: this
        }
        break

      default:
        memberRoomOpt = require("./skeleton/default-content")
    }

    memberRoomOpt.currentTag = this._currentTag;

    return this.__content.feed(memberRoomOpt)
  }

  /**
   * 
   */
  onDomRefresh() {
    if (this._type != 'member_create') {
      this._drumateId = this.mget('drumate_id')
      this._getMemberDetail()
    }
    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _e.edit:
        this.editMemberForm()
        break
      case 'cancel-member':
        this.cancelMemberForm()
        break
      case "member-added":
        this.triggerHandlers(args)
        break;
      default:
        if (!service) return
        this.source = cmd
        this.triggerHandlers({ service })
    }
  }

  /**
   * 
   * @returns 
   */
  _getMemberDetail() {
    const memberId = this.mget('drumate_id')
    if (memberId) {
      this.fetchService({
        service: SERVICE.adminpanel.member_show,
        orgid: this.mget('orgId'),
        user_id: memberId,
      }).then((data) => {
        if (data) {
          this.mset(_a.member, data)
        }
        this.ensurePart("header").then((p) => {
          p.feed(require('./skeleton/header').default(this))
        })
        this.routeContent();
      })
    }
  }

  /**
   * 
   * @returns 
   */
  editMemberForm() {
    this._type = 'member_edit'
    this.__header.feed(require('./skeleton/header').default(this))
    this.routeContent()
    return
  }

  /**
   * 
   * @returns 
   */
  cancelMemberForm() {
    if (this._type == 'member_edit') {
      this._type = 'member_detail'
      this.__header.feed(require('./skeleton/header').default(this))
      this.routeContent()

    } else {
      this.service = 'cancel-create-member'
      this.triggerHandlers()
      this.service = ''
    }

    return
  }

}


module.exports = ___members_room
