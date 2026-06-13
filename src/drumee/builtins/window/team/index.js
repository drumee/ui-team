const __hub = require('../hub');
class __window_team extends __hub {

  /**
   * @param {*} opt 
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.isHub = 1;
    this.style.set({
      margin: 0,
      width: this.size.width,
      height: this.size.height
    });
    this.model.atLeast({
      new_chat: 0,
    })
    if (!Visitor.isMobile()) {
      this.style.atLeast({
        top: 90,
        left: window.innerWidth / 2 - this.size.width / 2
      })
    } else {
      this.style.atLeast({
        top: 0,
        left: 0
      })
    }
    // this.bindActivityHandlerEvent();
    this.defaultSkeleton = require("./skeleton");
    this.settingsLabel = LOCALE.PROJECT_ROOM_MANAGER;
  }

  /**
   * 
   * @param {Letc} cmd 
  */
  // onDestroy(cmd) {
  //   RADIO_BROADCAST.off('notification:details', this.updateNotificationCount.bind(this));
  // }

  /**
   * @param {*} c
  */
  updateCount(c) {
    if (!this.__newMessage) {
      _.delay(() => {
        this.updateCount(c)
      }, 2000)

    } else {
      if (parseInt(c) > 9) {
        this.__newMessage.set({ content: "9+" });
      } else if (parseInt(c) > 0) {
        this.__newMessage.set({ content: c });
      } else {
        this.__newMessage.set({ content: '' });
      }
      this.__newMessage.el.dataset.count = c;
    }
  }

  /**
   * @param {*} opt
   */
  notify(opt = {}) {
    /* Do not remove */
  }

  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {

      case "webinar": 
      case "meeting": 
      case "channel":
        opt = {
          kind: `window_${service}`,
          hub_id: this.mget(_a.hub_id),
          filename: this.mget(_a.filename),
          nid: this.mget(_a.actual_home_id),
          trigger: this.get(_a.media) || this,
          media: this.get(_a.media) || this,
          service: service,
          wm_unique_id: `window_${service}-${this.mget(_a.hub_id)}`,
          ...args
        }
        let launchSetting = { explicit: 1, singleton: 1 };
        if (service == "channel") {
          launchSetting.unique = { key: 'wm_unique_id', value: opt.wm_unique_id };
        }
        return Wm.launch(opt, launchSetting);

      case SERVICE.desk.leave_hub:
        return this.goodbye();

      case _e.settings:
        return this.openSettings();

      case "open-call-panel":
      case "start-meeting":
        return this.startTeamCall();

      case "change-owner":
        var opt = require('../hub/skeleton/change-owner')(this, args);
        this.mset({ confirm_type: 'primary' });
        return this.confirm(opt).then(() => {
          this.postService({
            service: SERVICE.hub.change_owner,
            id: args.uid,
            hub_id: this.mget(_a.hub_id)
          }).then(() => {
            args.trigger.goodbye();
          }).catch(() => {
          });
        }).catch(() => {
        });
      default:
        return super.onUiEvent(cmd, args);
    }
  }

  /**
   * Launch the native team call as its own top-level window so it gets the
   * full screen real-estate instead of a cramped side panel. window_meeting
   * already renders standalone chrome (header/resizable) and honors the
   * _meeting_standalone flag for default sizing. A singleton guard prevents
   * a second concurrent call — we just refocus the running one.
   */
  startTeamCall() {
    const existing =
      Wm.getItemByKind("window_meeting") || Wm.getItemByKind("window_connect");
    if (existing && !existing.isDestroyed()) {
      if (typeof existing.raise === "function") existing.raise();
      return Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
    }
    const room_id = this.mget(_a.nid) || this.mget(_a.actual_home_id);

    // Center a free-floating popup via an explicit `style` so it floats
    // correctly instead of docking to the team window. Center within the WM
    // content area (right of the sidebar), not the raw viewport — see
    // Wm.centeredPopupGeometry.
    const { top, left, width, height } = Wm.centeredPopupGeometry();

    return Wm.launch(
      {
        kind: "window_meeting",
        hub_id: this.mget(_a.hub_id),
        nid: room_id,
        room_id,
        // Forward the team window's chat-channel identity so the meeting chat
        // binds to the same conversation as the team window (sync in/out).
        // chat_nid is the chat's scope nid (this window's own nid).
        actual_hub_id: this.mget(_a.actual_hub_id),
        actual_home_id: this.mget(_a.actual_home_id),
        chat_nid: this.mget(_a.nid),
        home_id: this.mget(_a.home_id),
        ownpath: this.mget(_a.ownpath),
        filename: this.mget(_a.filename) || this.mget(_a.name),
        area: this.mget(_a.area),
        audio: 1,
        video: 1,
        standalone: 1,
        wm_unique_id: `window_meeting-${this.mget(_a.hub_id)}`,
        style: { top, left, width, height, minWidth: 480, minHeight: 420, margin: 0 },
      },
      { explicit: 1, singleton: 1 },
    );
  }


  /**
   * 
   */
  // bindActivityHandlerEvent() {
  //   RADIO_BROADCAST.on('notification:details', this.updateNotificationCount.bind(this));
  // }

  /**
   * 
   */
  // updateNotificationCount(args) {
  //   let data = args[this.mget(_a.hub_id)];
  //   if (!data || !data.content || !data.content.teamchat) return;
  //   let { cnt } = data.content.teamchat;
  //   if (cnt === null) return
  //   this.mset('notificationCount', cnt)
  //   this.updateCount(cnt);
  // }

  /**
   * @param {String} method
   * @param {Object} data
   * @param {Object} socket
   */
  __dispatchRest(method, data) {
    switch (method) {
      case SERVICE.media.make_dir_special:
        return;

      case SERVICE.media.count_new:
        return this.updateCount(data.new_chat);

      default:
        return super.__dispatchRest(method, data);
    }
  }
}

module.exports = __window_team;
