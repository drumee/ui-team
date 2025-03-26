// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/desk/media/icon
//   TYPE : 
// ==================================================================== *

const { timeNow } = require("core/utils")

const media_gird = require('../grid');
class __media_paste extends media_gird {


  initialize(opt) {
    this.figName = 'media_grid';
    let a = opt.type.split(/[:\/]/);
    this.mset({
      imgCapable: 1,
      filetype: _a.image,
      ext: a[2],
      extension: a[2],
      phase: _e.paste,
      mimetype: `${a[1]}/${a[2]}`,
      filename: `${timeNow()}.${a[2]}`
    });
    super.initialize(opt);
  }

  /**
   * 
   */
  // delete() {
  //   this.goodbye()
  // }

  /**
   * 
   */
  allowedAction() {
    return false;
  }

  /**
   * 
   */
  _checkUpload(){
    if(this._done) return;
    let handler = this.mget(_a.uiHandler) || this.getLogicalParent() || Wm;
    //this.debug("AAA:45 --- _checkUpload", this.mget(_a.src));
    this.postService(SERVICE.media.upload_base64, {
      filename : this.mget(_a.filename),
      mimetype: this.mget(_a.mimetype),
      nid: this.mget(_a.nid),
      image:this.mget(_a.src),
      hub_id: this.mget(_a.hub_id)
    }).then((data)=>{
      //this.debug("AAA:53", this.mget('destination'), data, this);
      this._done = 1;
      this.status = null;
      data.kind = this._getKind();
      data.service = "open-node";
      data.uiHandler = handler;
      data.isAttachment = this.isAttachment();
      this.model.clear();
      this.model.set(data);     
      this.initData();
      this.initURL();
      this.trigger(_e.restart);
      this.onDomRefresh();
      this.status = null;
    });
  }


}


module.exports = __media_paste;
