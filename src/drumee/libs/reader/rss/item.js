/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/rss/item
//   TYPE : 
// ==================================================================== *

//-------------------------------------
//
// Designer.Social.Rss.Thread
//-------------------------------------
class __rss_item extends Marionette.View {
  static initClass() {
  //   templateName: _T.rssItem
  //   className : "#{_C.flow.y} rss-item"#_a.rssItem
  // 
  // #    tagName: () ->
    this.prototype.templateName = _T.rssItem;
    this.prototype.className  = `${_C.flow.y} rss-item`;
    //_a.rssItem
  }
//  # =================== *
//  #
//  # =================== *

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
//    tagName: () ->
//      if @model.get(_a.link)?
//        return _K.tag.a
//      else
//        return _K.tag.div
// ========================
//
// ========================
// ===========================================================
  initialize(opt) {
    const pubDate = this.model.get('pubDate');
    let format = _K.defaults.date_format;
    if (typeof usrAttr !== 'undefined' && usrAttr !== null) {
      format = usrAttr[_a.data.format] || format;
    }
    this.model.set(_a.date, Dayjs(pubDate).format(format));
    if ((this.model.get(_a.author) == null)) {
      this.model.set(_a.author, _K.char.empty);
    }
    try {
      const enclosure = this.model.get('enclosure')['@attributes'];
      if (enclosure.type.match(/image\//)) {
        this.model.set(_a.src, enclosure.url);
        const desc = this.model.get(_a.description);
        this.model.set(_a.description, desc.replace(/<img .+>/, _K.char.empty));
      }
    } catch (error) {}
    if ((this.model.get(_a.src) == null)) {
      return this.model.set(_a.src, _K.picto.rss);
    }
  }
}
__rss_item.initClass();
module.exports = __rss_item;
