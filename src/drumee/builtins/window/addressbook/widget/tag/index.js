// ============================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/addressbook/widget/tag
//   TYPE : Component
// ============================================================== *


class __addressbook_widget_tag extends LetcBox {

  static initClass() {
    this.prototype.figName = 'widget_tag';
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize();
    require('./skin');
    this.declareHandlers();
    this.footer = this.mget(_a.footer);
    if (this.mget(_a.chat)) {
      this.bindEvent(_a.live);
    }

    this.router = opt.router || 'all-contacts';
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
    this.feed(require("./skeleton")(this));
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
      case 'all-conversations':
        return this.waitElement(child.el, () => {
          if ((this.router === 'all-conversations') || (this.router === 'contact') || (this.router === 'team-room')) {
            return child.triggerHandlers();
          }
        });

      case 'all-contacts':
        return this.waitElement(child.el, () => {
          if (this.router === 'all-contacts') {
            return child.triggerHandlers();
          }
        });

      case 'shareroom-wrapper':
        return this.waitElement(child.el, () => {
          if (this.router === 'only-team-room') {
            return child.triggerHandlers();
          }
        });

      case 'support-wrapper':
        return this.waitElement(child.el, () => {
          if (this.router === 'support-list') {
            return child.triggerHandlers();
          }
        });
      default:
        try {
          return super.onPartReady(child, pn, section);
        } catch (error) { }
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    switch (service) {
      case 'add-tag':
        return this.addTag();

      case 'tag-list-data':
        let status = cmd.mget(_a.status)
        if (status === _e.data) {
          cmd.$el.children().sortable({
            placeholder: "tag-sortable-placeholder",
            update: this.updateSort
          });
        }
        break;

      case 'trigger-all-contacts':
        var tagEl = this.__allContacts;
        return this.waitElement(tagEl.el, () => {
          tagEl.triggerHandlers();
        });

      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        return this.service = '';
    }
  }

  /**
   * 
   * @returns 
   */
  addTag() {
    const dataOpt = {
      kind: 'tag_item',
      className: 'tag-form-item',
      service: 'addTag',
      dataset: {
        form: _a.on
      }
    };

    return this.getPart(_a.tags).append(dataOpt);
  }

  /**
   * 
   * @param {*} event 
   * @param {*} ui 
   */
  updateSort(event, ui) {
    const smart_list = this.getPart('tags');
    const order = smart_list.$el.children().sortable('toArray', { attribute: 'tag-id' });
    this.updateOrder(order);
  }

  /**
   * 
   * @returns 
   */
  triggerAllcontact() {
    return this.__allContacts.triggerHandlers();
  }

  /**
   * 
   * @param {*} order 
   * @returns 
   */
  updateOrder(order) {
    return this.fetchService({
      service: SERVICE.tagcontact.reposition,
      content: order,
      hub_id: Visitor.get(_a.id)
    });
  }

  /**
   * 
   * @returns 
   */
  getCurrentApi() {
    const api = {
      service: SERVICE.tagcontact.show_tag_by,
      order: 'asc',
      hub_id: Visitor.get(_a.id)
    };
    return api;
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   * @returns 
   */
  onWsMessage(service, data, options) {
    switch (options.service) {
      case SERVICE.channel.post:
        if (!this.__shareroomWrapper.mget(_a.state)) {
          return this.__teamCounter.el.dataset.state = 1;
        }
        break;
    }
  }
}
__addressbook_widget_tag.initClass();


module.exports = __addressbook_widget_tag;
