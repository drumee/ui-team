
const { copyToClipboard, createQrcode, openUserMailAgent } = require('core/utils')

/**
 * @class settings_hub
 * @extends __window_interact
 */
class settings_hub extends DrumeeMFS {

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    if (opt.media) {
      // this.mset(opt.media.toJSON ? opt.media.toJSON() : opt.media);
      this.copyPropertiesFrom(opt.media)
    }
    switch (this.mget(_a.area)) {
      case _a.private:
        this.manager = "settings_private_hub"
        break
      default:
        this.manager = "settings_share_hub"
    }
  }

  /**
   * 
   */
  getViewMode() {
    return _a.grid;
  }

  /**
   *
   */
  onDomRefresh() {
    this._tab = 0;
    this.feed(require("./skeleton").default(this));
    if (this.mget(_a.hub_id) && !this.mget(_a.members)) {
      this.fetchService({
        service: SERVICE.hub.get_members_by_type,
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.actual_home_id),
        type: 'all'
      }, { async: 1 }).then((data) => {
        this.mset({ members: data });
        this.reload();
      })
    }
  }

  /**
   * Reload the skeleton
   */
  reload() {
    this.feed(require("./skeleton").default(this));
  }

  /**
   * 
   */
  route() {
    switch (this._tab) {
      default:
        this.reload()
    }
  }
  /**
   * @param {*} child
   * @param {*} pn
   */
  showQrCode(url) {
    this.ensurePart('overlay').then((p) => {
      let id = `canvas-container-${this._id}`;
      p.feed(require("./skeleton/qrcode").default(this, id));
      createQrcode({ id, text: url })
    })
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug("AAA:50", this, service, cmd)
    switch (service) {
      case _e.close:
      case "close-popup":
        this.goodbye();
        // if (this.source && this.source.dialogWrapper && typeof this.source.dialogWrapper.clear === "function") {
        //   this.source.dialogWrapper.clear();
        // }
        return;
      case _a.members:
        this._tab++;
        return this.feed({ kind: "settings_members_list", uiHandler: [this], media: this.mget(_a.media) });

      case _a.back:
        this._tab--;
        return this.route()
      case "edit-type":
        this._tab++;
        return this.feed({ kind: this.manager, uiHandler: [this], media: this.mget(_a.media) });

      case "activity-hub":
        this._tab++;
        return this.feed({ kind: "settings_activity_hub", uiHandler: [this], media: this.mget(_a.media) });

      case 'copy-link':
        return this.viewerLink().then((url) => {
          copyToClipboard(url);
          Wm.acknowledge();
        });

      case 'send-by-email':
        return this.viewerLink().then((url) => {
          openUserMailAgent({
            subject: `Link access to my files`,
            body: `Hi
              here is the link to retrieve my files 
              ${url} 
            `
          })
          copyToClipboard(url);
        });

      case "share-qrcode":
        if (/^(dmz|share)$/i.test(this.mget(_a.area))) {
          this.viewerLink().then((url) => {
            this.showQrCode(url);
          });
        } else {
          this.viewerLink().then((url) => {
            this.showQrCode(url + `/${this.mget(_a.nid)}/play`);
          });
        }
        break;

      case "close-overlay":
        this.ensurePart('overlay').then((p) => {
          p.softClear();
        })
        break;
      default:
        this.debug("AAA:55", service, cmd)
    }
  }


}


module.exports = settings_hub;
