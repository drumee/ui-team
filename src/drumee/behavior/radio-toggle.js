const { toggleState, radioState } = require("core/utils")

class __bhv_radiotoggle extends Marionette.Behavior {
  constructor(...args) {
    super(...args);
    this._on_message = this._on_message.bind(this);
  }

  static initClass() {
    this.prototype.events = { click: '_click' };
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  onBeforeRender(e) {
    this.view.model.atLeast({ state: 0 });
    const state = this.view.model.get(_a.state);
    this.view.model.set(_a.state, toggleState(state));
    this.view.isToggle = 1;
  }


  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    // special signal
    let state;
    this._channel = this.view.model.get(_a.radiotoggle);
    if (this.view.model.get(_a.state) != null) {
      state = this.view.model.get(_a.state);
    } else if (this.view.model.get(_a.initialState) != null) {
      state = this.view.model.get(_a.initialState);
    }
    this.view.model.set(_a.state, toggleState(state));
    this.el.setAttribute(_a.data.state, state);
    this.el.setAttribute(_a.data.radiotoggle, radioState(state));
    switch (this._channel) {
      case _a.on: case _a.parent: case null: case undefined:
        return noOperation();
      default:
        return RADIO_BROADCAST.on(this._channel, this._on_message);
    }
  }

  /**
   * 
   * @returns 
   */
  onDestroy() {
    return RADIO_BROADCAST.off(this._channel, this._on_message);
  }

  /**
   * 
   * @param {*} origin 
   * @returns 
   */
  _on_message(origin) {
    this.debug("radiotoggle _on_message");
    if (((origin != null) && (origin.cid === this.view.cid)) || this.view.contains(origin)) {
      this._toggle(origin);
    } else {
      this.el.setAttribute(_a.data.radiotoggle, _a.off);
      this.el.setAttribute(_a.data.state, _a.off);
      this.el.setAttribute(_a.data.radio, _a.off);
      this.view.model.set(_a.state, 0);
    }
  }

  /**
   * 
   * @returns 
   */
  _click() {
    // special signal
    switch (this.view.get(_a.radiotoggle)) {
      case _a.on: case _a.parent: case null: case undefined:
        this.view.trigger(_a.radio);
        return this.debug("radiotoggle _click _a.on", this.view);
      default:
        RADIO_BROADCAST.trigger(this._channel, this.view);
        return this.debug("radiotoggle _click RADIO_BROADCAST.trigger", this.view);
    }
  }

  /**
   * 
   * @param {*} origin 
   * @returns 
   */
  onRadioToggle(origin) {
    origin = origin || this.view;
    return this._toggle(origin);
  }

  /**
   * 
   * @param {*} child 
   * @returns 
   */
  onChildRadio(child) {
    if (this.view.model.get(_a.level) === _K.level.trigger) {
      return;
    }
    if ((child != null) && (child.model.get(_a.level) === _K.level.trigger)) {
      return;
    }

    if ((child == null)) {
      this.view.children.each(function (c) {
        c.triggerMethod(_e.radiotoggle.toggle, _a.off);
        return c.setState(0);
      });
      return;
    }
    return this.view.children.each(c => {
      if (c.model.cid === child.model.cid) {
        return this._toggle(c);
      } else {
        return c.setState(0);
      }
    });
  }

  /**
   * 
   * @param {*} item 
   * @param {*} a 
   * @returns 
   */
  _toggle(item, a) {
    if (toggleState(item.model.get(_a.state))) {
      item.setState(0);
    } else {
      item.setState(1);
    }
    if (this.view.contains(item)) {
      return this.view.setState(item.mget(_a.state));
    }
  }


  /**
   * 
   * @param {*} state 
   * @returns 
   */
  onRadioSet(state) {
    return this.view.setState(state);
  }

  /**
   * 
   * @param {*} state 
   * @returns 
   */
  onRadioReset(state) {
    if (state == null) { state = _a.off; }
    this.debug("radiotoggle onRadioReset");
    this.view.setState(state);
    if ((this.view.children == null)) {
      return;
    }
    this.view.children.each(c => c.setState(state));
  }
}
__bhv_radiotoggle.initClass();
module.exports = __bhv_radiotoggle;
