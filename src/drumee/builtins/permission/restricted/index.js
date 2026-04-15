class __permission_restricted extends DrumeeMFS {

  /**
   * @param {Object} opt
   */
  initialize(opt = {}) {
    opt.dataset = { ...opt.dataset, position: "0" }

    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
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
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
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
            email
          }).then((users) => {
            this.mset(_a.users, users);
            this.feed(require('./skeleton')(this));
          });
        });
        break;

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __permission_restricted;
