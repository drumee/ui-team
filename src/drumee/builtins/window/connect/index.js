const __room = require('builtins/webrtc/room/jitsi');

const { timestamp } = require("@drumee/ui-essentials")
class __window_connect extends __room {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    this.service_class = 'connect';
    super.initialize(opt);
    const hubId = this.mget(_a.hub_id) || Wm.mget('wicket_id') || Visitor.id;
    this.mset({
      hub_id: hubId,
      service_class: this.service_class,
      audio: 1,
      area: _a.private
    });
    if (this.mget(_a.video) == null) this.mset({ video: 0 });
    // Meeting-style standalone window: a resizable, meeting-sized floating popup
    // (replaces the old fixed 440x480 box). header/resizable enable the base
    // window drag handle + jQuery-UI resize handles; _setSize seeds the default
    // geometry. onDomRefresh flags data-standalone="1" so the shared shell skin
    // floats it as a free window in the Wm pool with a grabbable resize frame.
    this.model.atLeast({ header: 1, resizable: 1 });
    if (typeof this._setSize === "function") {
      this._setSize({ width: 720, height: 560, minWidth: 480, minHeight: 360 });
    }
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
    // Peer reaction float (shared reactions feature). _applyRemoteReaction
    // ignores our own echo, so handle it before the base self-filter.
    if (options.service === SERVICE.conference.broadcast &&
        options.event === "REACTION") {
      this._applyRemoteReaction(data);
      return;
    }
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
    // Standalone floating popup: the shared meeting-shell skin keys its absolute
    // frame + grabbable resize handles off data-standalone="1" (same as meeting).
    if (this.el) this.el.dataset.standalone = "1";
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
  async startConnection(args = {}) {
    //let user = this.callee || this.caller;
    if (this.isOnine) return;
    let isCallee = 0;
    if (this.caller) {
      isCallee = 1;
    }
    let room = await this.join({ isCallee, ...args });
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
    target.el.dataset.disabled = service ? 0 : 1;
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
        try {
          console.log("[ROOMDBG] dial: invite returned", {
            guest_room_id: guest && guest.room_id, guest_nid: guest && guest.nid,
          });
        } catch (e) { }
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
        break;

      case 'offline':
        this.beforeLeavingState = _a.none;
        this.defaultState(_a.cancel);
        if (this.el) this.el.dataset.callState = 'offline';
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
        const room_id = this.caller.room_id || this.caller.nid;
        try {
          console.log("[ROOMDBG] pickup: callee adopting caller room", {
            caller_room_id: this.caller.room_id, caller_nid: this.caller.nid, room_id,
          });
        } catch (e) { }
        this.mset({
          room_id,
          nid: room_id,
          hub_id: Visitor.id,
          drumate_id: this.caller.drumate_id || this.caller.uid,
        });
        // The conference room was created in the caller's hub context and
        // the callee's permission was granted in the caller's hub DB.
        // Use the caller's hub_id for join and accept so the permission
        // check (fast_check: user_permission) runs in the correct DB.
        // The model hub_id stays as Visitor.id for subsequent leave/update
        // signals which use fast_check: public-api and don't need it.
        const callerHubId = this.caller.hub_id;
        const hubOverride = callerHubId ? { hub_id: callerHubId } : {};
        let c = await this.startConnection(hubOverride);
        if (!c) {
          this.defaultState(_a.cancel);
          return;
        }
        await this.sendRoomSignaling(SERVICE.conference.accept, {
          caller: this.caller,
          ...hubOverride,
        });
        break;

      case _e.reject:
        if (data && data.caller) {
          caller = data.caller;
        } else {
          caller = this.caller
        }
        // hub_id must be Visitor.id (B's own) — the model still carries A's
        // hub_id from this.mset(caller) in 'ring' state, which the server rejects
        // with 403 PERMISSION_DENIED.
        await this.sendRoomSignaling(SERVICE.conference.decline, {
          caller,
          hub_id: Visitor.id,
        });
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
        Visitor.muteSound();
        await this.sendRoomSignaling(SERVICE.conference.logCall, {
          event: _e.reject,
          callee: this.callee
        });
        this.stateMessage(s);
        this.beforeLeavingState = _a.none;
        setTimeout(() => {
          if (!this.isDestroyed()) this.goodbye();
        }, 1800);
        break;

      case _e.cancel:
        this.verbose("AAAX:240 -- CANCEL", this.callee);
        // Mirror the 'reject' path: send the peer data so the server can
        // route the dismissal directly. conference.cancel relies on a
        // conference-table lookup that is unreliable pre-pickup, leaving
        // the callee's ringing window stuck. conference.revoke resolves
        // the callee's sockets by drumate_id and also writes the call log.
        await this.sendRoomSignaling(SERVICE.conference.revoke, {
          callee: this.callee,
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
  // Screen-share must NOT resize the 1:1 call window. The base fitScreenSize/
  // change_size animate the window to ~full viewport (innerWidth-200 ×
  // innerHeight-42); we only want the presenter LAYOUT to change. Mirror the
  // meeting: flip data-mode and let CSS own the layout (the presenter grid is
  // driven by responsive() → __endpoints[data-mode=presenter]), never touch
  // the window geometry.
  fitScreenSize(mode) {
    if (this.el) this.el.dataset.mode = mode;
    if (this.responsive) this.responsive(mode);
  }

  change_size(cmd, max_size) {
    const mode = (this.el && this.el.dataset.mode) || "normal";
    if (this.responsive) this.responsive(mode);
  }

  async onUiEvent(cmd, args = {}) {
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
      case "reject":
        Visitor.muteSound();
        if (this.caller) {
          this.beforeLeavingState = _e.reject;
        }
        // Route through leaveRoom so stateMachine(beforeLeavingState) fires the
        // decline signal; goodbye() alone skips it and the caller stays stuck.
        await this.leaveRoom();
        return;

      case _e.cancel:
      case _e.stop:
      case _e.close:
        if (!this.beforeLeavingState && this.callee && !this.isOnine) {
          this.beforeLeavingState = _e.cancel;
        }
        await this.leaveRoom();
        return;

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


      case "react":
        // Quick-reaction emoji from the topbar bar (shared reactions feature).
        this._sendReaction(
          (cmd.mget && cmd.mget("emoji")) ||
            (cmd.el && cmd.el.textContent && cmd.el.textContent.trim()),
        );
        break;

      case "reactions-more":
        this._toggleReactionsPicker();
        break;

      case "start-screenshare":
      case "stop-screenshare":
        // One screen at a time: block starting a share while the peer is
        // presenting (belt-and-suspenders with the disabled button). The
        // active local presenter is never locked, so they can still stop.
        if (this._shareLocked && !this._presentingLocally) return;
        super.onUiEvent(cmd, args);
        break;

      case "togglefullscreen":
        // Only expand the screen-share widget itself, not the whole host page
        // (the base handler fullscreens document.body). Shared with the meeting.
        this._toggleScreenShareFullscreen();
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  onBeforeDestroy(opt) {
    // Drop the reactions picker's document click-listener if open at teardown.
    this._closeReactionsPicker();
    if (super.onBeforeDestroy) return super.onBeforeDestroy(opt);
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
  }



}

// Shared in-call reactions behavior (same module the meeting uses).
Object.assign(__window_connect.prototype, require("builtins/webrtc/reactions"));
// Shared in-call screen-share behavior (own screen on stage, tile docking,
// one-at-a-time lock, fullscreen). Meeting-only hooks it calls are optional.
Object.assign(__window_connect.prototype, require("builtins/webrtc/screenshare"));

// __window_connect.initClass();
module.exports = __window_connect;

