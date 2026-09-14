const { timestamp } = require("@drumee/ui-essentials")
// Preview text for a row's last message — shared with the row's own skeleton so
// a system card cannot read one way on load and another way after a WS push.
const {
  chatPreview,
  findMeetingRow,
  meetingStatusOf,
} = require("libs/chat-preview");
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
          const count = this.__listContacts.collection.filter(r => ~~r.get('room_count')).length;
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
  onWsMessage(service, data, options = {}) {
    let item = null;
    let list = this.__listContacts;
    let newContact;
    let msg;
    // `options.service` first: a push built with `payload(data, {service})`
    // carries the name there and the push router stamps the envelope name
    // ("live.update") at the top level, which is what arrives as the first
    // argument. The fallback covers a sender that labels the frame itself.
    // Same form as widget_chat / window_tasks / panel_calendar.
    const svc = (options && options.service) || service;
    switch (svc) {
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
        if (!item) return;
        item.mset('room_count', 0);
        item.updateNotification();
        break;

      case 'chat.roominfo':
      case 'channel.roominfo':
        item = this.selectItem(data, 'entity_id', 'hub_id');
        if (!item) return;
        // THE BODY ON THIS SERVICE IS CUT TO 100 CHARS — the row comes from
        // `_last_node` in channel_delete.sql, whose message column is
        // VARCHAR(100) filled with LEFT(message, 100). So when the incoming
        // body is a PREFIX of the one already on the row, the row keeps its
        // own: the stored one is whole (a meeting card is ~146 chars), it is
        // what the meeting-end flip matches on, and re-deriving the preview
        // from the cut one would drop the card's author. The row also keeps a
        // lifecycle status it already knows, because this payload carries no
        // metadata at all and would otherwise re-open a finished meeting.
        {
          const stored = `${item.mget(_a.message) || ''}`;
          const incoming = `${data.message || ''}`;
          const isCut = !!incoming && stored.startsWith(incoming);
          const body = isCut ? stored : incoming;
          msg = chatPreview(body, {
            metadata: data.metadata,
            messageType: data.message_type,
            meetingStatus: isCut ? item.mget('meeting_status') : null,
            isAttachment: !_.isEmpty(data.attachment),
          });
          if (!isCut) {
            item.mset(_a.message, data.message);
            item.mset('meeting_status', meetingStatusOf(data));
          }
          // '_' stands in for a room with nothing to preview, as it always has.
          item.__message.set(_a.content, msg || '_');
        }

        item.mset('room_count', data.room_count);
        item.updateNotification();
        break;

      // A meeting that ends does NOT post a second message: channel.meeting_end
      // flips the start card's metadata and re-broadcasts that same row, which
      // is how the chat card turns into "Meeting ended". Without this the row
      // beside it went on advertising "started a meeting" until something else
      // was said. Literal service name — SERVICE.channel.meeting_end is
      // undefined against an older server (same as widget_chat's handler).
      case 'channel.meeting_end':
        // NOT selectItem: this payload is a bare channel row, so the hub is in
        // `key_id` (selectItem only knows entity_id/hub_id) and the right row
        // is the one whose body IS this card — see libs/chat-preview.
        item = findMeetingRow(list, data);
        if (!item || !item.__message) return;
        item.mset('meeting_status', 'ended');
        item.__message.set(
          _a.content,
          chatPreview(data.message, {
            metadata: data.metadata,
            meetingStatus: 'ended',
          })
        );
        break;

      case SERVICE.contact.invite_accept:
        item = this.selectItem(data, 'contact_id', 'drumate_id');
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
        if (!item) return;
        item.mset(_a.ctime, timestamp());
        list.collection.sort();
        break;

      case SERVICE.chat.post:
      case SERVICE.channel.post:
        item = this.selectItem(data, 'entity_id', 'hub_id');
        if (!item || !item.__msgTime || !item.__message) return;
        let room_count = item.mget('room_count') || 0;
        if (item.mget(_a.state) === 1) {
          room_count = 0;
        } else if (data.author_id !== Visitor.id) {
          room_count = room_count + 1;
        }

        msg = chatPreview(data.message, {
          metadata: data.metadata,
          messageType: data.message_type,
          isAttachment: data.is_attachment === 1,
        });

        item.mset('room_count', room_count);
        // RAW body on the model, derived text on the Note — see the roominfo
        // case above.
        item.mset(_a.message, data.message);
        item.mset('meeting_status', meetingStatusOf(data));
        item.mset(_a.ctime, data.ctime);

        const msgTime = Dayjs.unix(data.ctime).locale(Visitor.language()).format("HH:mm");
        item.__msgTime.set(_a.content, msgTime);
        item.__message.set(_a.content, msg);

        list.collection.sort();
        item.updateNotification();
        // Trigger update event for topbar
        list.trigger('change:room_count');
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
