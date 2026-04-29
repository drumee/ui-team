const { TweenLite } = gsap;
const Rectangle = require('rectangle-node');

class __media_grid extends DrumeeMediaInteract {
  constructor(...args) {
    super(...args);
    this.enablePreview = this.enablePreview.bind(this);
    this.initBounds = this.initBounds.bind(this);
    this.setupInteract = this.setupInteract.bind(this);
    this.allowedAction = this.allowedAction.bind(this);
    this.shift = this.shift.bind(this);
    this.resetMotion = this.resetMotion.bind(this);
    this._onStartShifting = this._onStartShifting.bind(this);
    this._onStopShifting = this._onStopShifting.bind(this);
  }


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.type = opt.type || _a.media;
    this.isGrid = 1;
    this.model.atLeast({
      aspect: _a.grid,
      area: _a.personal
    });

    this.cursorPosition = { left: 30, top: 30 };

    this.size = {
      width: 121,
      height: 120
    }
    this.initContainer()
    switch (opt.mode) {
      case _a.vignette:
        return this.innerContent = require('./template/vignette')
      default:
        this.innerContent = require('./template');
    }

  }


  /**
   * 
   */
  initContainer() {
    let filetype = this.mget(_a.filetype);
    let hubs = this.mget("hubs");
    let areas = this.mget("areas");
    let hub = 0;
    this.containsHub = filetype == _a.hub;
    if (!_.isEmpty(hubs)) {
      hub = 1;
      this.containsHub = true;
      this.isHub = 1;
    }

    this.container = [
      Skeletons.Box.X({
        className: `${this.fig.family}__container ${this.mget(_a.filetype)}`,
        sys_pn: _a.content,
        active: 0,
        dataset: {
          hub,
        },
      })
    ]

    if (areas && filetype == _a.folder) {
      this.container.push(
        Skeletons.Element({
          className: `${this.fig.family}__areas`,
          flow: _a.y,
          content: require('./template/folder/areas')(this)
        })
      )
    }

  }

  /**
   * Kebab → unified popup. Invokes the same SDK-bound handler that runs on
   * a real right-click (`el.oncontextmenu`, set by `@drumee/ui-core/letc/
   * addons/letc.js#__handleContextmenu`) so kebab and right-click produce
   * an identical `.drumee-contextmenu` popup. Calling the bound handler as
   * a function bypasses `dispatchEvent('contextmenu')` quirks where
   * synthetic events do not reach property-style handlers.
   *
   * @param {Event} e
   */
  dispatchUiEvent(e) {
    const service = this.el.getService(e);
    if (service === 'context-menu') {
      e.stopPropagation();
      e.preventDefault();
      const trigger = this.el.querySelector('.media-context-menu__trigger')
        || this.el.querySelector('.media-context-menu__folder-trigger');
      const rect = trigger
        ? trigger.getBoundingClientRect()
        : { right: e.clientX, bottom: e.clientY };
      const handler = this.el && this.el.oncontextmenu;
      if (typeof handler === 'function') {
        // Plain object provides every field the SDK's __handleContextmenu
        // reads (`@drumee/ui-core letc/addons/letc.js:355`): pageX/pageY for
        // popup positioning, the three stop* / preventDefault methods, plus
        // shiftKey / ctrlKey for the debug short-circuit.
        handler({
          pageX: rect.right + (window.scrollX || 0),
          pageY: rect.bottom + (window.scrollY || 0),
          clientX: rect.right,
          clientY: rect.bottom,
          target: this.el,
          shiftKey: false,
          ctrlKey: false,
          preventDefault() {},
          stopPropagation() {},
          stopImmediatePropagation() {},
        });
      }
      return;
    }
    super.dispatchUiEvent(e);
  }

  /**
   *
   */
  rowsCount(value) {
    let l = 1;
    if (value && value.length) {
      l = Math.ceil((value.length + 1) / 11);
    } else {
      l = Math.ceil((this.mget(_a.filename).length + 1) / 11);
    }
    if (l > 5) l = 5;
    return l;
  }


  /**
   * 
   * @param {*} toggle 
   */
  enablePreview(toggle) {
    this.$preview = this.$el.find(`#${this._id}-preview`);
    switch (this.model.get(_a.filetype)) {
      case _a.hub:
        if (this.mget(_a.area) === _a.private) {
          this.iconType = _a.vector;
        } else if (this.mget(_a.area) === _a.public) {
          this.iconType = _a.vignette;
        } else if (toggle) {
          this.iconType = _a.vignette;
        }
        break;

      case _a.image:
      case _a.video:
      case _a.vector:
        this.iconType = _a.vignette;
        break;

      default:
        this.iconType = _a.vector;
    }
    this.trigger('media:loaded');
    this.content.el.dataset.icontype = this.iconType;
  }


  /**
   * 
   * @param {*} e 
   * @param {*} ui 
   */
  _dragging(e, ui) {
    if (!this.allowedAction()) {
      return;
    }
    this.selected = {};
    if (this.disabled) {
      return;
    }
    this.rectangle = new Rectangle(
      ui.offset.left, ui.offset.top, ui.helper.width() * 0.7, ui.helper.height() * 0.7
    );
    this.selfOverlapped = this.bbox.intersection(this.rectangle);
    Wm.capture(this);
  }

  /**
   * 
   * @param {*} side 
   */
  shift(side) {
    let x;
    if (this._animIsActive) {
      return;
    }
    switch (side) {
      case _a.left:
        x = -15;
        break;

      case _a.right:
        x = 15;
        break;

      default:
        x = 0;
    }
    this._shiftX = x;
    TweenLite.to(this.$el, .2, {
      x,
      onStart: this._onStartShifting,
      onComplete: this._onStopShifting
    });
    return this;
  }

  /**
   * 
   */
  resetMotion() {
    this.el.dataset.over = _a.off;
    this.el.dataset.hover = _a.off;
    this.shift();
  }

  /**
   * 
   * @param {*} e 
   */
  _onStartShifting(e) {
    this._animIsActive = true;
  }

  /**
   * 
   * @param {*} e 
   */
  _onStopShifting(e) {
    this._animIsActive = false;
    this.initBounds();
  }

  /**
   * 
   */
  dispatchNotifications(data) {
    if (data && data.hub_id != this.mget(_a.hub_id)) return;
    let reset_icon = (d) => {
      if (d && d.hub_id == this.mget(_a.hub_id)) {
        this.setupInteract();
      };
    }
    let change_icon = (icon, name) => {
      let el = document.createElement(_K.tag.div);
      el.innerHTML = require('../template/icon')(this, name, _a.href);
      el.className = `${this.fig.family}__pulse`;
      el.setAttribute(_a.url, data.url);
      icon.replaceWith(el);
      RADIO_BROADCAST.once('room-shutdown', reset_icon);
    }
    switch (data.type) {
      case 'meeting.start':
        let icon = document.getElementById(this._id + '-icon');
        if (icon) {
          change_icon(icon, "drumee_teamroom_enter");
        }
        break;
      case 'meeting.stop':
        reset_icon(data);
        break;
    }
  }

}


module.exports = __media_grid;    
