const WS_EVENT = "ws:event";

const { timestamp } = require("core/utils")
const winman = require("window/manager");

class __push_manager extends winman {

  constructor(...args) {
    super(...args);
    this.dispatchInboundCall = this.dispatchInboundCall.bind(this);
    this.dispatchRoom = this.dispatchRoom.bind(this);
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

      case SERVICE.conference.update:
      case SERVICE.conference.broadcast:
        return;

      case SERVICE.signaling.notify:
        return;

      case SERVICE.signaling.message:
        if (/pickup|cancel|reject/.test(data.type)) Visitor.muteSound();
        return


      case SERVICE.adminpanel.mimic_new:
        return this.loadMimicNew(data);

      case SERVICE.adminpanel.mimic_reject:
        return this.loadMimicReject(data);

      case SERVICE.adminpanel.mimic_active:
      case SERVICE.adminpanel.mimic_end_bymimic:
      case SERVICE.adminpanel.mimic_end_byuser:
      case SERVICE.adminpanel.mimic_end_bytime:
        _.delay(() => location.reload());
        break;

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

      case "user.connection_status":
        this.myContactsStatus.set(data.user_id, data);
        this.trigger(options.service, data);
        break;

      case "subscription.paid":
      case "subscription.failed":
        if (!_.isEmpty(data.subscription_id)) {
          return Desk.checkForPaymentStatus({
            subscription_id: data.subscription_id,
          });
        }

      case "subscription.deleted":
        return Desk.checkForSubscriptionStatus({ status: _a.deleted });

      default:
        this.trigger(WS_EVENT, { service, data, options })
    }
  }

  /**
   * 
   */
  dispatchInboundCall(data) {
    let o;
    const currentRoom =
      Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting");
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
      Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting");
    if (!data || !data.room_id) return;
    if (currentRoom && !currentRoom.isDestroyed()) {
      if (currentRoom.mget(_a.hub_id) == data.hub_id) {
        currentRoom.onRemoteDrumateJoined(data);
        if (_.isEmpty(data.details)) return;
      }
      let details = data.details;
      if (details && details.ctime < timestamp() / 1000 - 10) return;
    }

    const respawn = {
      ...data,
      kind: "window_meeting",
    };
    let { details, uid, username } = data;
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
      const notif = {
        body: message,
        icon: Visitor.avatar(uid)
      };
      if (!window.Notification) return;
      new Notification(title, notif);
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
        if (currentRoom.state == _a.invite) {
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
