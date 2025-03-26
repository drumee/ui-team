/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/calendar/month
//   TYPE : Widjet
// ==================================================================== *

require('./skin');
class __calendar_month extends LetcBox {
  static initClass() {
  
    this.prototype.fig             = 1;
  }

// ===========================================================
// initialize
// ===========================================================

  initialize(opt) {
    super.initialize();
    this.declareHandlers();
    this.monthData  = this.mget(_a.matrix);
    this._additionalModifiers();
    this.calendarUi = this.getHandlers(_a.ui)[0];
    return this.skeleton   = require('./skeleton')(this);
  }

// ===========================================================
// _additionalModifiers
// ===========================================================

  _additionalModifiers() {
    this.$el.addClass(`--${_.lowerCase(this.monthData.name)}`);
    if (this.monthData.isCurrent) {
      this.$el.addClass('--current');
    }
    if (this.monthData.isPast) {
      return this.$el.addClass('--inactive');
    }
  }

// ===========================================================
// onDomRefresh
// ===========================================================
  //
  // onDomRefresh: ->
  //   @append require('./skeleton/daynames')(@)

// ===========================================================
// onPartReady
// ===========================================================

  onPartReady(child, pn) {
    return _dbg("3e", child, pn);
  }
}
__calendar_month.initClass();

module.exports = __calendar_month;
