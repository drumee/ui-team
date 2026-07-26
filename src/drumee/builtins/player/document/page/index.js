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
   * The player's width changed (drag-resize, maximize, fullscreen, viewport).
   * Re-raster at the new width — the canvas carries an inline pixel width, so
   * CSS alone cannot reflow it.
   */
  _onParentResize(ui) {
    this.build()
  }

  /**
   * Render this page so it is exactly as wide as its container.
   *
   * The width is handed to the renderer as a target (`fitWidth`) rather than as
   * a precomputed scale: the model's `pageWidth` is the FIRST page's size for
   * the whole document, so scaling every page by `container / pageWidth` renders
   * pages of other sizes at other widths — the "one page big, one page small"
   * symptom. The renderer divides by each page's own width instead.
   *
   * Renders are serialized because several triggers can fire in the same frame
   * (resize + zoom + scroll-in). Concurrent rasters of one canvas race on
   * canvas.width/height and the loser paints at the wrong size; the trailing
   * request is coalesced so the final size always wins.
   */
  async build(c) {
    const width = Math.round(this.__canvasWrapper.$el.width() || 0);
    if (!width) return;
    if (this._rendering) {
      this._pendingWidth = width;
      return;
    }
    // Already showing this width at this rotation — nothing to redo. Both
    // triggers fire more often than the size actually changes (the observer
    // reports the same width after a height-only resize), and a raster is
    // expensive enough to be worth skipping.
    const key = `${width}:${this.mget(_a.rotation) || 0}`;
    if (key === this._renderedKey) return;
    this._rendering = 1;
    try {
      await this._render(width);
      this._renderedKey = key;
      while (this._pendingWidth && this._pendingWidth !== width) {
        const next = this._pendingWidth;
        this._pendingWidth = 0;
        await this._render(next);
        this._renderedKey = `${next}:${this.mget(_a.rotation) || 0}`;
      }
    } finally {
      this._rendering = 0;
      this._pendingWidth = 0;
    }
  }

  /**
   * Single raster pass at an explicit target width.
   */
  async _render(fitWidth) {
    const pdfDocument = this.mget("pdfDocument");
    if (!pdfDocument) return;
    const pageIndex = this.mget("pageIndex");
    const canvas = await this.ensurePart('canvas');
    if (this.isDestroyed() || !canvas || canvas.isDestroyed()) return;
    const rotation = this.mget(_a.rotation) || 0;
    const dpr = (window.devicePixelRatio) || 1;
    try {
      // scale is ignored when fitWidth is set; pass 1 as the neutral value.
      const viewport = await pdfDocument.renderPage(
        pageIndex, 1, rotation, canvas.el, dpr, fitWidth,
      );
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
