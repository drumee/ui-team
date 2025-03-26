
// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : src/drumee/builtins/window/serverexplorer/widget/sv-new-folder/index.js
//   TYPE : Component
// ==================================================================== *


/**
 * 
 */

class ___widget_sv_new_folder extends LetcBox {

  /**
   * @param {*} opt 
  */
  initialize (opt={}) {
    require('./skin');
    super.initialize(opt);
    this.currentPath = opt.path;
    this.type  = opt.type;
    this._parent = opt.uiHandler;
    this.debug('sv_new_folder', opt, this);
    this.declareHandlers();
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

  /**
  * 
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
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
      case "create-dir":
        return this.createDirectory();
        
      default:
        this.source = cmd
        this.service = service;
        return this.triggerHandlers({service: service})
    }

  }

  
  /**
   * 
   */
  createDirectory() {
    this.validateData()
    if (this.formStatus == _a.error) {
      this.debug('invalid data', this)
      return
    }
    const data = this.getData(_a.formItem)
    let serExplorer = this.getParentByKind("window_server_explorer");
    let fullPath = serExplorer._currentPath;
    return this.fetchService({
      service: SERVICE.media.create_server_dir,
      path: fullPath,
      type: this.type,
      name: data.name,
      hub_id: Visitor.id
    }, { async: 1 }).then((res) => {
      this.debug('exportFiles api response', res, this);
      if (_.isEmpty(res)) return;
      let list = serExplorer.getItemsByKind("widget_efs_list")[0];
      list.__list.append(res);
      return this.triggerHandlers({service: "close-model"})
      // return this.goodbye();
    })
  }

}

module.exports = ___widget_sv_new_folder