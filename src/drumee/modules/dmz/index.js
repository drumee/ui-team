/**
 * Class representing the dmz module.
 * @class __dmz_router
 * @extends LetcBox
*/
class __dmz_router extends LetcBox {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);

    this.offsetY = 0;
    window.Dmz = this;
    this.declareHandlers();
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  setWallpaper() {
    uiRouter.setWallpaper(Organization.welcomeWallpaper());
  }

  
  /**
   *
  */
  onDomRefresh() {
    this.setWallpaper();
    this.route();
    this.visible = !document.hidden;
    document.onvisibilitychange = async (e) => {
      if (!this.visible) {
        await uiRouter.ensureWebsocket();
      }
      this.visible = !document.hidden;
    }
  }

  /**
   *
  */
  async route() {
    let opt;
    const args = Visitor.parseModule();
    const tab = args[1];
    const token = args[2];

    Visitor.set({ token });
    switch (tab) {
      case _a.share:
        opt = {
          kind: 'dmz_sharebox',
          token,
        }
        await Kind.waitFor(opt.kind);
        //await this.checkToken(opt);
        break;

      case _a.meeting:
        opt = {
          kind: 'dmz_meeting',
          token,
        }
        await Kind.waitFor(opt.kind);
        await Kind.waitFor("window_meeting");
        //await this.checkToken(opt);
        break;

      default:
        if (Visitor.isOnline()) {
          location.href = _K.module.desk;
          location.reload();
        } else {
          this.debug('load no content', args);
          opt = require('./skeleton/no-content').default(this);
          this.feed(require('./skeleton').default(this, opt));
        }
        return
    }
    this.feed(require('./skeleton').default(this, opt));
  }


  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    this.debug(`onUiEvent service=${service}`, cmd, this);

    switch (service) {
      case 'close-popup':
        return this.getPart('wrapper-modal').clear();

      case _a.hide:
        return this.getItemsByKind('window_downloader')[0].el.hide();

      case 'redirect-to-home':
        let subject = LOCALE.INVALID_LINK;
        let body = location.href
        subject = encodeURIComponent(subject);
        body = encodeURIComponent(body);
        var mailToLink = `mailto:?subject=${subject}&body=${body}`;
        window.location.href = mailToLink;
        this.getPart('wrapper-modal').clear();
        return
    }
  }

  /**
   * @param {String} message
   * @param {object} cb
   * @param {any} args
  */
  say(opt) {
    return this.getPart('wrapper-modal').feed(require('./skeleton/popup-message').default(this, opt));
  }

  /**
   * @param {String} name
   * @param {object} opt
  */
  _loadWindow(name, opt) {
    return Wm.openWindow(name, opt[2], opt[3]);
  }

}

//__dmz_router.initClass();

module.exports = __dmz_router;
