require("./skin");

class settings_private_hub extends DrumeeMFS {
  /**
   * @param {object} opt
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    if (opt.media) {
      this.copyPropertiesFrom(opt.media);
    }
    Kind.waitFor('invitation')
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.close:
      case _a.back:
      case 'close-popup':
        if (this.mget(_a.media)) {
          this.triggerHandlers({
            service,
          });
          return;
        }
        return this.goodbye();

      case "add-members":
        this.triggerHandlers({
          service,
        })
        return

      case "prompt-permission":
        this.triggerHandlers({
          service, member: cmd
        })
        return
      case "invite-contacts":
        Wm.launch({
          kind: 'window_addressbook',
          source: this.__addressbookLauncher
        }, { explicit: 1, singleton: 1 });
        return
    }
  }

}

module.exports = settings_private_hub;

