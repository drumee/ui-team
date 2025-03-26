/* ==================================================================== *
 *   Copyright Xialia.com  2011-2020
 *   FILE : src/drumee/builtins/window/adminpanel/pages/admin-security/index.js
 *   TYPE : Component
 * ==================================================================== */


/**
 * Class representing a admin security page.
 * @class ___admin_security_page
 * @extends LetcBox
 */
class ___admin_security_page extends LetcBox {


  /**
   * @param {object} opt
   */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.organisation = this.mget('organisation');
  }

  /**
   * @param {LetcBox} child
   * @param {string} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
      default:
        super.onPartReady(child, pn);
        this.debug("Created by kind builder");
    }
  }


  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
   */
  onUiEvent(cmd, args) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent", cmd, service, this, this.model.attribute)

    switch (service) {
      case 'change-option':
        this.saveOptions(cmd);
      case _a.none:
        this.debug("Created by kind builder");
      default:
        this.debug("Created by kind builder");
        // super.onUiEvent(cmd, args)
    }

  }

  /**
   * @param {(LetcBox)} cmd
   */
  saveOptions(cmd) {
    const option = cmd.parent
    const optionName = option.mget('formItem')
    const optionData = option.getData(_a.formItem)
    const commonData = {
      orgid: this.organisation.id,
      //hub_id: Visitor.get(_a.id),
      option: optionData[optionName]
    }
    switch (optionName) {
      case 'dir_visibility':
        this.postService({
          service: SERVICE.adminpanel.organisation_update_dir_visiblity,
          ...commonData
        })
        break;
      case 'dir_info':
        // SERVICE.adminpanel.organisation_update_dir_info
        this.postService({
          service: SERVICE.adminpanel.organisation_update_dir_info,
          ...commonData
        })
        break;
      default:
        this.debug('undefined option')

    }

  }


  /**
   * @param {_SVC} service
   * @param {object} data
   * @param {any} socket
   */
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.adminpanel.organisation_update_dir_visiblity:
      case SERVICE.adminpanel.organisation_update_dir_info:
        this.source = this;
        this.service = 'update_organisation_data';
        this.organisation = data;
        this.triggerHandlers();
        this.service = '';
      case SERVICE.no_service:
        this.debug("Created by kind builder", service, data)
    }
  }
}

___admin_security_page.initClass()
module.exports = ___admin_security_page
