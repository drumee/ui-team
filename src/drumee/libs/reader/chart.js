/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/chart
//   TYPE : 
// ==================================================================== *

({
  _templateName() {
    return "<svg class='\pie-chart\'></svg>";
  }
});

//########################################
// Chart.Reader
//########################################
class __chart extends LetcBox {
  static initClass() { //Marionette.View
    this.prototype.templateName = _T.wrapper.raw;
  }

// ===========================================================
// initialize
// ===========================================================

  initialize() {
    return super.initialize();
  }
}
__chart.initClass();

module.exports = __chart;
