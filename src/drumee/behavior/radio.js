const { toggleState } = require("core/utils")
const _clear = 'clear:radio';
class behavior_radio extends Marionette.Behavior {

  constructor(...args) {
    super(...args);
    this._on_message = this._on_message.bind(this);
    this._on_clear = this._on_clear.bind(this);
  }

  /**
   * 
   * @returns 
   */
  onRender() {
    let state;
    this.view.isRadio = 1;
    if (this._channel != null) {
      return;
    }
    if (this.view.mget(_a.state) != null) {
      state = this.view.mget(_a.state);
    } else if (this.view.mget(_a.initialState) != null) {
      state = this.view.mget(_a.initialState);
    }
    this.view.setState(toggleState(state));

    this._channel = this.view.mget(_a.radio);

    switch (this._channel) {
      case _a.on: case _a.parent: case null: case undefined:
        return noOperation();
      default:
        RADIO_BROADCAST.on(this._channel, this._on_message);
        return RADIO_BROADCAST.on(_clear, this._on_clear);
    }
  }

  /**
   * 
   * @returns 
   */
  onDestroy() {
    RADIO_BROADCAST.off(this._channel, this._on_message);
    return RADIO_BROADCAST.off(_clear, this._on_clear);
  }

  /**
   * 
   * @param {*} origin 
   * @returns 
   */
  onChangeRadio(origin) {
    origin = origin || this.view;
    return RADIO_BROADCAST.trigger(this._channel, origin);
  }

  /**
   * 
   * @param {*} origin 
   * @returns 
   */
  onToggle(origin) {
    origin = origin || this.view;
    return RADIO_BROADCAST.trigger(this._channel, origin);
  }

  /**
   * 
   * @param {*} origin 
   * @returns 
   */
  onClearRadio(origin) {
    return RADIO_BROADCAST.trigger(_clear, origin);
  }

  /**
   * 
   * @param {*} origin 
   * @param {*} a 
   * @returns 
   */
  _on_message(origin, a) {
    if ((origin.cid === this.view.cid) || this.view.contains(origin)) {
      this.view.setState(1);
    } else {
      this.view.setState(0);
    }
  }


  /**
   * 
   * @returns 
   */
  _on_clear() {
    return this.view.setState(this.view.mget(_a.initialState));
  }

  /**
   * 
   * @returns 
   */
  onAlsoClick(a) {
    switch (this.view.mget(_a.radio)) {
      case _a.on: case _a.parent: case null: case undefined:
        return this.view.trigger(_a.radio);
      default:
       return RADIO_BROADCAST.trigger(this._channel, this.view);
    }
  }

  /**
   * 
   * @param {*} child 
   * @returns 
   */
  onChildBubble(child) {
    return RADIO_BROADCAST.trigger(this._channel, this.view);
  }

  /**
   * 
   * @param {*} child 
   * @returns 
   */
  onChildRadio(child) {
    if (this.view.mget(_a.level) === _K.level.trigger) {
      return;
    }
    if ((child != null) && (child.mget(_a.level) === _K.level.trigger)) {
      return;
    }

    this.view.triggerMethod(_e.toggle, this.view);
    if ((child == null)) {
      this.view.children.each(function (c) {
        c.setState(1);
        return c.triggerMethod(_e.radio.toggle, _a.off);
      });
      return;
    }

    if (child.children) {
      return child.children.each(function (c) {
        if (c.cid === child.cid) {
          c.setState(1);
        } else {
          c.setState(0);
        }
      });
    }
  }

  /**
   * 
   * @param {*} state 
   * @returns 
   */
  onRadioReset(state) {
    if (state == null) { state = _a.off; }
    this.view.setState(state);
    return this.view.children.each(c => c.setState(state));
  }
}

module.exports = behavior_radio;
