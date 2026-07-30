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

    switch (service) {
      case 'close-popup':
        return this.getPart('wrapper-modal').clear();

      case _a.hide:
        return this.getItemsByKind('window_downloader')[0].el.hide();

      // 'redirect-to-home' removed 2026-07-30. Despite the name it never
      // redirected here — it opened a mailto: composer (subject = INVALID_LINK,
      // body = the current URL), so the "OK" button on every share status popup
      // launched the visitor's mail client. Its only callers were the six
      // statuses in dmz/sharebox handleInfoStatus(), which now fall through to
      // the popup's 'close-popup' default. The identically-named service in the
      // welcome module is a genuine redirect and is NOT affected.
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
