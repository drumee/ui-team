/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/twitter/item
//   TYPE : 
// ==================================================================== *

//-------------------------------------
//
// Designer.Social.Twitter.Thread
//-------------------------------------
//########################################
//
//########################################
class __twitter_item extends Marionette.View {
  static initClass() {
  //   templateName: _T.twitItem
  //   className : "twit-item"#_a.twit
  // 
  //   behaviorSet
  //     bhv_renderer      : _K.char.empty
  //     bhv_renderer : _K.char.empty
  //     bhv_renderer  : _K.char.empty
  //     bhv_spin    : _K.char.empty
  // 
    this.prototype.templateName = _T.twitItem;
    this.prototype.className  = "twit-item";//_a.twit
    behaviorSet({
      bhv_renderer      : _K.char.empty,
      bhv_renderer : _K.char.empty,
      bhv_renderer  : _K.char.empty,
      bhv_spin    : _K.char.empty
    });
  }
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    const user    = this.model.get(_a.user);
    if ((user != null ? user.screen_name : undefined) != null) {
      this.model.set(_a.screen_name, user.screen_name);
    }
    let format = _K.defaults.date_format;
    if (typeof usrAttr !== 'undefined' && usrAttr !== null) {
      format = usrAttr[_a.data.format] || format;
    }
    const created = this.model.get('created_at');
    return this.model.set(_a.date, Dayjs(created).format(format));
  }
}
__twitter_item.initClass();
module.exports = __twitter_item;
