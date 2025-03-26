// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/widget/members-search/index.js
//   TYPE : Component
// ==================================================================== *


//########################################

class __widget_members_search extends LetcBox {

// ===========================================================
//
// ===========================================================
  initialize(opt = {}) {
    require('./skin');
    super.initialize();
    this.type = this.mget(_a.type);
    return this.declareHandlers();
  }

// ===========================================================
// 
// ===========================================================
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }

// ===========================================================
// 
// ===========================================================
  onDomRefresh(){
    return this.feed(require('./skeleton').default(this));
  }

// ===========================================================
// 
// ===========================================================
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    let status = cmd.get(_a.status);

    this.debug("onUiEvent", cmd, this);
    if (mouseDragged) {
      return;
    }

    switch (service) {
      case _a.close:
        this.goodbye();
        this.service = 'close-search-bar';
        return this.triggerHandlers();

      case 'show-member-detail':
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        this.service = 'close-search-bar';
        this.triggerHandlers();
        return this.goodbye();
      
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
    this.debug("getCurrentApi", this);
    
    const api = { 
      service : SERVICE.adminpanel.member_list,
      orgid   : this.mget('orgId'),
      key     : this.mget(_a.search),
      order   : 'desc',
      //hub_id  : Visitor.get(_a.id)
    };

    return api;
  }

}

__widget_members_search.initClass();

module.exports = __widget_members_search;
