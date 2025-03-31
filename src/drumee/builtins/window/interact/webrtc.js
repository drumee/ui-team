
const windowCore = require('./index');
const { TweenMax } = require("gsap/all");

class __window_webrtc extends windowCore {


  /**
   * 
   */
  startChat() {
    let opt = {
      kind: "window_channel",
      hub_id: this.mget(_a.hub_id),
      filename: this.mget(_a.filename),
      nid: this.mget(_a.actual_home_id),
      trigger: this.get(_a.trigger),
      area: this.mget(_a.area),
      args: {
        hub_id: this.mget(_a.hub_id),
        nid: this.mget(_a.actual_home_id),
      },
      unique: {
        key: _a.hub_id,
        value: this.mget(_a.hub_id)
      }
    }
    Wm.launch(opt, { explicit: 1, singleton: 1 });
  }


  /**
   * 
   * @param {*} moving 
   */
  seek_insertion(moving) {
    return null;
  }


  /**
   * 
   */
  _setSize(size = {}) {
    //@debug "JSJSJDHDH", @
    let left, top, width;
    let minWidth = size.minWidth || 360;
    let minHeight = size.minHeight || 414;
    let height = size.height || 452;
    this.offset = {
      left: 0,
      top: 0
    };
    if (Visitor.isMobile()) {
      width = window.innerWidth;
      top = 0;
      left = 0;
    } else {
      width = size.width || minWidth;
      left = (window.innerWidth / 2) - (width / 2);
      top = (window.innerHeight / 2) - 100 - (height / 2);
      if (top < 90) top = 90;
      // this.offset = Wm.iconsList.$el.offset();
    }
    if (this.mget(_a.top) != null) {
      top = this.mget(_a.top);
    }
    const maxHeight = size.maxHeight || (window.innerHeight - 100);
    this.size = {
      height,
      left,
      margin: 0,
      top,
      width,
      minWidth,
      minHeight,
      maxHeight,
      ...size
    };
    this.style.set(this.size);
  }

  /**
   * 
   * @param {*} anim 
   */
  _prepareChange(anim) {
    this.newSize = {
      width: anim.width,
      height: anim.height
    };

  }

  /**
   * 
   * @param {*} cmd 
   */
  change_size(cmd, max_size) {
    let anim, state;
    if (_.isInteger(cmd)) {
      this.model.set(_a.value, cmd);
      state = cmd;
    } else {
      this.model.set(_a.value, cmd.mget(_a.value));
      state = cmd.get(_a.state);
    }
    this.upsizing = state;
    this.position = this.position || this.$el.position();
    this.defaultSize = this.defaultSize || {
      width: this.$el.width(),
      height: this.$el.height()
    };
    if (state === 1 || _.isObject(max_size)) {
      anim = max_size || this.max_size();
    } else {
      anim = {
        top: this.position.top,
        left: this.position.left,
        width: this.defaultSize.width,
        height: this.defaultSize.height
      };
      this.playSize = null;
    }

    this._prepareChange(anim);
    anim.onComplete = () => {
      let ui = { size: this.defaultSize };
      this.responsive && this.responsive(this.el.dataset.mode, ui);
      this.setContentSize && this.setContentSize();
    };

    TweenMax.to(this.$el, 0.5, anim);
  }

  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   * @param {*} anim 
   */
  _resize(e, ui, anim) {
    this.responsive(this.el.dataset.mode, ui);
    super._resize(e, ui, anim);
  }

  /**
   * 
   */
  responsive(m, ui) {
    let mode = m || this.el.dataset.mode || "normal";
    this.el.dataset.mode = mode;
    this.__presenter && (this.__presenter.el.dataset.mode = mode);
    this.__endpoints && (this.__endpoints.el.dataset.mode = mode);
    if (this.__participants && !this.__participants.isDestroyed()) {
      setTimeout(() => { this.__participants.responsive(mode, ui) }, 1000);
    }
  }

  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @param {*} section 
   */
  onPartReady(child, pn, section) {
    this.raise();
    switch (pn) {
      case _a.content:
        this.dialogWrapper = child;
        this.setupInteract();
        this.raise();
        this.ratio = this.$el.width() / this.$el.height();
        child.$el.addClass(`${this.fig.group}__singleton`);
        break;


      default:
        super.onPartReady(child, pn, section);
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.trigger(_e.loaded);
    //if(Visitor.isMobile()) this.el.requestFullscreen();
  }
}

module.exports = __window_webrtc;

