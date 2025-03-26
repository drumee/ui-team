
class ___widget_tagFormMenu extends LetcBox {

  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.reloadMenu = this.reloadMenu.bind(this);
    this.getTagListApi = this.getTagListApi.bind(this);
    this.saveTag = this.saveTag.bind(this);
  }

  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    this.declareHandlers();
    this.tagsSelected = [];
    this.fetchTags = 1;
    this.autoSave = 1;
    if (this.mget('fetchTags') === 0) {
      this.fetchTags = 0;
    }
    if (this.mget('autoSave') === 0) {
      this.autoSave = 0;
    }

    return this.refreshTag = true;
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
      case 'tags-dropdown':
        if (this.autoSave) {
          child.on(_e.close, () => {
            if (this.refreshTag) {
              return this.refreshTag = false;
            }
          });
          return child.on(_e.open, () => {
            this.refreshTag = true;
            return this.reloadMenu();
          });
        }
        this.fetchService({ 
          service   : SERVICE.tagcontact.entity_assign_get,
          entity_id : this.mget('entity_id'),
          hub_id    : Visitor.id
        }).then((data)=>{
            this.tagsSelected = data;
            return this.reloadMenu();
        })
        break;
    }
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh(){
    return this.feed(require('./skeleton')(this));
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'trigger-tag-select':
        return;
      
      case 'save-tag':
        return this.saveTag();
      
      case undefined: 
        return;
    }
  }

  /**
   * 
   * @returns 
   */
  reloadMenu(){
    return this.getPart('tags-dropdown').renderItems(require('./skeleton/tag-menu-item')(this));
  }
  
  /**
   * 
   * @returns 
   */
  getTagListApi(){
    const api = { 
      service : SERVICE.tagcontact.show_tag_by,
      order   : _a.position,
      hub_id  : Visitor.id
    };
    return api;
  }

  /**
   * 
   * @returns 
   */
  saveTag(){
    const data = this.getPart('tag-menu-list').getData(_a.formItem);

    if (!this.autoSave) {
      this.tagsSelected = data.tags.filter(row=> row.tag).map(row=> { return {tag_id: row.tag}; });
      this.getPart('tags-dropdown')._closeItems();
      return;
    }
      
    const selectedTag = data.tags.filter(row=> row.tag).map(row=> row.tag);        
    if (_.isEmpty(data.tags)) {
      this.getPart('tags-dropdown')._closeItems();
      return;
    }
    
    this.postService({
      service   : SERVICE.tagcontact.entity_assign,
      entity_id : this.mget('entity_id'),
      hub_id    : Visitor.get(_a.id),
      tag       : selectedTag
    }).then((data)=>{
      this.tagsSelected = data;
      this.refreshTag = true;
      return this.getPart('tags-dropdown')._closeItems();

    });
  }

}


module.exports = ___widget_tagFormMenu;
