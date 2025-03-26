const media = require('reader/media');
class __media_selector extends media {
  constructor(...args) {
    super(...args);
    this._click = this._click.bind(this);
  }

  static initClass() {
    this.prototype.templateName = "#media-helper"; // _T.media.vignette
    this.prototype.className =`${_C.flowH} ${_C.media.thumb}`;
    this.prototype.events =
      {click : '_click'};
    this.prototype.ui = {
      image       : '.icon img',
      icon        : '.icon',
      progressBar : '.progress-bar',
      percent     : '.percent'
    };
    behaviorSet({
      bhv_uploader   : _K.char.empty,
      socket:1
    });
  }
// =================== *
//
// =================== *

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    _dbg("Selector.Video", this.model);
    const description = this.model.get(_a.caption) || this.model.get(_a.filename);
    this.model.set(_a.description, description);
    return this.model.atLeast({
      description : this.model.get(_a.caption) || this.model.get(_a.filename),
      firstname   : Visitor.get(_a.name),
      lastname    : Visitor.get(_a.lastname)
    });
  }
// ========================
//
// ========================

// ===========================================================
// _click
//
// @param [Object] e
//
// ===========================================================
  _click(e){
    e.stopPropagation();
    _dbg("Selector.Video", this.model);
    return RADIO_BROADCAST.trigger(_e.media.play, this.model);
  }
}
__media_selector.initClass();
module.exports = __media_selector;
