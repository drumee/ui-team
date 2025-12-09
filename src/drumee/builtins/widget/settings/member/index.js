
class settings_member extends LetcBox {


  /**
   * 
   * @returns 
   */
  initialize() {
    require('./skin');
    super.initialize();
    const m = this.model;
    if (m.get(_a.entity)) {
      m.set(_a.id, _a.entity);
    }
    this.url = Visitor.avatar(m);
    this.name = m.get(_a.surname);
    const firstname = m.get(_a.firstname) || '';
    const lastname = m.get(_a.lastname) || '';
    this.id = m.get(_a.entity) || m.get(_a.id);
    this.email = m.get(_a.email);
    this.phone = m.get(_a.mobile);

    if (_.isEmpty(this.name)) {
      this.name = `${firstname} ${lastname}`;
    }

    this.name = this.name.trim();

    if (_.isEmpty(this.name)) {
      this.name = this.email;
    }

    if ((this.mget(_a.origin) == _a.share) && (this.mget(_a.status) == _a.memory)) {
      this.name = this.email;
    }

    if (this.email === "*") {
      this.name = LOCALE.OPEN_LINK;
      this.tooltips = this.name;
    } else {
      this.tooltips = this.email || this.name;
    }
    this.declareHandlers();
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }


}


module.exports = settings_member;