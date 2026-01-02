/* ============================================================= *
*   Copyright Xialia.com  2011-2020
*   FILE : /home/somanos/devel/ui/letc/template/index.coffee
*   TYPE : Component
* ============================================================== */

const { copyToClipboard } = require("core/utils")

class ___domain_page extends LetcBox {


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();

    this.organisation = this.mget('organisation');
    this.mode = _a.new
    if (this.organisation.id)
      this.mode = _a.view
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.none:
        this.debug("onPartReady", child);
        break;

      default:
        this.debug("onPartReady");
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.routePage();
  }

  /**
   * 
   * @param {*} cmd 
   */
  onValidateError(cmd) {
    this.debug(cmd, this)
  }

  /**
   * 
   * @param {*} cmd 
   */
  onValidateSuccess(cmd) {
    this.debug(cmd, this)
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    switch (service) {
      case 'edit_domain':
        this.routePage('edit_domain')
        break;
      case 'view_domain':
        this.routePage('view_domain')
        break;
      case "added_domain":
        this.submitDomain();
        break;
      case "update_domain":
        this.submitDomain();
        break;
      case 'copy-link':
        copyToClipboard(cmd.mget(_a.content));
        this.__ackClipboard.append(Skeletons.Note(
          LOCALE.ACK_COPY_LINK,
          "copied-to-clipboard"
        ))
        let f = () => {
          let c = this.__ackClipboard.children.last();
          c.goodbye();
        }
        _.delay(f, Visitor.timeout(3000))
    }
  }

  /**
   * 
   * @param {*} page 
   */
  routePage(page) {
    switch (page) {
      case 'edit_domain':
        this.mode = _a.edit
        this.feed(require('./skeleton').default(this));
        break;
      case 'view_domain':
        this.mode = _a.view
        this.feed(require('./skeleton').default(this));
        break;
      default:
        this.feed(require('./skeleton').default(this));
    }
  }

  /**
   * 
   * @returns 
   */
  submitDomain() {
    this.validateData()
    if (this.formStatus == _a.error) {
      this.debug("invalid data")
      return
    }

    let data = this.getData(_a.formItem);
    this.debug(data)
    let service = SERVICE.adminpanel.organisation_add;
    if (this.mode == _a.edit) {
      service = SERVICE.adminpanel.organisation_update;
      data['orgid'] = this.organisation.id;
    }
    this.postService({
      service: service,
      ...data
    })
  }


  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} socket 
   * @returns 
   */
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.adminpanel.organisation_add:
      case SERVICE.adminpanel.organisation_update:
        if (data.status == 'IDENT_NOT_AVAILABLE') {
          this.getPart('ident-entry').showError('Ooops…this ident is already used. Try another one.')
          return;
        }
        if (data.status == 'ORGANISATION_ALREADY_EXITS') {
          this.warn('ORGANISATION_ALREADY_EXITS', data, this)
        }
        this.organisation = data;
        this.mset('organisation', data);
        this.routePage('view_domain')

        this.source = this;
        this.service = 'domain_updated';
        this.data = data;
        this.triggerHandlers();
        this.service = '';
    }
  }
}


___domain_page.initClass();
module.exports = ___domain_page;
