require('./skin');
// const { AnnotationMode, TextLayer } = require("pdfjs-dist");
class __player_page extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.isPlayer = 1;
    this.declareHandlers();
    this.scaleFactor = 3;
    this._onParentResize = this._onParentResize.bind(this)
  }

  /**
   * 
   */
  onDestroy() {
    let handler = this.getHandlers(_a.ui)[0];
    if (handler) {
      handler.off(_e.resize, this._onParentResize)
    }
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    this.ensurePart('canvas').then(this.build.bind(this));
    let handler = this.getHandlers(_a.ui)[0];
    if (handler) {
      handler.on(_e.resize, this._onParentResize)
    }
  }

  /**
   * 
   */
  _onParentResize(ui) {
    this.build()
  }

  /**
   * 
   */
  async build(c) {
    let pdfDocument = this.mget("pdfDocument");
    let pageNum = this.mget("pageNum");
    let pageWidth = this.mget("pageWidth");
    let scale =1;
    if (pageWidth) {
      scale = this.__canvasWrapper.$el.width() / pageWidth;
    }
    let canvas = await this.ensurePart('canvas');
    try {
      let viewport = await pdfDocument.renderPage(pageNum, scale, 0, canvas.el);
      this.debug("AAA:72", scale, viewport)
      this.ratio = viewport.width / viewport.height;
    } catch (e) {
      this.warn("Failed to render page", e)
    }
  }


  /**
   * 
   */
  url() {
  }

  /**
   * 
   */
  rotate() {
  }

}

module.exports = __player_page;
