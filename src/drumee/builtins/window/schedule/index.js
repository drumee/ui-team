//const __webinar_socket = require('./socket');
const __interact = require('window/interact');
const { copyToClipboard } = require("core/utils")

class __window_schedule extends __interact {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    this.service_class = 'conference';
    this.isSchedule = 1;
    super.initialize(opt);
    this.model.atLeast({
      format: _a.slide,
      autostart: false,
      mute: true,
      innerClass: _K.char.empty,
      widgetId: this._id,
      fit: _a.height,
      video: 0,
      audio: 1,
      privilege: _K.privilege.owner
    });
    this._configs = {};
    this.minimizeLocation = {
      left: this.mget(_a.source).$el.offset().left - 20
    }

    this.style.set({
      width: this.size.width,
      height: this.size.height
    });

    this.declareHandlers();
    this.mset({ hub_id: Wm.mget('wicket_id') });
    this.contextmenuSkeleton = 'a';
  }

  /**
   * 
   */
  onDomRefresh() {
    const start = (data) => {
      data.hub_id = this.mget(_a.hub_id) || data.hub_id;
      data.home_id = data.actual_home_id;
      data.nid = data.id;
      this.mset(data);
      this.feed(require('./skeleton/index')(this));
      this.setupInteract();
    }
    if (!this.mget(_a.hub_id)) {
      this.postService(SERVICE.desk.create_wicket, { hub_id: Visitor.id })
        .then((data) => {
          this.debug("AAA:57", data);
          Wm.mset({ wicket_id: data.hub_id });
          start(data);
        });
    } else {
      this.postService(SERVICE.media.attributes, {
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.nid)
      }, { async: 1 })
        .then((data) => {
          this.debug("AAA:63", data);
          start(data);
        });
    }
  }

  /**
   * 
   */
  openSettings(cmd) {
    if (!this.dialogWrapper.isEmpty()) {
      this.dialogWrapper.clear();
      return
    }
    this.dialogWrapper.feed({
      kind: 'schedule_invitation'
    });
  }

  /**
   * 
   * @param {*} args 
   */
  _acknowledge(args) {
    this.insertMedia({ ...args, kind: this._getKind() });
    let opt = {
      kind: 'window_confirm',
      cancel_type: "meeting btn-later",
      confirm_type: "meeting btn-now",
      maxsize: 2,
      cancel: LOCALE.START_LATER,
      confirm: LOCALE.START_NOW,
    };
    this.dialogWrapper.feed(opt).ask(require('./skeleton/acknowledge'))
      .then(() => {
        let content = {};
        try {
          content = JSON.parse(JSON.parse(args.metadata).content);
        } catch (e) {
          this.warn("FAILED ", e, args);
        }

        let opt = {
          kind: "window_meeting",
          attendees: content.content,
          hub_id: args.hub_id,
          nid: args.nid,
          filename: content.title,
          room_id: content.room_id,
          trigger: this.getItemsByAttr(_a.nid, content.room_id)[0],
          area: _a.dmz,
          mode: 'external'
        }
        Wm.launch(opt, { explicit: 1, singleton: 1 });
      })
      .catch((e) => {
        this.warn("CLOSE XX ZEZEZEZE", e);
      });
  }

  /**
   * 
   */
  onRoomReady(data) {
  }

  /**
   * 
   * @param {LetcBox}  cmd 
   * @param {object}  args 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.model.get(_a.service);
    switch (service) {
      case "create-meeting":
        this.dialogWrapper.feed({
          kind: 'schedule_invitation',
          uiHandler: [this],
          service: "invitation-sent",
        });
        break;

      case "invitation-sent":
        args.service = 'open-node';
        this._acknowledge(args);
        break;

      case _e.delete:
        let items = this.__recipientsList.getItemsByAttr(_a.nid, cmd.mget(_a.nid));
        for (var i of items) {
          i.suppres();
        }
        break;

      case _e.start:
        this.startMeeting(cmd);
        break;

      case _e.copy:
        this.copyMeetingURL(cmd);
        break;

      case 'delete-popup':
        this.deleteMeeting(cmd);
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * To start the Meeting 
   * @param {LetcBox}  media 
   */
  startMeeting(media) {
    let md = media.mget(_a.metadata);
    if (_.isString(md)) {
      md = JSON.parse(md);
    }
    let meetingInfo;
    if (_.isString(md.content)) {
      meetingInfo = JSON.parse(md.content)
    } else {
      meetingInfo = md.content;
    }

    let opt = {
      kind: "window_meeting",
      attendees: meetingInfo.attendees,
      hub_id: media.mget(_a.hub_id),
      filename: meetingInfo.title,
      room_id: meetingInfo.room_id,
      trigger: media,
      area: _a.dmz,
      media,
      mode: 'host'
    }
    //this.debug('AAAAA 104', opt);
    Wm.launch(opt, { explicit: 1, singleton: 1 });
    return
  }

  /**
   * to copy Meeting URL
   * @param {LetcBox}  media 
   */
  copyMeetingURL(media) {
    this.postService(SERVICE.room.public_link, {
      hub_id: media.mget(_a.hub_id),
      nid: media.mget(_a.nid)
    }, { async: 1 }).then((data) => {
      copyToClipboard(data.link);
      this.acknowledge()
    })
    return;
  }

  /**
   * to delete Meeting
   * @param {LetcBox}  media 
   */
  deleteMeeting(media) {
    let md = media.mget(_a.metadata);
    if (_.isString(md)) {
      md = JSON.parse(media.mget(_a.metadata));
    }
    const meetingInfo = JSON.parse(md.content)
    const title = meetingInfo.title || ''

    this.__wrapperDialog.feed({
      kind: 'window_confirm',
      title: LOCALE.DELETE,
      message: (title.printf(LOCALE.DELETE_SCHEDULE_INFO)), //'You are about to delete sharebox "{0}".'
      confirm: LOCALE.DELETE, //LOCALE.DELETE_SCHEDULE_INFO
      maxsize: 2,
      confirm_action: 'delete-schedule-info',
    }).ask().then(() => {
      this.postService(SERVICE.room.remove, {
        hub_id: media.mget(_a.hub_id),
        nid: media.mget(_a.nid)
      }).then(() => {
        this.__wrapperDialog.clear()
        media.goodbye();
      })
    });

    return;
  }


  /**
   * 
   * @param {*} data 
   */
  update_attendees(data) {
    this.debug("ATTENDEES", data);
  }


  /**
   * 
   * @param {*} s 
   */
  hasStarted(s) {
    if (s) this.state = _e.started;
    return /(started)|(connected)/.test(this.state);
  }


  /** 
   * handle inbound call (window_connect) while there is already 
   * a conference (window_conference) underway, 
  */
  switchCall(data) {
    //this.__wrapperModal.feed(Skeletons.Note('eQQQQQQQQQQQQee'));
    if (_.isEmpty(data)) {
      //this.__wrapperModal.clear();
      return;
    }
    this.warning(require('./skeleton/inbound')(this, data));
    const a = new Promise((resolve, reject) => {
      // this.__wrapperModal.feed('./skeleton/inbound')(this, data)
      this.onConfirm = resolve;
      this.onCancel = reject;
    });
    return a;
  }



  // ===========================================================
  //
  // ===========================================================
  leave() {
  }


}

__window_schedule.initClass();

module.exports = __window_schedule;

