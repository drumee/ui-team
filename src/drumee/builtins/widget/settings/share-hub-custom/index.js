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
        return false;
      
      case 'invite-people':
        // Invite people action
        return false;
      
      case 'view-all-members':
        // View all members
        return false;
      
      case 'copy-link':
        // Copy share link
        return false;
      
      case 'show-qr-code':
        // Show QR code
        return false;
      
      case 'settings':
        // Open settings
        return false;
    }
    if (super.onUiEvent) {
      return super.onUiEvent(cmd, args);
    }
  }
}

module.exports = settings_share_hub_custom;

