/* =========================================================== *
*   Copyright Xialia.com  2011-2021
*   FILE : /src/drumee/builtins/player/schedule/index.js
*   TYPE : Component
* ============================================================ */

const { TweenMax, Expo } = require("gsap/all");
const { copyToClipboard, fitBoxes } = require("core/utils")

const __core = require('player/interact');
class ___player_schedule extends __core {
  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    let { content } = this.metadata()
    let attr;
    if (_.isString(content)) {
      attr = JSON.parse(content);
    }
    this.mset({
      ...attr,
      resizable: _a.disable
    });
    this.size = _K.docViewer;
    this.style.set({ ...this.size, minWidth: 462, minHeight: 420 });
    this.ack = require('./skeleton/acknowledge')(this);
    this.notificationMode = _a.readonly;
    this.contextmenuItems = [_a.link];
  }

  /**
   * 
   */
  start() {
    this.display({ top: 85 });
    this.setupInteract();
    this.media.wait(0);
  }
  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case 'edit-date':
        return this.refreshDatewidget(true);
      case 'save-date':
        return this.saveDate();

      case 'edit-message':
        return this.refreshMessagewidget(true);
      case 'save-message':
        return this.saveMessage();

      case 'edit-attendees':
        return this.refreshAttendeeswidget(_a.edit);
      case 'cancel-edit-attendees':
        return this.refreshAttendeeswidget();
      case 'save-attendees':
        return this.saveAttendees();

      case 'delete-popup':
        const title = this.mget(_a.title) || this.mget(_a.filename);
        this.__wrapperDialog.feed({
          kind: 'window_confirm',
          title: LOCALE.DELETE,
          maxsize: 2,
          message: (title.printf(LOCALE.DELETE_SCHEDULE_INFO)),
          confirm: LOCALE.DELETE,
          confirm_action: 'delete-schedule-info',
        }).ask().then(this.deleteShareRoom.bind(this));

        return;

      case _e.delete:

        break;

      case _e.copy:
        this.postService(SERVICE.room.public_link, {
          hub_id: this.mget(_a.hub_id),
          nid: this.mget(_a.nid)
        }).then((data) => {
          copyToClipboard(data.link);
          this.__footer.feed(require('./skeleton/acknowledge')(this));
          const f = () => {
            this.__footer.clear()
          }
          _.delay(f, Visitor.timeout(3000));
        })
        break;

      case _e.start:
        this.suppress();
        let opt = {
          kind: "window_meeting",
          attendees: this.get(_a.attendees),
          hub_id: this.get(_a.hub_id),
          filename: this.get(_a.title) || this.mget(_a.filename),
          room_id: this.get(_a.room_id),
          trigger: this.get(_a.trigger),
          area: _a.dmz,
          media: this.media,
          mode: 'host',
        }
        this.debug('AAAAA 104', opt);
        Wm.launch(opt, { explicit: 1, singleton: 1 });
        let window_schedule = Wm.getItemByKind("window_schedule");
        if (window_schedule)
          window_schedule.goodbye();
        break;
      default:
        super.onUiEvent(cmd, args)
    }
  }

  refreshDatewidget(dateEditMode = false) {
    this._dateEditMode = dateEditMode;
    return this.__dateWrapper.feed(require('./skeleton/date')(this));
  }

  refreshMessagewidget(descEditMode = false) {
    this._descEditMode = descEditMode;
    return this.__descriptionWrapper.feed(require('./skeleton/description')(this));
  }

  refreshAttendeeswidget(attendeesEditMode = _a.readonly) {
    this._attendeesMode = attendeesEditMode;
    return this.__attendeesWrapper.feed(require('./skeleton/attendees')(this));
  }


  saveDate() {
    let formData = this.getData(_a.formItem)
    let apiData = {
      service: SERVICE.room.update || 'room.update',
      date: formData.date,
      nid: this.mget(_a.nid),
      flag: "when",
      hub_id: this.mget(_a.hub_id)
    }
    this.fetchService(apiData).then((data) => {
      this.mset(_a.date, formData.date)
      this.updateCurrentMedia(data)
      this.refreshDatewidget()
    });

  }

  saveMessage() {
    let formData = this.getData(_a.formItem)
    let apiData = {
      service: SERVICE.room.update || 'room.update',
      message: formData.message,
      nid: this.mget(_a.nid),
      flag: "agenda",
      hub_id: this.mget(_a.hub_id)
    }
    this.fetchService(apiData).then((data) => {
      this.mset(_a.message, formData.message)
      this.updateCurrentMedia(data)
      this.refreshMessagewidget()
    });

  }

  /**
   * 
   */
  saveAttendees() {
    let widgetEmail = this.getItemsByKind('widget_simple_invitation')[0]
    if (widgetEmail.submitEmail()) {
      // let newList = widgetEmail.getMembersList().map(row=>row.email);
      let emails = widgetEmail.getMembersList();

      let attendees = [];
      emails.forEach((c) => {
        attendees.push({
          email: c.email,
          name: c.surname || c.email,
          id: c.id,
        });
      });

      let apiData = {
        service: SERVICE.room.update || 'room.update',
        attendees: attendees,
        nid: this.mget(_a.nid),
        flag: "member",
        hub_id: this.mget(_a.hub_id)
      }
      this.fetchService(apiData).then((data) => {
        let widgetEmail = this.getItemsByKind('widget_simple_invitation')[0];
        this.mset(_a.attendees, attendees)
        this.updateCurrentMedia(data)
        this.refreshAttendeeswidget()
      });
    }
  }

  /**
   * 
   * @param {*} data 
   */
  updateCurrentMedia(data) {
    let metadata = JSON.parse(this.mget(_a.media).mget(_a.metadata))
    let content = JSON.stringify(data)
    metadata.content = content;
    this.mget(_a.media).mset(_a.metadata, JSON.stringify(metadata))
  }

  /**
   * 
   * @param {*} data 
   */
  updateCurrentMediaByKey(data) {
    let metadata = JSON.parse(this.mget(_a.media).mget('metadata'))
    let content = JSON.parse(metadata.content)
  }


  /**
   * 
   */
  deleteShareRoom() {
    this.postService(SERVICE.room.remove, {
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid)
    }).then(() => {
      this.media.goodbye();
      this.goodbye();
    })
  }

  /**
   * 
   */
  memberDetails() {
    //ret
    // this.postService({
    //   service: SERVICE.room.get_meeting_members,
    //   nid: this.mget('nid'),
    //   hub_id: this.mget(_a.media).mget(_a.hub_id)
    // }).then((data) => {
    //   this.memberData = data;
    //   this.feed(require('./skeleton')(this));
    // })
  }
  // ===========================================================
  // 
  // ===========================================================
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        child.on(_e.show, () => {
          this.start(this.media)
        });
        break;
      default:
        super.onPartReady(child, pn);
    }
  }
  /**
   * @param {any} size
   * @param {Function} cb
  */
  display(size, cb) {
    this.debug('AAA:19 250 display size', size, this)

    this.raise();
    let o = require("window/configs/default")();
    let s = fitBoxes(this.size, size);
    let height = s.height;
    let shiftX = this.mget('shiftX') || 0;

    const max_height = window.innerHeight - o.offsetY - 2 * o.marginY;
    const max_width = window.innerWidth - 2 * o.marginX;

    if (height > max_height) {
      s.width = s.width * max_height / height;
      height = max_height;
      dy = 0;
    } else if (s.width > max_width) {
      height = height * max_width / s.width;
      s.width = max_width;
    }
    const x = (((max_width - s.width) / 2) - Wm.$el.offset().left) + this._lastX;
    const f = () => {
      this.$el.width(s.width);
      this.$el.height(height);
      if (_.isFunction(cb)) cb(this);
    };
    let pos;
    if (Visitor.isMobile()) {
      pos = { left: 0, top: -o.offsetY };
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      pos = {
        top: this.offset.top,
        left: x + shiftX + 20,
      }
    }

    this.debug("AAA:441", this, `max_height=${max_height}, max_width=${max_width}`, o, s.width);
    TweenMax.fromTo(this.$el, 1.5,
      { scale: 0.15, opacity: 0 },
      {
        width: s.width,
        height: height,
        scale: 1,
        opacity: 1,
        ease: Expo.easeInOut,
        ...pos,
        onComplete: f
      }
    );
  }

  /* ===========================================================
   *
   * ===========================================================*/
  __dispatchPush(service, data, socket) {
    switch (service) {
      case SERVICE.no_service:
        this.debug("Created by kind builder", service, data)
    }
  }

}

module.exports = ___player_schedule
