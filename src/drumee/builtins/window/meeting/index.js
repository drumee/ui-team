const __room = require('builtins/webrtc/room/jitsi');

class __window_meeting extends __room {
  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    require('./skin');
    this.service_class = 'meeting';
    super.initialize(opt);
    this.model.atLeast({
      header: 1,
      resizable: 1
    });
    this._configs = {};
    this.model.set({
      video: 0,
      audio: 1,
      service_class: this.service_class,
      
    })
    this.declareHandlers();
    if (!this.mget(_a.nid) && this.mget(_a.room_id)) this.mset({ nid: this.mget(_a.room_id) });
    this.isVideo = this.mget(_a.video);
    this.statusMessages = {
      ...this.statusMessages,
      waiting: LOCALE.WAITING_FOR_ATTENDEES
    }
    this.state = 'initialize';
    this.once('user-left', (id) => {
      if (this.__participants.collection.length > 2) {
        this.stateMessage();
      } else {
        this.stateMessage('waiting');
      }
    })
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @param {*} anim 
   */
  _resize(e, ui, anim) {
    this.responsive();
    super._resize(e, ui, anim);
  }


  /**
   * 
   * @returns 
   */
  contextmenuItems() {
    if (this.mget(_a.room_id)) return [_a.link];
    return null;
  }


  /**
   * 
   */
  async onDomRefresh() {
    this.raise();
    this.feed(require('./skeleton/init')(this));
    this.stateMachine("initializing");
    let room = await this.join();
    if (!room || !room.user ) {
      this.stateMachine('permissionDenied');
      return;
    }
    this.feed(require('./skeleton')(this, room.user));
    await this.prepareConference(room);
    this.responsive();
    this.ensurePart("commands").then((p) => { p.el.show() });
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  async onSignalingMessage(data) {
    switch (data.type) {
      case "meeting.start":
        if (this.isPresenter()) return;
        if (data.endpointAddress && data.endpointAddress == Visitor.get(_a.endpointAddress)) return;
        await uiRouter.ensureWebsocket();
        await this.getRoomInfo();
    }
  }


  /**
   * 
   */
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.get(_a.service)
    if (!service) return;
    switch (service) {
      case _a.close:
        this.warning(require('./skeleton/confirm')(this, null));
        break;

      case _a.invite:
        this.postService(SERVICE.hub.poke, {
          hub_id: this.mget(_a.hub_id),
          uid: cmd.mget(_a.user_id),
          kind: this.mget(_a.kind),
          nid: this.mget(_a.room_id)
        })
        break;

      case 'close-dialog':
        this.warning();
        this.__wrapperOverlay.clear();
        this.goodbye();
        break;

      case 'cancel-dialog':
        this.warning();
        this.__wrapperOverlay.clear();
        break;


      default:
        super.onUiEvent(cmd, args)
    }
  }


  /**
   * 
   */
  membersListApi() {
    if (this.mget(_a.area) == _a.dmz) return null;
    return {
      service: SERVICE.hub.get_members_by_type,
      type: 'all',
      hub_id: this.mget(_a.hub_id),
      timer: 500
    }
  }


}

//__window_meeting.initClass();

module.exports = __window_meeting;

