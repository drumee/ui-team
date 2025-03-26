/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/builtins/window/adminpanel/widget/member_tag_item/index.coffee
*   TYPE : Component
* ==================================================================== */

//#########################################

class ___widget_member_tagItem extends LetcBox {



  /* ===========================================================
   *
   * ===========================================================*/
  initialize (opt={}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();

    this._onOutsideClick = (e, origin)=> {
      if (mouseDragged) {
        return;
      }
      if ((e != null) && !this.el.contains(e.currentTarget)) {
        const type = this.mget(_a.type);
        if (type === 'addTag') {
          return this._createTag();
        }
        
        if (type === 'editTag') {
          return this._renameTag();
        }
      }
    };

    return RADIO_CLICK.on(_e.click, this._onOutsideClick);
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onDestroy(e, origin) {
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    return
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onPartReady(child, pn) { return null; }

  /* ===========================================================
   *
   * ===========================================================*/
  onDomRefresh() {
    if (this.mget(_a.type) === 'addTag') {
      this.feed(require('./skeleton/form').default(this));
      return;
    }

    this.mset(_a.type, 'tag');
    this.feed(require('./skeleton').default(this));
    return this.$el.attr('tag-id', this.mget('role_id'));
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onUiEvent (cmd, args) {
    let type = this.mget(_a.type);
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch(service) {
      case 'edit-tag':
        this.mset(_a.type, 'editTag');
        this.el.dataset.form = _a.on
        return this.feed(require('./skeleton/form').default(this));
      
      case 'save-tag':
        if (type === 'addTag') {
          return this._createTag();
        }
        
        if (type === 'editTag') {
          return this._renameTag();
        }
        break;
      
      case _e.destroy:
        if (type === 'addTag') {
          this.goodbye();
          return this.emitServiceToParent('trigger-all-members')
        }
        
        if (type === 'editTag') {
          return this._destroyTag();
        }
        break;

      default:
        this.emitServiceToParent(service, cmd)
        return this.service = '';
    }
  }

  /* ===========================================================
   *
   * ===========================================================*/
  _createTag () {
    const data = this.getData();
    if (data.name.trim() === '') {
      return;
    }
    
    return this.postService({
      service   : SERVICE.adminpanel.role_add,
      name      : data.name,
      orgid     : this.mget('orgId'),
      //hub_id    : Visitor.get(_a.id)
    });
  }

  /* ===========================================================
   *
   * ===========================================================*/
  _renameTag () {
    const data = this.getData();
    if (data.name.trim() === '') {
      return;
    }
    
    return this.postService({
      service   : SERVICE.adminpanel.role_rename,
      role_id    : this.mget('role_id'),
      name      : data.name,
      orgid     : this.mget('orgId'),
      //hub_id    : Visitor.get(_a.id)
    });
  }

  /* ===========================================================
   *
   * ===========================================================*/
  _destroyTag () {
    return this.postService({
      service   : SERVICE.adminpanel.role_delete,
      role_id    : this.mget('role_id'),
      orgid     : this.mget('orgId'),
      //hub_id    : Visitor.get(_a.id)
    });
  }

  /* ===========================================================
   *
   * ===========================================================*/
  roleManagerResponse (data) {
    this.mset(data);
    this.mset(_a.type, 'tag');
    this.$el.attr('tag-id', data.role_id);
    this.el.dataset.form = _a.off
    this.feed(require('./skeleton').default(this));

    return this.emitServiceToParent('show-member-list', data)
  }
    
  /* ===========================================================
   *
   * ===========================================================*/
  destroyRoleResponse (data) {
    RADIO_CLICK.off(_e.click, this._onOutsideClick);
    this.goodbye();
    return this.emitServiceToParent('trigger-all-members', data)
  }

  /* ===========================================================
   *
   * ===========================================================*/
  emitServiceToParent (service, data = null) {
    this.source   = data || this
    this.service  = service
    return this.triggerHandlers()
  }


  /* ===========================================================
   *
   * ===========================================================*/
  __dispatchRest(service, data, socket) {
    switch(service) {
      case SERVICE.adminpanel.role_delete:
        return this.destroyRoleResponse(data)
      
      default:
        return this.roleManagerResponse(data)
    }
  }
}


module.exports = ___widget_member_tagItem
