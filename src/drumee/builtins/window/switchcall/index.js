/* ==================================================================== *
*   Copyright xialia.com  2011-2021
* ==================================================================== */

const mfsInteract = require('../interact')
class ___window_switchcall extends mfsInteract {


  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.peerData = opt.peerData;
    this.currentRoom = opt.currentRoom;
    this.skeleton = require('./skeleton')(this);
    //this.bindEvent('...');
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'topbar':
        this.setupInteract();
        break;
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this.setupInteract();
  }

  /**
   * 
   * @param {*} data 
   * @param {*} opt 
   * @returns 
   */
  sameRoom(d) {
    if (!d) return false;
    let c = this.currentRoom;
    if (!c || c.isDestroyed()) return false;
    return (d.hub_id == c.get(_a.hub_id) && d.room_id == c.get(_a.room_id));
  }

  /**
   * 
   * @param {*} data 
   * @param {*} opt 
   * @returns 
   */
  sameCall(data, opt) {
    if (this.sameRoom(data.caller)) {
      if (_.isFunction(this.currentRoom.reload)) {
        this.currentRoom.reload({ ...data, ...opt });
        return true;
      }
    }
    return false;
  }


  /**
   */
  accept(cmd) {
    let data = this.mget(_a.respawn);
    let opt = {
      pickup: 1,
      audio: 1,
      video: 1
    };
    if (cmd.mget(_a.name) == _a.audio) {
      opt.video = 0;
    }
    if (this.sameCall(data, opt)) return;
    if (this.sameRoom(data, opt)) return;
    // One accept per popup. The window this opens takes a moment to build, and
    // without a latch an impatient second click opened a second call window.
    // Latched here, AFTER the two guards: neither of them opens anything, so
    // latching before them dead-ended the popup — picking Audio on a call
    // already in progress consumed the only accept, and the Video button next
    // to it then did nothing at all.
    if (this._accepted) return;
    this._accepted = 1;
    if (this.currentRoom) {
      this.currentRoom.$el.hide();
      this.currentRoom.goodbye();
    }
    // Wm.addWindow has no dedup of its own, so joining a meeting whose folder
    // window is already open used to stack a second one. Reuse it and join the
    // live room on it — the same path the activity panel's Join takes.
    const hub_id = data && data.hub_id;
    if (hub_id && data.kind === "window_folder") {
      const open = ((Wm.getItemsByKind && Wm.getItemsByKind("window_folder")) || [])
        .find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
      if (open && typeof open._launchMeetingInPanel === "function") {
        if (open.raise) open.raise();
        open._launchMeetingInPanel();
        return;
      }
    }
    Wm.addWindow({ ...data, ...opt });
  }

  /**
   */
  async decline(cmd) {
    this._declineMeetingInvite();
    if (!this.currentRoom || this.peerData.room_type != _e.connect) {
      return;
    }
    let data = this.mget(_a.respawn);
    if (this.currentRoom) {
      await this.currentRoom.stateMachine(_e.reject, data);
    }
    this.$el.hide();
    this.goodbye();
}

  /**
   * Someone in a meeting rang us from its roster (conference.invite → push.js
   * dispatchRoom) and we dismissed the prompt: tell them, so their "Call in
   * progress" turns into "Declined" instead of waiting out the ring. A prompt
   * raised by anything else (conference.join "first participant arrived")
   * carries no caller socket and is left alone. Sent once, through the
   * meeting's workspace — the callee is a member there, which is what the
   * decline's user_permission check needs.
   */
  _declineMeetingInvite() {
    const p = this.peerData;
    if (this._declined || !p || p.room_type != _a.meeting) return;
    if (p.type && p.type != SERVICE.conference.invite) return;
    if (!p.caller_id || !p.hub_id) return;
    this._declined = 1;
    this.postService(SERVICE.conference.decline, {
      hub_id: p.hub_id,
      nid: p.room_id,
      metadata: { type: _a.meeting },
      caller: {
        caller_id: p.caller_id,
        uid: p.uid,
        hub_id: p.hub_id,
        room_id: p.room_id,
      },
    }).catch((e) => this.warn && this.warn("conference.decline failed", e));
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'decline': case _e.close:
        this.decline(cmd);
        this.goodbye();
        break;
      case 'accept':
        this.accept(cmd);
        this.el.hide();
        this.suppress();
        break;
      default:
        //this.debug("Created by kind builder");
        if (super.onUiEvent) super.onUiEvent(cmd, args)
    }
  }

  /**
   * 
   */
  onWsMessage(service, data, options) {
    switch (options.service) {
      case SERVICE.chat.post:
        if (this.peerData.origin.uid != data.entity_id) return;
        if (data.call_status == _e.cancel && data.call_duration == 0) {
          this.goodbye();
        }
    }

  }
  // switch(service)
  //   when SERVICE.signaling.dial
  //     @dispatchInboundCall(data)

  //   when SERVICE.signaling.notify
  //     this.debug("XWWWWQ  NOTIFY 0", service, data);


}

module.exports = ___window_switchcall
