
class organization_form extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this._source = this.mget(_a.source)
    this._type = this.mget(_a.type)
    this.rolesSelected = []
    this.membersSelected = []
    this.declareHandlers();
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {*} msg 
   */
  showError(content) {
    this.ensurePart(_a.error).then((p) => {
      p.set({ content })
    })
    if (content) {
      this.ensurePart("host-input").then((p) => {
        p.el.dataset.error = "1"
      })
    } else {
      this.ensurePart("host-input").then((p) => {
        p.el.dataset.error = "0"
      })
    }
  }
  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'create-organization':
        return this.checkDomain()

      case _e.close:
        return this.goodbye()

      default:
    }
  }

  /**
   * 
   * @returns 
   */
  async checkDomain() {
    if (Visitor.domainCan(_K.permission.admin) || Organization.get('domain_id') != 1) {
      return this.showError("Your account belong already to an organization");
    }
    let { ident, name } = this.getData();
    if (!ident || !Validator.host(ident)) {
      return this.showError("The url contain only alpha numeric characters");
    }
    let host = `${ident}.${bootstrap().main_domain}`
    this.showError("")
    let r = await this.fetchService(SERVICE.yp.host_exists, { host })
    if (r.exists) {
      return this.showError(LOCALE.DOMAIN_ALREADY_EXISTS);
    }
    let domain = await this.postService(SERVICE.adminpanel.create_organisation, {
      ident,
      name,
      nid: Visitor.get(_a.home_id),
      hub_id: Visitor.id
    })
    switch (domain.status) {
      case 'already_in_other_domain':
        return this.showError("Your account belong already to an organization");
      case 'domain_not_available':
        return this.showError(LOCALE.DOMAIN_ALREADY_EXISTS);
      default:
        location.reload()
    }
  }


}


module.exports = organization_form
