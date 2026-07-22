const WS_EVENT = "ws:event";

const { timestamp } = require("@drumee/ui-essentials")
const winman = require("window/manager");

class __push_manager extends winman {

  constructor(...args) {
    super(...args);
    this.dispatchInboundCall = this.dispatchInboundCall.bind(this);
    this.dispatchRoom = this.dispatchRoom.bind(this);
    this._showMeetingToast = this._showMeetingToast.bind(this);
  }

  initialize(opt) {
    super.initialize(opt);
    this.myContacts = new Map();
    this.myContactsStatus = new Map();
  }

  /**
   *
   */
  updatePeersState() {
    if (!Visitor.isOnline()) return;
    this.postService(
      SERVICE.contact.connection_status, { hub_id: Visitor.id },
    ).then((contacts) => {
      if (_.isEmpty(contacts)) return;
      if (!_.isArray(contacts)) {
        contacts = [contacts]
      }
      for (let c of contacts) {
        this.myContactsStatus.set(c.his_id, { status: c.his_state });
        RADIO_BROADCAST.trigger(_e.peerData, { id: c.his_id, status: c.his_state });
      }
    });
  }

  /**
   *
   * @param {*} client
   */
  getContactStatus(id) {
    return this.myContactsStatus.get(id);
  }

  /**
   *
   * @param {*} service
   * @param {*} data
   * @param {*} options
   * @returns
   */
  onWsMessage(service, data, options = {}) {
    let items = [];
    let sender = options.sender;
    this.verbose("[60]onWsMessage:", options.service, data.socket_id, data, options);
    if (sender && sender.socket_id == Visitor.get(_a.socket_id)) {
      if (!options.loopback) return;
    }
    switch (options.service) {

      case SERVICE.conference.invite:
        if (data.room_type == _a.meeting) {
          return this.dispatchRoom(data, options);
        }
        return this.dispatchInboundCall(data);

      case SERVICE.conference.join:
        Wm.alert();
        if (data.room_type == _a.meeting) {
          this.dispatchRoom(data, options);
        } else {
          let sender = options.sender || {};
          if (data.uid == Visitor.id && sender.uid == Visitor.id) return;
          this.dispatchInboundCall(data);
        }
        return;

      case SERVICE.conference.accept:
      case SERVICE.conference.revoke:
      case SERVICE.conference.decline:
        this.dispatchSignaling(options.service, data);
        return;

      case SERVICE.conference.cancel:
        Visitor.muteSound();
        for (let c of this.getItemsByAttr(_a.room_id, data.room_id)) {
          c.goodbye();
        }
        return;

      case SERVICE.conference.leave:
        // Other party left the call. Close P2P call windows only (window_connect).
        // Team meeting windows (window_folder) stay open — only the host ending
        // the meeting should close them.
        Visitor.muteSound();
        for (let c of this.getItemsByAttr(_a.room_id, data.room_id)) {
          if (c && (typeof c.isDestroyed !== 'function' || !c.isDestroyed())) {
            if (c.mget && c.mget(_a.kind) === 'window_connect') {
              c.goodbye();
            }
          }
        }
        return;

      case SERVICE.conference.update:
      case SERVICE.conference.broadcast:
        return;

      case SERVICE.signaling.notify:
        return;

      // A workspace member scheduled/invited you to a meeting (room.js
      // _notify_invitees). Show a transient top-right toast — NOT a modal.
      // (The persistent notification-sidebar entry is a separate follow-up
      // that needs the notification_center_next aggregation extended.)
      case "room.scheduled":
        return this._showMeetingToast(data);

      // A scheduled meeting's start time has arrived (reminderWorker →
      // meeting_schedule_due). Show the same toast, flavoured as a reminder
      // with a Join button that opens the meeting.
      case "room.reminder":
        return this._showMeetingToast(data, { reminder: 1 });

      case SERVICE.signaling.message:
        if (/pickup|cancel|reject/.test(data.type)) Visitor.muteSound();
        return

      case SERVICE.adminpanel.member_delete:
        let { organization } = data
        return Wm.choice(LOCALE.YOU_HAVE_BEEN_KICK_OUT.format(organization), LOCALE.GOT_IT).then(() => {
          location.reload()
        })
      // case SERVICE.adminpanel.mimic_new:
      //   return this.loadMimicNew(data);

      // case SERVICE.adminpanel.mimic_reject:
      //   return this.loadMimicReject(data);

      // case SERVICE.adminpanel.mimic_active:
      // case SERVICE.adminpanel.mimic_end_bymimic:
      // case SERVICE.adminpanel.mimic_end_byuser:
      // case SERVICE.adminpanel.mimic_end_bytime:
      //   _.delay(() => location.reload());
      //   break;

      case SERVICE.drumate.logout:
        if (!sender || sender.socket_id == Visitor.get(_a.socket_id)) {
          return;
        }
        this.fetchService(SERVICE.yp.hello).then((data) => {
          if (data.connection == 'offline') {
            location.reload()
          }
        })
        return;

      case SERVICE.contact.connection_status:
      case "user.connection_status":
        // UserProfile.updateStatus guards on data.id; server push uses user_id.
        this.myContactsStatus.set(data.user_id, { status: data.status });
        this.trigger(options.service, data);
        RADIO_BROADCAST.trigger(_e.peerData, { id: data.user_id, status: data.status });
        break;

      default:
        this.trigger(WS_EVENT, { service, data, options })
    }
  }

  /**
   * Transient top-right toast for a meeting invite (room.scheduled push):
   * appends a Skeletons node to the WM layer, auto-dismisses after ~6s (or on
   * click). Not a modal; the notification-sidebar entry is a separate follow-up.
   */
  _showMeetingToast(data = {}, opt = {}) {
    try {
      const isReminder = !!opt.reminder;
      const layer = Wm && Wm.windowsLayer;
      if (!layer || !layer.append) return;

      let kids;
      if (isReminder) {
        // "<title>" / "Your meeting is starting now" + a Join button.
        kids = [
          Skeletons.Note({
            content: data.title || LOCALE.MEETING,
            styleOpt: { "font-size": "14px", "line-height": "20px", "font-weight": "600", color: "#ffffff" },
          }),
          Skeletons.Note({
            content: LOCALE.MEETING_STARTING_NOW,
            styleOpt: { "font-size": "12px", "line-height": "17px", color: "rgba(255,255,255,0.75)", "margin-top": "2px" },
          }),
          Skeletons.Note({
            className: "desk-meeting-toast__join",
            content: LOCALE.JOIN_MEETING,
            styleOpt: {
              "margin-top": "10px", "align-self": "flex-start", padding: "6px 16px",
              "border-radius": "6px", background: "#5950ff", color: "#ffffff",
              "font-size": "13px", "font-weight": "600", cursor: "pointer",
            },
          }),
        ];
      } else {
        const from = data.from || "";
        const line = data.title
          ? `${LOCALE.X_INVITED_YOU_TO_MEETING.format(from)} — ${data.title}`
          : LOCALE.X_INVITED_YOU_TO_MEETING.format(from);
        kids = [
          Skeletons.Note({
            content: line,
            styleOpt: { "font-size": "14px", "line-height": "20px", color: "#ffffff" },
          }),
        ];
      }

      // Stack toasts down the right edge so several don't overlap.
      this._meetingToastN = (this._meetingToastN || 0) + 1;
      const idx = this._meetingToastN;
      const toast = layer.append(
        Skeletons.Box.Y({
          className: "desk-meeting-toast",
          service: "dismiss-meeting-toast",
          uiHandler: [this],
          styleOpt: {
            position: "fixed",
            top: `${72 + ((idx - 1) % 4) * 96}px`,
            right: "24px",
            "z-index": 100000,
            "max-width": "320px",
            padding: "14px 16px",
            "border-radius": "10px",
            background: "#0b0a21",
            color: "#ffffff",
            "box-shadow": "0 10px 30px rgba(0, 0, 0, 0.25)",
            cursor: "pointer",
          },
          kids,
        }),
      );
      const kill = () => {
        try {
          if (toast && (!toast.isDestroyed || !toast.isDestroyed())) {
            if (toast.goodbye) toast.goodbye();
            else if (toast.remove) toast.remove();
          }
        } catch (e) {}
      };
      // Reminder: the Join button joins the meeting (and dismisses); clicking
      // elsewhere on the toast just dismisses. stopPropagation keeps the two apart.
      if (isReminder && toast && toast.el) {
        const joinEl = toast.el.querySelector(".desk-meeting-toast__join");
        if (joinEl) {
          joinEl.addEventListener("click", (e) => {
            e.stopPropagation();
            this._joinMeetingFromData(data);
            kill();
          });
        }
      }
      // Click-to-dismiss + auto-dismiss (reminders linger longer).
      if (toast && toast.el) toast.el.addEventListener("click", kill, { once: true });
      setTimeout(kill, isReminder ? 15000 : 6000);
    } catch (e) {
      this.warn && this.warn("meeting toast failed", e);
    }
  }

  /**
   * Open (or reuse) the folder window for a meeting's hub and join the live room
   * on its meeting tab. Mirrors the activity-panel "join-meeting" handler so a
   * reminder toast's Join button behaves identically.
   */
  _joinMeetingFromData(data = {}) {
    try {
      const hub_id = data.hub_id;
      if (!hub_id || typeof Wm === "undefined") return;
      const room_id = data.room_id || data.nid;
      const folderNid = data.nid || room_id;
      const open = ((Wm.getItemsByKind && Wm.getItemsByKind("window_folder")) || [])
        .find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
      if (open && typeof open._launchMeetingInPanel === "function") {
        if (open.raise) open.raise();
        open._launchMeetingInPanel();
      } else if (Wm.addWindow) {
        Wm.addWindow({
          kind: "window_folder",
          hub_id,
          nid: folderNid,
          filename: data.title || "",
          activeTab: "meeting",
          room_id,
          room_type: "meeting",
        });
      }
    } catch (e) {
      this.warn && this.warn("_joinMeetingFromData failed", e);
    }
  }

  /**
   *
   */
  dispatchInboundCall(data) {
    let o;
    const currentRoom =
      Wm.getItemsByKind("window_connect")[0] || Wm.getItemsByKind("window_meeting")[0];
    data.nid = data.nid || data.room_id;
    const respawn = {
      kind: "window_connect",
      caller: data,
    };

    if (currentRoom && !currentRoom.isDestroyed()) {
      let room_id = currentRoom.mget(_a.room_id);
      if (room_id && room_id == data.room_id) {
        if (data.type == "conference.join") {
          switch (currentRoom.state) {
            case "dial":
              currentRoom.stateMachine("connect");
              break;
            case _a.invie:
              return;
          }
        }
        return;
      }
      if (
        currentRoom.callee &&
        currentRoom.callee.drumate_id == data.drumate_id
      ) {
        return;
      } // Handled by existing widgetææ
      if (
        data.type == "conference.join" &&
        data.socket_id == Visitor.get(_a.socket_id)
      ) {
        return;
      }

      Kind.waitFor("window_switchcall").then(() => {
        const s = Wm.getItemByKind("window_switchcall");
        if (s && !s.isDestroyed()) return;
        const o = {
          kind: "window_switchcall",
          type: _e.connect,
          currentRoom,
          peerData: data,
          respawn,
        };

        this.addWindow(o);
      });
    } else {
      o = respawn;
      Visitor.playSound();
      if (data.origin && data.origin.uid) {
        const title = LOCALE.X_IS_CALLING_YOU.format(data.origin.firstname);
        const notif = {
          body: LOCALE.INCOMING_CALL || "",
          icon: Visitor.avatar(data.origin.uid),
        };
        if (!window.Notification) return;
        new Notification(title, notif);
      }
      this.addWindow(o);
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  dispatchRoom(data) {
    const currentRoom =
      Wm.getItemsByKind("window_connect")[0] || Wm.getItemsByKind("window_meeting")[0];
    if (!data || !data.room_id) return;
    if (currentRoom && !currentRoom.isDestroyed()) {
      if (currentRoom.mget(_a.hub_id) == data.hub_id) {
        currentRoom.onRemoteDrumateJoined(data);
        return;
      }
      let details = data.details;
      if (details && details.ctime < timestamp() / 1000 - 10) return;
    }

    // Open the folder window on the meeting tab so the callee lands in the
    // same shell the caller sees, rather than a detached window_meeting.
    const { details, uid, username } = data;
    const folderNid = data.nid || (details && (details.nid || details.actual_home_id)) || data.room_id;
    const folderName = (details && details.filename) || data.filename || "";
    const folderArea = (details && details.area) || data.area;
    const respawn = {
      kind: "window_folder",
      hub_id: data.hub_id,
      nid: folderNid,
      filename: folderName,
      area: folderArea,
      activeTab: "meeting",
      room_id: data.room_id,
      room_type: data.room_type,
    };
    let message = LOCALE.FIRST_PARTICIPANTS_ARRIVED;
    let title = `${LOCALE.MEETING}`;
    if (username && details) {
      message = LOCALE.X_HAS_JOINED_MEETING.format(username, details.filename);
      title = `${LOCALE.MEETING} ${details.filename}`;
    }
    let peerData = {
      ...data,
      title,
      message,
    };

    try {
      if (window.Notification) {
        const notif = {
          body: message,
          icon: Visitor.avatar(uid)
        };
        new Notification(title, notif);
      }
    } catch (e) {
      this.warn("Failed to notify", e)
    }
    Kind.waitFor("window_switchcall").then(() => {
      const s = Wm.getItemByKind("window_switchcall");
      if (s && !s.isDestroyed()) return;
      const o = {
        kind: "window_switchcall",
        currentRoom,
        peerData,
        respawn,
      };

      this.addWindow(o);
    });
  }

  /**
   *
   */
  dispatchSignaling(service, data) {
    const currentRoom = Wm.getItemByKind("window_connect");
    if (!currentRoom || currentRoom.isDestroyed()) {
      return;
    }
    let state;
    switch (service) {
      case SERVICE.conference.decline:
        state = "declined";
        break;
      case SERVICE.conference.accept:
        this.verbose("AAA:364", currentRoom, currentRoom.state, _a.invite, data)
        state = "connect";
        if (currentRoom.state == _a.invite || currentRoom.state == 'connect') {
          return;
        }
        break;
      case SERVICE.conference.revoke:
        currentRoom.goodbye();
        return;
    }
    if (currentRoom.stateMachine) {
      currentRoom.stateMachine(state, data);
    }
    return;
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  loadMimicNew(data) {
    if (data.mimicker === Visitor.id) {
      return;
    }
    const success = () => {
      this.postService({
        service: SERVICE.adminpanel.mimic_active,
        orgid: Visitor.get("org_id"),
        mimic_id: data.mimic_id,
        hub_id: Visitor.id,
      });
      return Wm.closeAlert();
    };
    const reject = () => {
      // @todo Need to remove the hard coded org id
      this.postService({
        service: SERVICE.adminpanel.mimic_reject,
        orgid: Visitor.get("org_id"),
        mimic_id: data.mimic_id,
        hub_id: Visitor.id,
      });
      this.warn("ERROR:523 -- loadMimicNew -- Rejected");
      return Wm.closeAlert();
    };
    return Wm.confirm(require("./skeleton/mimic/request")(this, data))
      .then(success)
      .catch(reject);
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  loadMimicReject(data) {
    if (data.mimicker !== Visitor.id) {
      return;
    }
    Wm.alert(require("./skeleton/mimic/decline")(this, data));
  }
}

module.exports = __push_manager;
