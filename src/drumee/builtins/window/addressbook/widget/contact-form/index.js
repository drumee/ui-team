
//########################################

class __addressbook_widget_contactForm extends LetcBox {

  // ===========================================================
  //
  // ===========================================================
  constructor(...args) {
    super(...args);
    this.loadAfterAllPartReady = this.loadAfterAllPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this._submitContact = this._submitContact.bind(this);
    this.getDefaultEmail = this.getDefaultEmail.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this._tagToggleState = this._tagToggleState.bind(this);
    this._inviteUserToggle = this._inviteUserToggle.bind(this);
    this.setFormData = this.setFormData.bind(this);
    this._cancelContactForm = this._cancelContactForm.bind(this);
  }

  initialize(opt = {}) {
    super.initialize(opt);
    require('./skin');
    this.tagsSelected = [];
    this.declareHandlers();
    this._formError = {};
    this.mode = _a.new;
    this.setFormData();
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   * @returns 
   */
  onPartReady(child, pn, section) {
    switch (pn) {
      case 'email-list': case 'phone-list': case 'address-list':
        return this.debug(`onPartReady ${pn}`, child, section, this);
      case 'message-input':
        return this.waitElement(child.el, () => {
          return this.parent.el.scrollTop = this.parent.el.scrollHeight;
        });

      case 'form_list-wrapper':
        return this.waitElement(child.el, this.loadAfterAllPartReady);

    }
  }

  /**
   * 
   * @returns 
   */
  loadAfterAllPartReady() {
    const defaultEmailObj = {
      category: 0,
      email: "",
      is_default: 1
    };

    if (this.contact.email && this.contact.email.length) {
      this.contact.email.forEach(row => {
        return this._addItem('email-list', row);
      });

    } else {
      this._addItem('email-list', defaultEmailObj);
    }


    if (this.contact.mobile && this.contact.mobile.length) {
      this.contact.mobile.forEach(row => {
        return this._addItem('phone-list', row);
      });

    } else {
      this._addItem('phone-list');
    }

    if (this.contact.address && this.contact.address.length) {
      return this.contact.address.forEach(row => {
        return this._addItem('address-list', row);
      });

    } else {
      return this._addItem('address-list');
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.debug(" onDomRefresh", this);
    return this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    if (pointerDragged) {
      return;
    }

    switch (service) {
      case 'is-default':
        this._defauld = this;
        return this.changeDefault(cmd);

      case 'add-item':
        return this._addItem(cmd.mget('itemName'));

      case 'submit':
        return this._submitContact();

      case 'trigger-tag-select':
        return this._tagToggleState(cmd.source);

      case 'trigger-invite-user':
        return this._inviteUserToggle(cmd);

      case 'cancel-edit':
        return this._cancelContactForm(cmd);

      default:
        var {
          status
        } = cmd;
        this.source = cmd;
        return this.service = service;
    }
  }

  /**
   * 
   * @param {*} name 
   * @param {*} data 
   * @returns 
   */
  _addItem(name, data) {
    if (data == null) { data = {}; }
    this.debug(" _addItem", name, data);
    const currentlist = this.getPart(name);
    kidData = {
      ...currentlist.mget(_a.itemsOpt),
      ...data
    }
    return currentlist.append(kidData);
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  changeDefault(cmd) {
    return this.__emailList.children.forEach(emailItem => {
      const status = emailItem.__defaultEmail.mget(_a.state);
      let trashState = _a.open;
      const emailInput = emailItem.__emailInput;
      let validators = emailInput.mget("validators").filter(validatorItem => {
        if (validatorItem.comply === Validator.require) {
          return false;
        }
        return validatorItem;
      });

      if (status) {
        trashState = _a.closed;
      }

      if (this.contact.is_need_email) {
        validators = [
          ...validators,
          { reason: "Email is required", comply: Validator.require }
        ];
        emailInput.mset("validators", validators);
      }
      emailItem.__trashIcon.$el.attr(_a.data.state, trashState);
      if (emailInput.el.getAttribute('data-status')) {
        return emailInput.checkSanity();
      }
    });
  }

  // ===========================================================
  // _submitContact to submit the contact form 
  // ===========================================================
  _submitContact() {
    this.validateData();
    if (this.formStatus === _a.error) {
      this.debug("invalid data");
      return;
    }

    this.debug(" _submitContact", this);
    const data = this.getData(_a.formItem);
    const replaceCategory = row => {
      let cat = 'prof';
      if (row.category === 1) {
        cat = 'priv';
      }
      row.category = cat;
      return row;
    };

    const formatAreaCode = row => {
      if (!row.areacode.includes('+')) {
        row.areacode = '+' + row.areacode;
      }
      return row;
    };

    const getSelectedTagIds = i => {
      let tagIds;
      return tagIds = [i.tag_id].join(',');
    };

    data.email = data.email
      .map(replaceCategory)
      .filter(row => row.email);
    data.mobile = data.mobile
      .map(replaceCategory)
      .map(formatAreaCode)
      .filter(row => row.phone.trim());

    data.address = data.address
      .map(replaceCategory)
      .filter(row => {
        return row.city.trim() && row.country.trim() && row.street.trim();
      });

    this.tagsSelected = this.getPart('tag-form-menu').tagsSelected;
    data.tag = this.tagsSelected.map(getSelectedTagIds);

    let service = SERVICE.contact.add;
    if ((this.mode === _a.edit) && (this.contact.type === "my_contact")) {
      service = SERVICE.contact.update;
      data.contact_id = this.contact.id;
    }

    this.postService({
      service,
      hub_id: Visitor.get(_a.id),
      ...data
    });

    return this.debug(" _submitContact data", this, data);
  }

  /**
   * 
   * @returns 
   */
  getDefaultEmail() {
    const defaultRow = this.contact.email != null ? this.contact.email.find(row => row.is_default) : undefined;
    if (defaultRow != null ? defaultRow.email : undefined) {
      return defaultRow.email;
    }
    return '';
  }

  /**
   * 
   * @returns 
   */
  getCurrentApi() {
    const api = {
      service: SERVICE.tagcontact.show_tag_by,
      order: _a.position,
      hub_id: Visitor.get(_a.id)
    };
    return api;
  }

  /**
   * 
   * @param {*} source 
   * @returns 
   */
  _tagToggleState(source) {
    const state = source.mget(_a.state);
    const tagId = source.mget(_a.value);
    const tagName = source.mget(_a.label);

    if (state) {
      return this.tagsSelected.push({
        tag_id: tagId,
        name: tagName
      });

    } else {
      return this.tagsSelected = this.tagsSelected.filter(row => {
        if (row.tag_id !== tagId) {
          return row;
        }
      });
    }
  }


  /**
   * 
   * @param {*} source 
   * @returns 
   */
  _inviteUserToggle(source) {
    const state = source.mget(_a.state);
    let content = "";
    if (state) {
      content = require('./skeleton/message-box')(this);
    }

    return this.__wrapperMessageInputBox.feed(content);
  }

  /**
   * 
   * @returns 
   */
  setFormData() {
    const contact = {
      tag: [],
      email: [{
        category: 0,
        email: "",
        is_default: 1
      }],
      address: [],
      mobile: [],
      is_need_email: 1
    };

    this.contact = contact;
    const replaceCategory = row => {
      let cat = 0;
      if (row.category === 'priv') {
        cat = 1;
      }
      row.category = cat;
      return row;
    };

    if (this.mget(_a.mode) === _a.edit) {
      this.mode = _a.edit;
      this.contact = this.mget(_a.source).mget(_a.contact);
      this.tagsSelected = this.contact.tag || [];
      this.contact.email = this.contact.email != null ? this.contact.email.map(replaceCategory) : undefined;
      this.contact.mobile = this.contact.mobile != null ? this.contact.mobile.map(replaceCategory) : undefined;
      return this.contact.address = this.contact.address != null ? this.contact.address.map(replaceCategory) : undefined;
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  _cancelContactForm(cmd) {
    this.source = this.contact;
    this.service = 'cancel-contact-form';

    if (this.mget(_a.mode) === _a.edit) {
      const data = this.mget(_a.source).mget(_a.source);
      this.source = { type: 'my_contact', mode: _a.cancel, ...data }
      this.source = this.mget(_a.source).mget(_a.source);
      this.service = 'show-contact-detail-by-id';
      this.triggerHandlers();

    } else {
      this.debug("_cancelContactForm add form", cmd);
    }

    this.forceClose = true;
    this.service = _e.closePopup;
    return this.triggerHandlers();
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.contact.add: 
      case SERVICE.contact.update:
        if (data.status === 'ALREADY_IN_CONTACT') {
          this.__emailList.children.forEach(emailItem => {
            const status = emailItem.__defaultEmail.mget(_a.state);
            if (status) {
              return emailItem.__emailInput.showError('This email already exists.');
            }
          });
        }

        var mode = _a.new;
        if (SERVICE.contact.update) {
          mode = _a.edit;
        }

        if (data.id) {
          if (service === SERVICE.contact.add) {
            this.source = { type: 'my_contact', ...data }
            this.service = 'add-new-contact';

          } else {
            this.service = 'update-contact';
          }
          this.source = { type: 'my_contact', mode: mode, ...data }
          this.triggerHandlers();
        }
        break;
    }
  }
}

module.exports = __addressbook_widget_contactForm;
