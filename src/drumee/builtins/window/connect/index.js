const __room = require('builtins/webrtc/room/jitsi');

const { timestamp } = require("core/utils")
class __window_connect extends __room {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    this.service_class = 'connect';
    super.initialize(opt);
    this.mset({
      hub_id: Wm.mget('wicket_id'), // Use sharebox as room host
      service_class: this.service_class,
      video: 0,
      audio: 1,
      area: _a.private
    });
    this._state = 0;
    this.declareHandlers();
    this.statusMessages = {
      ...this.statusMessages,
      dial: LOCALE.CALLING,
      ring: (''.printf(LOCALE.X_IS_CALLING_YOU)),
      revoke: LOCALE.CALL_CANCELED,
      offline: (''.printf(LOCALE.X_IS_NOT_ONLINE)),
      pickup: LOCALE.CONNECTING,
      ready: LOCALE.CONNECTING,
      invite: LOCALE.CALLING,
      cancel: LOCALE.MISSED_CALL,
      leave: LOCALE.CALL_ENDED,
      declined: LOCALE.CALL_DECLINED,
      busy: LOCALE.LINE_BUSY,
      accepted: LOCALE.CONNECTING,
      connect: LOCALE.CONNECTING,
      online: LOCALE.ONLINE,
      caller_ready: LOCALE.ONLINE,
      waiting: LOCALE.CONNECTING,
    }
    this._signal = {
      ring: _e.reject,
      connect: _e.leave,
      caller_ready: _e.leave,
      waiting: _e.leave,
      prepare_remote: _e.leave,
      dial: _e.cancel,
      idle: _e.cancel,
      dialing: _e.cancel,
      accepted: 'accepted',
      reject: _e.cancel,
    }

    this.configure();
    this.once('user-left', (id) => {
      if (this.__participants.collection.length > 2) {
        this.stateMessage();
      } else {
        this.goodbye();
      }
    })
  }

  /**
    * 
    */
  membersListApi() {
    return {
      service: SERVICE.chat.chat_rooms,
      flag: "contact",
      tag_id: null,
      option: _a.active,
      hub_id: Visitor.get(_a.id)
    }
  }

  /**
   * 
   * @param {*} service 
   * @param {*} data 
   * @param {*} options 
   */
  onWsMessage(service, data, options = {}) {
    this.verbose("AAA:292 459", this.el, service, data, options);
    switch (options.service) {
      case SERVICE.conference.cancel:
        this.goodbye()
        break;
      default:
        super.onWsMessage(service, data, options);
    }
  }

  /**
   * 
   */
  async onDomRefresh() {
    this.raise();
    await super.onDomRefresh();
    this.verbose("AAAX:204 -- onDomRefresh", this.callee, this.caller);
    if (this.callee) {
      this.stateMachine('dial');
    } else {
      if (this.mget('pickup')) {
        this.stateMachine('pickup');
      } else {
        this.stateMachine('ring');
      }
    }
  }


  /**
   * 
   */
  async startConnection() {
    //let user = this.callee || this.caller;
    if (this.isOnine) return;
    let isCallee = 0;
    if (this.caller) {
      isCallee = 1;
    }
    let room = await this.join({ isCallee });
    if (!room || !room.user) {
      this.stateMachine('permissionDenied');
      return;
    }
    this.feed(require('./skeleton')(this, room.user, this.peer));
    await this.prepareConference(room);
    this.ensurePart("commands").then((p) => { p.el.show() });
    this.responsive();
    this.stateMachine('online');
    return room;
  }


  /**
   * 
   * @param {*} opt 
   */
  async handleCrossCall(data) {
    this.verbose("AAA:127 CROSS VCALL ", this.callee, data);
    this.mset(data);
    if (data && data.caller && data.room_id) {
      this.model.unset(_a.callee);
    } else {
      let caller = await this.postService(SERVICE.conference.get_caller, {
        hub_id: Visitor.id,
        guest_id: this.callee.drumate_id
      }, { async: 1 });
      this.verbose("AAA:136 CROSS VCALL ", caller);
      if (!caller || !caller.room_id) {
        setTimeout(this.handleCrossCall.bind(this), 2000);
        return;
      }
      this.mset({ caller });
      this.model.unset(_a.callee);
    }
    this.configure();
    this.stateMachine('pickup');
  }

  /**
 * 
 * @param {*} opt 
 */
  isBusy(opt) {
    this.verbose("AAA:324 STATE", this.state);
    if (!opt) {
      this.verbose("XWWW ::205  NOT BUSY", opt);
      return false;
    }
    switch (this.state) {
      case _a.idle: 
      case _e.reject: 
      case 'failed': 
      case _e.cancel:
        return false;
      default:
        this.postSignaling({
          type: 'busy',
          scope: _a.socket,
          origin: {
            socket_id: Visitor.get(_a.socket_id),
          },
          target: opt.origin
        });
        this.debug("XWWW ::228 BUSY 222", this.state);
        return true;
    }
  }

  /**
   * 
   * @param {*} name 
   * @param {*} service 
   * @returns 
   */
  _setService(name, service) {
    let target = this.getPart(name);
    if (!target) return;
    target.mset({ service });
    let state = 1;
    if (service) state = 0;
    target.el.dataset.disabled = state;
  }


  /**
   * 
   */
  async stateMachine(s, data) {
    this.verbose("AAA:196 STATE MACHINE", s);
    this.state = s;
    let guest;
    let callee;
    let caller;
    switch (s) {
      case 'dial':
        this.prevState = s;
        if (this.caller) {
          this.stateMachine("WRONG STATE");
          this.warn("AAA:373 -- WRONG STATE. Should not have caller");
          return;
        }
        this.beforeLeavingState = _e.cancel;
        callee = this.callee;
        this.feed(require('./skeleton/init')(this, callee));
        this.statusMessages.dial = `${LOCALE.CALLING} ${callee.display}`;

        guest = await this.sendRoomSignaling(SERVICE.conference.invite, {
          guest_id: callee.drumate_id
        });
        this.verbose("AAAX:241 -- onDomRefresh", guest, this);
        if (guest && guest.cross_call) {
          let msg = LOCALE.X_IS_CALLING_YOU.format(callee.display);
          this.stateMessage(msg);
          Visitor.muteSound();
          this.handleCrossCall(guest);
          return;
        }
        if (!guest || guest.offline || !guest.room_id) {
          this.stateMachine('offline');
          return;
        }
        Visitor.playSound(_K.dialtones.rinback, 10);
        this.mset(guest);
        break;

      case _a.invite:
        this.prevState = s;
        if (this.caller) {
          this.stateMachine("Only host can add new participant");
          this.warn("AAA:373 -- WRONG STATE. Should not have caller");
          return;
        }
        callee = this.callee;
        this.statusMessages.invite = `${LOCALE.CALLING} ${callee.display}`;
        guest = await this.sendRoomSignaling(SERVICE.conference.invite, {
          guest_id: callee.drumate_id
        });
        this.verbose("AAAX:241 -- onDomRefresh", guest, this);
        if (guest && guest.cross_call) {
          let msg = LOCALE.X_IS_CALLING_YOU.format(callee.display);
          this.stateMessage(msg);
          //Visitor.muteSound();
          //this.handleCrossCall(guest);
          return;
        }
        if (!guest || guest.offline || !guest.room_id) {
          this.stateMachine('offline');
          return;
        }

        //Visitor.playSound(_K.dialtones.rinback, 10);
        //this.mset(guest);
        this.beforeLeavingState = 'terminated';
        return true;

      case 'ring':
        this.prevState = s;
        if (this.callee) {
          this.stateMachine("WRONG STATE");
          this.warn("AAA:373 -- WRONG STATE. Should not have caller");
          return;
        }
        this.beforeLeavingState = _e.reject;
        caller = this.caller;
        this.mset(caller);
        this.statusMessages.ring = LOCALE.X_IS_CALLING_YOU.format(this.caller.display);
        this.feed(require('./skeleton/init')(this, caller));
        this._setService('ctrl-video', 'pickup');
        this._setService('ctrl-audio', 'pickup');
        break;

      case 'offline':
        this.beforeLeavingState = _a.none;
        this.defaultState(_a.cancel);
        this.stateMessage(LOCALE.X_IS_NOT_ONLINE.format(this.mget('display')));
        Visitor.playSound(_K.dialtones.offline, 1);
        break;

      case 'connect':
        Visitor.muteSound();
        this.verbose("AAAX:306 -- connect", this.state, data, this);
        if (this.caller) { // One of callee picked up -- stop others
          if (data) {
            if (data.active_id == Visitor.get(_a.socket_id)) return;
            if (data.uid != Visitor.id) return;
          }
          this.beforeLeavingState = _a.none;
          this.goodbye();
          return;
        }
        this.beforeLeavingState = 'terminated';
        await this.startConnection();
        break;

      case 'pickup':
        this.prevState = s;
        Visitor.muteSound();
        this.beforeLeavingState = null;
        this.mset(this.caller);
        this.mset({ nid: this.caller.room_id || this.caller.nid });
        let c = await this.startConnection();
        if (!c) {
          this.defaultState(_a.cancel);
          return;
        }
        await this.sendRoomSignaling(SERVICE.conference.accept, { caller: this.caller });
        break;

      case _e.reject:
        if (data && data.caller) {
          caller = data.caller;
        } else {
          caller = this.caller
        }
        await this.sendRoomSignaling(SERVICE.conference.decline, { caller });
        break;

      case 'declined':
        this.verbose("AAAX:240 -- CANCEL", this.prevState, this.state, data);
        if (this.isOnine) {
          this.stateMessage(s);
          setTimeout(() => { this.stateMessage(), Visitor.timeout() });
          await this.sendRoomSignaling(SERVICE.conference.logCall, {
            event: _e.reject,
            callee: this.callee
          });
          let c = this.__attendees.getItemsByAttr(_a.user_id, this.callee.drumate_id)[0];
          if (c && c.inviteCancelled) c.inviteCancelled();
          this.prevState = s;
          return;
        }
        // this.__ctrlAudio.$el.hide();
        Visitor.muteSound();
        await this.sendRoomSignaling(SERVICE.conference.logCall, {
          event: _e.reject,
          callee: this.callee
        });
        this.stateMessage(s);
        break;

      case _e.cancel:
        this.verbose("AAAX:240 -- CANCEL", callee);
        await this.sendRoomSignaling(SERVICE.conference.cancel);
        await this.sendRoomSignaling(SERVICE.conference.logCall, {
          event: _e.cancel,
          callee: this.callee
        });
        break;

      case 'revoke':
        this.verbose("AAAX:240 -- CANCEL", this.callee);
        this.prevState = s;
        this.stateMessage(s);
        await this.sendRoomSignaling(SERVICE.conference.revoke, { callee: this.callee });
        setTimeout(() => { this.stateMessage(), Visitor.timeout() });
        return;

      case 'terminated':
        await this.sendRoomSignaling(SERVICE.conference.logCall, {
          duration: (timestamp() - this.mget(_a.start_at)),
          event: 'leave',
          callee: this.callee
        });

        break;


      default:
        super.stateMachine(s, data);
        return;
    }
    this.prevState = s;
    this.stateMessage(s);

  }



  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service)
    this.verbose(`AAA:438 -- onUiEvent service=${service}`, args, cmd, this);
    this.status = service;

    switch (service) {
      case 'pickup':
        cmd.setState(1);
      case "dial":
        this.stateMachine(service);
        break;

      case 'remote-left':
        if (args.siblings > 1) {
          this.stateMessage();
        } else {
          this.goodbye();
        }
        break;
      case _e.cancel:
      case _e.stop:
      case _e.close:
        this.goodbye();
        break;

      case _a.invite:
        if (this.state == service) return;
        this.mset({ callee: cmd.getCalleeData() });
        this.configure();
        this.stateMachine(service).then((sent) => {
          if (sent) cmd.inviteSucceeded();
        })
        break;

      case "revoke":
        if (this.state == service) return;
        this.mset({ callee: cmd.getCalleeData() });
        this.configure();
        this.stateMachine(service).then(() => {
          cmd.inviteCancelled();
        })
        break;


      default:
        super.onUiEvent(cmd, args);
    }
  }

  // ===========================================================
  // 
  // ===========================================================
  configure() {
    this._started = 0;
    let caller = this.mget(_a.caller);
    let callee = this.mget(_a.callee);
    if (callee == '*') {
      callee = Visitor.parseModuleArgs()
    }
    let o = null;
    // this.peers = {};
    if (caller) {
      this.callee = null;
      caller.display = caller.display || caller.fullname || caller.firstname;
      this.caller = caller;
    } else if (callee) {
      this.caller = null;
      callee.display = callee.display || callee.fullname || callee.firstname;
      this.callee = callee;
    } else {
      this.warn("Bad options : need caller either callee");
      if (!conf) {
        //this.skeleton =  require('./skeleton')(this);
        Wm.alert(LOCALE.UNKNOWN_ERROR)
        this.suppress();
      }
    }
    this.peer = callee || caller;

  }


  /**
   * 
   * @param {*} data 
   */
  onServerComplain(data) {
    this.debug("__ERRRRR", data);
  }



}

// __window_connect.initClass();
module.exports = __window_connect;

