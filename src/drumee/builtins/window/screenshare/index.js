//const __webinar_socket = require('./socket');
const __room = require('builtins/webrtc/room/jitsi');
class __window_screenshare extends __room {
  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    require('./skin');
    this.service_class = _a.screen;
    super.initialize(opt);
    this.model.atLeast({
      mute: true,
      widgetId: this._id,
    });
    this._configs = {};
    this.origin_name = opt.firstname || opt.lastname || opt.email;
    this.isShower = opt.isShower;
    this.screenStream = opt.uiHandler.screenStream;

    this.roomInfoSvc = SERVICE.room.get;
    if (this.isShower && [_a.dmz, _a.personal].includes(this.mget(_a.area))) {
      this.roomInfoSvc = SERVICE.room.get_screen;
      this.roomInfoOptions = {
        parent_id: this.mget(_a.parent_id),
        parent_type: this.mget('parent_type'),
      }
    }
    this.debug(`AAA:22`, this, this.mget(_a.area), this.roomInfoSvc);
    this.declareHandlers();
    this._state = 1;
    opt.uiHandler.once(_e.destroy, this.goodbye.bind(this));

  }

  /**
   * 
   */
  onDestroy() {
    this.triggerHandlers({ service: 'screenshare-stopped' });
    this.leaveRoom();
  }

  /**
 * 
 * @returns 
 */
  async onDomRefresh() {
    if (this.isShower) {
      this.el.dataset.shower = 1;
    }
    this.defaultSize = {
      width: _K.docViewer.width,
      height: _K.docViewer.height
    };
    await this.getRoomInfo();
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "local-display": case "remote-display":
        child.once(_e.destroy, this.goodbye.bind(this));
        break;
    }
  }

  /**
   * 
   */
  async onAccessGranted(data) {
    this.debug("GAAA:42", this.room, data);
    await Kind.waitFor('webrtc_local_display');
    await Kind.waitFor('webrtc_remote_display');
    if (this.isShower) {
      this.feed(require('./skeleton/local')(this, this.room))
    } else {
      this.feed(require('./skeleton/remote')(this, data.presenter));
      this.raise();
      this.setupInteract();
      this.ratio = this.$el.width() / this.$el.height();
    }
  }

  /**
   * 
   */
  completeResize() {
    this.defaultSize = {
      width: this.$el.width(),
      height: this.$el.height()
    };

  }

  /**
 * 
 */
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.get(_a.service)
    //this.debug("AAA:55 ", args);
    switch (service) {
      case 'upstream-start-screenshare':
        this.$el.hide();
        this.triggerHandlers(args); // Forward event to the exiting room
        break;
      case "change-size":
        if (this._fullscreen) {
          this.el.onfullscreenchange = null;
          this.__ctrlFullscreen.setState(0);
          document.exitFullscreen();
        } else {
          this.change_size(cmd);
        }
        this._fullscreen = false;
        return;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
* 
* @param {*} service 
* @param {*} data 
*/
  __dispatchPush(service, data) {
    let svc = this.serviceName(service);
    this.debug("AAA:134", svc, data);
    switch (svc) {
      case 'downstream-stop-screenshare': case 'room-shutdown':
        this.debug("AAA:136", svc, data);
        this.goodbye();
        break;
      default:
        super.__dispatchPush(service, data);
    }
  }
}


module.exports = __window_screenshare;

