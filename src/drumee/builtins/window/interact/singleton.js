// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/interact/singleton.coffee
//   TYPE : Component
// ==================================================================== *

const __window_chatInteract = require('./chat');
const { TweenMax } = require("gsap/all");

class __window_interact_singleton extends __window_chatInteract {
  constructor(...args) {
    super(...args);
    this._setSize = this._setSize.bind(this);
    this.change_size = this.change_size.bind(this);
    this.changeWindowSize = this.changeWindowSize.bind(this);
    this._resize = this._resize.bind(this);
    this._resizeAnimation = this._resizeAnimation.bind(this);
    this.instanceUpdated = this.instanceUpdated.bind(this);
    this.sizeUpdated = this.sizeUpdated.bind(this);
    this.updateInstance = this.updateInstance.bind(this);
  }

  static initClass() {
    this.prototype.isSingleton = 1;
  }

  // ===========================================================
  // initialize
  //

  // ===========================================================
  // _setSize
  // ===========================================================
  _setSize(opt = {}) {
    const ww = Wm.$el.width();
    let w = ww;
    let h = Math.max(_K.docViewer.height / 2, window.innerHeight / 1.5);
    if (opt.minHeight && (h < opt.minHeight)) {
      h = opt.minHeight;
    }
    let x = 0;
    if (w > (_K.iconWidth * 7)) {
      x = (w - (_K.iconWidth * 7)) / 2;
      w = _K.iconWidth * 7;
    }
    if (this.style.get(_a.left)) {
      x = this.style.get(_a.left);
    }
    let y = 0;
    if (this.style.get(_a.top) != null) {
      y = this.style.get(_a.top);
    }
    if (this.style.get(_a.width)) {
      w = this.style.get(_a.width);
    }
    if (this.style.get(_a.height)) {
      h = this.style.get(_a.height);
      if (!opt.minHeight) opt.minHeight = h;
    }
    if (w > ww) {
      w = ww - 20;
    }
    if (x > ww) {
      x = ww - w;
    }

    if (y <= 0) {
      y += 90;
    }
    if (Visitor.isMobile()) {
      x = 0;
      y = 0;
      w = window.innerWidth;
      opt.width =  w;
      h = window.innerHeight;
      opt.height = h;
    }
    //this.debug("AAA:82 72 ", opt);
    this.size = {
      left: x,
      top: y,
      height: Math.round(h),
      minHeight: opt.minHeight || (_K.docViewer.height / 2),
      minWidth: opt.minWidth || 300,
      width: opt.width || Math.round(w)
    };
    this.size = { ...this.size, ...opt };
    //this.debug("AAA:82 ", this.size);
    this.style.set(this.size);
  }

  /**
   * 
   * @param {*} cmd 
   */
  onDestroy() {
    if(this.updateNotificationCount){
      RADIO_BROADCAST.off('notification:counts', this.updateNotificationCount.bind(this));
    }
    if (super.onDestroy) super.onDestroy();
  }

  /**
   * 
   */
  bindNotificationCenterEvent() {
    if(this.updateNotificationCount){
      RADIO_BROADCAST.on('notification:counts', this.updateNotificationCount.bind(this));
    }
    // RADIO_BROADCAST.on('notification:counts', this.updateNotificationCount.bind(this));
  }


  // ===========================================================
  // change_size
  // ===========================================================
  change_size(cmd, mode) {
    //@debug "change_size view = #{@_view}", cmd ,@_state
    const ww = Wm.$el.width();

    const actualSize = {
      width: this.$el.width(),
      height: this.$el.height()
    };
    const actualPos = this.$el.position();
    const style = this.style.toJSON();

    let anim = {
      from: { ...actualPos, ...actualSize }
    }

    if (cmd.mget(_a.state) === 1) {
      anim.to = {
        left: 10,
        top: 40,
        width: ww - 10,
        height: window.innerHeight - 60
      };
    } else {
      anim.to = {
        left: style.left || actualPos.left,
        top: style.top || actualPos.top,
        width: style.width || (_K.docViewer.width / 2),
        height: style.height || _K.docViewer.height
      };
    }
    if (anim.to.left < 10) {
      anim.to.left = 10;
    }
    const offset = 40;
    return this._resizeAnimation(anim, offset);
  }

  // ===========================================================
  // setContentSize
  // ===========================================================
  setContentSize() { return null; }

  // ===========================================================
  // Handle content display accordingly to state and width of the UI
  // The state mach data.size x data.action shall decide which container shall 
  // visible 
  // ===========================================================
  responsive(ui, action) {
    let newSize, width;
    if ((this.el == null)) {
      return;
    }
    const oldSize = this.el.dataset.size;
    if ((ui == null)) {
      width = this.$el.width();
    } else if (ui.width) {
      ({
        width
      } = ui);
    } else {
      width = this.$el.width();
    }
    const v = this.getBranch('max-view');

    if (width < 600) {
      newSize = _a.min;
    } else if (width < 850) {
      newSize = _a.medium;
    } else {
      newSize = _a.max;
    }
    this.el.dataset.size = newSize;
    if (newSize !== oldSize) {
      this.changeWindowSize(newSize, oldSize);
    }

    this._view = newSize;
    this.el.dataset.action = action;
    return this.updateInstance();
  }

  /**
   * 
   * @param {*} newSize 
   * @param {*} oldSize 
   * @returns 
   */
  changeWindowSize(newSize, oldSize) {
    let changeSize = 'default';
    if (oldSize) {
      changeSize = `${oldSize}-${newSize}`;
    }
    switch (changeSize) {
      case 'max-medium':
        this.viewInstance = 2;
        break;
      case 'max-min':
        this.viewInstance = 3;
        break;
      case 'medium-min':
        if (this.viewInstance === 1) {
          this.viewInstance = 2;
        } else {
          this.viewInstance = 3;
        }
        break;
      case 'min-medium':
        if (this.viewInstance !== 1) {
          this.viewInstance = 2;
        }
        break;
      case "min-max": case "medium-max": case 'default':
        this.viewInstance = 1;
        if (this.mget(_a.kind) === 'window_supportticket') { // for supporticket two column ux
          this.viewInstance = 2;
        }
        break;

      default:
        this.debug(`changeWindowSize not available - ${changeSize}`);
    }

    return this.sizeUpdated(newSize, oldSize);
  }

  // ===========================================================
  // _resize
  // ===========================================================
  _resize(e, ui, anim) {
    const size = {
      width: ui.size.width,
      height: ui.size.height - 44
    };

    this.size.height = size.height;
    this.size.width = size.width;
    return this.responsive(ui.size, _a.none);
  }

  // ===========================================================
  // _resizeAnimation
  // ===========================================================
  _resizeAnimation(anim, change) {
    //@debug "_resizeAnimation" , @_state , @ , anim, change
    change = change || 0;
    const h = anim.to.height - change;
    if (anim.to.left < 0) {
      anim.to.left = 0;
    }
    const f = () => {
      anim.to.overflow = _a.visible;
      this.size.width = anim.to.width;
      this.size.height = anim.to.height;
      this.responsive(null, _a.none);
      return this.$el.css({
        minWidth: this.size.minWidth
      });
    };

    return TweenMax.to(this.$el, 0.5, {
      width: anim.to.width,
      height: anim.to.height,
      left: anim.to.left,
      top: anim.to.top,
      onComplete: f
    });
  }
  // ===========================================================
  // instanceUpdated - callback to the instence update
  // ===========================================================
  instanceUpdated(instance = null) { return null; }
  // ===========================================================
  // sizeUpdated - callback to the size update 
  // ===========================================================
  sizeUpdated(newSize, oldSize) { return null; }

  // ===========================================================
  // updateInstance - TO SHOW & HIDE THE BACK BUTTON 
  // ===========================================================
  updateInstance(instance = null) {
    this.viewInstance = instance || this.viewInstance || 1;
    this.el.dataset.viewInstance = this.viewInstance;
    if (this.instanceUpdated && _.isFunction(this.instanceUpdated)) {
      this.instanceUpdated(this.viewInstance);
    }

    if (this.getPart('overlay-wrapper') && (this.getPart('overlay-wrapper').el.dataset.mode === _a.open) && this.contactBreadcrumbsContainer) {
      this.contactBreadcrumbsContainer.el.dataset.state = 0;
    }
  }
}
__window_interact_singleton.initClass();

module.exports = __window_interact_singleton; 