const { toPercent } = require("core/utils")

const specials = require('assets/special-chars');
const __core = require('./core');

/**
 * Class representing password_meter in the Welcome module.
 * @class __welcome_password_meter
 * @extends __core
*/

class __welcome_password_meter extends __core {
    


  /**
   ** @param {object} opt
  */
  initialize (opt = {}) {
    this.pwMeterScoreLimit = 59;
    return super.initialize(opt);
  }

  /**
   *
  */
  checkSanity () {
    this.pwMeterScoreLimit = 59;
    const v = this._input.getValue();
    this._letters[_.last(v)]=1;
    if (v.length < 1) {
      this._letters = {};
    }

    if (!this.pw_meter) {
      if (v.isEmail()) {
        this.msg(this._buttonLabel, 0);
        return true;
      }
      this._button.el.dataset.state = 0;
      return false; 
    }
    const length = (_.keys(this._letters).length + v.length)/2;

    let r = (50*length)/8;
    this.pw_meter.el.dataset.state = 1;
    for (let c of Array.from(v)) { 
      if (specials.test(c)) {
        r = r + 10;
      }
    }
    if (r > 100) {
      r = 100;
    }

    this.pw_meter.el.style.left = toPercent(r/100);

    if (r > this.pwMeterScoreLimit) {
      this.msg(this._buttonLabel, 0);
      return true;
    }
    
    this._button.el.dataset.state = 0;
    return false;
  }

  /**
   *
  */
  clearError () {
    this.debug('clearError', this);
    if (this._message.isEmpty()) {
      return;
    }
    this._message.clear();
    return this._input.hideError();
  }

  /**
   *
  */
  onChildBubble() {
    return this.clearMessage();
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady (child, pn) {
    switch (pn) { 
      case 'ref-pwm':
        return this.pw_meter = child;
      
      case 'ref-pwm-score-limit':
        this.pw_limit = child;        
        return this.pw_limit.$el.css('left',`calc(${this.pwMeterScoreLimit}% - 4px)`);
      
      default:
        return super.onPartReady(child, pn);
    }
  }
}



module.exports = __welcome_password_meter;
