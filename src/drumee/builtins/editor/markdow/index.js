const __player = require("player/interact");
const { marked } = require("marked");
const { xhRequest } = require("core/socket/request");

require("./skin");
require("./skin/viewer");
class __editor_markdown extends __player {
  /**
   *
   */
  async initialize(opt = {}) {
    this.size = _K.docViewer;
    super.initialize(opt);
    this.size.with = window.innerWidth - 100;
    this.style.set({ width: this.size.with });
    const renderer = require("./renderer");
    const { mangle } = require("marked-mangle");
    const { gfmHeadingId } = require("marked-gfm-heading-id");
    marked.use(mangle({ mangle: false }));
    marked.use(gfmHeadingId({
      prefix: this.fig.family + "-"
    }));
    marked.use({ renderer });
    window.onbeforeunload = this.checkUnsavedWork.bind(this);
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
        if (window.innerWidth < 700) {
          this.el.dataset.column = 1;
        }
        this.display({ top: 85 });
        this.setupInteract();
        this.raise();
        this.viewerId = `${this.mget(_a.widgetId)}-viewer`;
        this.editorId = `${this.mget(_a.widgetId)}-editor`;
        setTimeout(() => {
          child.el.dataset.flow = 'g';
        }, 1000);
        child.el.dataset.column = this.el.dataset.column;
        child.feed(require('./skeleton/content')(this))
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    if (!this.media) {
      this.suppress();
      this.warn("EEE:42 -- Require media reference");
      return;
    }

    let responseType = _a.text;
    this.media.wait(0);
    let { url } = this.media.actualNode();
    this.el.setAttribute(_a.id, this.diagramId);
    xhRequest(url, { responseType }).then((content) => {
      this.content = content;
      this.feed(require("./skeleton")(this));
    }).catch((e) => {
      this.suppress();
      let msg = e.reason || e.error || LOCALE.INTERNAL_ERROR;
      Wm.alert(msg);
      this.warn("ERR:98", e);
    });
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
    let target = Wm.getActiveWindow();
    let position = 0;
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
      position = this.media.index();
    }
    let filename = LOCALE.NOTE;
    if (this.mget(_a.filename)) {
      filename = this.mget(_a.filename);
    } else if (this.media && this.media.mget(_a.filename)) {
      filename = this.media.mget(_a.filename);
    }
    //let ext = this.mget(_a.ext) || 'note';
    let { hub_id, nid, pid } = node;
    let replace = 0;
    if (nid) replace = 1;
    let opt = {
      service: SERVICE.media.save,
      hub_id: hub_id || Visitor.get(_a.id),
      nid: nid,
      id: nid,
      replace,
      pid: pid || Visitor.get(_a.home_id),
      filename: `${filename}.${ext}`,
      filetype,
      content,
    };
    if (!replace) opt.position = position;
    let stylesheet = this.__styleSrc.getValue() || "";
    if (stylesheet) {
      opt.metadata = {
        stylesheet
      }
    }

    this.postService(opt, { async: 1 }).then((data) => {
      this._changed = 0;
      let [file] = target.getItemsByAttr(_a.nid, data.nid);
      if (!file) {
        const item = {
          kind: target._getKind(),
          filetype: _a.note,
          logicalParent: target,
          pid: target.getCurrentNid(),
          hub_id: target.mget(_a.hub_id),
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
        this.saveContent(this.__editor.getValue(), this.actualNode());
        break;
      case "save-html":
        this.saveHtml();
        break;
      case "preview":
        this.preview(cmd);
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
      case "paste-file":
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
        return
      default:
        super.onUiEvent(cmd, args);
    }
  }
}
export default __editor_markdown;
