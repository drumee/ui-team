const EOD = "end:of:data";

class __addressbook_widget_contacts extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.triggerClick = this.triggerClick.bind(this);
    this.addContactItem = this.addContactItem.bind(this);
    this.addOrUpdateContactItem = this.addOrUpdateContactItem.bind(this);
    this.updateContactItem = this.updateContactItem.bind(this);
    this.deleteContactItemById = this.deleteContactItemById.bind(this);
  }

  static initClass() {
    this.prototype.figName = 'widget_contacts';
    this.prototype.fig = 1;
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    require('./skin');
    this._currentTag = this.mget(_a.source);
    return this.declareHandlers();
  }

  /**
   * 
   */
  format() { }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.feed(require("./skeleton")(this));
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
      case "list-contacts":
        return child.on(EOD, () => {
          return this.trigger(EOD);
        });
      default:
        return super.onPartReady(child, pn, section);
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.source = cmd;
    this.service = service;
    return this.triggerHandlers({ service });
  }

  /**
   * 
   * @returns 
   */
  getCurrentApi() {
    let tagid = null;
    if (this._currentTag) {
      tagid = this._currentTag.mget('tag_id');
    }

    const source = this.mget(_a.source);

    const api = {
      service: SERVICE.contact.show_contact,
      tag_id: tagid,
      option: source.mget(_a.option),
      hub_id: Visitor.get(_a.id)
    };

    return api;
  }

  /**
   * 
   * @param {*} id 
   * @returns 
   */
  triggerClick(id = null) {
    if (_.isEmpty(id)) {
      const firstEl = this.__listContacts.children.first();
      firstEl.triggerHandlers();
      return;
    }

    return this.getItemsByAttr(_a.id, id)[0].triggerHandlers();
  }


  /**
   * 
   * @param {*} contact 
   * @returns 
   */
  addContactItem(contact) {
    const itemsOpt = this.__listContacts.mget(_a.itemsOpt);
    return this.__listContacts.prepend({ ...contact, ...itemsOpt });
  }

  /**
   * 
   * @param {*} contact 
   * @returns 
   */
  addOrUpdateContactItem(contact) {
    if (_.isEmpty(contact.id)) {
      this.warn("Contact ID is required.");
      return;
    }

    const item = this.getItemsByAttr(_a.id, contact.id)[0];

    const itemsOpt = this.__listContacts.mget(_a.itemsOpt);
    let contactItem = _.merge(contact, itemsOpt);

    if (!_.isEmpty(item)) {
      contactItem = _.merge(contactItem, { state: item.mget(_a.state) });
      item.model.set(contactItem);
      item.render();
      if (contactItem.state || (item.el.dataset.radio === _a.on)) {
        return item.el.click();
      }
    } else {
      this.__listContacts.prepend(contactItem);

      // to trigger the click event after prepend the contact
      const f = () => {
        return this.triggerClick(contact.id);
      };
      return _.delay(f, Visitor.timeout(500));
    }
  }



  /**
   * 
   * @param {*} contact 
   * @returns 
   */
  updateContactItem(contact) {
    if (_.isEmpty(contact.id)) {
      this.warn("Contact ID is required.");
      return;
    }

    const item = this.getItemsByAttr(_a.id, contact.id)[0];

    const itemsOpt = this.__listContacts.mget(_a.itemsOpt);
    const updatedContact = _.merge(contact, itemsOpt);

    if (!_.isEmpty(item)) {
      var contactItem = _.merge(contactItem, { state: item.mget(_a.state) });
      item.model.set(updatedContact);
      item.render();
      if (contactItem.state || (item.el.dataset.radio === _a.on)) {
        return item.el.click();
      }
    }
  }

  /**
   * 
   * @param {*} contactId 
   * @returns 
   */
  deleteContactItemById(contactId) {
    const list = this.__listContacts.collection;
    list.remove(list.findWhere({ id: contactId }));
  }

}
__addressbook_widget_contacts.initClass();

module.exports = __addressbook_widget_contacts;
