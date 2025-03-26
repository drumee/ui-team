const MAX_CONTENT = 'max-content';
require('./skin');

class __addressbook_widget_contact_detail extends LetcBox {

  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this._parent = this.getParentByKind('window_addressbook');
    const src = this.mget(_a.source);
    this._currentContact = src;
    if (!src) {
      return this.warn("No contact");
    }
    if ((src.type === _a.myContact) || (src.mget(_a.type) === _a.myContact)) {
      return this._getContactDetail(src);
    }
    this.mset(_a.contact, src.model.toJSON());
    this.feed(require("./skeleton")(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
      case _a.edit:
        this.service = 'edit-contact';
        this.triggerHandlers();
        return this.service = '';

      case _a.block:
        return this._blockContact();

      case 'unblock':
        return this._unBlockContact();

      case 'toggle-block-contact':
        return this._toggleBlockContact(cmd);

      case _a.archived:
        return this._archiveContact();

      case 'unarchive':
        return this._unArchiveContact();

      case 'toggle-archive-contact':
        return this._toggleArchiveContact(cmd);

      case 'delete-contact':
        return this._deleteContact();

      case 'confirm-delete':
        return this._deleteContactConfirm(cmd);

      case 'invite-contact':
        return this._inviteContact();

      case 'resend-invite':
        return this._reSendInvite();

      case 'resend-invite-confirmation':
        return this._reSendInviteConfirmation();

      case 'update-invite':
        return this._updateInvite();

      case 'cancel-invite':
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();

      default:
        return this.debug("event not attached");
    }
  }

  /**
   * 
   * @returns 
   */
  _getContactDetail(src) {
    const contactID = src.id || this._currentContact.mget(_a.id);

    return this.fetchService({
      service: SERVICE.contact.get_contact,
      contact_id: contactID,
      hub_id: Visitor.get(_a.id)
    }).then((data)=>{
      this.mset(_a.contact, { type: 'my_contact', ...data })
      this.feed(require("./skeleton")(this));
    })
  }

  /**
   * 
   * @returns 
   */
  onBeforeDestroy() { return null; }

  /**
   * 
   * @returns 
   */
  getDefaultEmail() {
    const contact = this.mget(_a.contact);
    const defaultRow = contact.email != null ? contact.email.find(row => row.is_default) : undefined;
    if (defaultRow != null ? defaultRow.email : undefined) {
      return defaultRow.email;
    }

    return '';
  }


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  _openOverlayWrapper(opt) {
    if (opt == null) { opt = {}; }
    const overlayWrapper = this._parent.getPart('overlay-wrapper');
    overlayWrapper.el.dataset.mode = _a.open;
    if (__guard__(this._parent.getPart(MAX_CONTENT), x => x.updateStyle)) {
      this._parent.getPart(MAX_CONTENT).updateStyle('z-index', '1');
      return this._feedOverlayWrapper(opt);
    }
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  _feedOverlayWrapper(opt) {
    let dataOpt;
    if (opt == null) { opt = {}; }
    if (opt.type === 'resend-confirm') {
      dataOpt = require('./skeleton/action-popup/resend-invite')(this);
    } else if (opt.type === _a.resend) {
      dataOpt = require('./skeleton/action-popup/resend-invite-confirmation')(this);
    } else {
      dataOpt = require('./skeleton/action-popup/confirmation')(this, opt);
    }

    return this._parent.getPart('wrapper-overlay-notifier').feed(dataOpt);
  }

  /**
   * 
   */
  _blockContact() {
    if (__guard__(this.mget(_a.contact), x => x.is_blocked) === 0) {
      const opt = {
        type: _a.block,
        confirmLabel: LOCALE.BLOCK,
        confirmService: 'toggle-block-contact',
        headerContent: LOCALE.BLOCK_CONTACT,
        subtitleContent: LOCALE.DO_YOU_WANT_BLOCK_CONTACT
      };
      this._openOverlayWrapper(opt);
    }

  }

  /**
   * 
   */
  _unBlockContact() {
    if (__guard__(this.mget(_a.contact), x => x.is_blocked) === 1) {
      const opt = {
        type: 'unblock',
        confirmLabel: LOCALE.UNBLOCK,
        confirmService: 'toggle-block-contact',
        headerContent: LOCALE.UNBLOCK_CONTACT,
        subtitleContent: LOCALE.DO_YOU_WANT_TO_UNBLOCK
      };
      this._openOverlayWrapper(opt);
    }

  }

  /**
   * 
   * @param {*} cmd 
   */
  _toggleBlockContact(cmd) {
    const contact = this.mget(_a.contact);
    if (contact != null ? contact.id : undefined) {
      let _service = SERVICE.contact.block;
      if (contact.is_blocked === 1) {
        _service = SERVICE.contact.unblock;
      }

      this.postService({
        service: _service,
        contact_id: contact.id,
        hub_id: Visitor.get(_a.id)
      }).then((data)=>{
        this._toggleBlockAcknowledgement();
      })
    }

  }

  /**
   * 
   * @returns 
   */
  _toggleBlockAcknowledgement() {
    const contact = this.mget(_a.contact);
    let content = LOCALE.BLOCKED_FROM_YOUR_CONTACT_LIST;
    if (contact.is_blocked === 1) {
      content = LOCALE.UNBLOCKED_FROM_YOUR_CONTACT_LIST;
    }
    this._reloadContact();
    const popupBodyContent = this._parent.getPart('popup-body-content');
    popupBodyContent.feed(require('./skeleton/action-popup/acknowledgement')(this, content));
    return this._closeOverlay();
  }

  /**
   * 
   */
  _archiveContact() {
    if (__guard__(this.mget(_a.contact), x => x.is_archived) === 0) {
      const opt = {
        type: _a.archived,
        confirmLabel: LOCALE.ARCHIVE,
        confirmService: 'toggle-archive-contact',
        headerContent: LOCALE.ARCHIVE_CONTACT,
        subtitleContent: LOCALE.CONFIRM_ARCHIVE_CONTACT
      };
      this._openOverlayWrapper(opt);
    }

  }

  /**
   * 
   */
  _unArchiveContact() {
    if (__guard__(this.mget(_a.contact), x => x.is_archived) === 1) {
      const opt = {
        type: 'unarchive',
        confirmLabel: LOCALE.UNARCHIVE,
        confirmService: 'toggle-archive-contact',
        headerContent: LOCALE.UNARCHIVE_CONTACT,
        subtitleContent: LOCALE.CONFIRM_UNARCHIVE_CONTACT
      };
      this._openOverlayWrapper(opt);
    }

  }

  /**
   * 
   * @param {*} cmd 
   */
  _toggleArchiveContact(cmd) {
    const contact = this.mget(_a.contact);
    if (contact != null ? contact.id : undefined) {
      let _status = _a.archived;
      if (contact.is_archived === 1) {
        _status = _a.active;
      }

      this.postService({
        service: SERVICE.contact.change_status,
        contact_id: contact.id,
        status: _status,
        hub_id: Visitor.get(_a.id)
      }).then((data)=>{
        this._toggleArchiveAcknowledgement();
      })
    }

  }

  /**
   * 
   * @returns 
   */
  _toggleArchiveAcknowledgement() {
    const contact = this.mget(_a.contact);

    let content = LOCALE.INFO_ARCHIVED_CONTACT_LIST;
    if (contact.is_archived === 1) {
      content = LOCALE.INFO_UNARCHIVED_CONTACT_LIST;
    }

    this.source = contact;
    this.service = 'delete-contact';
    this.triggerHandlers();

    const popupBodyContent = this._parent.getPart('popup-body-content');
    popupBodyContent.feed(require('./skeleton/action-popup/acknowledgement')(this, content));
    return this._closeOverlay();
  }

  /**
   * 
   */
  _deleteContact() {
    if (__guard__(this.mget(_a.contact), x => x.id)) {
      const opt = {
        type: _a.destroy,
        confirmLabel: LOCALE.DELETE,
        confirmService: 'confirm-delete',
        headerContent: LOCALE.DELETE_CONTACT,
        subtitleContent: LOCALE.CONFIRM_DELETE_CONTACT
      };
      this._openOverlayWrapper(opt);
    }

  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _deleteContactConfirm(cmd) {
    const contactID = __guard__(this.mget(_a.contact), x => x.id);
    if (contactID) {
      this.postService({
        service: SERVICE.contact.delete_contact,
        contact_id: contactID,
        hub_id: Visitor.get(_a.id)
      }).then((data)=>{
        this._deleteAcknowledgement();
      })
    }
  }


  /**
   * 
   * @returns 
   */
  _deleteAcknowledgement() {
    this.source = this.mget(_a.contact);
    this.service = 'delete-contact';
    this.triggerHandlers();

    const content = LOCALE.REMOVE_CONTACT_LIST;
    const popupBodyContent = this._parent.getPart('popup-body-content');
    popupBodyContent.feed(require('./skeleton/action-popup/acknowledgement')(this, content));
    return this._closeOverlay();
  }

  /**
   * 
   * @returns 
   */
  _inviteContact() {
    const contact = this.mget(_a.contact);
    const data = this.getData();

    this.postService({
      service: SERVICE.contact.invite,
      firstname: contact.firstname || '',
      email: contact.ident || contact.email,
      surname: (data != null ? data.surname : undefined) || '',
      message: (data != null ? data.comment : undefined) || '',
      hub_id: Visitor.id
    });
  }


  /**
   * 
   * @returns 
   */
  _reSendInvite() {
    const contact = this.mget(_a.contact);
    if (contact.invitetime) {
      const inviteTime = Dayjs.unix(contact.invitetime);
      const timeNow = Dayjs();
      const timeDiff = timeNow.diff(inviteTime, _a.hours);
      if (timeDiff < 6) {
        const opt = { type: _a.resend };
        this._openOverlayWrapper(opt);
        return;
      }
    }

    return this._reSendInviteConfirmation();
  }

  /**
   * 
   * @returns 
   */
  _reSendInviteConfirmation() {
    const opt = { type: 'resend-confirm' };
    this._openOverlayWrapper(opt);
  }


  /**
   * 
   * @returns 
   */
  _updateInvite() {
    const contact = this.mget(_a.contact);
    contact.tag = (contact.tag != null ? contact.tag.map(row => [row.tag_id].join(',')) : undefined) || [];

    const source = this._parent.getPart('overlay-wrapper');
    const {
      message
    } = source.getData(_a.formItem);

    return this.postService({
      service: SERVICE.contact.update,
      hub_id: Visitor.id,
      contact_id: contact.id,
      firstname: contact.firstname || '',
      lastname: contact.lastname || '',
      invite: 1,
      comment: contact.comment || '',
      message: message || '',
      tag: contact.tag,
      email: contact.email || [],
      mobile: contact.mobile || [],
      address: contact.address || []
    }).the((data)=>{
      this._updateInviteResponse()
    })
  }

  /**
   * 
   * @returns 
   */
  _updateInviteResponse() {
    this._reloadContact();

    let content = LOCALE.INVITATION_HAS_BEEN_SENT_SUCCESSFULLY;
    if (this.mget(_a.contact).status === _a.sent) {
      content = LOCALE.INVITATION_AGAIN_SUCCESSFULLY;
    }

    const popupBodyContent = this._parent.getPart('popup-body-content');
    popupBodyContent.feed(require('./skeleton/action-popup/acknowledgement')(this, content, _a.invite));
    return this._closeOverlay();
  }

  /**
   * 
   * @returns 
   */
  _reloadContact() {
    const contact = this.mget(_a.contact);
    const contactList = this._parent.getItemsByKind('widget_contacts')[0];
    return contactList.triggerClick(contact.id);
  }

  /**
   * 
   * @returns 
   */
  _closeOverlay() {
    const f = () => {
      this.source = this;
      this.service = 'close-overlay';
      this.triggerHandlers();
      return this.service = '';
    };
    return _.delay(f, Visitor.timeout());
  }

  /**
   * 
   * @param {*} method 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  // __dispatchRest(method, data, socket) {
  //   switch (method) {
  //     // case SERVICE.contact.get_contact:
  //     //   this.mset(_a.contact, { type: 'my_contact', ...data })
  //     //   return this.feed(require("./skeleton")(this));

  //     // case SERVICE.contact.invite: 
  //     // case SERVICE.contact.update:
  //     //   var contact = this.mget(_a.contact);
  //     //   var mode = _a.new;

  //     //   if (SERVICE.contact.update) {
  //     //     this._updateInviteResponse();
  //     //     return mode = _a.edit;
  //     //   }
  //     //   break;

  //     // case SERVICE.contact.block: 
  //     // case SERVICE.contact.unblock:
  //     //   return this._toggleBlockAcknowledgement();

  //     // case SERVICE.contact.change_status:
  //     //   return this._toggleArchiveAcknowledgement();

  //     // case SERVICE.contact.delete_contact:
  //     //   return this._deleteAcknowledgement();
  //   }
  // }
}

module.exports = __addressbook_widget_contact_detail;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}