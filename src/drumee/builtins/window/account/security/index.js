let PASSWORD = null;

/**
 * 
*/
class __account_security extends LetcBox {


  /**
   * @param {Object} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   * @param {Object} opt
  */
  onDestroy(opt) {
    return PASSWORD = null;
  }

  /**
   * 
   * @returns 
   */
  getPass(p) {
    if (p) PASSWORD = p;
    return PASSWORD;
  }

  /**
   * 
   * @param {*} args 
   * @returns 
   */
  prompt_password() {
    this.ensurePart("overlay-wrapper").then((p)=>{
      let prompt = require("./skeleton/check-password")(this);
      p.feed(prompt);
    })
  }

  /**
   * 
   */
  check_password() {
    let { password } = this.getData();
    if (_.isEmpty(password)) {
      this.__refInput.el.dataset.error = 1;
      return;
    }
    return this.postService(SERVICE.yp.check_password, {
      password,
      hub_id: Visitor.id
    }).then((data) => {
      if (_.isEmpty(data)) {
        this.__refInput.el.dataset.error = 1;
        this._cur_pp = null;
        this.findPart('ref-input').el.dataset.error = 1;
      } else {
        this.getPass(password);;
        this.change(data);
      }
    });
  }

  /**
   * @param {Letc} child 
   * @param {String} pn
  */
  onPartReady(child, pn) {
    switch (pn) {
      case "wrapper-modal":
        this.modalWrapper = child;
        return this.modalOffset = this.$el.offset();

      case "wrapper-popup":
        this.popupWrapper = child;
        break;
    }
  }

  /**
   *
  */
  onDomRefresh() {
    this.fetchService({
      service: SERVICE.butler.hello,
      hub_id: Visitor.id
    }).then(() => {
      this.feed(require('./skeleton')(this));
      // if(!this.getPass()){
      //   this.prompt_password();
      // }
    }).catch((e)=>{
      this.warn("Failed to start", e)
      this.cut();
    })
  }

  /**
   * 
  */
  onUiEvent(cmd, args) {
    const service = cmd.mget(_a.service);
    switch (service) {
      case "close-tooltips":
        return this.modalWrapper.clear();

      case "close-popup":
        return this.popupWrapper.clear();

      case 'see-log-details':
        var y = (cmd.$el.offset().top - this.__logDetails.$el.offset().top) + cmd.$el.height();
        this.logData = cmd.model.attributes;
        return this.__logDetails.feed(require('./skeleton/log-details')(this, y));

      case 'close-log-details':
        return this.__logDetails.clear();

      case _a.unlock:
        return this.__wrapperPopup.feed(require('./skeleton/popup/fr/confirm')(this));
    }
  }

  /**
   * @param {*} method 
   * @param {*} data 
  */
  __dispatchRest(method, data) {
    switch (method) {
      case SERVICE.yp.check_password:
        if (!_.isEmpty(data)) {
          return this.feed(require('./skeleton')(this));
        } else {
          return this.findPart('ref-pass').showError('');
        }

    }
  }

}

module.exports = __account_security;
