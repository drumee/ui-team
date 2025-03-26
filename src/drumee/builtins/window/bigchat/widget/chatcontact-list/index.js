const { timestamp } = require("core/utils")
const EOD = "end:of:data";
class ___widget_chatcontactList extends LetcBox {

  // ===========================================================
  //
  // ===========================================================
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.getCurrentApi = this.getCurrentApi.bind(this);
    this.triggerClick = this.triggerClick.bind(this);
    this.addContactItem = this.addContactItem.bind(this);
    this.updateContactItem = this.updateContactItem.bind(this);
    this.addorUpdateContactItem = this.addorUpdateContactItem.bind(this);
    this.deleteRoomItemById = this.deleteRoomItemById.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.declareHandlers();
    this._currentTag = this.mget('tag') || this.mget(_a.source).model.toJSON() || {};
    this.bindEvent(_a.live);

  }

  // ===========================================================
  // onPartReady
  // ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case "list-contacts":
        this.__listContacts.collection.comparator = item => {
          return -item.get("ctime");
        };

        this.__listContacts.collection.on('change:room_count', (model, data) => {
          const count = this.__listContacts.collection.filter(r => r.get('room_count')).length;
          return this.trigger('change:room_count', count);
        });
        return child.on(EOD, () => {
          return this.trigger(EOD);
        });
      default:
        return super.onPartReady(child, pn, section);
    }
  }

  // ===========================================================
  // 
  // ===========================================================
  onDomRefresh() {
    return this.feed(require('./skeleton')(this));
  }

  // ===========================================================
  // 
  // ===========================================================
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    const status = cmd.get(_a.status);
    //this.debug(`onUiEvent service=${service}`, cmd, this);
    switch (service) {
      case 'open-privateroom-chat':
        if (cmd.resetNotification) {
          cmd.resetNotification();
        }
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
      default:
        this.source = cmd;
        this.service = service;
        return this.triggerHandlers();
    }
  }

  // ===========================================================
  // getCurrentApi 
  // ===========================================================
  getCurrentApi() {
    let tagid = null;
    if (this._currentTag) {
      tagid = this._currentTag.tag_id;
    }
    const flag = this.mget(_a.flag) || _a.all;
    const _option = this.mget(_a.option) || _a.active;

    const api = {
      service: SERVICE.chat.chat_rooms,
      flag,
      tag_id: tagid,
      option: _option,
      hub_id: Visitor.get(_a.id)
    };

    return api;
  }

  // ===========================================================
  // triggerClick
  // ===========================================================
  triggerClick(id = null) {
    if (_.isEmpty(id)) {
      const firstEl = this.__listContacts.children.first();
      firstEl.triggerHandlers();
      //this.debug("AAA:2229", firstEl);
      return;
    }

    let contact = this.getItemsByAttr('contact_id', id)[0];
    if (!contact) {
      contact = this.getItemsByAttr('entity_id', id)[0];
    }

    return contact.triggerHandlers();
  }

  // ===========================================================
  // addContactItem
  // ===========================================================
  addContactItem(contact) {
    const itemsOpt = this.__listContacts.mget(_a.itemsOpt);
    const newContact = _.merge(contact, itemsOpt);

    return this.__listContacts.prepend(newContact);
  }

  // ===========================================================
  // updateContactItem
  // ===========================================================
  updateContactItem(contact) {
    if (_.isEmpty(contact.entity_id)) {
      this.warn("Contact ID is required.");
      return;
    }

    const item = this.getItemsByAttr('entity_id', contact.entity_id)[0];

    const itemsOpt = this.__listContacts.mget(_a.itemsOpt);
    let updatedContact = _.merge(contact, itemsOpt);

    if (!_.isEmpty(item)) {
      updatedContact = _.merge(updatedContact, { state: item.mget(_a.state) });
      item.model.set(updatedContact);
      item.render();
      if (updatedContact.state || (item.el.dataset.radio === _a.on)) {
        //item.el.click()
        return item.triggerHandlers();
      }
    }
  }

  // ===========================================================
  // addorUpdateContactItem
  // ===========================================================
  addorUpdateContactItem(contact) {
    if (_.isEmpty(contact.entity_id)) {
      this.warn("Contact ID is required.");
      return;
    }

    const item = this.getItemsByAttr('entity_id', contact.entity_id)[0];

    const itemsOpt = this.__listContacts.mget(_a.itemsOpt);
    let updatedContact = _.merge(contact, itemsOpt);

    if (!_.isEmpty(item)) {
      updatedContact = _.merge(updatedContact, { state: item.mget(_a.state) });
      item.model.set(updatedContact);
      item.render();
      if (updatedContact.state || (item.el.dataset.radio === _a.on)) {
        // item.el.click()
        return item.triggerHandlers();
      }
    } else {
      return this.__listContacts.prepend(updatedContact);
    }
  }

  // ========================================================
  // deleteRoomItemById delete a room by roomId
  // ========================================================
  deleteRoomItemById(id) {
    const list = this.__listContacts.collection;
    let room = this.getItemsByAttr('contact_id', id)[0];
    if (room) {
      return listNaNpxove(list.findWhere({ 'contact_id': id }));
    } else {
      room = this.getItemsByAttr('entity_id', id)[0];
      return listNaNpxove(list.findWhere({ 'entity_id': id }));
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  selectItem(data, ...attr) {
    // let sent = this.queue[0];
    let list = this.__listContacts;
    let item = null;
    for (var a of attr) {
      if (!data[a]) continue;
      let item = list.getItemsByAttr(a, data[a]);
      if (item && item[0] && item[0].mget(_a.kind) == 'chat_contact_item') return item[0];
    }
    return item;
  }
  /**
   * 
   */
  onWsMessage(service, data, options) {
    let item = null;
    let list = this.__listContacts;
    let newContact;
    let msg;
    switch (options.service) {
      case SERVICE.contact.block:
      case SERVICE.contact.unblock:
        item = this.selectItem(data, 'entity_id');
        if (!item) return;
        if (item.mget(_a.flag) !== _a.contact) {
          return;
        }
        item.mset('is_blocked', data.is_blocked);
        item.mset('is_blocked_me', data.is_blocked_me);
        break;

      case SERVICE.chat.acknowledge:
      case SERVICE.channel.acknowledge:
        item = this.selectItem(data, 'entity_id', 'hub_id');
        //this.debug("AAA:269", item);
        if (!item) return;
        item.mset('room_count', 0);
        item.updateNotification();
        break;

      case 'chat.roominfo':
      case 'channel.roominfo':
        item = this.selectItem(data, 'entity_id', 'hub_id');
        //this.debug("AAA:278", item);
        if (!item) return;
        msg = data.message;
        if (_.isEmpty(msg) && !_.isEmpty(data.attachment)) {
          msg = LOCALE.ATTACHMENT;
        }
        if (_.isEmpty(msg)) {
          msg = '_';
        }

        item.mset(_a.message, msg);
        item.__message.set(_a.content, msg);

        item.mset('room_count', data.room_count);
        item.updateNotification();
        break;

      case SERVICE.contact.invite_accept:
        item = this.selectItem(data, 'contact_id', 'drumate_id');
        //this.debug("QQAAA:297", item);
        if (item) {
          item.mset(_a.ctime, timestamp());
          list.collection.sort();
          newContact = list.children.first();
          this.waitElement(newContact.el, () => { newContact.$el.click() })
        } else {
          Kind.waitFor('chat_contact_item').then(()=>{
            list.prepend({
              ...data,
              ctime: timestamp(),
              kind: 'chat_contact_item',
              entity_id: data.drumate_id,
              display: data.display || `${data.firstname} ${data.lastname}`,
              flag: _a.contact,
              hub_id: Visitor.id,
              service: 'open-privateroom-chat',
              radio: 'contact_selected_' + this.mget(_a.widgetId)
            });
            newContact = list.children.first();
            //this.debug("QQAAA:319", newContact, list);
            if(newContact.$el.click){
              setTimeout(()=>{newContact.$el.click()}, 300);
            }else{
              this.waitElement(newContact.el, () => { newContact.$el.click() })
            }  
          })
        };
        break;

      case SERVICE.contact.accept_informed:
        item = this.selectItem(data, 'drumate_id');
        //this.debug("AAA:297", item);
        if (!item) return;
        item.mset(_a.ctime, timestamp());
        list.collection.sort();
        break;

      case SERVICE.chat.post:
      case SERVICE.channel.post:
        item = this.selectItem(data, 'entity_id', 'hub_id');
        if (!item || !item.__msgTime || !item.__message) return;
        //this.debug("AAA:306", item, data);
        let room_count = item.mget('room_count') || 0;
        if (item.mget(_a.state) === 1) {
          room_count = 0;
        } else if (data.author_id !== Visitor.id) {
          room_count = room_count + 1;
        }

        msg = data.message;
        if (_.isEmpty(msg) && (data.is_attachment === 1)) {
          msg = LOCALE.ATTACHMENT;
        }

        item.mset('room_count', room_count);
        item.mset(_a.message, msg);
        item.mset(_a.ctime, data.ctime);

        const msgTime = Dayjs.unix(data.ctime).locale(Visitor.language()).format("HH:mm");
        item.__msgTime.set(_a.content, msgTime);
        item.__message.set(_a.content, msg);

        list.collection.sort();
        item.updateNotification();
        break;
    }

  }

  // ===========================================================
  // 
  // ===========================================================
  // __dispatchRest:(service, data, socket) ->
  //   switch service
  //     when SERVICE.no_service
  //       @debug "Created by kind builder"

}

module.exports = ___widget_chatcontactList;
