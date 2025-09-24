
const { uploadFile } = require("core/socket/upload")
const { dataTransfer } = require("core/utils")

const __window_addressbook_interact = require('window/interact/singleton');

const MAX_CONTENT = 'max-content';

class __window_addressbook extends __window_addressbook_interact {
  constructor(...args) {
    super(...args);
    this.loadAfterAllPartReady = this.loadAfterAllPartReady.bind(this);
    this.uploadFile = uploadFile.bind(this);

  }

  /**
   * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize();
    this.initialLoad = true;
    this._view = _a.max;
    this._state = 0;
    this.breadcrumbsList = [];
    this.activeNodes = {};
    this._setSize({ minHeight: 500, minWidth: 340 });
    if (this.mget(_a.source)) {
      this.minimizeLocation = {
        left: this.mget(_a.source).$el.offset().left - 20
      };
    }
    this.router = null;
    this.bindEvent(_a.live);
    if (this.mget(_a.args)) {
      return this.router = this.mget(_a.args);
    }
    this.contextmenuSkeleton = 'a';
  }

  /**
   *
  */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this.raise();
    return super.onDomRefresh();
  }

  /**
   * @param {*} child
   * @param {*} pn
   * @param {*} section
  */
  onPartReady(child, pn, section) {
    this.raise();
    switch (pn) {
      case 'contact-breadcrumbs-container':
        return this.contactBreadcrumbsContainer = child;

      case 'overlay-wrapper':
        this._getInviteNotifications();
        return
      case _a.content:
        this._content = child;
        this.loadContentView();
        return this.setupInteract();

      case MAX_CONTENT:
        this._loadMaxContent();
        return this.waitElement(child.el, this.loadAfterAllPartReady);

      case 'widget_contacts':
        return this.waitElement(child.el, this.loadAfterWidgetContacts, child);

      case 'widget_tag':
        return this.waitElement(child.el, () => {
          if (this.router && (this.router.page === 'pending-list')) {
            const pendingList = child.getPart(_a.pending);
            return this.waitElement(pendingList.el, () => {
              this.initialLoad = false;
              return pendingList.triggerHandlers();
            });
          }
        });


      default:
        return super.onPartReady(child, pn, section);
    }
  }

  /**
   * @param {*} args
  */
  reload(args) {
    this.router = null;
    if (args) {
      this.mset(_a.args, args);
      this.router = args;
    }
    if (this.router && (this.router.page === 'notification')) {
      return this._showInviteNotifications(null);
    }

    this.initialLoad = true;
    if (this.router && ((this.router.page === _a.invite) || (this.router.page === 'add-contact'))) {
      this._loadMaxContent();
      this.waitElement(this.getPart(MAX_CONTENT).el, this.loadAfterAllPartReady);
      return;
    }
    this.loadContentView();
    this.setupInteract();
  }

  /**
   *
  */
  loadAfterAllPartReady() {
    this.responsive('', _a.none);
    if (this.router) {
      return this.route(this.router.page);
    }
  }

  /**
   * @param {*} page
   * @param {*} args
  */
  route(page, args) {
    switch (page) {
      case _a.invite:
        return this._loadInviteContactForm();
      case 'add-contact':
        return this._loadCreateContactForm();
      case 'notification':
        return this._showInviteNotifications();
    }
  }

  /**
   * @param {*} widgetContacts
  */
  loadAfterWidgetContacts(widgetContacts) {
    const EOD = 'end:of:data';
    const f = () => {
      if (this.router && this.initialLoad) {
        this.initialLoad = false;
        if (this.router.data && this.router.page === 'open-contact') {
          widgetContacts.triggerClick(this.router.data.contact_id);
        }
        return;
      }
      if (this._view === _a.max) {
        return widgetContacts.triggerClick();
      }
    };

    return widgetContacts.on(EOD, f);
  }


  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.model.get(_a.service);
    if (pointerDragged) {
      return;
    }
    switch (service) {
      case _e.closePopup: case 'close-invite':
        return this.closeOverlay(cmd);

      case 'close-overlay':
        return this.closeOverlay();

      case 'cancel-invite':
        return this.updateContactDetail(cmd);

      case 'previous-page':
        return this.previousBreadcrumb();

      case 'next-page':
        return this.nextBreadcrumb();

      case 'invite-notifications':
        return this._showInviteNotifications(cmd);

      case 'edit-contact':
        return this._loadEditPage(cmd);

      case 'load-tag':
        return this.loadTagView();

      case 'show-contact-list':
        this.loadContactView(cmd.source);
        return this._defaultSource = cmd.source;

      case 'add-new-contact':
        return this.addNewContact(cmd);

      case 'update-contact':
        return this.updateContact(cmd);

      case 'show-contact-detail':
        var {
          source
        } = cmd;

        if (!source.mget('isPlaceholder')) {
          return this.loadContactDetailView(cmd);
        } else {
          return this._loadMaxContent();
        }

      case 'show-contact-detail-by-id':
        this.getPart('overlay-wrapper').el.dataset.mode = _a.closed;
        this.getPart('wrapper-overlay-notifier').el.dataset.state = _a.closed;
        return this.loadContactDetailView(cmd);

      case 'invite_someone':
        this._loadInviteContactForm();
        return this.getPart('contact-dropdown').changeState(0);

      case 'invite-response':
        return this._inviteResponse(cmd);

      case 'invite-others':
        this.getPart('overlay-wrapper').el.dataset.mode = _a.closed;
        this.getPart('wrapper-overlay-notifier').el.dataset.state = _a.closed;
        return this._loadInviteContactForm();

      case 'create_contact':
        this._loadCreateContactForm();
        return this.getPart('contact-dropdown').changeState(0);

      case _e.search:
        return this._loadSearchResults(cmd);

      case 'toggle-search-bar':
        return this._toggleSearchBar();

      case 'import-address-book':
        return this.__fileselector.open(this._importAddressBook.bind(this));

      case 'import-from-google':
        return this.importFromGoogle(this);
      // this - is passed as a source to the destination - do not change/remove

      case 'close-search-bar':
        this.getPart('search-bar-input').setValue('');
        return this.getPart(_a.search).el.dataset.mode = _a.closed;

      case 'delete-contact':
        return this.deleteContact(cmd);

      case 'cancel-contact-form':
        return this.cancelContactForm(cmd.source);

      case 'empty-notification-handler':
        return this.emptyNotificationHandler();

      default:
        return super.onUiEvent(cmd);
    }
  }

  /**
   * @param {*} e
  */
  onUploadEnd(data) {
    if (data.error) {
      this.warning(data.message || data.error);
    }
    this.__overlayWrapper.el.dataset.mode = _a.closed;
  }

  /**
   * @param {*} e
  */
  _importAddressBook(e) {
    const r = dataTransfer(e);
    const file = r.files[0];
    if (!/.+\.(csv|cvf)$/i.test(file.name)) {
      this.warning("*.csv, *.cvf".printf(LOCALE.ONLY_ACCEPT))
      return
    }
    const opt = {
      service: SERVICE.contact.load,
      hub_id: Visitor.id,
      nid: '0',
    };
    this.uploadFile(file, opt)
    this.__overlayWrapper.el.dataset.mode = _a.open;
    this.__overlayWrapper.append({
      kind: 'progress',
      filename: file.name,
      cancelable: _a.yes,
    });
    this.__progess = this.__overlayWrapper.children.last();
    return this.__progess.once(_e.destroy, () => {
      return this.__overlayWrapper.el.dataset.mode = _a.closed;
    });
  }

  /**
   * 
  */
  importFromGoogle(source) {
    this.fetchService({
      service: SERVICE.contact.google_auth,
      hub_id: Visitor.get(_a.id)
    }).then((data) => {
      const { url } = data;
      const settings = 'height=500,width=400,left=150,top=90,resizable,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes';

      var wind = window.open(url, 'popUpWindow', settings);
      var timer = setInterval(function () {
        if (wind.closed) {
          clearInterval(timer);
          source.reload();
        }
      }, 2000);
      return
    }).catch((e) => {
      return this.debug('Something wrong happened.');
    })
  }

  /**
   * 
  */
  _toggleSearchBar() {
    const {
      mode
    } = this.getPart(_a.search).el.dataset;

    if (mode === _a.open) {
      this.getPart('search-bar-input').setValue('');
      this.getPart('search-result').clear();
      return this.getPart(_a.search).el.dataset.mode = _a.closed;

    } else {
      return this.getPart(_a.search).el.dataset.mode = _a.open;
    }
  }

  /**
   * @param {*} source
  */
  _loadSearchResults(source) {
    const val = source.getData(_a.formItem).value;
    if (val.length < 2) {
      return;
    }

    const dataOpt = {
      kind: 'widget_search',
      className: 'search-result-box',
      search: val,
      type: _a.contact
    };

    this.getPart('search-result').feed(dataOpt);
    return this.getPart(_a.search).el.dataset.mode = _a.open;
  }

  /**
   * @param {*} source
  */
  _showInviteNotifications(source = null) {
    this.getPart('overlay-wrapper').el.dataset.mode = _a.open;
    let p = this.getPart(MAX_CONTENT)
    if (p && p.updateStyle) {
      p.updateStyle('z-index', '1');
    }
    this.ensurePart('wrapper-overlay-notifier').then((p) => {
      p.feed({ kind: 'widget_invite_notification' });
    })
  }

  /**
   *
  */
  getCurrentLabel() {
    if (this.mget(_a.trigger)) {
      return this.mget(_a.trigger).mget(_a.label);
    }

    return this._currentLabel || 'Not set';
  }

  /**
   *
  */
  openFormOverlow() {
    const mode = _a.open;
    this.getPart('overlay-wrapper').el.dataset.mode = _a.open;
    return this.getPart(MAX_CONTENT).updateStyle('z-index', '1000');
  }

  /**
   * @param {*} cmd
  */
  async closeOverlay(cmd) {
    if (cmd == null) { cmd = {}; }
    const overlayWrapper = await this.ensurePart('overlay-wrapper');
    const inviteWrapper = await this.ensurePart('wrapper-overlay-notifier');
    const maxContent = await this.ensurePart(MAX_CONTENT);
    const forceClose = cmd.forceClose || false;
    const mode = cmd.mode || overlayWrapper.el.dataset.mode || '';

    this.getPart('wrapper-overlay-notifier').clear();
    if (!forceClose && maxContent && (this._view !== _a.min) && (mode !== 'addressBook')) {
      if (maxContent && maxContent.children && maxContent.findByIndex) {
        let part = maxContent.findByIndex(0)
        const partKind = part.mget(_a.kind);
        if (['widget_contact_form', 'contact_invitation_form'].includes(partKind)) {
          this.openFormOverlow();
          return;
        }
      }
    } else {
      this.updateContactDetail();
    }

    overlayWrapper.el.dataset.mode = _a.closed;
    inviteWrapper.el.dataset.state = _a.closed;
    return maxContent.updateStyle('z-index', '1');
  }

  /**
   * @param {*} contact
  */
  cancelContactForm(contact) {
    this._loadMaxContent();
    return this.closeOverlay(contact);
  }

  /**
   * 
  */
  emptyNotificationHandler() {
    this.closeOverlay();
    const notifierItem = this.getItemsByKind('addressbook_widget_notification')[0];
    notifierItem.mset(_a.data, '');
    notifierItem.render();
    return this.warning(LOCALE.NO_NOTIFICATION_TO_SHOW);
  }

  /**
   * switch min & max mode
  */
  loadContentView() {
    this.__content.feed(require('./skeleton/view/content')(this));
    return this.__windowHeader.feed(require('./skeleton/common/top-bar')(this));
  }

  /**
   * switch min & max mode
  */
  loadTopbarView() {
    return this.__windowHeader.feed(require('./skeleton/common/top-bar')(this));
  }

  /**
   * 
  */
  loadTagView() {
    this.breadcrumbsList = [];
    this.updateInstance();

    return this.__content.feed(require('./skeleton/view/content')(this));
  }

  /**
   * _loadMaxContent - Load the content view for the max mode
  */
  _loadMaxContent() {
    return this.getBranch(MAX_CONTENT).feed(require('./skeleton/common/default-max-content')(this));
  }

  /**
   * loadContactView - to load the contact view based on the tag id 
   * @param {*} tag
  */
  loadContactView(tag = null) {
    const contacts = {
      kind: 'widget_contacts',
      className: 'widget_contacts',
      sys_pn: 'widget_contacts',
      source: tag
    };

    this.activeNodes['tag'] = tag;

    if (this._view === _a.min) {
      this.updateInstance(this.viewInstance = 2);

    } else {
      this.updateInstance(this.viewInstance = 1);
    }

    return this.getBranch('contact-wrapper').feed(contacts);
  }

  /**
   * _loadInviteContactForm - load the invite form
  */
  _loadInviteContactForm() {
    const inviteForm = {
      kind: 'contact_invitation_form',
      className: 'addressBook-invitation-form',
      mode: 'addressBook'
    };

    if (this._view === _a.min) {
      this.updateInstance(this.viewInstance = 3);

    } else {
      this.updateInstance(this.viewInstance = 2);
    }

    return this.getBranch(MAX_CONTENT).feed(inviteForm);
  }

  /**
   * @param {*} cmd
  */
  _inviteResponse(cmd) {
    this.getPart('overlay-wrapper').el.dataset.mode = _a.open;
    this.source = cmd.source;
    this.addNewContact(cmd, _a.yes);
    const w = this.getPart('wrapper-overlay-notifier');
    return w.feed(require('../contact/skeleton/acknowledge')(this));
  }

  /**
   * to load the add contact form
  */
  _loadCreateContactForm() {
    const contactForm = {
      kind: 'widget_contact_form',
      className: 'widget_contact_form',
      sys_pn: 'contact_form',
      mode: _a.new
    };

    if (this._view === _a.min) {
      this.updateInstance(this.viewInstance = 3);

    } else {
      this.updateInstance(this.viewInstance = 2);
    }

    this.getBranch(MAX_CONTENT).feed(contactForm);
    return this.openFormOverlow();
  }

  /**
   * to load the edit contact form
   * @param {*} contact
   */
  _loadEditPage(contact) {
    const contactForm = {
      kind: 'widget_contact_form',
      className: 'widget_contact_form',
      sys_pn: 'contact_form',
      source: contact,
      mode: _a.edit
    };

    this.getBranch(MAX_CONTENT).feed(contactForm);
    this.openFormOverlow();
    return this.updateInstance();
  }

  /**
   * to update the contact
   * @param {*} cmd
   */
  updateContactDetail(cmd) {
    if (cmd == null) { cmd = {}; }
    const contactWrapper = this.getPart('contact-wrapper').children.first();
    const listContacts = contactWrapper.getPart('list-contacts');

    if (this.activeNodes['contact']) {
      this.loadContactDetailView(this.activeNodes['contact']);
      return;
    }
    const f = listContacts.children.first();
    if (f && f.$el && f.mget(_a.id)) {
      // listContacts.children.first().$el.trigger _e.click
      listContacts.children.first().triggerHandlers();
      return;
    } else {
      this._loadMaxContent();
    }
  }

  /**
   * to load the contact view based on the tag id
   * @param {*} cmd 
   */
  loadContactDetailView(cmd) {
    let contactsDetail;
    const contact = cmd.source || this.source;
    if ((cmd != null ? cmd.kind : undefined) === 'widget_contact_detail') {
      contactsDetail = cmd;

    } else {
      contactsDetail = {
        kind: 'widget_contact_detail',
        className: 'widget_contact_detail',
        source: contact
      };
    }

    if ((contact.type === _a.myContact) || (contact.mget(_a.type) === _a.myContact)) {
      this.activeNodes['contact'] = contactsDetail;
    }

    this.getBranch(MAX_CONTENT).feed(contactsDetail);

    if (this._view === _a.min) {
      return this.updateInstance(this.viewInstance = 3);

    } else if (this._view === _a.medium) {
      return this.updateInstance(this.viewInstance = 2);

    } else {
      return this.updateInstance(this.viewInstance = 1);
    }
  }

  /**
  * @param {*} cmd
  * @param {*} invite
  */
  addNewContact(cmd, invite) {
    if (invite == null) { invite = _a.no; }
    const contactList = this.getItemsByKind('widget_contacts')[0];
    contactList.addContactItem(cmd.source);
    contactList.triggerClick(cmd.source.id);
    if (invite === _a.no) {
      return this.closeOverlay();
    }
  }

  /**
   * @param {*} cmd
  */
  updateContact(cmd) {
    const contactList = this.getItemsByKind('widget_contacts')[0];
    contactList.updateContactItem(cmd.source);
    contactList.triggerClick(cmd.source.id);
    return this.closeOverlay();
  }

  /**
   * @param {*} cmd
  */
  deleteContact(cmd) {
    const contact = cmd.source;
    if (this._view !== _a.max) {
      this.previousBreadcrumb();
    }

    const contactList = this.getItemsByKind('widget_contacts')[0];
    contactList.deleteContactItemById(cmd.source.id);
    this.activeNodes['contact'] = null;
    const f = () => {
      return contactList.triggerClick();
    };
    return _.delay(f, 500);
  }

  /**
   * 
  */
  previousBreadcrumb() {
    let viewInstance = this.viewInstance || 1;
    if (viewInstance > 1) {
      viewInstance = viewInstance - 1;
    }
    return this.updateInstance(viewInstance);
  }

  /**
   *
  */
  nextBreadcrumb() {
    let viewInstance = this.viewInstance || 1;
    if (viewInstance < 3) {
      viewInstance = viewInstance + 1;
    }
    return this.updateInstance(viewInstance);
  }

  /**
   * 
   * @returns 
   */
  _getInviteNotifications() {
    this.debug("_getInviteNotifications", this);
    this.fetchService({
      service: SERVICE.contact.invite_get,
      hub_id: Visitor.get(_a.id)
    }).then((data) => {
      this.mset('notificationList', data);
      if (!_.isEmpty(data)) {
        return this._showInviteNotifications();
      }
    })
  }

  /**
   * 
  */
  onServerComplain(xhr) {
    this.debug('ERROR DISPATCED', xhr);
    return this.__wrapperPopup.feed(Skeletons.Note(LOCALE.TRY_AGAIN));
  }

  /**
   * @param {*} service
   * @param {*} data
   * @param {*} options
  */
  onWsMessage(service, data, options = {}) {
    this.gossip(`AAA:732 service = ${service}`, data, options);
    switch (options.service) {
      case SERVICE.contact.invite_accept:
      case SERVICE.contact.delete_contact:
        return this.fetchService({
          service: SERVICE.contact.get_contact,
          contact_id: data.contact_id,
          hub_id: Visitor.get(_a.id)
        }).then(data => {
          const contactList = this.getItemsByKind('widget_contacts')[0];
          if (service === SERVICE.contact.delete_contact) {
            return contactList.updateContactItem(data);
          }
          return contactList.addOrUpdateContactItem(data);
        });
      case SERVICE.contact.load:
        this.__progess.update(data.progress);
        if (data.progress === 100) {
          this.__progess.goodbye();
          return this.loadContactView(this._defaultSource);
        }
        break;
    }
  }

}

module.exports = __window_addressbook;
