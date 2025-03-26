const __window_interact_singleton = require('window/interact/singleton');

/**
 * @class ___window_admin_panel
 * @extends __window_interact_singleton
 */

class ___window_admin_panel extends __window_interact_singleton{


  static initClass() {
    this.prototype.acceptMedia    = 1;
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this.size = { 
      width : 511,
      height : 386
    };

    this._configs = {};
    this._view  = _a.max
    this._state =  0
    this.activeNodes = {}
    this.organisation = null;
    
    this._setSize({minHeight : 500, minWidth  : 340});
    this.declareHandlers();
    
    this.skeleton = require('./skeleton').default(this);
    this.contextmenuSkeleton = 'a';
  }

  /**
   * @param {any} child
   * @param {any} pn
   */
  onPartReady (child, pn){
    switch(pn){
      case _a.content:
        this._content = child;
        this.router();        
        this.setupInteract();
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   */
  onDomRefresh(){
    this.responsive();
  }


  /**
   * @param {any} moving
   */
  seek_insertion(moving){
    let file;
    try{
      file = moving.event.originalEvent.dataTransfer.items[0];
    }catch(e){
      this.warn("INVALID FILE");
    }
    return this;
  }
 

  /**
   * @param {string | any[]} f
   */
  insertMedia(f){
    if(!this.__content || this.__content.isDestroyed()) return;
    let child = this.__content.children.first()
    if (child && child.insertMedia && _.isFunction(child.insertMedia)) {
      child.insertMedia(f)
    }
    return
  }
 
  /**
   * Abstracted
   * @note don't remove
   * @param {any} d
   */
  scrollToBottom(d) {
    // Do not remove. Abstracted.
  }

  /**
   * @param {any} cmd
   * @param {any} args
   */
  onUiEvent (cmd, args){
    const service = cmd.get(_a.service) || cmd.get(_a.name);

    switch(service){
      case 'updateInstance':
        this.updateInstance(cmd.viewInstance);
        break;

      case 'domain_updated':
        this.getMyOrg();
        break;
      
      case 'update_organisation_data':
        this.organisation = cmd.organisation
        break;
      
      case 'change_option':
        this.router(cmd.selected.value);
        break;
      
      case _e.search:
        return this.loadSearchResults(cmd)

      case 'show-member-detail':
        return this.loadMemberDetail(cmd)

      case 'toggle-search-bar':
        return this.toggleSearchBar(cmd)
      
      case 'close-search-bar':
        return this.closeSearchBar(cmd)
      
      default:
        super.onUiEvent(cmd, args)
    }
  }

  /**
   * getMyOrg
   * @param {function} callback 
  */
  getMyOrg (callback = null) {
    const data = {
      service: SERVICE.adminpanel.my_organisation,
      orgid  : Visitor.get('org_id')
    }
    this.fetchService(data, {async : 0})
    .then((data) => {
      this.organisation = data;
      this.updateTitle();
      callback && callback();
    }).catch(error => this.warn(error));
  }

  /**
   * @param {LetcBox} cmd
  */
  loadSearchResults (cmd) {
    const val = cmd.getData(_a.formItem).value
    if (val.length < 2) {
      return
    }
    
    const dataOpt = {
      kind      : 'widget_members_search',
      className : 'search-result-box',
      search    : val,
      orgId     : this.organisation.id
    }

    this.getPart('search-result').feed(dataOpt)
    this.getPart(_a.search).el.dataset.mode = _a.open
    return
  }

  /**
   * @param {LetcBox} cmd
   */
  loadMemberDetail (cmd) {
    if(!this.__content || this.__content.isDestroyed()) return;
    let child = this.__content.children.first()
    if (child && child.loadMemberDetail && _.isFunction(child.loadMemberDetail)) {
      child.loadMemberDetail(cmd)
    }
    return
  }

  /**
   * @param {LetcBox} cmd
   */
  toggleSearchBar (cmd) {
    const mode = this.getPart(_a.search).el.dataset.mode
    
    if (mode == _a.open) {
      this.getPart('search-bar-input').setValue('')
      this.getPart('search-result').clear()
      this.getPart(_a.search).el.dataset.mode = _a.closed
    } else {
      this.getPart(_a.search).el.dataset.mode = _a.open
    }
    return
  }

  /**
   * @param {LetcBox | {}} cmd
   */
  closeSearchBar (cmd = {}) {
    this.getPart('search-bar-input').setValue('')
    return
  }
  
 /* *********************************************************
  * Router
  * ********************************************************* */
  router(page = 'members_page', options = {}) {
    let route = () => {
      this.route = page;
      this.getPart(_a.search).el.dataset.status = _a.closed //to close search-bar, if navigating through pages

      switch (page) {
        case 'domain_page':
          this.loadDomainPage();
          break
        
        case 'broadcast_message':
          this.loadBroadcastMessagePage()
          break
        
        case 'members_page':
          this.loadMembersPage();
          break
        
        case 'import_list_page':
          this.loadImportListPage();
          break
        
        case 'security_page':
          this.loadSecurityPage();
          break
        
        case 'subscription_page':
        default:
          this.loadingPage()
      }
    }

    if (this.organisation && this.organisation.id && this.__content) {
      route();
      return;
    }
   this.getMyOrg(route)
  }

  /**
   * 
   */
  updateDropdown() {
   this.getPart('page_dropdown').feed(require("./skeleton/common/dropdown").default(this))
 }

 /**
  * 
  */
 updateTitle() {
   let windowTitle = 'Administration';
   if (this.organisation && this.organisation.name) {
     windowTitle = (this.organisation.name.printf(LOCALE.ADMINISTRATION_OF));
   }
   this.getPart('window-name').set('content', windowTitle)
 }


/**
 * 
 */
 loadingPage () {
    this.__content.feed(require("./skeleton/content").default(this))
  }

  /**
   * 
   */
  loadDomainPage () {
    this.__content.feed({
      kind          : 'domain_page',
      organisation  : this.organisation
    })
  }

  /**
   *
  */
  loadBroadcastMessagePage () {
    const broadcastMessagePage = {
      kind          : 'broadcast_message_page',
      className     : 'broadcast_message_page',
      organisation  : this.organisation,
      viewInstance  : this.viewInstance,
      view          : this._view,
      parent        : this
    }

    return this.__content.feed(broadcastMessagePage);
  }

  /**
   * 
   */
  loadMembersPage () {
    const membersPage = {
      kind          : 'members_page',
      className     : 'members_page',
      organisation  : this.organisation,
      viewInstance  : this.viewInstance,
      view          : this._view,
      parent        : this
    }
    this.__content.feed(membersPage);
  }

  /**
   * 
   */
  loadImportListPage () {
    const importPage = {
      kind          : 'import_list_page',
      className     : 'import_list_page',
      organisation  : this.organisation
    }
    this.__content.feed(importPage);
  }

  /**
   * 
   */
  loadSecurityPage () {
    const page = {
      kind          : 'admin_security_page',
      className     : 'admin_security_page',
      organisation  : this.organisation
    }
    this.__content.feed(page);
  }

  /**
   * @param {number} instance
   */
  instanceUpdated (instance) {
    if(!this.__content || this.__content.isDestroyed()) return;
    let child = this.__content.children.first()
    child.viewInstance  =  instance
    child.el.dataset.viewInstance = instance
  }

  /**
   * sizeUpdated
   * @param {('min'|'max'|'medium')} newSize
   * @param {('min'|'max'|'medium')} oldSize
   */
  sizeUpdated(newSize, oldSize) {
    if(!this.__content || this.__content.isDestroyed()) return;
    let child = this.__content.children.first()
    child.el.dataset.size = newSize
    child._view = newSize
  }

}

___window_admin_panel.initClass();

module.exports = ___window_admin_panel
