let PASSWORD = null;

class __security_pad extends LetcBox {
  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.declareHandlers();
    return this.mset({
      signal: _e.ui.event,
      service: _e.change
    });
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "wrapper-tooltips":
        this._tooltips = child;
        return this._offset = this.$el.offset();
    }
  }

  /**
   * 
   * @returns 
   */
  reload() {
    return this.feed(require('./skeleton/pad')(this));
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    return this.reload();
  }


  /**
   * 
   * @returns 
   */
  cannotChange() {
    return (Visitor.parseModuleArgs().debug === 'nochange') || (Visitor.isB2B() && !(Visitor.domainCan(_K.permission.admin_member)));
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
  unlock(args) {
    this.mget(_a.master);
    const opt = {
      label: LOCALE.CURRENT_PASSWORD,
      type: _a.password,
      service: _a.password_check,
      shower: 1
    };
    this.append(require("./skeleton/entry")(this, { ...opt, ...args }));
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
   * 
   */
  request_otp(type) {
    if (!this.getPass()) {
      return this.unlock(args);
    }
    return this.postService(SERVICE.yp.request_otp, {
      hub_id: Visitor.id,
      type
    })
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args) {
    const service = cmd.mget(_a.service);
    switch (service) {
      case "close-tooltips":
        return this._tooltips.clear();

      case _e.close:
        return this.reload();

      case _e.unlock:
        if (!this.getPass()) {
          return this.unlock(args);
        } else {
          return this.change(args);
        }

      case _a.password_check:
        this.findPart('ref-button').el.dataset.state = 1;
        if ((cmd.status === _e.commit) || (cmd.mget(_a.status) === _e.commit)) {
          this.check_password()
        }
        break;
    }
  }

}
module.exports = __security_pad;