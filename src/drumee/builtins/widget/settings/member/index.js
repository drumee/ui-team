
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

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    const service =
      args.service ||
      cmd.service ||
      cmd.name ||
      (cmd.mget && (cmd.mget(_a.service) || cmd.mget(_a.name))) ||
      (cmd.get && (cmd.get(_a.service) || cmd.get(_a.name)));
    
    console.log("AAA:62", service)
    switch (service) {
      case "change-permission":
        const newPrivilege = cmd.mget('privilege') || cmd.privilege;
        const memberId = cmd.mget('memberId') || cmd.memberId || this.id;
        
        if (newPrivilege && memberId) {
          this.mset(_a.privilege, newPrivilege);
          this.triggerHandlers({
            service: "update-member-permission",
            memberId: memberId,
            privilege: newPrivilege,
            member: this
          });
          this.reload();
        }
        break;
    }

    if (super.onUiEvent) {
      return super.onUiEvent(cmd, args);
    }
  }

}


module.exports = settings_member;