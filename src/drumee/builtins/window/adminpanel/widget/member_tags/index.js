require('./skin');

class ___widget_member_tags extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize (opt={}) {
    super.initialize(opt);
    this.declareHandlers();
  }
  
  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady (child, pn){
    switch(pn){
      case 'all-members':
        return this.waitElement(child.el, () => {
          child.triggerHandlers();
        });
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent (cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'add-tag':
        var dataOpt = {
          kind      : 'widget_member_tag_item',
          className : 'tag-form-item',
          type      : 'addTag',
          dataset   : {
            form  : _a.on
          }
        };
        return this.getPart(_a.tags).append(dataOpt);

      case 'tag-list-data':
        this.self = this;
        if (status === _e.data) {
          return cmd.$el.children().sortable({
            placeholder: "tag-sortable-placeholder",
            update: this.updateSort
          });
        }
        break;
      
      case 'trigger-all-members':
        let rolEle = this.__allMembers
        return this.waitElement(rolEle.el, () => { 
          // rolEle.$el.trigger(_e.click);
          rolEle.triggerHandlers();
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
   */
  format () {}

  /**
   * 
   * @returns 
   */
  getTags() {
    const api = {
      service : SERVICE.adminpanel.role_show,
      orgid   : this.mget('orgId'),
      //hub_id  : Visitor.get(_a.id)
    };
    
    return api;
  }

  /**
   * 
   * @param {*} event 
   * @param {*} ui 
   */
  updateSort(event, ui) { 
    const smart_list = this.getPart(_a.tags);
    const order = smart_list.$el.children().sortable('toArray', {attribute: 'tag-id'});
    this.updateOrder(order);
  }

  /**
   * 
   * @param {*} order 
   * @returns 
   */
  updateOrder(order) {
    return this.fetchService({
      service     : SERVICE.adminpanel.role_reposition,
      content     : order,
      orgid       : this.mget('orgId'),
      //hub_id      : Visitor.get(_a.id)
    });
  }

  /**
   * 
   */
  triggerAllcontact() { 
    this.__allTagContent.triggerHandlers();
  }
}


module.exports = ___widget_member_tags
