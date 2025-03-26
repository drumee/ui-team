
class __slidebar extends Marionette.View {
  constructor(...args) {
    super(...args);
    this._start = this._start.bind(this);
    this._getValue = this._getValue.bind(this);
    this._triggerUpdate = this._triggerUpdate.bind(this);
    this._triggerChange = this._triggerChange.bind(this);
    this._triggerStart = this._triggerStart.bind(this);
    this._triggerEnd = this._triggerEnd.bind(this);
    this._channelEvent = this._channelEvent.bind(this);
    this._trigger = this._trigger.bind(this);
  }

  static initClass() {  //Marionette.View
    this.prototype.templateName = "#--slidebar-noui";
    this.prototype.className = `${_a.widget} no-ui-slidebar`;
  }


  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      axis: 'x',
      innerClass: '',
      label: _K.char.empty,
      placeholder: "font-size",
      min: 0,
      max: 100,
      start: 50
    });
    this._id = _.uniqueId('slidebar-');
    this.model.set(_a.widgetId, this._id);
    this._forceTrigger = 1;
    this._onStart = [];
    this._vendorOpt = {
      start: [this.model.get(_a.start)], // 4 handles, starting at...
      margin: 300, // Handles must be at least 300 apart
      connect: [false, true], // Display a colored bar between the handles
      direction: 'rtl', // Put '0' at the bottom/right of the slider
      orientation: 'vertical', // Orient the slider vertically
      behaviour: 'tap-drag', // Move handle on tap, bar is draggable
      format: wNumb({ decimals: 0 }),
      range: {
        min: this.model.get(_a.min),
        max: this.model.get(_a.max)
      },
      ...this.model.get(_a.vendorOpt)
    };
    if (__guard__(this.model.get(_a.range), x => x.min) != null) {
      this.model.set(_a.min, __guard__(this.model.get(_a.range), x1 => x1.min));
    }
    if (__guard__(this.model.get(_a.range), x2 => x2.min) != null) {
      this.model.set(_a.min, __guard__(this.model.get(_a.range), x3 => x3.min));
    }
    this._min = this._vendorOpt.range.min;
    this.model.set(_a.min, this._min);
    this._max = this._vendorOpt.range.max;
    this.model.set(_a.max, this._max);
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.el.onclick = e => {
      e.stopImmediatePropagation();
      e.stopPropagation();
      return true;
    };
    return require.ensure(['nouislider'], () => {
      window.noUiSlider = require('nouislider');
      this._start()
    });

  }

  /**
   * 
   * @param {*} color 
   * @returns 
   */
  setBaseBackground(color) {
    const f = () => {
      const el = this._slider.getElementsByClassName('noUi-base');
      return el[0].style.background = color;
    };
    if (!this._started) {
      this._onStart.push(f);
      return;
    }
    return f();
  }

  /**
   * 
   * @param {*} value 
   * @returns 
   */
  set(value) {
    const f = () => {
      return this._slider.noUiSlider.set(value);
    };
    if (!this._started) {
      this._onStart.push(f);
      return;
    }
    return f();
  }

  /**
   * 
   * @param {*} value 
   * @returns 
   */
  display(value) {
    if (!this._started) {
      return;
    }
    this._slider.noUiSlider.set(value);
    return this._ready = true;
  }

  /**
   * 
   * @returns 
   */
  _start() {
    this._slider = document.getElementById(this._id);
    const go = () => {
      if (this.model.get(_a.axis) === 'x') {
        this._slider.style.width = Utils.px(this.$el.width());
        this._vendorOpt.orientation = 'horizontal';
      } else {
        this._slider.style.height = Utils.px(this.$el.height());
        this._vendorOpt.orientation = 'vertical';
      }
      noUiSlider.create(this._slider, this._vendorOpt);
      this._slider.noUiSlider.on(_e.start, this._triggerStart);
      this._slider.noUiSlider.on(_e.slide, this._triggerUpdate);
      this._slider.noUiSlider.on(_e.end, this._triggerEnd);
      for (var f of Array.from(this._onStart)) {
        f();
      }
      return this._started = true;
    };
    this.waitElement(this._slider, go);
  }

  /**
   * 
   * @param {*} values 
   * @param {*} handle 
   * @returns 
   */
  _getValue(values, handle) {
    let val = values[handle];
    if (!this._started) {
      return;
    }
    if ((parseFloat(values[handle]) >= this._max) && this.model.get(_a.allowExceed)) {
      val = this._max;
    }
    if ((parseFloat(values[handle]) <= this._min) && this.model.get(_a.allowExceed)) {
      val = this._min;
    }
    return val;
  }

  /**
   * 
   * @param {*} values 
   * @param {*} handle 
   * @returns 
   */
  _triggerUpdate(values, handle) {
    const val = this._getValue(values, handle); //values[handle]
    this.model.set(_a.value, val);
    if (!this.triggerHandlers(null, true)) {
      return this.trigger(_a.update, values[handle]);
    }
  }

  /**
   * 
   * @param {*} values 
   * @param {*} handle 
   */
  _triggerChange(values, handle) { }


  /**
   * 
   * @param {*} values 
   * @param {*} handle 
   * @returns 
   */
  _triggerStart(values, handle) {
    this.status = _e.start;
    try {
      return (this._handler != null ? this._handler.ui.triggerMethod(_e.slideStart, this) : undefined);
    } catch (error) { }
  }


  /**
   * 
   * @param {*} values 
   * @param {*} handle 
   * @returns 
   */
  _triggerEnd(values, handle) {
    this.status = _e.end;
    const val = this._getValue(values, handle);
    this.model.set(_a.value, val);
    this.triggerHandlers()
  }


  _channelEvent(data) {
    let val = data[this.model.get(_a.name)];
    try {
      val = parseFloat(val);
      this.ui.entry.val(val);
      const x = (((val - this._min) / (this._max - this._min)) * this._length) - this._min;
      const fill = x + (this._handleWidth * 0.5);
      if (this.ui.level.length) {
        this.ui.level.width(fill.px());
        return this.ui.handle.css({ left: x.px() });
      }
    } catch (e) {
      return _c.error(e);
    }
  }


  _trigger() {
    if (this.model.get(_a.value) === this._init) {
      return;
    }
    const signal = this.model.get(_a.signal) || _e.update;
    const ui = this._handler.ui || this.parent._handler.ui;
    if ((ui != null) && signal) {
      return ui.triggerMethod(signal, this);
    }
  }
}
__slidebar.initClass();

module.exports = __slidebar;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}