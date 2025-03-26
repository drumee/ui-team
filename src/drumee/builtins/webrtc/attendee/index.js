require('./skin');

class __webrtc_attendee extends LetcBox {
  constructor(...args) {
    super(...args);
    this.enter = this.enter.bind(this);
    this.update_stream = this.update_stream.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    if (opt == null) { opt = {}; }
    super.initialize();
    this.declareHandlers();
    let uid = (opt.uid || opt.drumate_id || opt.entity_id || opt.id);
    this.mset({ user_id: uid, id: uid, uid });
    this.mset({ service: _a.invite })
  }

  /**
   * 
   */
  onBeforeDestroy() {
    this.unbindEvent(_a.live)
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onStatusChanged(data) {
    this._online = data.status;
    this.mset({ online: data.status });
    this.el.dataset.online = data.status;
    if (this.__ctrlLine) {
      this.__ctrlLine.el.dataset.online = data.status;
      this.__ctrlLine.el.dataset.invite = 0;
    }
  }

  /**
 * 
 */
  getCalleeData() {
    return {
      contact_id: this.mget('contact_id'),
      ctime: this.mget(_a.ctime),
      display: this.mget('display'),
      drumate_id: this.mget('drumate_id'),
      entity_id: this.mget(_a.entity_id),
      firstname: this.mget(_a.firstname),
      is_archived: this.mget('is_archived'),
      is_blocked: this.mget('is_blocked'),
      is_blocked_me: this.mget('is_blocked_me'),
      lastname: this.mget(_a.lastname),
      metadata: this.mget(_a.metadata),
      status: this.mget(_a.status),
    }
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.profile:
        child.on('status_changed', this.onStatusChanged.bind(this));
        this._online = child.mget(_a.online);
        break;
      case "ctrl-line":
        this.onStatusChanged({ status: this._online });
        break;
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    switch (this.mget(_a.role)) {
      case _a.listener:
        this.mset({ roleName: LOCALE.JOINED });
        break;
      case 'presenter':
        this.mset({ roleName: LOCALE.HOST });
        break;
      default:
        if (this.mget(_a.service) == _a.invite) {
          this.mset({ roleName: LOCALE.INVITE });
        }
    }
    const isExist = this.model.collection.models.filter(e => e.attributes.drumate_id === this.mget('uid')).pop();
    const isNoContact = this.mget('status') === "nocontact" ? 1 : 0;
    this.el.dataset.nocontact = isNoContact;
    this.el.dataset.existcontact = isExist ? 1 : 0;
    this.el.dataset.active = 0;
    if (this.mget(_a.role)) {
      this.el.dataset.online = toggleState(this.mget(_a.online));
    } else {
      this.el.dataset.online = 0
    }
    this.feed(require('./skeleton')(this));
    this.el.dataset.stream = _a.none;
    if (this.mget(_a.user_id) == Visitor.id) {
      this.el.dataset.nocontact = 1;
    }

  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  update(data) {
    if (!data.role) return;
    this.mset(data);
    this.onDomRefresh();
  }

  /**
   * 
   */
  enter() {
    this.el.dataset.stream = _a.idle;
  }


  /**
   * 
   * @param {*} stream 
   */
  update_stream(stream) {
    if (stream.getVideoTracks().length) {
      this.el.dataset.stream = _a.video;
    } else if (stream.getAudioTracks().length) {
      this.el.dataset.stream = _a.audio;
    } else {
      this.el.dataset.stream = _a.none;
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  onUiEvent(cmd, args = {}) {
    this.triggerHandlers();
  }

  /**
   * 
   */
  inviteSucceeded() {
    this.mset({ service: "revoke" });
    this.__ctrlLine.setState(1);
    this.__ctrlLine.el.dataset.invite = 1;
  }

  /**
   * 
   */
  inviteCancelled() {
    this.mset({ service: _a.invite });
    this.__ctrlLine.setState(0);
    this.__ctrlLine.el.dataset.invite = 0;
  }

}


module.exports = __webrtc_attendee;
