const mfsInteract = require('window/interact/singleton')
const { copyToClipboard, openUserMailAgent } = require("core/utils")

class __schedule_invitation extends mfsInteract {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.model.atLeast({
      format: _a.slide,
      autostart: false,
      mute: true,
      innerClass: _K.char.empty,
      widgetId: this._id,
      fit: _a.height,
      video: 0,
      audio: 1
    });
    this.service_class = 'conference';
    this._configs = {};
    this.logicalParent = this.getHandlers(_a.ui)[0];
    this.mset({
      nid: this.logicalParent.mget(_a.nodeId),
      hub_id: this.logicalParent.mget(_a.hub_id)
    })
    this.formData = {
      email: []
    };
    this.contextmenuItems = [];
    this.declareHandlers();
  }

  /**
   * 
   */
  addGuest(data) {
    if (!this.__recipientsList) return;
    let opt = {};
    if (data && data.email) {
      opt = data;
      opt.id = _.uniqueId();
    }
    opt.kind = 'schedule_recipient';
    let exists = this.__recipientsList.getItemsByAttr(_a.email, opt.email);
    if (exists[0]) {
      exists[0].anim([0.3, { scale: 0.9, alpha: 0.7 }], [0.3, { scale: 1, alpha: 1 }]);
      return;
    }
    this.__recipientsList.append(opt);
  }

  /**
   * 
   */
  addDrumate(source) {
    let opt = {};
    if (source.model) {
      opt = source.model.toJSON();
    }
    opt.kind = 'schedule_recipient';
    if (!opt.email || !opt.email.isEmail()) {
      if (opt.id && opt.id.isEmail()) {
        opt.email = opt.id;
      } else {
        this.handleError({ error: 1 });
        this.warn("INVALID EMAIL", opt);
        return
      }
    }
    let exists = this.__recipientsList.getItemsByAttr(_a.email, opt.email);
    if (exists[0]) {
      exists[0].anim([0.3, { scale: 0.9, alpha: 0.7 }], [0.3, { scale: 1, alpha: 1 }]);
      return;
    }
    this.__recipientsList.append(opt);
  }

  /**
   * 
   */
  handleError(args) {
    this.debug(`bbaaaa 81 handleError`, args, this);
    if (args.error) {
      this.__wrapperError.feed(
        Skeletons.Note(LOCALE.INVALID_EMAIL_FORMAT, `${this.fig.family}__error`)
      );
    } else {
      this.__wrapperError.clear();
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    Kind.waitFor('schedule_recipient').then(() => {
      this.feed(require('./skeleton/index')(this));
      this.setupInteract();
    });
  }

  /** 
   * 
  */
  onAddUser() {

  }

  /** */
  onDeleteUser(cmd) {

  }

  /**
   * 
   */
  async copyLink() {
    let opt = {
      ...this.getData(),
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      permission: _K.privilege.modify
    }
    let room = await this.postService(SERVICE.room.book, opt);
    room.kind = Wm._getKind();
    let { link } = await this.postService(SERVICE.room.public_link, room);
    copyToClipboard(link);
    this.logicalParent.acknowledge(LOCALE.URL_COPIED);
    this.logicalParent.addMedia(room)
    setTimeout(() => {
      this.goodbye();
    }, 2000);
  }

  /**
   * 
   */
  async sendInvitation() {
    let data = this.getData();
    data.nid = this.mget(_a.nid);
    data.hub_id = this.mget(_a.hub_id);
    data.permission = _K.privilege.modify;
    let opt = await this.postService(SERVICE.room.book, data)
    opt.service = "invitation-sent";
    this.triggerHandlers(opt);
    let msg = {};
    let { metadata } = opt;
    if (_.isString(metadata)) {
      let { content } = JSON.parse(metadata);
      if (_.isString(content)) {
        let { date, message, title } = JSON.parse(content);
        msg = { date, message, title };
      } else {
        msg = content
      }
    } else if (metadata && metadata.content && metadata.content.title) {
      msg = metadata.content;
    }
    data = await this.postService(SERVICE.room.public_link, {
      hub_id: opt.hub_id,
      nid: opt.nid
    }, { async: 1 });
    let subject = msg.title || LOCALE.MEETING_WITH_X.format(Visitor.fullname());
    let body = msg.message || LOCALE.X_INVITE_YOU_MEETING.format(Visitor.fullname());
    if (msg.date) {
      body = LOCALE.WHEN + ': ' + msg.date + '\n' + body;
    }

    body = body + '\n' + LOCALE.ACCESS_LINK + '\n\n' + data.link + '\n\n';
    openUserMailAgent({ subject, body });
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.model.get(_a.service);
    if (!args.no_raise) this.raise(cmd);
    switch (service) {
      case _a.update:
        return;

      case _e.found:
        break;

      case "add-item":
        return this.addDrumate(args.item);

      case "add-guest":
        return this.addGuest(args);

      case "add-selection":
        if (!_.isArray(args.items)) return;
        for (var item of args.items) {
          this.addDrumate(item);
        }
        break;

      case _e.send:
        this.sendInvitation();
        break;

      case 'copy-link':
        this.copyLink();
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  setupInteract() {
    //abstract
    return
  }


  update_attendees(data) {
    this.debug("ATTENDEES", data);
  }


}


module.exports = __schedule_invitation;
