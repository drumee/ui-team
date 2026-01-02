/* ==================================================================== *
*   Copyright Xialia.com  2011-2023
*   FILE : /src/drumee/builtins/window/adminpanel/widget/member-who-can-see/index.js
*   TYPE : Component
* ==================================================================== */
/// <reference path = "../../../../../../../@types/index.d.ts" />

/**
 * Class representing widget_member_whoCanSee page in Welcome module.
 * @class __widget_member_whoCanSee
*/

class __widget_member_whoCanSee extends LetcBox {


  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.selectedFilterId = null
    this.roles = []
    this.membersSelected = []

    this.autoSave = this.mget('autoSave') || false
    this.declareHandlers();
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case 'member-list-content':
        if (!this.mget('fetchService')) {
          this.waitElement(child.el, f => {
            child.feed(require('./skeleton/members-list').default(this))
          })
        }
        break;

      default:
        this.debug("Created by kind builder");
    }
  }

  /**
   *
  */
  async onDomRefresh() {
    await this.getTags()
    if (this.mget('fetchService')) {
      this.memberData = this.mget('memberData') || {}
      this.fetchSelectedMembers()
    }
    this.feed(require('./skeleton').default(this));
  }

  /**
   *
  */
  getTags() {
    this.roles = [
      { display: LOCALE.ALL_MEMBERS, value: null, selected: true }
    ]

    return this.fetchService({
      service: SERVICE.adminpanel.role_show,
      orgid: this.mget('orgId'),
    }).then((data) => {
      const rolesD = data.map(row => {
        const i = {}
        i.display = row.name;
        i.value = row.role_id;
        this.roles.push(i)
      })
      const dropDown = {
        kind: 'widget_dropdown_menu',
        options: this.roles
      }
      this.ensurePart('role-menu-list').then((p) => {
        p.feed(dropDown);
      })
    }).catch(this.debug('Something went wrong'))
  }

  /**
   *
  */
  fetchSelectedMembers() {
    this.fetchService({
      service: SERVICE.adminpanel.members_whocansee,
      orgid: this.mget('orgId'),
      user_id: this.memberData.drumate_id,
      //hub_id  : Visitor.get(_a.id)
    }).then(data => {
      this.membersSelected = data[0].member;
      let content = require('./skeleton/members-list').default(this)
      this.ensurePart('member-list-content').then((p) => {
        p.feed(content);
      });
    }).catch(this.debug('Something went wrong'))
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
      case 'change_option':
        return this.contentRouter(cmd);

      case 'toggle-search':
        return this.toggleSearchBar(cmd);

      case 'trigger-who-can-see':
        return this.triggerWhoCanSee(cmd);

      case 'toggle-all-members-selection':
        return this.toggleAllMembersSelection(cmd);

      case 'submit-who-can-see':
        return this.submitWhoCanSee(cmd);

      case _e.search:
        return this.loadSearchResults(cmd);

      case 'trigger-search-member-select':
        return this.triggerSearchMemberSelect(cmd);

      case 'search-close-result':
        return this.closeSearchResult();

      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        return this.service = '';
    }
  }

  /**
  * @param {LetcBox} cmd
  */
  contentRouter(cmd, opt = {}) {
    this.selectedFilterId = cmd.selected.value
    const memberList = require('./skeleton/members-list').default(this)
    return this.getPart('member-list-content').feed(memberList)
  }

  /**
   * @param {LetcBox} cmd
   */
  toggleSearchBar(cmd = {}) {
    const searchWrapper = this.getPart('search-wrapper')
    const filterWrapper = this.getPart('filter-wrapper')
    const mode = searchWrapper.el.dataset.mode

    if (mode == _a.open) {
      searchWrapper.el.dataset.mode = _a.closed
      filterWrapper.el.dataset.mode = _a.open
      return this.closeSearchResult()
    } else {
      filterWrapper.el.dataset.mode = _a.closed
      return searchWrapper.el.dataset.mode = _a.open
    }
  }

  /**
  * @param {LetcBox} cmd
  */
  triggerWhoCanSee(cmd) {
    // to check the checkbox when clicking on name
    if (cmd.source.mget(_a.trigger) == _a.item) {
      const state = cmd.__memberItemCheckbox.getState();
      return cmd.__memberItemCheckbox.changeState(!state);
    }
  }

  /**
  * @param {LetcBox} cmd
  */
  toggleAllMembersSelection(cmd) {
    const memberList = this.getPart('members-list')

    return memberList.getItemsByKind('widget_members_list_item').forEach(row => {
      const type = cmd.mget(_a.type);
      const checkBoxEl = row.__memberItemCheckbox;
      const state = checkBoxEl.getState();
      if ((type == 'select-all') && (state)) { return }

      if ((type == 'clear-all') && (!state)) { return }

      return checkBoxEl.changeState(!state);
    })
  }

  /**
  * @param {LetcBox} cmd
  */
  submitWhoCanSee(cmd) {
    const formData = this.getData(_a.formItem).member;
    this.membersSelected = formData.filter(row => { return row.selector != 0 }).map(row => { return row.selector });

    this.membersSelected = this.membersSelected.filter(row => {
      return row != this.memberData.drumate_id
    })

    if (!this.autoSave) {
      return this.triggerHandlers({ service: 'close-who-can-see' })
    }

    return this.postService({
      service: SERVICE.adminpanel.members_whocansee_update,
      orgid: this.mget('orgId'),
      user_id: this.memberData.drumate_id,
      users: this.membersSelected,
      //hub_id  : Visitor.get(_a.id)
    }).then(data => {
      this.debug('submitWhoCanSee', data, this) //error response should be handled
      return this.triggerHandlers({ service: 'close-overlay' })
    }).catch(this.debug('Something went wrong'))
  }

  /**
   *
  */
  loadSearchResults(cmd) {
    const searchItem = this.getPart('search-result')
    const val = cmd.getData(_a.formItem).value
    this.mset(_a.search, val)

    if (val.length < 2) {
      return
    }

    const formData = this.getData(_a.formItem).member;
    this.membersSelected = formData.filter(row => { return row.selector != 0 }).map(row => { return row.selector });

    searchItem.el.dataset.mode = _a.open
    return searchItem.feed(require('./skeleton/search').default(this))
  }

  /**
  *
  */
  triggerSearchMemberSelect(cmd) {
    const item = this.getItemsByAttr('drumate_id', cmd.mget('drumate_id'))[0];
    const state = item.__memberItemCheckbox.getState();
    item.__memberItemCheckbox.changeState(!state);
    return this.toggleSearchBar();
  }

  /**
   *
  */
  closeSearchResult() {
    const searchItem = this.getPart('search-result')
    searchItem.clear()
    searchItem.el.dataset.mode = _a.closed
    return this.getPart('member-search-input').setValue('')
  }

  /**
   *
  */
  getAllMembers() {
    const api = {
      service: SERVICE.adminpanel.member_list,
      orgid: this.mget('orgId'),
      role_id: this.selectedFilterId,
      option: _a.member,
      //hub_id   : Visitor.get(_a.id)
    }
    return api;
  }

  /**
   *
  */
  searchMembers() {
    const api = {
      service: SERVICE.adminpanel.member_list,
      orgid: this.mget('orgId'),
      key: this.mget(_a.search),
      role_id: this.selectedFilterId,
      option: _a.member,
      //hub_id   : Visitor.get(_a.id)
    }
    return api;
  }
}


module.exports = __widget_member_whoCanSee
