const __room = require('builtins/webrtc/room/jitsi');

const { timestamp } = require("@drumee/ui-essentials")

// The floating call frame. Was the Figma 734x600; a 1:1 call is one or two
// faces and a row of controls, and at that size it covered most of the desk
// behind it for no gain.
const CONNECT_W = 640;
const CONNECT_H = 520;
// Keep-out from the edges of the work area, used only when the area is smaller
// than the window and there is nothing left to centre.
const CONNECT_INSET = 16;

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
      this._setSize({
        width: CONNECT_W,
        height: CONNECT_H,
        minWidth: 480,
        minHeight: 420,
      });
    }
    // _setSize placed it too; this puts it where it belongs. See the method.
    this._centerInWorkArea();
    this._state = 0;
    this.declareHandlers();
    this.statusMessages = {
      ...this.statusMessages,
      dial: LOCALE.CALLING,
      ring: LOCALE.INCOMING_CALL,
      offline: (''.printf(LOCALE.X_IS_NOT_ONLINE)),
      pickup: LOCALE.CONNECTING,
      ready: LOCALE.CONNECTING,
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
        // The peer hung up. Show the Figma terminal panel ("Call ended (04:56)")
        // for a beat instead of the window just vanishing.
        this.showCallEnded(this.callEndedMessage());
      }
    })

    // Desk navigation asks a live call to step aside rather than closing it —
    // the SAME mechanism the team meeting uses (builtins/webrtc/call-parking,
    // Wm.parkLiveCall / Desk._parkLiveCall -> "call:minimize"). Before this, the
    // broadcast had no listener here, so a 1:1 call stayed inside the window
    // manager while a full-page desk screen covered it: navigating away looked
    // exactly like the call had been closed.
    this._installCallParking();
  }

  /**
   * The box this window is positioned INSIDE — the window manager's container,
   * in viewport coordinates.
   *
   * The same box Wm.clampWindows measures, and for the same reason: it is the
   * desk canvas, which starts below the topbar and to the right of the sidebar
   * rail, not at the viewport origin.
   *
   * Falls back to the viewport when the desk has not laid out yet (or measures
   * 0x0, which it does for a frame during a rebuild) — a window centred against
   * nothing would sit in the corner.
   *
   * @returns {{width: Number, height: Number}}
   */
  _workAreaBox() {
    try {
      const host = window.Wm && Wm.el && (Wm.el.parentElement || Wm.el);
      if (host && _.isFunction(host.getBoundingClientRect)) {
        const r = host.getBoundingClientRect();
        if (r.width && r.height) return r;
      }
    } catch (e) { /* no desk — DMZ, or a teardown mid-flight */ }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  /**
   * CENTRE IT IN THE CANVAS, NOT IN THE VIEWPORT.
   *
   * The shared `_setSize` (window/interact/webrtc.js) computes
   * `left = innerWidth / 2 - width / 2` and a `top` from `innerHeight`. Those
   * are viewport coordinates, but this window's offset parent is the call layer,
   * whose origin is the WM work area — so the offset is applied from a point
   * already pushed right by the sidebar rail (64px pinned, 231px expanded) and
   * down by the topbar. The window landed right and low by exactly that much,
   * which on a 1440x800 desk with the rail open is ~123px right of centre.
   *
   * Corrected here rather than in `_setSize` itself: that method is shared with
   * window/meeting, which is a full-frame screen and throws its inline geometry
   * away in `_lockGeometry`, and with the orphaned window/screenshare. Neither
   * can be exercised on a box without a WebRTC stack, so the shared arithmetic
   * is left alone and the one live consumer places itself.
   *
   * Not re-run on resize on purpose: the window is draggable, so re-centring
   * would take it away from wherever the user put it, and Wm.clampWindows
   * already pulls it back inside when the area shrinks.
   *
   * @param {Number} [width] defaults to the launch width
   * @param {Number} [height] defaults to the launch height
   * @returns {{left: Number, top: Number}}
   */
  _centerInWorkArea(width, height) {
    const area = this._workAreaBox();
    const w = width || CONNECT_W;
    const h = height || CONNECT_H;
    // max() rather than a bare divide: an area narrower than the window gives a
    // negative offset, which would hang the frame off the top-left of the desk.
    const left = Math.max(CONNECT_INSET, Math.round((area.width - w) / 2));
    const top = Math.max(CONNECT_INSET, Math.round((area.height - h) / 2));

    // `this.size` is what change_size restores to, so it has to carry the new
    // origin as well as the element.
    this.size = { ...(this.size || {}), left, top };
    if (this.style && _.isFunction(this.style.set)) this.style.set({ left, top });
    if (this.el) {
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    }
    return { left, top };
  }

  /**
   * The 1:1 call is always its own floating window — there is no embedded
   * variant to protect (the meeting's `_isFullFrame` case), so it can always be
   * parked. Guarded on the element only, which the mixin re-checks anyway.
   */
  _canParkCall() {
    return !!this.el;
  }

  /**
   * Put the popup's own box back after the tile is un-docked.
   *
   * Unlike the meeting — a full-frame screen whose stylesheet fills the canvas
   * once the inline geometry is gone — this window is a floating popup that OWNS
   * its geometry (see `_setSize` in initialize). Dropping it into the dock leaves
   * the dock's `> *` fill rule in charge; coming back out, nothing would size it
   * at all, so it has to be re-seeded here.
   *
   * THE SAME CONSTANTS AS THE LAUNCH, and the same centring. Written out as
   * literals this drifted the moment the frame was resized: the window opened at
   * one size and came back from the dock at another.
   */
  _onCallTileLeft() {
    if (!this.el) return;
    // The dock pinned it with a stylesheet, not with inline styles, so there is
    // nothing to strip — only the launch geometry to re-assert.
    if (typeof this._setSize === "function") {
      this._setSize({
        width: CONNECT_W,
        height: CONNECT_H,
        minWidth: 480,
        minHeight: 420,
      });
    }
    this._centerInWorkArea();
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
    // Lock the in-topbar controls for the whole connecting phase (dial / ring /
    // pickup → online): the in-call top-bar controls (camera/mic/screen/
    // reactions/fullscreen) mount with the shared shell but the call is not live
    // yet, so they must not be operable. Flagged on the window ROOT (which exists
    // from the very first render, unlike the controls — those only mount with the
    // in-call skeleton in startConnection), so the CSS lock applies the instant
    // they appear. Cleared in onLocalUserJoined, when CONFERENCE_JOINED fires and
    // the call goes live. The Leave button is exempted in CSS so the user always
    // has an escape hatch. Mirrors the meeting window's startup lock.
    if (this.el) this.el.dataset.startingUp = "1";
    await super.onDomRefresh();
    // Seed data-narrow / data-compact / data-short before the pre-call screen
    // is drawn. _resize only fires once the user drags a handle, so without
    // this a call opened in an already-small window renders at full size first.
    if (this.responsive) this.responsive();
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

  // CONFERENCE_JOINED — the local user is now actually in the conference, so the
  // call is live. Unlock the in-topbar controls that onDomRefresh locked for the
  // connecting phase. On a failed/aborted call this never fires, so the controls
  // stay locked (Leave stays clickable via CSS). Mirrors the meeting window.
  async onLocalUserJoined(...args) {
    await super.onLocalUserJoined(...args);
    if (this.el) this.el.dataset.startingUp = "0";
    // Honour a mic muted on the pre-call screen. The camera preference already
    // rides `isVideo` into _createStartupTracks, but audio is always acquired,
    // so muting it has to happen once the track exists.
    if (this._precallMuted) {
      this._precallMuted = 0;
      this.changeLocalAudio(0);
    }
  }

  // ── Terminal panel (Figma "get rejected" / call ended) ────────────────────
  // Replace the live UI with the identity block plus a single outcome line,
  // then close the window. Used for a declined call and for the peer hanging
  // up; the local user pressing Leave still closes immediately, since they
  // already know the outcome.
  showCallEnded(message, delay = 2200) {
    if (this.isDestroyed() || this._ending) return;
    this._ending = 1;
    Visitor.muteSound();
    // The 1s elapsed-timer tick writes into the "elapsed-timer" part, which the
    // ended panel does not carry — stop it before the swap rather than let it
    // poke at a part that is about to be torn down.
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    // Release camera/mic BEFORE swapping the stage out. The panel lives for a
    // couple of seconds before goodbye() runs the real teardown, and leaving
    // live tracks (and the widgets bound to them) behind while their DOM is
    // gone is how stray jitsi events find destroyed endpoints. Fire-and-forget:
    // the panel must not wait on track disposal.
    if (typeof this.unload === "function") {
      Promise.resolve()
        .then(() => this.unload())
        .catch((e) => this.warn("call-ended unload failed", e));
    }
    if (this.el) {
      this.el.dataset.callState = "ended";
      this.el.dataset.mode = "normal";
    }
    try {
      this.feed(require("./skeleton/ended")(this, this.peer, message));
    } catch (e) {
      this.warn("failed to render the call-ended panel", e);
      this.goodbye();
      return;
    }
    setTimeout(() => {
      if (!this.isDestroyed()) this.goodbye();
    }, delay);
  }

  // "Call ended (04:56)" — the duration is omitted when the call never went
  // live (nothing to report), leaving the bare "Call ended".
  callEndedMessage() {
    const d = this.callDuration();
    return d ? `${LOCALE.CALL_ENDED} (${d})` : LOCALE.CALL_ENDED;
  }

  // mm:ss (hh:mm:ss past an hour) since the conference went live, or null if it
  // never did. _elapsedStart is set by the base room on stateMachine("online").
  callDuration() {
    if (!this._elapsedStart) return null;
    const elapsed = Math.floor((Date.now() - this._elapsedStart) / 1000);
    if (elapsed < 0) return null;
    const pad = (n) => String(n).padStart(2, "0");
    const s = elapsed % 60;
    const m = Math.floor(elapsed / 60) % 60;
    const h = Math.floor(elapsed / 3600);
    return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  // Header expand button (Figma CornersOut): native fullscreen on the window
  // root — `_toggleWindowFullscreen`, shared with the meeting via
  // builtins/webrtc/window-fullscreen (assigned at the bottom of this file).
  // Note this is distinct from `change_size`, which the screen-share path
  // deliberately neuters.


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
        // The callee's name/email now headline the pre-call screen, so the
        // status line stays the bare "Calling…" the design asks for.
        this.statusMessages.dial = LOCALE.CALLING;

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
        // Same as 'dial': the caller's identity is already the headline.
        this.statusMessages.ring = LOCALE.INCOMING_CALL;
        this.feed(require('./skeleton/init')(this, caller));
        break;

      case 'offline':
        this.beforeLeavingState = _a.none;
        this.defaultState(_a.cancel);
        if (this.el) this.el.dataset.callState = 'offline';
        this.stateMessage(LOCALE.X_IS_NOT_ONLINE.format(this.mget('display')));
        // Silent by design: the "<name> is not currently online" panel is the
        // whole message. The old looping dial tone added nothing but noise.
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
        Visitor.muteSound();
        await this.sendRoomSignaling(SERVICE.conference.logCall, {
          event: _e.reject,
          callee: this.callee
        });
        this.beforeLeavingState = _a.none;
        // Figma "get rejected": the terminal panel carries the outcome itself,
        // so skip the trailing stateMessage() — the ended screen has no
        // message-container part for it to land in.
        this.prevState = s;
        this.showCallEnded(LOCALE.CALL_DECLINED);
        return;

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

  // Drive the small-size layout off the WINDOW's own box, not the viewport.
  // The call is a resizable Wm window that can be shrunk to its 480×420 minimum
  // (or blown up to fullscreen) on a large screen, so `@media` never fires and
  // the `data-device` the framework stamps only tells us about the viewport.
  // Flip data-narrow / data-compact / data-short on the root and let the skin
  // tighten the action row and identity block. Mirrors the meeting window.
  responsive(m, ui) {
    if (super.responsive) super.responsive(m, ui);
    if (!this.el || !this.$el) return;
    const w = this.$el.width() || this.el.offsetWidth || 0;
    const h = this.$el.height() || this.el.offsetHeight || 0;
    if (!w && !h) return;
    // A drag-resize calls this many times a second — only touch the DOM when a
    // dimension actually changed.
    if (this._lastW === w && this._lastH === h) return;
    this._lastW = w;
    this._lastH = h;
    if (w) {
      // 4 actions × 64px + 3 × 48px gap + 48px padding = 448px, so the full
      // row only stops fitting below ~470px.
      this.el.dataset.narrow = w < 560 ? "1" : "0";
      this.el.dataset.compact = w < 470 ? "1" : "0";
    }
    if (h) {
      // Below this the 120px avatar + name + email + action row stop fitting
      // between the header and the footer.
      this.el.dataset.short = h < 520 ? "1" : "0";
    }
  }

  // The base onTrackMuteChange only syncs the top-bar mic pill; the local
  // self-tile's mic badge (unlike the remote one) is never seeded or updated,
  // so its muted state never shows. Reflect it here on audio mute/unmute.
  onTrackMuteChange(track) {
    if (super.onTrackMuteChange) super.onTrackMuteChange(track);
    if (!track || typeof track.getType !== "function") return;
    if (track.getType() === _a.audio) {
      // data-state "0" = muted (skin reveals the badge); "1" = live (hidden).
      this._setLocalTileMic(!track.isMuted());
    }
  }

  // Set the local self-tile mic badge's data-state. Target it by class within
  // the local tile — its sys_pn ("audio") collides with the tile's <audio>
  // element, so a part lookup would be ambiguous.
  _setLocalTileMic(isLive) {
    if (typeof this.getLocalParts !== "function") return;
    this.getLocalParts()
      .then((parts) => {
        const local = parts && parts.local;
        if (!local || (local.isDestroyed && local.isDestroyed()) || !local.el) {
          return;
        }
        const fam = (local.fig && local.fig.family) || "endpoint-local";
        const mic = local.el.querySelector(`.${fam}__tile-mic`);
        if (mic) mic.dataset.state = isLive ? 1 : 0;
      })
      .catch(() => {});
  }

  // ── Float-overlay focus (single-participant view while a screen is shared) ──
  // While a screen is shared the participant tiles dock into the float overlay,
  // where the skin stacks both tiles in one 16:9 frame (local self-view on top
  // of the remote by z-index). Spotlight whoever is TALKING by flipping
  // data-focused="1" onto their tile — the shared shell raises it to the very
  // front, so the active speaker's avatar/camera (endpoint-local__avatar /
  // remote-user__avatar) is the one visible over the shared screen. Mirrors the
  // meeting window's float focus, minus hand-raise (the 1:1 call has none).
  // Only meaningful while docked; _dockParticipants calls _updateFloatFocus /
  // _clearFloatFocus on dock / undock.

  // Jitsi dominant-speaker changed. Keep the base behavior (per-tile
  // data-speaking ring), then re-point the float spotlight at the speaker.
  onDominantSpeaker(id) {
    if (super.onDominantSpeaker) super.onDominantSpeaker(id);
    this._dominantPid = id || null;
    this._updateFloatFocus();
  }

  // True while the live tiles are docked into the float overlay (a screen is
  // being shared) — the only time focus switching is visible.
  _floatDocked() {
    return !!(
      this._participantsHome && this._participantsHome.dataset.docked === "1"
    );
  }

  _myParticipantId() {
    return this.room && this.room.myUserId ? this.room.myUserId() : null;
  }

  // Spotlight the dominant speaker's tile; fall back to the local self-view when
  // nobody is talking (or the speaker has no live tile).
  _updateFloatFocus() {
    if (!this._floatDocked()) return;
    if (this._dominantPid) return this._focusByPid(this._dominantPid);
    return this._focusLocalTile();
  }

  _focusByPid(pid) {
    if (!pid || pid === this._myParticipantId()) return this._focusLocalTile();
    const ep = this.endpoints && this.endpoints[pid];
    if (ep && !ep.isDestroyed() && ep.el) return this._applyFloatFocus(ep.el);
    return this._focusLocalTile();
  }

  _focusLocalTile() {
    if (typeof this.getLocalParts !== "function") return;
    this.getLocalParts()
      .then((parts) => {
        const local = parts && parts.local;
        if (local && !local.isDestroyed() && local.el) {
          this._applyFloatFocus(local.el);
        }
      })
      .catch(() => {});
  }

  // Move data-focused onto `el`, clearing it from every other tile in the float
  // overlay so exactly one participant is spotlighted.
  _applyFloatFocus(el) {
    if (!el || !this.el) return;
    const float = this.el.querySelector(`.${this.fig.family}__float-tiles`);
    if (!float || !float.contains(el)) return;
    float
      .querySelectorAll('[data-focused="1"]')
      .forEach((n) => { n.dataset.focused = "0"; });
    el.dataset.focused = "1";
  }

  _clearFloatFocus() {
    if (!this.el) return;
    const float = this.el.querySelector(`.${this.fig.family}__float-tiles`);
    if (!float) return;
    float
      .querySelectorAll('[data-focused="1"]')
      .forEach((n) => { n.dataset.focused = "0"; });
  }

  // ── Control-pill loading state ───────────────────────────────────────────
  // Toggling the camera, mic, or screen share is async — create/dispose the
  // local track, or open the screen picker and publish the desktop track. Flag
  // the relevant control with data-loading while that work is in flight; the
  // skin overlays a spinner and blocks further clicks so the toggle can't be
  // spammed mid-flight. Bracketed around the shared base toggles; the finally
  // always clears the flag, even on cancel/failure.

  // Each control is a round __call-action button in the bottom bar, so the
  // spinner goes straight on the button itself.
  _ctrlLoadingEl(kind) {
    const btn =
      kind === _a.video ? this.__ctrlVideo :
      kind === _a.audio ? this.__ctrlAudio :
      this.__ctrlScreen;
    if (!btn || !btn.el || (btn.isDestroyed && btn.isDestroyed())) return null;
    return btn.el;
  }

  _setCtrlLoading(kind, loading) {
    const el = this._ctrlLoadingEl(kind);
    if (el) el.dataset.loading = loading ? "1" : "0";
  }

  async changeLocalVideo(state) {
    this._setCtrlLoading(_a.video, true);
    try {
      return await super.changeLocalVideo(state);
    } finally {
      this._setCtrlLoading(_a.video, false);
    }
  }

  async changeLocalAudio(state) {
    this._setCtrlLoading(_a.audio, true);
    try {
      return await super.changeLocalAudio(state);
    } finally {
      this._setCtrlLoading(_a.audio, false);
    }
  }

  async changePresentation(state) {
    this._setCtrlLoading(_a.screen, true);
    try {
      return await super.changePresentation(state);
    } finally {
      this._setCtrlLoading(_a.screen, false);
    }
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

      // Pre-call mic / camera preferences (Figma: the toggles sit next to
      // accept/decline before the call connects). No conference exists yet, so
      // these only record the choice — the camera one rides `isVideo` into
      // _createStartupTracks, the mic one is applied in onLocalUserJoined.
      case "precall-audio":
        this.mset({ audio: cmd.getState() ? 1 : 0 });
        this.isAudio = !!this.mget(_a.audio);
        this._precallMuted = this.mget(_a.audio) ? 0 : 1;
        break;

      case "precall-video":
        this.mset({ video: cmd.getState() ? 1 : 0 });
        this.isVideo = !!this.mget(_a.video);
        break;

      case "toggle-fullscreen":
        // Header expand button — fullscreen the call window itself.
        this._toggleWindowFullscreen();
        break;

      // The designed target on the parked tile ("Return to call" cover,
      // webrtc/skeleton/call-tile). call-parking also takes the click on the
      // window root in the capture phase, because at 300x180 every other child
      // is a live WebRTC widget that stops propagation — this is the clean path
      // when the cover itself is hit.
      case "restore-call":
        this.setCallTile(0);
        break;

      // Park this call in the desk dock without leaving it. Same end state as
      // the desk's own navigation park, reached deliberately.
      case "park-call":
        this.setCallTile(1);
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
    // Un-park (if parked), release the broadcasts and tell the desk the call is
    // gone. Covers every exit: Leave, the peer hanging up, a decline, a revoke,
    // a tab close.
    this._teardownCallParking();
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
// Live-call dock parking, shared with window_meeting: "call:minimize" parks
// this window as a tile in the desk's call-dock, a click brings it back. Its
// two seams — _canParkCall / _onCallTileLeft — are defined on the class above
// and must NOT appear in the mixin (Object.assign would overwrite them).
Object.assign(__window_connect.prototype, require("builtins/webrtc/call-parking"));

Object.assign(__window_connect.prototype, require("builtins/webrtc/reactions"));
// Shared in-call screen-share behavior (own screen on stage, tile docking,
// one-at-a-time lock, fullscreen). Meeting-only hooks it calls are optional.
Object.assign(__window_connect.prototype, require("builtins/webrtc/screenshare"));
// Shared window-level fullscreen (also used by window_meeting): snapshots the
// window geometry on the way in and restores it on the way out, which a bare
// requestFullscreen() cannot do — see the module header.
Object.assign(__window_connect.prototype, require("builtins/webrtc/window-fullscreen"));

// __window_connect.initClass();
module.exports = __window_connect;

