
const { copyToClipboard, createQrcode, openUserMailAgent } = require('@drumee/ui-essentials')
const { permission } = require("../../../widget/settings/hub/skeleton/toolkit")
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
      this.isRegularFile = opt.media.isRegularFile;
      this.isHub = opt.media.isHub;
      this.isFolder = opt.media.isFolder;
    }
    switch (this.mget(_a.area)) {
      case _a.private:
        this.manager = "settings_private_hub"
        break
      default:
        this.manager = "settings_share_hub"
    }
    this.mset({ flow: _a.y })
    this.contextmenuItems = []
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
  set_member_privilege() {
    let args = {
      ...this.__permissionForm.gatherData(),
      uid: this.pendingMember.mget(_a.id),
      hub_id: this.mget(_a.hub_id),
    }
    this.debug("AAA:46", args)
    this.postService(SERVICE.hub.set_member_privilege, args).then((users) => {
      this._tab--;
      this.route()
    })
  }

  /**
   *
   */
  onDomRefresh() {
    this._tab = 0;
    this.fetchService(SERVICE.hub.show_privilege, {
      hub_id: this.mget(_a.hub_id),
      type: _a.owner,
    }).then((data) => {
      this.mset(data)
      this.feed(require("./skeleton").default(this));
    })
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
   * 
   */
  showMembers() {
    this.feed({
      kind: "settings_members_list",
      uiHandler: [this],
      media: this.mget(_a.media),
      visitor: this.mget('visitor')
    });
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
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service) || cmd.mget(_a.name);
    this.debug("AAA:50", this, service, cmd, args)
    let subWidget;
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
        return this.showMembers();

      case _a.back:
        this._tab--;
        return this.route()

      case "edit-type":
        this._tab++;
        return this.feed({
          kind: this.manager,
          uiHandler: [this],
          media: this.mget(_a.media),
          visitor: this.mget('visitor')
        });

      case "activity-hub":
        this._tab++;
        return this.feed({ kind: "settings_activity_hub", uiHandler: [this], media: this.mget(_a.media) });

      case 'copy-link':
        return this.viewerLink().then((url) => {
          setTimeout(async () => {
            await copyToClipboard(url);
            Wm.acknowledge();
          }, 0);
        });

      case 'send-by-email':
        return this.viewerLink().then((url) => {
          setTimeout(async () => {
            openUserMailAgent({
              subject: `Link access to my files`,
              body: `Hi
              here is the link to retrieve my files 
              ${url} 
            `
            })
          }, 0)
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

      case "add-members":
        this._tab++;
        await Kind.waitFor('invitation');
        this.feed({
          kind: 'invitation',
          topbar: 1,
          topLabel: LOCALE.DOCUMENTS_ACCESS,
          uiHandler: [this],
          members: 0,
          media: this.mget(_a.media)
        })
        subWidget = this.children.last();
        subWidget.once(_e.destroy, () => {
          this._tab--;
          return this.route()
          // this.feed({ kind: "settings_members_list", uiHandler: [this], media: this.mget(_a.media) });
          // return this.route()
        })
        return

      case "contributors-added":
        this._tab--;
        return this.route()

      case "prompt-permission":
        this._tab++;
        this._service = "set-user-permission";
        this.pendingMember = args.member;
        this.feed(
          Skeletons.Box.Y({
            debug: __filename,
            className: `${this.fig.family}__subwidget`,
            kids: [
              permission(this, args.member, this._service)
            ]
          })
        )
        subWidget = this.children.last();
        subWidget.once(_e.destroy, () => {
          this._tab--;
          this.route()
        })
        return

      case "set-user-permission":
        this.debug("AAA:203", service, cmd);
        this.set_member_privilege()
        break;

      case "revoke-member":
        let opt = {
          users: this.pendingMember.mget(_a.id),
          hub_id: this.mget(_a.hub_id)
        }
        this.postService(SERVICE.hub.delete_contributor, opt)
          .then((users) => {
            this._tab--;
            this.route()
          })
        return

      case "permission-changed":
        this.debug("AAA:680", cmd, args)
        if (this._service == "set-recipients-permission") {
          return this.__updatePermission.setState(args.valid)
        }
        this.__updatePermission.setState(1)
        if (!args.valid) {
          this.__updatePermission.set({ content: LOCALE.REMOVE })
          this.__updatePermission.mset({ service: "revoke-member" })
        } else {
          this.__updatePermission.set({ content: LOCALE.SAVE })
          this.__updatePermission.mset({ service: this._service })
        }
        break;

      default:
        this.debug("AAA:210", service, cmd)
    }
  }


}


module.exports = settings_hub;
