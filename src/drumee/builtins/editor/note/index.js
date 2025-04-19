/* ============================================================= *
*   Copyright xialia.com  2011-2021
* ============================================================== */

const __player = require('player/interact');
const { xhRequest } = require("core/socket/request");

const REMINDER_ID = 'reminder_id';

class ___editor_note extends __player {
  /**
   * 
   */
  async initialize(opt = {}) {
    require('./skin');
    this.size = _K.docViewer;
    super.initialize(opt);
    const now = Dayjs().format("DD-MMM-YYYY à HH:MM");
    if (opt.maiden) { // Maiden note
      delete opt.maiden;
      this.model.unset('maiden')
      this.mset(({ content: '' }));
      let w = Wm.getActiveWindow();
      this.mset({
        hub_id: Visitor.id,
        pid: w.getCurrentNid(),
        filename: LOCALE.NOTE_ON_DATE_X.format(now),
        ext: 'drumee.html',
        filetype: _a.note
      });
    } else if (opt.media && opt.media.isMfs) { // Open from media
      this.media = opt.media;
    }
    let pin = this.mget('pin');
    if (pin) { // Loaded from Wm
      if (pin.width) this.size.width = pin.width;
      if (pin.height) this.size.height = pin.height - 44;
    } else {
      this.size.width = 590;
      this.size.height = 480;
    }

    this.style.set({ ...this.size, minWidth: 200, minHeight: 200, pin });
    this.isEditor = 1;
    this.isPlayer = 1;
    if (opt.nid && !opt.media) {
      let media = Wm.getItemsByAttr(_a.nid, opt.nid)[0];
      if (media && media.isMfs) this.media = media;
    }

    if (this.media) {
      this.copyPropertiesFrom(this.media);
    }

    window.onbeforeunload = this.checkUnsavedWork.bind(this);
    this.lastActiveWindow = Wm.getActiveWindow();

  }

  /**
   * 
   */
  onBeforeDestroy() {
    window.removeEventListener("beforeunload", this.checkUnsavedWork.bind(this));
    if (this.__textContent && this.__textContent.hasBeenChanged()) {
      this.saveContent(1);
    }
  }

  /**
   * 
   */
  checkUnsavedWork() {
    if (this.__textContent && this.__textContent.hasBeenChanged()) {
      return LOCALE.CONFIRM_QUIT;
    }
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    let opt;
    this.raise();
    switch (pn) {
      case _a.content:
        this.display({ top: 85 });
        this.setupInteract();
        opt = { content: this.mget(_a.content) };
        if (this.mget('html')) {
          delete opt.content;
          opt.html = this.mget('html');
        }
        let tags = _K.allowed_tag;
        tags.push(_K.tag.img);
        this.raise();
        if(this._error){
          child.feed(Skeletons.Note({
            className: `${this.fig.family}__text-content`,
            content : this._error
          }));
        }else{
          child.feed(Skeletons.RichText({
            sys_pn: 'text-content',
            name: _a.content,
            role: 'editor',
            readwrite: 1,
            autofocus: 1,
            service: _e.raise,
            placeholder: LOCALE.NOTE,
            autolink: 1,
            tags,
            className: `${this.fig.family}__text-content`,
            ...opt
          }))  
        }
        //this.debug("AAA:31", child);
        break;
      case 'pin':
        if (!this.media || this.mget(REMINDER_ID)) return;
        if (!this.media.canOrganize()) return;
        this.waitElement(child.el, () => {
          child.el.dataset.visibility = 1;
        })
        opt = {
          service: SERVICE.reminder.get,
          nid: this.mget(_a.nid),
          hub_id: this.mget(_a.hub_id),
          reminder_id: this.mget(REMINDER_ID)
        }
        this.postService(opt, { async: 1 }).then((data) => {
          if (data && data.reminder_id) {
            if (_.isString(data.task)) data.task = JSON.parse(data.task);
            this.mset(data);
            child.setState(1);
          }
        })
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.raise();
    let url = null;
    if (this.media) {
      url = this.media.actualNode().url;
    } else if (this.mget(REMINDER_ID)) {
      url = this.actualNode().url + `&v=${Dayjs().valueOf()}`;
    }
    if (url) {
      xhRequest(url + '&reminder=list', { responseType: _a.text }).then(async (data) => {
        this.mset(({ html: data }));
        let canOrganize = 0;
        if (this.media) {
          if (this.media.wait) this.media.wait(0);
          canOrganize = this.media.canOrganize();
        }
        if (canOrganize) {
          let args = {
            service: SERVICE.reminder.get,
            nid: this.mget(_a.nid),
            hub_id: this.mget(_a.hub_id),
            reminder_id: this.mget(REMINDER_ID)
          }
          let r = await this.postService(args, { async: 1 });
          if (r && r.reminder_id) {
            if (_.isString(r.task)) r.task = JSON.parse(r.task);
            if (r.task && r.task.style) {
              r.pin = r.task.style;
              this.ensurePart('pin').then((p) => {
                p.setState(1);
              })
            }
            this.mset(r);
          }
        }
        this.feed(require('./skeleton')(this));
      }).catch((e) => {
        this.suppress();
        this.warn("Failed to load", url, e);
        let msg = e.reason || e.error || LOCALE.INTERNAL_ERROR;
        Wm.alert(msg);
      })
      return;
    }
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */

  saveContent(close = 0) {
    let target = Wm.getActiveWindow();
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
    } else {
      target = this.lastActiveWindow || target;
    }
    let pid = target.mget(_a.nid) || Visitor.get(_a.home_id);
    let hub_id = target.mget(_a.hub_id) || Visitor.get(_a.id);
    let filename;
    if (this.mget(_a.filename)) {
      filename = this.mget(_a.filename);
    } else if (this.media && this.media.mget(_a.filename)) {
      filename = this.media.mget(_a.filename);
    }
    let nid = this.mget(_a.nid);
    let position = this.mget(_a.position) || 999999;
    let opt = {
      service: SERVICE.media.save,
      hub_id,
      nid: nid || pid,
      pid,
      id: nid,
      position,
      filename: `${filename}.html`,
      filetype: _a.note,
      metadata: {
        dataType: "drumee.note"
      },
      content: this.__textContent.getHTML()
    }
    this.postService(opt, { async: 1 }).then((data) => {
      let [file] = target.getItemsByAttr(_a.nid, data.nid);
      this.__textContent.hasBeenChanged(0);
      if (close) {
        this.goodbye();
      }
      if (!file) {
        const item = {
          kind: target._getKind(),
          metatype: _a.note,
          logicalParent: target,
          pid: target.getCurrentNid(),
          hub_id: target.mget(_a.hub_id),
          ...data,
        };
        delete item.replace;
        target.insertMedia(item);
        target.scrollToBottom();
        file = target.getItemsByAttr(_a.nid, data.nid)[0];
        if (file.isLazyClass) {
          file.once(_a.respawn, (el) => {
            file = target.getItemsByKind(target._getKind()).reverse()[0];
            this.media = file;
          })
        }
        this.mset(data);
        this.media = file;
        return
      }
      if (file.restart) {
        file.mset(data);
        file.restart("media:modified");
        this.media = file;
      }
    });
  }

  /**
   * 
   */
  updateReminder(ui) {
    if (!this.mget(REMINDER_ID)) return;
    this.postService({
      service: SERVICE.reminder.update,
      hub_id: Visitor.id,
      nid: Visitor.get(_a.home_id),
      id: this.mget(REMINDER_ID),
      task: {
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.nid),
        pid: this.mget(_a.parentId),
        style: {
          ...ui.position,
          ...ui.size,
        }
      }
    })
  }
  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _resizeStop(e, ui) {
    super._resizeStop(e, ui);
    this.updateReminder(ui);
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @returns 
   */
  _dragStop(e, ui) {
    super._dragStop(e, ui);
    this.updateReminder(ui);
  }

  /**
   * 
   */
  pin(cmd) {
    this.debug("AAAA:142", this.mget(REMINDER_ID), cmd.mget(_a.state));
    let task = {
      nid: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      repeat: 'onload',
      action: 'open',
      filetype: _a.node,
      kind: this.mget(_a.kind),
      style: {
        ...this.$el.offset(),
        width: this.$el.width(),
        height: this.$el.height(),
      }
    }
    if (cmd.mget(_a.state)) {
      this.postService({ service: SERVICE.reminder.create, hub_id: Visitor.id, task }, { async: 1 }).then((data) => {
        delete data.id;
        this.mset(data);
      })
    } else {
      let id = this.mget(REMINDER_ID);
      this.debug("AAAA:162", id, this.mget(REMINDER_ID), cmd.mget(_a.state));
      if (!id) return;
      this.postService({ service: SERVICE.reminder.remove, hub_id: Visitor.id, id }, { async: 1 }).then((data) => {
        /** */
      })
    }

  }
  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _a.save:
        this.saveContent();
        break;
      case 'pin-on':
        this.pin(cmd);
        break;
      case 'paste-file':
        const reader = new FileReader();
        let img = document.createElement(_K.tag.img);
        reader.onloadend = () => {
          img.setAttribute(_a.src, reader.result);
          this.__textContent.insert({ el: img });
        };
        reader.readAsDataURL(args.file);
        break;
      case _e.close:
        this.goodbye();
      default:
        super.onUiEvent(cmd, args)
    }
  }


}
module.exports = ___editor_note;
