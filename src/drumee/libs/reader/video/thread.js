class __video_thread extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.getCurrentNid = this.getCurrentNid.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.region;
    this.prototype.className =_C.flow.fullH;
    this.prototype.tagName =_K.tag.li;
    this.prototype.geometry = {
      height:260,
      width:460
    };
    this.prototype.ui = {
      image       : 'image',
      icon        : '.icon',
      progressBar : '.progress-bar',
      percent     : '.percent'
    };
  }

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh() {
    this.thread = new Letc.AutoList({
      modelArgs  : {
        flow     : _a.vertical,
        format   : _a.thumb
      },
      pipe: {
        service : SERVICE.media.get_by_type,
        type   : _a.video,
        order  : _K.order.descending,
        page   : 1,
        oid: dui.request(_REQ.site.attribute, _a.id)
      },
      listView   : WPP.Media.Thread,
      childView  : WPP.Selector.Media,
      search     : ['filename', 'description', 'summary']});
    this.contentRegion.show(this.thread);
    return this.thread.view.on('add:child', this._addChild); //_e.
  }
// ========================
//
// ========================

// ===========================================================
// _addChild
//
// @param [Object] child
//
// ===========================================================
  _addChild(child) {
    if (child.model.get(_a.file) != null) {
      _dbg("Thread _addChild ",child, child.model);
      const file = new dui.Socket.Uploader(child.model.attributes);
      file.addListener(child);
      return file.send();
    }
  }
// ========================
//
// ========================

// ===========================================================
// getCurrentNid
//
// @return [Object] 
//
// ===========================================================
  getCurrentNid() {
    return -1;
  }
// ========================
//
// ========================

// ===========================================================
// feed
//
// @param [Object] models
//
// ===========================================================
  feed(models) {
    return this.thread.feed(models);
  }
}
__video_thread.initClass();
module.exports = __video_thread;
