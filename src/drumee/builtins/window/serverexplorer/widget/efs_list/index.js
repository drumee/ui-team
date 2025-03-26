/* ==================================================================== *
*   Copyright Xialia.com  2011-2023
*   FILE : /ui/src/drumee/builtins/window/serverexplorer/widget/efs_list/index.js
*   TYPE : Component
* ==================================================================== */

class ___widget_efs_list extends LetcBox {

  /**
   * @param {*} opt 
  */
  initialize (opt={}) {
    super.initialize(opt);
    this.currentPath = opt.path;
    this.type  = opt.type;
    this._parent = opt.uiHandler;
    this.debug('efs_list', opt, this);
    this.declareHandlers();
  }

  /**
   * 
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
    if (this.mget('showBreadcrumb')) {
      this._parent.updateBreadcrumbs(this.currentPath);
    }
  }

  /**
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent (cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service=${service}`, cmd, this);

    switch(service) {
      case  _a.none:
        return this.debug("onUiEvent none", cmd, this);
      
      default:
        this.source = cmd
        return this.triggerHandlers({service: service})
    }
  }

  /**
   * 
  */
  getFileList () {
    const api = {
      service : 'media.list_server_files',
      hub_id  : Visitor.id,
      path    : this.currentPath,
      type    : this.type
    }
    
    return api;
  }

}


module.exports = ___widget_efs_list
