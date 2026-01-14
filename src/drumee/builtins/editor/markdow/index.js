const __player = require("player/interact");
const { marked } = require("marked");
const { xhRequest } = require("core/socket/request");

const REMINDER_ID = 'reminder_id';


require("./skin");
require("./skin/viewer");
class __editor_markdown extends __player {
  /**
   *
   */
  async initialize(opt = {}) {
    super.initialize(opt);
    const renderer = require("./renderer");
    const { mangle } = require("marked-mangle");
    const { gfmHeadingId } = require("marked-gfm-heading-id");
    marked.use(mangle({ mangle: false }));
    marked.use(gfmHeadingId({
      prefix: this.fig.family + "-"
    }));
    marked.use({ renderer });
    window.onbeforeunload = this.checkUnsavedWork.bind(this);
    if (opt.media) {
      this.copyPropertiesFrom(opt.media)
    } else {
      /** If not source file, default to the owner's */
      this.mset({
        hub_id: Visitor.id,
        pid: Visitor.get(_a.home_id),
        privilege: _K.privilege.owner
      })
    }
    const now = Dayjs().format("DD-MMM-YYYY@HH:MM");
    this.model.atLeast({
      filename: LOCALE.NOTE_ON_DATE_X.format(now),
      hub_id: Visitor.get(_a.id),
    })
    this.target = Wm.getActiveWindow();
  }

  /**
   *
   */
  onBeforeDestroy() {
    window.removeEventListener(
      "beforeunload",
      this.checkUnsavedWork.bind(this)
    );
  }

  /**
   * 
   */
  getCurrentMedia() {
    if (this.target) {
      return {
        pid: this.target.getCurrentNid(),
        hub_id: this.target.mget(_a.hub_id),
      }
    }
    return {
      hub_id: Visitor.id,
      pid: Visitor.get(_a.home_id),
    }
  }


  /**
   *
   */
  checkUnsavedWork() {
    if (this._changed) {
      return LOCALE.CONFIRM_QUIT;
    }
  }

  /**
   * 
   */
  display() {
    this.size = this.max_size();
    super.display(this.size, this.preview.bind(this), { scale: 0.55, opacity: 0 });
  }

  /**
   *
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        this.display({ top: 85 });
        this.setupInteract();
        this.raise();
        this.viewerId = `${this.mget(_a.widgetId)}-viewer`;
        this.editorId = `${this.mget(_a.widgetId)}-editor`;
        child.feed(require('./skeleton/content')(this))
        break;
      case 'pin':
        if (!this.media || this.mget(REMINDER_ID)) return;
        if (!this.media.canOrganize()) return;
        this.waitElement(child.el, () => {
          child.el.dataset.visibility = 1;
        })
        const opt = {
          service: SERVICE.reminder.get,
          nid: this.mget(_a.nid),
          hub_id: this.mget(_a.hub_id),
          reminder_id: this.mget(REMINDER_ID)
        }
        this.postService(opt, { async: 1 }).then((data) => {
          if (data && data.reminder_id) {
            if (_.isString(data.task)) data.task = JSON.parse(data.task);
            // this.mset(data);
            child.setState(1);
          }
        })
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
   * @param {*} url 
   */
  _loadContent(url) {
    xhRequest(url, { responseType: _a.text }).then((content) => {
      this.feed(require("./skeleton")(this));
      this.ensurePart(_a.content).then((p) => {
        p.feed(require('./skeleton/content')(this, content))
      })
    }).catch((e) => {
      this.suppress();
      let msg = e.reason || e.error || LOCALE.INTERNAL_ERROR;
      Wm.alert(msg);
      this.warn("ERR:98", e);
    });
  }
  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    if (this.media) {
      let { url } = this.media.actualNode();
      this.media.wait(0);
      this._loadContent(url)
      return
    }
    if (this.mget(_a.task)) {
      let { nid, hub_id } = this.mget(_a.task)
      this.postService(SERVICE.media.get_node_attr, { nid, hub_id }).then((data) => {
        this.mset(data);
        let { url } = this.actualNode();
        this._loadContent(url)
      })
      return
    }

    this.feed(require("./skeleton")(this));

  }

  /**
   * 
   */
  _saveContent(opt, target) {
    this.postService(opt, { async: 1 }).then((data) => {
      this._changed = 0;
      let [file] = target.getItemsByAttr(_a.nid, data.nid);
      if (!file) {
        const item = {
          kind: target._getKind(),
          filetype: _a.note,
          logicalParent: target,
          ...this.getCurrentMedia(),
          ...data,
        };
        delete item.replace;
        target.insertMedia(item);
        target.scrollToBottom();
        return
      }
      if (file.restart) {
        file.mset(data);
        file.restart("media:modified");
      }
      this.mset(data);
    });
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
   *
   */
  saveContent(content = "", node, ext = 'md') {
    let filetype;
    switch (ext) {
      case 'md':
        filetype = 'markdown';
        break
      case 'html':
      case 'htm':
        filetype = _a.web;
        break;
      default:
        filetype = _a.text;
    }
    let target = this.target;
    let position = 0;
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
      position = this.media.index();
    }
    content = content || this.getData().content || "";
    let a = content.split(' ');

    let filename = this.mget(_a.filename);
    if (a[0]) {
      filename = (a[0] + (a[1] || "")).replace(/[\/<>!\$\*\&\~\#\"\'\`\^]/g, '')
    }
    //let ext = this.mget(_a.ext) || 'note';
    let { hub_id, nid, pid } = node || this.actualNode();
    let replace = 0;
    if (nid) replace = 1;
    let opt = {
      service: SERVICE.media.save,
      hub_id: hub_id || Visitor.get(_a.id),
      nid,
      id: nid,
      replace,
      pid: pid || Visitor.get(_a.home_id),
      filename: `${filename}.${ext}`,
      filetype,
      content,
    };
    if (!replace) opt.position = position;

    if (this.target) {
      opt.pid = this.target.mget(_a.nid);
      opt.hub_id = this.target.mget(_a.hub_id);
      if (!this.target.canUpload()) {
        let msg = `
        You don't have the permission to save the file into to the folder {0}.<br>
        Do you want to save it on you Deck?`
        Wm.confirm(msg.format(this.target.mget(_a.filename))).then((r) => {
          if (r.response == 'confirm') {
            opt.hub_id = Visitor.get(_a.id);
            opt.pid = Visitor.get(_a.home_id);
            this._saveContent(opt, Wm)
          }
        }).catch((e) => { })
      } else {
        this._saveContent(opt, this.target)
      }
    }

  }

  /**
   * 
   */
  saveHtml() {
    let title = this.mget(_a.filename);

    let description = "description";
    let keywords = "keywords";
    let style = require('./template/style.css.txt').default;
    let content = this.__editor.getValue();
    let lines = content.split('\n');
    for (let line of lines) {
      if (/^\#{1,} /.test(line)) {
        title = line.trim().replace(/^\#{1,} /, '');
        break;
      }
    }
    let body = marked.parse(this.__editor.getValue());
    let template = require('./template/index.html.text').default;
    let renderer = _.template(template);
    let stylesheet = this.__styleSrc.getValue() || this.metadata().stylesheet;
    if (stylesheet) {
      stylesheet = `<link rel="stylesheet" href="${stylesheet}" media="screen"></link>`;
    }
    let html = renderer({ stylesheet, title, description, keywords, style, body });
    let ownpath = this.mget(_a.ownpath).replace(/\.(md|html)$/i, '.html');
    this.fetchService(SERVICE.media.get_node_stat, {
      hub_id: this.mget(_a.hub_id),
      nid: ownpath
    }).then((data) => {
      if (data.ownpath == ownpath && data.pid == this.mget(_a.pid)) {
        this.saveContent(html, data, 'html');
      } else {
        delete data.nid;
        delete data.id;
        data.pid = this.mget(_a.pid);
        this.saveContent(html, data, 'html');
      }
    })
  }

  /**
   *
   */
  _updateView() {
    if (!this.__viewerOuter || this.__viewerOuter.isDestroyed()) return;
    let content = this.__content;
    let { width, height } = content.el.getBoundingClientRect();
    if (width <= height) {
      content.el.dataset.axis = _a.y;
      this.__viewerOuter.el.dataset.position = _a.bottom;
    } else {
      content.el.dataset.axis = _a.x;
      this.__viewerOuter.el.dataset.position = _a.right;
    }
  }

  /**
   *
   */
  _resizeStop(e, ui) {
    super._resizeStop(e, ui);
    this._updateView();
  }
  /**
   *
   * @param {*} cmd
   */
  preview(cmd) {
    if (!this.__viewer || this.__viewer.isDestroyed()) return;
    this.__viewer.el.innerHTML = marked.parse(this.__editor.getValue());
    this._updateView();
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
      case "save-html":
        this.saveHtml();
        break;
      case "preview":
        this.preview(cmd);
        break;
      case 'pin-on':
        this.pin(cmd);
        break;
      case "text-input":
        this._changed = 1;
        if (this.timer || !this.__viewer) return;
        this.timer = setTimeout(() => {
          let html = marked.parse(this.__editor.getValue());
          this.__viewer.el.innerHTML = html;
          this.timer = null;
        }, 3000);
        break;
      case _e.close:
        this.goodbye();
        return
      default:
        super.onUiEvent(cmd, args);
    }
  }
}
export default __editor_markdown;
