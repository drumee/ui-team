require('./skin');
const { AnnotationMode, TextLayer } = require("pdfjs-dist");
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
  onDestroy(){
    let handler = this.getHandlers(_a.ui)[0];
    if(handler){
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
    if(handler){
      handler.on(_e.resize, this._onParentResize)
    }
  }

  /**
   * 
   */
  _onParentResize(ui){
    this.__canvasWrapper.$el.height(ui.size.width/this.ratio);
  }

  /**
   * 
   */
  async build(c) {
    var scale = 1;
    let page = this.mget(_a.page);
    var viewport = page.getViewport({ scale });
    scale = this.$el.width() / viewport.width;
    viewport = page.getViewport({ scale: scale * this.scaleFactor });
    let canvas = c.el;
    let canvasContext = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    this.ratio = viewport.width / viewport.height;
    this.__canvasWrapper.$el.height(this.$el.width()/this.ratio)
    // Render PDF page into canvas context
    var renderContext = {
      canvasContext,
      viewport,
      annotationMode: AnnotationMode.ENABLE_FORMS,
    };

    /** Setup text selection */
    let textLayer = await this.ensurePart('text-layer');
    page.render(renderContext);
    let textContent = await page.getTextContent();
    let az = new TextLayer({
      textContentSource: textContent,
      textContent,
      container: textLayer.$el.get(0),
      viewport,
      textDivs: []
    });
    await az.render();
    textLayer.el.style.width = "100%";
    textLayer.el.style.height = "100%";
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
