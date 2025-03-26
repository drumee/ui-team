/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/resource-bar
//   TYPE : 
// ==================================================================== *
//Filesize = require('filesize');

class __resource_bar extends Marionette.View {
  static initClass() {
    this.prototype.templateName = "#--sys-user-memory";
    this.prototype.className = "widget user-memory";
  }

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    if ((this.model == null)) {
      this.model = new Backbone.Model();
    }
    const used  = Visitor.get('disk') || 0;
    const limit = Visitor.get('quota').disk || 99999;
    return this.model.atLeast({
      unit      : LOCALE.MEGA_BYTE,
      used      : filesize(used),
      limit     : filesize(limit),
      available : ((100 * used)/limit).toFixed(2,2)
    });
  }
}
__resource_bar.initClass();
module.exports = __resource_bar;
