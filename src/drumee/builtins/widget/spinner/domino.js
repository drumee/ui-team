/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/builtins/widget/spinner/domino
//   TYPE :
// ==================================================================== *

class __spinner_domino extends Marionette.View {
  static initClass() {
  
    this.prototype.template       = _T.wrapper.raw;
    this.prototype.className      = "artboard";
  }

// ===========================================================
// domino
// ===========================================================

  getTemplate() { return _.template(
    `<div class='domino'> \
<div></div> \
<div></div> \
<div></div> \
<div></div> \
</div>`
  ); }
}
__spinner_domino.initClass();

module.exports = __spinner_domino;
