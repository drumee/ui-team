
const { fitBoxes } = require("core/utils")
const __stream = require('builtins/webrtc/stream');

class ___player_stream extends __stream {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    super.initialize();
    return this.model.atLeast({ 
      offsetX : 0,
      offsetY : 0
    });
  }

  /**
   * 
   */
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
  }

 

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  responsive(opt) {
    if (!this.__video || !this.stream) {
      return;
    }
    const conf = opt || this.stream.getVideoTracks()[0].getSettings();
    const box = fitBoxes({
      width : this.$el.width()  - this.mget(_a.offsetX),
      height: this.$el.height() - this.mget(_a.offsetY)
    },{
      width : conf.width, 
      height: conf.height 
    });
    this.__video.$el.width(box.width);
    this.__video.$el.height(box.height);
    return box;
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  setSize(opt) {
    opt.width = opt.width - this.mget(_a.offsetX);
    opt.height = opt.height - this.mget(_a.offsetY);
    const box = fitBoxes(opt, {
      width : this.$el.width(),
      height: this.$el.height()
    });
    this.$el.width(box.width);
    this.$el.height(box.height);
    return box;
  }


  /**
   * 
   * @param {*} stream 
   * @param {*} label 
   * @returns 
   */
  plug(stream, label) {
    if (label == null) { label = ''; }
    if (!this.__video) {
      return;
    }
    this.mset({ 
      stream_id : stream.id}); 

    this.stream = stream;
    this.__video.el.dataset.status = '';
    this.__video.el.srcObject = stream;
    this.__video.el.onloadedmetadata =e=> {
      const rx = this.$el.width()/e.target.videoWidth;
      const ry = this.$el.height()/e.target.videoHeight;
      const inner = {width : e.target.videoWidth, height:e.target.videoHeight};
      const outer = {width : this.$el.width(), height:this.$el.height()};
      const ratio = e.target.videoWidth/e.target.videoHeight;
      if(this.mget(_a.size) === _a.cover) {
        this.__video.$el.css({ 
          transform : `translate(-50%, -50%) scale(${Math.max(rx, ry)})`});
        inner.ratio = ratio;
        return this.trigger(_e.ready, inner);
      } else { 
        const box = fitBoxes(outer, inner);
        box.ratio = ratio;
        this.__video.el.style.width  = "100%"; //"calc(100% - #{@mget(_a.offsetY)}"
        this.__video.el.style.height = `calc(100% - ${this.mget(_a.offsetY)}`;
        return this.trigger(_e.ready, box);
      }
    };

    return this.__label.set({ 
      content : label});
  }
}

module.exports = ___player_stream;
