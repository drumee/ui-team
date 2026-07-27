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
    // feed() replaces the canvas and the text overlay, so anything remembered
    // about the previous pair is stale. Without this a second onDomRefresh would
    // find its key already "rendered" and leave the new canvas blank.
    this._renderedKey = null;
    this._viewport = null;
    this._resetTextLayer();
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
    this._rendering = 1;
    try {
      let next = width;
      while (next) {
        // Already showing this width at this rotation — nothing to redo. Both
        // triggers fire more often than the size actually changes (the observer
        // reports the same width after a height-only resize), and a raster is
        // expensive enough to be worth skipping.
        const key = `${next}:${this.mget(_a.rotation) || 0}`;
        if (key !== this._renderedKey) {
          if (await this._render(next)) {
            this._renderedKey = key;
          } else {
            // A failed raster must not be recorded as done: the key would match
            // forever after and a transient failure would leave the page blank
            // until its width happened to change again.
            this._renderedKey = null;
          }
        }
        // The trailing width is consumed HERE rather than cleared in `finally`,
        // so a resize that lands while a raster is in flight is picked up
        // instead of being dropped on the way out.
        next = this._pendingWidth === next ? 0 : this._pendingWidth;
        this._pendingWidth = 0;
      }
    } finally {
      this._rendering = 0;
      this._pendingWidth = 0;
    }

    // The overlay is settled once per build() rather than once per raster: the
    // intermediate widths of a maximize are transient, and laying out hundreds
    // of spans for each of them is the difference between a smooth animation and
    // a stuttering one. Deliberately outside the render lock — extraction is
    // async and a resize arriving during it must still be honoured.
    //
    // This call covers the steady state (spans already exist, follow the new
    // raster); the first build is covered by _ensureTextSpans laying out the
    // spans it has just created.
    this._layoutTextLayer();
    await this._ensureTextSpans();
  }

  /**
   * Single raster pass at an explicit target width. Resolves true when the
   * canvas now holds this page at `fitWidth`.
   */
  async _render(fitWidth) {
    const pdfDocument = this.mget("pdfDocument");
    if (!pdfDocument) return false;
    const pageIndex = this.mget("pageIndex");
    const canvas = await this.ensurePart('canvas');
    if (this.isDestroyed() || !canvas || canvas.isDestroyed()) return false;
    const rotation = this.mget(_a.rotation) || 0;
    const dpr = (window.devicePixelRatio) || 1;
    try {
      // scale is ignored when fitWidth is set; pass 1 as the neutral value.
      const viewport = await pdfDocument.renderPage(
        pageIndex, 1, rotation, canvas.el, dpr, fitWidth,
      );
      this.ratio = viewport.width / viewport.height;
      this._viewport = viewport;
      return true;
    } catch (e) {
      this.warn("Failed to render page", e)
      return false;
    }
  }

  /**
   * Forget the text overlay so the next build() rebuilds it. Called when the
   * skeleton is re-fed, which throws the old overlay element away.
   */
  _resetTextLayer() {
    this._textSpansPromise = null;
    this._textLayerEl = null;
    this._textSpans = null;
    this._textItems = null;
    this._spanEmWidth = null;
    this._layoutKey = null;
    this._textRotation = 0;
  }

  /**
   * Extract this page's text once, and build the transparent overlay that makes
   * it selectable.
   *
   * A canvas holds pixels, not text nodes — that is precisely why selecting and
   * copying from a rendered PDF did nothing. PDFium reports each text run's box;
   * each becomes an absolutely positioned span whose glyphs are invisible, so all
   * the user ever sees is the browser's own selection highlight.
   *
   * The spans are built ONCE and then only re-positioned (see _layoutTextLayer).
   * Rebuilding them per raster would collapse any selection the user is holding,
   * because a selection is anchored to the very text nodes that get replaced.
   *
   * Memoized on the promise rather than the result: several rasters can finish
   * while the first extraction is still in flight, and only one of them may build
   * a set of spans.
   *
   * Built with createElement rather than Skeletons on purpose: this is measured
   * per-glyph geometry, not UI, and a Marionette view per run would mean hundreds
   * of widgets per page.
   */
  _ensureTextSpans() {
    if (this._textSpansPromise) return this._textSpansPromise;
    this._textSpansPromise = (async () => {
      const pdfDocument = this.mget("pdfDocument");
      if (!pdfDocument || !pdfDocument.getPageText) return false;
      const layer = await this.ensurePart('text-layer');
      if (!layer || layer.isDestroyed() || this.isDestroyed()) return false;

      const text = await pdfDocument.getPageText(this.mget("pageIndex"));
      if (layer.isDestroyed() || this.isDestroyed()) return false;
      // No text at all: a scanned page, or fonts with no ToUnicode map. Nothing
      // to overlay, and nothing to retry either — the answer is cached.
      if (!text || !text.items.length) return false;

      const fragment = document.createDocumentFragment();
      const spans = [];
      for (const item of text.items) {
        const span = document.createElement('span');
        span.textContent = item.text;
        fragment.appendChild(span);
        spans.push(span);
        if (item.endOfLine) {
          // Absolutely positioned spans alone don't reliably produce newlines in
          // the clipboard; an explicit break does.
          fragment.appendChild(document.createElement('br'));
        }
      }
      layer.el.replaceChildren(fragment);

      this._textLayerEl = layer.el;
      this._textItems = text.items;
      this._textSpans = spans;
      this._textRotation = text.rotation || 0;
      // Calibrate and place in the same synchronous run as the DOM insert, so no
      // frame can ever paint the spans at their calibration size.
      this._calibrateSpans();
      this._layoutTextLayer();
      return true;
    })();
    return this._textSpansPromise;
  }

  /**
   * Measure every run's natural width once, at a fixed reference font size.
   *
   * Text advance is linear in font size, so a single measurement per run is
   * enough to derive its horizontal stretch at any later zoom by arithmetic.
   * That is what keeps resizing free of forced layouts — and it is steadier than
   * re-measuring, which returns slightly different rounding at each size and
   * makes the selection highlight shimmer as the page is dragged.
   *
   * A fixed reference size rather than the current one, because the first layout
   * can land while the player is still narrow, where per-glyph hinting error is
   * proportionally large enough to skew every later derived width.
   */
  _calibrateSpans() {
    const REFERENCE_PX = 100;
    for (const span of this._textSpans) {
      // getBoundingClientRect reports the TRANSFORMED width, so any stretch from
      // an earlier layout has to come off before measuring.
      span.style.transform = '';
      span.style.fontSize = `${REFERENCE_PX}px`;
    }
    // One forced layout for the whole batch, once in this page's lifetime.
    this._spanEmWidth = this._textSpans.map(
      (span) => span.getBoundingClientRect().width / REFERENCE_PX
    );
    this._layoutKey = null;
  }

  /**
   * Position the overlay over the current raster.
   *
   * Synchronous, and writes styles without ever reading layout back, so it costs
   * no reflow and can run on every build() without stuttering the resize.
   *
   * The spans are laid out in UNROTATED page space and the overlay as a whole is
   * rotated onto the canvas: one transform instead of one per span, and rotated
   * pages stay on the same code path.
   */
  _layoutTextLayer() {
    const spans = this._textSpans;
    const items = this._textItems;
    const emWidth = this._spanEmWidth;
    const viewport = this._viewport;
    const el = this._textLayerEl;
    if (!spans || !el || !emWidth || !viewport) return;
    if (!viewport.width || !viewport.height) return;
    if (!el.isConnected) {
      // The skeleton was re-fed under us; drop the stale nodes and let the next
      // build() rebuild against the new element.
      this._resetTextLayer();
      return;
    }

    // The extracted geometry has every rotation stripped out, so the overlay has
    // to carry both the page's own /Rotate and whatever the user turned it by.
    const total = this._textRotation + (this.mget(_a.rotation) || 0);
    const rotation = (total % 360 + 360) % 360;
    const rotated = rotation === 90 || rotation === 270;
    // viewport is the canvas' CSS size, already rotated. The overlay is laid out
    // unrotated, so for a quarter turn its axes are the other way round.
    const layerW = rotated ? viewport.height : viewport.width;
    const layerH = rotated ? viewport.width : viewport.height;
    const wrapperW = this.__canvasWrapper.$el.width() || layerW;

    // Nothing moved — skip several hundred style writes. build() is driven by a
    // ResizeObserver that also fires for height-only changes.
    const key = `${layerW}:${layerH}:${rotation}:${wrapperW}`;
    if (key === this._layoutKey) return;
    this._layoutKey = key;

    // Place the unrotated overlay so its centre coincides with the canvas
    // centre, then spin it about that centre — the canvas is itself centred in
    // the wrapper, so the two stay on one axis at any raster width.
    el.style.width = `${layerW}px`;
    el.style.height = `${layerH}px`;
    el.style.left = `${(wrapperW - layerW) / 2}px`;
    el.style.top = `${(viewport.height - layerH) / 2}px`;
    el.style.transform = rotation ? `rotate(${rotation}deg)` : '';

    for (let i = 0; i < spans.length; i++) {
      const item = items[i];
      const span = spans[i];
      // Font size from the run's own box height keeps the selection band exactly
      // as tall as the line it covers.
      const fontSize = item.height * layerH;
      span.style.left = `${item.left * layerW}px`;
      span.style.top = `${item.top * layerH}px`;
      span.style.fontSize = `${fontSize}px`;
      // Stretch the run to the width PDFium reported, so mid-word selection
      // lands on the character the user is actually pointing at.
      const natural = emWidth[i] * fontSize;
      const target = item.width * layerW;
      span.style.transform = natural && target ? `scaleX(${target / natural})` : '';
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
