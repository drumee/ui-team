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
        return this.toggleCallPanel();

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

  async toggleCallPanel() {
    if (this._callPanelOpening) return;

    const meetingPanel = await this.ensurePart("meeting-panel");
    const splitBody = await this.ensurePart("split-body");

    if (this._callPanel) {
      const panel = this._callPanel;
      this._callPanel = null;
      splitBody.el.removeAttribute("data-call-panel");
      panel.goodbye();
      return;
    }

    this._callPanelOpening = true;
    this._splitBody = splitBody;
    splitBody.el.setAttribute("data-call-panel", "open");
    meetingPanel.feed({
      kind: "widget_meeting",
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid),
      name: this.mget(_a.filename) || this.mget(_a.name),
      area: this.mget(_a.area),
      uiHandler: [this],
      sys_pn: "active-meeting",
      partHandler: this,
    });
  }

  onPartReady(child, pn) {
    switch (pn) {
      case "active-meeting":
        this._callPanelOpening = false;
        this._callPanel = child;
        child.once(_e.destroy, () => {
          if (this._callPanel === child) {
            this._callPanel = null;
            if (this._splitBody) {
              this._splitBody.el.removeAttribute("data-call-panel");
            }
          }
        });
        break;
      default:
        super.onPartReady(child, pn);
    }
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
