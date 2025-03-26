// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/form/index.js
//   TYPE : Component
// ==================================================================== *

require('./skin');
class __drumee_api_form extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    this.mset({
      flow: _a.y,
      tagName: 'form'
    });
    super.initialize(opt);
    this.declareHandlers();
    //this.debug("AAA:21 STARTING", this.fig.family);
  }
  
  /**
   * 
   */
  clearMessage() {
    this.getPart('error-message-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message').set({ content: '' })
    this.getPart('go-button-wrapper').el.dataset.state = _a.open
  }

  /**
   * 
   * @param {*} msg 
   * @returns 
   */
  showErrorMessage(msg) {
    this.getPart('go-button-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message-wrapper').el.dataset.state = _a.open
    this.getPart('error-message').set({ content: msg })
    _.delay(this.clearMessage.bind(this), Visitor.timeout(2500))
    return;
  }

  /**
   * 
   * @param {*} msg 
   */
  showSuccessMessage(msg) {
    this.getPart('body-container').feed(require('./skeleton/success-message')(this, msg))
  }

  /**
   * 
   * @param {*} error 
   * @returns 
   */
  updateError(error) { return null; }

  /**
   * 
   * @returns 
   */
  checkSanity() {
    return null;
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.feed(require("./skeleton")(this));
  }


  /**
   * 
   * @returns 
   */
  async submit() {
    const data = this.getData(_a.formItem);
    this.debug(data);
    if (!this.validateData()) {
      // if(this.formError.email.errorList.length){
      //   this.showErrorMessage(LOCALE.FILL_REQUIRED_FIELDS);
      //   return
      // }
      return;
    }
    this.__goButtonWrapper.el.dataset.state = 0;
    this.postService(SERVICE.form.submit, {
      nid: this.mget(_a.nid),
      vhost: this.mget(_a.vhost),
      data,
      //socket_id: Visitor.get(_a.socket_id)
    }, { async: 1 }).then(() => {
      this.showSuccessMessage(LOCALE.MESSAGE_SENT);
    }).catch(() => {
      this.showErrorMessage(LOCALE.ERR_REQUEST);
    })
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent", service, status, this)
    switch (service) {
      case _e.submit:
        this.submit();
        break;
    }

    return cmd = null;
  }

}



module.exports = __drumee_api_form;