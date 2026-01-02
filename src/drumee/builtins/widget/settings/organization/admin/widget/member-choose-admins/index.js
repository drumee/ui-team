/* ==================================================================== *
*   Copyright Xialia.com  2011-2021
*   FILE : /src/drumee/builtins/window/adminpanel/widget/member-choose-admins/index.js
*   TYPE : Component
* ==================================================================== */

//#########################################

class ___widget_member_chooseAdmins extends LetcBox {


  /**
   *
  */
  initialize (opt = {}) {
    require('./skin');
    super.initialize(opt);
    this._selectedMembers = []
    this.declareHandlers();
  }

  /**
   *
  */
  onPartReady (child, pn) {
    switch(pn) {
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
      
      default:
        this.debug('onPartready default');
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
  */
  onUiEvent (cmd, args={} ) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)

    switch(service) {
      case _e.search:
        this.loadSearchResults(cmd)
        break
      
      case 'search-close-result':
        this.closeSearchResult()
        break
      
      case 'trigger-admin-select':
        this.triggerMemberSelect(cmd)
        break
      
      case 'trigger-admin-search-select':
        this.triggerSearchMemberSelect(cmd)
        break
      
      case 'submit-selected-admins':
        this.submitSelectedAdmins()
        break
      
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
  getNonAdminMembers () {
    const api = {
      service  : SERVICE.adminpanel.member_list,
      orgid    : this.mget('orgId'),
      option   : 'nonadmin',
      //hub_id   : Visitor.get(_a.id)
    }
    
    return api;
  }

  /**
   *
  */
  searchNonAdminMembers () {
    const api = {
      service  : SERVICE.adminpanel.member_list,
      orgid    : this.mget('orgId'),
      option   : 'nonadmin',
      key      : this.mget(_a.search),
      //hub_id   : Visitor.get(_a.id)
    }
    
    return api;
  }

  /**
   *
  */
  loadSearchResults (cmd) {
    const searchItem = this.getPart('search-result')
    const val = cmd.getData(_a.formItem).value
    this.mset(_a.search, val)

    if (val.length < 2) {
      return
    }

    const formData = this.getData(_a.formItem).members;
    this._selectedMembers = formData.filter(row => { return row.selector != 0 }).map(row => {return row.selector});

    searchItem.el.dataset.mode = _a.open
    return searchItem.feed(require('./skeleton/search').default(this));
  }

  /**
   *
  */
  filterData (data) {
    return data.filter((row) => row.selector).map((row) => row.selector)
  }

  /**
   *
  */
  triggerMemberSelect (cmd) {

    // to check the checkbox when clicking on name
    if (cmd.source.mget(_a.trigger) == _a.item) {
      const state = cmd.__memberItemCheckbox.getState();
      return cmd.__memberItemCheckbox.changeState(!state);
    }
    // const source = cmd.source
    // const state = source.mget(_a.state)
    // const memberId = cmd.mget('drumate_id')

    // const data = this.getData(_a.formItem)
    // this._selectedMembers = this.filterData(data.members)
    // return this.debug('triggerMemberSelect', this._selectedMembers, this)
  }

  /**
   *
  */
  triggerSearchMemberSelect (cmd) {
    const item = this.getItemsByAttr('drumate_id', cmd.mget('drumate_id'))[0];
    const state = item.__memberItemCheckbox.getState();
    item.__memberItemCheckbox.changeState(!state);
    return this.closeSearchResult();
  }

  /**
   *
  */
  submitSelectedAdmins () {
    const formData = this.getData(_a.formItem).members;
    this._selectedMembers = formData.filter(row => { return row.selector != 0 }).map(row => {return row.selector});

    if (this._selectedMembers.length) {
      return this.postService({
        service   : SERVICE.adminpanel.member_admin_add,
        orgid     : this.mget('orgId'),
        users     : this._selectedMembers,
        privilege : 0b0011,
        //hub_id    : Visitor.get(_a.id)
      })
    }
    return
  }
  
  /**
   *
  */
  closeSearchResult () {
    const searchItem = this.getPart('search-result')
    searchItem.feed('')
    searchItem.el.dataset.mode = _a.closed
    return this.getPart('member-search-input').setValue('')
  }

  /**
   *
  */
  __dispatchRest(service, data, socket) {
    switch(service) {
      case SERVICE.adminpanel.member_admin_add:
        this.source = data
        this.service = 'trigger-all-admins'
        return this.triggerHandlers()
      
      default:
        this.warn(`${service} not found. !!!`)
    }
  }
}

___widget_member_chooseAdmins.initClass()

module.exports = ___widget_member_chooseAdmins
