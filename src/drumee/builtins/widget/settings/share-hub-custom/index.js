require("./skin");

class settings_share_hub_custom extends DrumeeMFS {
  /**
   * @param {object} opt
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    if (opt.media) {
      this.copyPropertiesFrom(opt.media);
    }
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
    const service = args.service || 
                    cmd.service || 
                    cmd.get(_a.service) || 
                    cmd.get(_a.name) ||
                    (cmd.mget && (cmd.mget(_a.service) || cmd.mget(_a.name))) ||
                    cmd.name;
    this.debug('settings_share_hub_custom onUiEvent', service, cmd, args);
    switch (service) {
      case _e.close:
      case _a.back:
      case 'close-popup':
        // Always go back to parent (share-hub) when back is clicked
        if (this.mget(_a.media)) {
          this.triggerHandlers({
            service: _a.back,
          });
          return;
        }
        return this.goodbye();
      
      case 'open-my-contact':
        // Open contact list
        this.debug('Open my contact');
        return false;
      
      case 'invite-people':
        // Invite people action
        this.debug('Invite people');
        return false;
      
      case 'view-all-members':
        // View all members
        this.debug('View all members');
        return false;
      
      case 'copy-link':
        // Copy share link
        this.debug('Copy link');
        return false;
      
      case 'show-qr-code':
        // Show QR code
        this.debug('Show QR code');
        return false;
      
      case 'settings':
        // Open settings
        this.debug('Open settings');
        return false;
    }
    if (super.onUiEvent) {
      return super.onUiEvent(cmd, args);
    }
  }
}

module.exports = settings_share_hub_custom;

