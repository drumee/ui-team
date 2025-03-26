const { arcLength } = require("core/utils")
const __progess = require('libs/template/progress');
const { uploadFile } = require("core/socket/upload")
const Loader = new Map();
require('./skin');
class __user_avatar extends DrumeeMFS {

  static initClass() {
    this.prototype.events = {
      drop: 'send',
      dragenter: 'fileDragEnter',
      dragover: 'fileDragOver'
    };
  }

  constructor(...args) {
    super(...args);
    this.uploadFile = uploadFile.bind(this);
  }


  /**
   * 
   * @param {*} e 
   */
  initialize(opt) {
    super.initialize();
    this.model.atLeast({
      flow: _a.y
    });
    this.declareHandlers();
  }

  /**
   * 
   * @param {*} e 
   */
  onDomRefresh() {
    this.el.setAttribute(_a.title, Visitor.name());
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} e 
   */
  onChildBubble() {
    try {
      this.triggerHandlers();
    } catch (error) { }
  }

  /**
   * 
   * @param {*} e 
   */
  reload(refresh) {
    if (this.mget(_a.id) && this.mget(_a.id) !== Visitor.id) return
    if (refresh) {
      this.fetchService(SERVICE.drumate.get_profile, {
        hub_id: Visitor.id
      }).then((d) => {
        Visitor.set(d);
      });
      return
    }

    if (this.$progress != null) {
      this.$progress.remove();
    }
    return this.feed(require('./skeleton')(this));
  }

  /**
   * 
   * @param {*} e 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'ref-image':
        this._image = child;
        this.loadImage();
    }
  }

  /**
   * 
   * @param {*} e 
   */
  fileDragEnter() {
    this.verbose("fileDragEnter", this);
  }


  /**
   * 
   * @param {*} e 
   */
  async loadImage(o) {
    const imageType = this.mget(_a.type) || _a.vignette
    let url = Visitor.avatar(this.mget(_a.id), imageType);
    if (Loader.get(url)) {
      this._defaultImage();
      return;
    }
    this.el.dataset.default = 0;
    this.fetchFile({ url }).then((blob) => {
      if (!/^image/.test(blob.type)) {
        this._defaultImage();
        return;
      }
      let src = URL.createObjectURL(blob)
      this.el.dataset.quality = _a.high;
      this.el.dataset.default = 0;
      this._loaded = true;
      this._image.feed({
        kind: KIND.image.smart,
        src
      });
    }).catch((e) => {
      Loader.set(url, url);
      this._defaultImage();
    });
  }
  /**
   * 
   */
  _defaultImage() {
    this._image.feed(Skeletons.Button.Svg({
      ico: this.mget(_a.icon) || 'desktop_account--white',
      className: `${this.fig.family}__icon`
    })
    );
    this.el.dataset.default = 1;
  }

  /**
   * 
   */
  selectFile() {
    this.__fileselector.open(this.send.bind(this));
  }

  /**
   * 
   * @param {*} e 
   */
  fileDragOver(e) {
    this.verbose("fileDragOver", e);
  }

  /**
   * 
   * @param {*} e 
   */
  send(e) {
    let files;
    try {
      files = e.originalEvent.dataTransfer.items;
    } catch (error) {
      files = e.target.items;
    }
    if ((files == null)) {
      try {
        ({
          files
        } = e.originalEvent.dataTransfer);
      } catch (error1) {
        ({
          files
        } = e.target);
      }
    }
    if (!files || !files[0]) {
      this.warn("No files to uload");
      return;
    }
    const file = files[0];
    if (!/^image/.test(file.type)) {
      Butler.say(LOCALE.ONLY_ACCEPT + " " + LOCALE.IMAGE.toLowerCase());
    }

    this._size = file.type;
    this.$el.append(__progess(this));
    const id = `${this._id}-fg`;
    this.waitElement(id, () => {
      this.$progress = $(`#${id}`);
      const opt = {
        nid: -2,
        hub_id: Visitor.id
      };
      this.uploadFile(file, opt)
    });
  }


  /**
   * 
   * @param {*} e 
   */
  onUploadProgress(e) {
    this.debug("AAA:206", e)
    if (!e.lengthComputable) {
      return;
    }
    const rate = e.loaded / e.total;
    const val = parseInt(100 * rate);
    return (this.$progress != null ? this.$progress.css({
      strokeDashoffset: arcLength(val)
    }) : undefined);
  }


  /**
   * 
   * @param {*} e 
   */
  getCurrentNid(e) {
    if (this.mget(_a.type) === _a.drumate) {
      return -2;
    }
    return -3;
  }

  /**
   * 
   * @param {*} e 
   */
  dbg(e) {
    this.mset(_a.percent, 45);
    this.$el.append(__progess(this));
  }

  /**
   * 
   * @param {*} e 
   */
  onUploadEnd() {
    this.reload(1);
    this.trigger(_e.uploaded);
  }
}

__user_avatar.initClass();

module.exports = __user_avatar;
