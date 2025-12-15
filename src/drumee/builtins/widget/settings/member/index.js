
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
    
    // Log all variables for debugging
    console.log("=== settings_member.onUiEvent ===");
    console.log("service:", service);
    console.log("cmd:", cmd);
    console.log("args:", args);
    console.log("cmd.service:", cmd.service);
    console.log("cmd.name:", cmd.name);
    console.log("cmd.privilege:", cmd.privilege);
    console.log("cmd.memberId:", cmd.memberId);
    console.log("cmd.mget('privilege'):", cmd.mget && cmd.mget('privilege'));
    console.log("cmd.mget('memberId'):", cmd.mget && cmd.mget('memberId'));
    console.log("cmd.get('privilege'):", cmd.get && cmd.get('privilege'));
    console.log("cmd.get('memberId'):", cmd.get && cmd.get('memberId'));
    console.log("cmd.el:", cmd.el);
    console.log("cmd.$el:", cmd.$el);
    // Try to get from dataset
    if (cmd.el) {
      console.log("cmd.el.dataset.privilege:", cmd.el.dataset?.privilege);
      console.log("cmd.el.dataset.memberId:", cmd.el.dataset?.memberId);
      console.log("cmd.el.getAttribute('data-privilege'):", cmd.el.getAttribute('data-privilege'));
      console.log("cmd.el.getAttribute('data-member-id'):", cmd.el.getAttribute('data-member-id'));
    }
    if (cmd.$el) {
      console.log("cmd.$el.data('privilege'):", cmd.$el.data('privilege'));
      console.log("cmd.$el.data('memberId'):", cmd.$el.data('memberId'));
      console.log("cmd.$el.attr('data-privilege'):", cmd.$el.attr('data-privilege'));
      console.log("cmd.$el.attr('data-member-id'):", cmd.$el.attr('data-member-id'));
    }
    // Try to get from model
    if (cmd.model) {
      console.log("cmd.model.get('privilege'):", cmd.model.get('privilege'));
      console.log("cmd.model.get('memberId'):", cmd.model.get('memberId'));
      console.log("cmd.model.toJSON():", cmd.model.toJSON());
    }
    console.log("this.id:", this.id);
    console.log("this.model.get(_a.privilege):", this.model.get(_a.privilege));
    console.log("================================");
    
    switch (service) {
      case "change-permission":
        // Try multiple ways to get privilege and memberId
        let newPrivilege = 
          (cmd.el && (cmd.el.dataset?.privilege || cmd.el.getAttribute('data-privilege'))) ||
          (cmd.$el && (cmd.$el.data('privilege') || cmd.$el.attr('data-privilege'))) ||
          (cmd.model && cmd.model.get('privilege')) ||
          cmd.mget && cmd.mget('privilege') ||
          cmd.privilege ||
          cmd.get && cmd.get('privilege');
        
        let memberId = 
          (cmd.el && (cmd.el.dataset?.memberId || cmd.el.getAttribute('data-member-id'))) ||
          (cmd.$el && (cmd.$el.data('memberId') || cmd.$el.attr('data-member-id'))) ||
          (cmd.model && cmd.model.get('memberId')) ||
          cmd.mget && cmd.mget('memberId') ||
          cmd.memberId ||
          cmd.get && cmd.get('memberId') ||
          this.id;
        
        console.log("=== change-permission handler ===");
        console.log("newPrivilege (raw):", newPrivilege);
        console.log("memberId:", memberId);
        console.log("newPrivilege !== undefined:", newPrivilege !== undefined);
        console.log("memberId exists:", !!memberId);
        
        if (newPrivilege !== undefined && memberId) {
          // Ensure privilege is a number
          const privilegeValue = parseInt(newPrivilege);
          
          console.log("privilegeValue (parsed):", privilegeValue);
          console.log("_K.privilege.delete:", _K.privilege.delete);
          console.log("_K.privilege.write:", _K.privilege.write);
          console.log("_K.privilege.read:", _K.privilege.read);
          
          // Update local model
          this.mset(_a.privilege, privilegeValue);
          
          console.log("Updated model privilege:", this.model.get(_a.privilege));
          
          // Trigger parent to call SERVICE.hub.set_privilege
          const triggerData = {
            service: "update-member-permission",
            memberId: memberId,
            privilege: privilegeValue,
            member: this
          };
          
          console.log("Triggering handlers with:", triggerData);
          this.triggerHandlers(triggerData);
          
          // Reload to reflect changes
          console.log("Calling reload()");
          this.reload();
        } else {
          console.log("Skipping - newPrivilege or memberId missing");
        }
        console.log("=================================");
        break;
    }

    if (super.onUiEvent) {
      return super.onUiEvent(cmd, args);
    }
  }

}


module.exports = settings_member;