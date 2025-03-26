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

require("./skin");
class __calendar_datepicker extends LetcBox {
  static initClass() {
  
    this.prototype.fig             = 1;
  }

// ===========================================================
// initialize
// ===========================================================

  initialize(opt) {
    super.initialize();
    this.declareHandlers();
    this.calendarUi = this.getHandlers(_a.ui)[0];
    this.matrix     = this.calendarUi.gridData.data[Dayjs().month()];
    return this.skeleton   = require('./skeleton')(this);
  }

// ===========================================================
// onPartReady
// ===========================================================

  onPartReady(child, pn) {
    switch (pn) {
      case "pick-a-date":
        return child.$el.on(_e.click, e => {
          return this.showDatePicker(e);
        });
    }
  }

// ===========================================================
// definePosition
// ===========================================================

  definePosition(e) {
    const width  = window.innerWidth;
    const height = window.innerHeight;
    const kX     = 300;
    const kY     = 200;
    const clickX = e.clientX;
    const clickY = e.clientY;

    const position       = [ 0 , 0 ];
    if ((clickX + kX) < width) {
      position[0]  = clickX - kX;
    } else {
      position[0]  = clickX - (2*kX);
    }
    if ((clickY + kY) < height) {
      position[1]  = clickY - kY;
    } else {
      position[1]  = clickY - (2*kY);
    }
    return {
      x            : position[0],
      y            : position[1]
    };
  }

// ===========================================================
// showDatePicker
// ===========================================================

  showDatePicker(e) {
    const position = this.definePosition(e);
    if (!this.__datepickerWrapper) {
      return this.append(require("./skeleton/wrapper")(this, position));
    }
  }
}
__calendar_datepicker.initClass();

module.exports = __calendar_datepicker;
