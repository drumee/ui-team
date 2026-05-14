class settings_member extends DrumeeMFS {
  /**
   *
   * @returns
   */
  initialize() {
    require("./skin");
    super.initialize();
    const m = this.model;
    if (m.get(_a.entity)) {
      m.set(_a.id, _a.entity);
    }
    this.url = Visitor.avatar(m);
    this.name = m.get(_a.surname);
    const firstname = m.get(_a.firstname) || "";
    const lastname = m.get(_a.lastname) || "";
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

    if (this.mget(_a.origin) == _a.share && this.mget(_a.status) == _a.memory) {
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
  data() {
    let { expiry, privilege, hours, days } = this.model.toJSON();
    return {
      expiry,
      privilege,
      hours,
      days,
    };
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
    const service = cmd.mget(_a.service);

    switch (service) {
      case "change-permission":
        this.triggerHandlers({
          service,
          member: this,
          name: cmd.mget(_a.name),
          state: cmd.mget(_a.state),
        });
        break;
      case "prompt-permission":
        console.log("===77== settings_member.prompt-permission ===", this);
        this.triggerHandlers({ service, member: this, trigger: cmd });
        break;
      case "change-role":
        this.triggerHandlers({
          service,
          member: this,
          role: cmd.mget(_a.name),
        });
        break;
      case "remove-member":
        this.triggerHandlers({ service, member: this });
        break;

      default:
        this.triggerHandlers({ service, trigger: cmd });
    }
  }
}

module.exports = settings_member;
