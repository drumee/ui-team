const { permissionItems } = require("../../../builtins/skeleton/toolkit");
class __permission_restricted extends DrumeeMFS {
  /**
   * @param {Object} opt
   */
  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, position: "0" };

    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._inviteRole = "admin";
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
      case "members-list":
        child.on(_e.eod, async () => {
          this.el.dataset.position = "1";
        });
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually inserted into DOM
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
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
        }, 500);
        return;

      case "send-invitation":
        this.ensurePart("ref-invite-email").then((entry) => {
          const email = entry.el.querySelector("input")?.value?.trim();
          if (!email) return;
          const { roleByValue } = require("../../../builtins/skeleton/toolkit");
          const privilege =
            roleByValue(this._inviteRole)?.privilege || _K.privilege.admin;
          this.postService(SERVICE.hub.invite, {
            hub_id: this.mget(_a.hub_id),
            invitees: [email],
            privilege,
          }).then((res) => {
            if (res && (res.error || res.error_code)) {
              return Wm.alert(res.reason || res.error || LOCALE.TRY_AGAIN);
            }
            const r = (res && res.results && res.results[0]) || {};
            if (r.status === "failed") {
              return Wm.alert(r.reason || LOCALE.TRY_AGAIN);
            }
            // Branded "notice" toast — the compact drumee-logo card with a
            // single primary Close button. Feed it through Wm.alert (into the
            // wrapper-modal) rather than Wm.info (the windows pool): alert
            // REPLACES this permission panel with the toast, so the toast is the
            // sole thing in the modal. Wm.info instead leaves the toast
            // coexisting with the still-open panel, where the panel's
            // full-viewport wrapper sat over the toast and swallowed its
            // X / Close clicks. `kind` is set so alert feeds the object verbatim
            // (variant + actions) instead of wrapping it as a plain body.
            Wm.alert({
              kind: "window_info",
              message: LOCALE.INVITATION_SENT_SUCCESSFULLY,
              variant: "notice",
              actions: [
                {
                  label: LOCALE.CLOSE,
                  priority: "primary",
                  service: _e.close,
                },
              ],
            });
          }).catch((e) => Wm.alert(e.reason || e.error || LOCALE.TRY_AGAIN));
        });
        break;

      case "select-invite-role":
        this._inviteRole = cmd.mget && cmd.mget(_a.name);
        this.feed(require("./skeleton")(this));
        break;

      case "change-role":
        if (args.member && args.role) {
          this.postService({
            service: SERVICE.hub.set_privilege,
            hub_id: this.mget(_a.hub_id),
            uid: args.member.mget(_a.entity) || args.member.mget(_a.id),
            role: args.role,
          }).then(() => {
            this.feed(require("./skeleton")(this));
          });
        }
        break;

      case "prompt-permission":
        const { service, member, trigger } = args;
        this.ensurePart("role-dropdown").then((p) => {
          if (!service) {
            p.el.style.display = "none";
            return;
          }
          p.feed(permissionItems(this, member, "", this.fig.family));
          let y =
            trigger.$el.offset().top -
            this.$el.offset().top +
            trigger.$el.outerHeight();
          let x =
            trigger.$el.offset().left -
            this.$el.offset().left -
            trigger.$el.outerWidth();
          p.el.style.display = "flex";
          p.el.style.left = `${x}px`;
          p.el.style.top = `${y}px`;
        });
        break;

      case "remove-member":
        if (args.member) {
          this.postService({
            service: SERVICE.hub.remove_member,
            hub_id: this.mget(_a.hub_id),
            uid: args.member.mget(_a.entity) || args.member.mget(_a.id),
          }).then((users) => {
            this.mset(_a.users, users);
            this.feed(require("./skeleton")(this));
          });
        }
        break;

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __permission_restricted;
