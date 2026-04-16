const { permissionMenu } = require('../../../builtins/skeleton/toolkit');
class __permission_restricted extends DrumeeMFS {

  /**
   * @param {Object} opt
   */
  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, position: "0" }

    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._inviteRole = 'admin';
    let m = opt.media;
    if (!m) return;
    this.media = m;
    this.copyPropertiesFrom(m);
  }

  /**
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'members-list':
        child.on(_e.eod, async () => {
          this.el.dataset.position = "1";
        })
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually inserted into DOM
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    // this.ensurePart("members-list").then((p) => {
    //   this.el.dataset.position = "1";
    // })
  }

  /**
   * User Interaction Event Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.close:
        this.el.dataset.position = "0";
        setTimeout(() => {
          this.suppress();
        }, 500)
        return

      case 'send-invitation':
        this.ensurePart('ref-invite-email').then((entry) => {
          const email = entry.el.querySelector('input')?.value?.trim();
          if (!email) return;
          this.postService({
            service: SERVICE.hub.add_contributors,
            hub_id: this.mget(_a.hub_id),
            email,
            role: this._inviteRole || 'admin',
          }).then((users) => {
            this.mset(_a.users, users);
            this.feed(require('./skeleton')(this));
          });
        });
        break;

      case 'select-invite-role':
        this._inviteRole = cmd.mget && cmd.mget(_a.name);
        this.feed(require('./skeleton')(this));
        break;

      case 'change-role':
        if (args.member && args.role) {
          this.postService({
            service: SERVICE.hub.set_privilege,
            hub_id: this.mget(_a.hub_id),
            uid: args.member.mget(_a.entity) || args.member.mget(_a.id),
            role: args.role,
          }).then(() => {
            this.feed(require('./skeleton')(this));
          });
        }
        break;

      case 'prompt-permission':
        const {trigger} = args;
        this.ensurePart('role-dropdown').then((p) => {
          p.feed(permissionMenu(this, this.fig.family, cmd.currentRole));
          let y = trigger.$el.offset().top - this.$el.offset().top + trigger.$el.outerHeight();
          let x = trigger.$el.offset().left - this.$el.offset().left - trigger.$el.outerWidth();
          p.el.style.left = `${x}px`;
          p.el.style.top = `${y}px`;
          this.debug("AAA:122", "Prompting permission menu for role change", p, cmd, this.$el.position(), cmd.$el.position());
        })
        break;

      case 'remove-member':
        if (args.member) {
          this.postService({
            service: SERVICE.hub.remove_member,
            hub_id: this.mget(_a.hub_id),
            uid: args.member.mget(_a.entity) || args.member.mget(_a.id),
          }).then((users) => {
            this.mset(_a.users, users);
            this.feed(require('./skeleton')(this));
          });
        }
        break;

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __permission_restricted;
