require('./skin');
// const { AnnotationMode, TextLayer } = require("pdfjs-dist");

// Width, in px, of the fixed space the selectable-text overlay is laid out in.
// Zoom is then a single scale() on the overlay instead of a reposition of every
// word. Large enough that the smallest body text still lands near 20 px, where
// the browser's own glyph metrics are stable enough to fit each word against.
const REFERENCE_WIDTH = 1000;

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
    this._layoutKey = null;
    this._textRotation = 0;
    this._refHeight = 0;
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
   * The spans are built and positioned ONCE, in a fixed reference space
   * REFERENCE_WIDTH px wide. Zoom is then a single `scale()` on the overlay
   * itself, so a resize costs three style writes per page no matter how many
   * words it holds — that is what makes per-word spans affordable. The glyphs are
   * transparent, so scaling them costs nothing in fidelity; only geometry
   * matters, and geometry scales exactly.
   *
   * Never rebuilt on resize, either: a selection is anchored to the very text
   * nodes a rebuild would replace, so rebuilding would drop whatever the user is
   * holding mid-drag.
   *
   * Memoized on the promise rather than the result: several rasters can finish
   * while the first extraction is still in flight, and only one of them may build
   * a set of spans.
   *
   * Built with createElement rather than Skeletons on purpose: this is measured
   * per-glyph geometry, not UI, and a Marionette view per word would mean
   * thousands of widgets per page.
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

      const refW = REFERENCE_WIDTH;
      const refH = refW * (text.aspect || 1);

      const fragment = document.createDocumentFragment();
      const spans = [];
      for (const item of text.items) {
        const span = document.createElement('span');
        span.textContent = item.text;
        span.style.left = `${item.left * refW}px`;
        span.style.top = `${item.top * refH}px`;
        // Font size from the run's own box height keeps the selection band
        // exactly as tall as the line it covers.
        span.style.fontSize = `${item.height * refH}px`;
        fragment.appendChild(span);
        spans.push([span, item.width * refW]);
        if (item.endOfLine) {
          // Absolutely positioned spans alone don't reliably produce newlines in
          // the clipboard; an explicit break does.
          fragment.appendChild(document.createElement('br'));
        }
      }
      layer.el.replaceChildren(fragment);
      layer.el.style.width = `${refW}px`;
      layer.el.style.height = `${refH}px`;

      this._textLayerEl = layer.el;
      this._textSpans = spans;
      this._textRotation = text.rotation || 0;
      this._refHeight = refH;
      this._escapeContextmenuOnSelection(layer);
      // Fit and place in the same synchronous run as the DOM insert, so no frame
      // can paint the spans before they are stretched and scaled.
      this._fitSpans();
      this._layoutTextLayer();
      return true;
    })();
    return this._textSpansPromise;
  }

  /**
   * Let a right-click on selected text reach the browser's own menu.
   *
   * ui-core suppresses the native menu everywhere so windows can offer their own,
   * which left Ctrl+C as the only way to copy. `escapeContextmenu` is ui-core's
   * documented opt-out; defining it as a GETTER means the choice is made at
   * click time — with a selection the user gets the native Copy, and with nothing
   * selected the page keeps the app's own context menu.
   */
  _escapeContextmenuOnSelection(layer) {
    Object.defineProperty(layer, 'escapeContextmenu', {
      configurable: true,
      get: () => {
        const selection = window.getSelection();
        const el = this._textLayerEl;
        if (!el || !selection || selection.isCollapsed) return 0;
        if (!selection.toString().trim()) return 0;
        // Only when the selection actually involves THIS page's text. A selection
        // living elsewhere in the app must not take the app's own menu away from
        // the page; intersectsNode also covers a selection dragged across
        // several pages, which intersects each overlay it passes through.
        for (let i = 0; i < selection.rangeCount; i++) {
          if (selection.getRangeAt(i).intersectsNode(el)) return 1;
        }
        return 0;
      },
    });
  }

  /**
   * Stretch every word to the width PDFium reported for it.
   *
   * The browser lays each word out in its own font, which is not the font the PDF
   * was drawn with, so the natural width is close but never equal. Forcing it to
   * match puts the highlight's edges on the glyph edges. Done once, in reference
   * space — the stretch factor is scale-invariant, so zoom never invalidates it.
   */
  _fitSpans() {
    const spans = this._textSpans;
    // Measured with the overlay unscaled: getBoundingClientRect reports the
    // TRANSFORMED width, so an ancestor scale would be baked into every ratio.
    this._textLayerEl.style.transform = 'none';
    for (const [span] of spans) span.style.transform = '';
    // One forced layout for the whole page, once in its lifetime.
    const natural = spans.map(([span]) => span.getBoundingClientRect().width);
    for (let i = 0; i < spans.length; i++) {
      const [span, target] = spans[i];
      if (!natural[i] || !target) continue;
      span.style.transform = `scaleX(${target / natural[i]})`;
    }
    this._layoutKey = null;
  }

  /**
   * Fit the overlay onto the current raster.
   *
   * Three style writes on one element, no layout reads: the words keep their
   * reference-space positions and the whole overlay is scaled and rotated onto
   * the canvas. Rotating the overlay rather than each word also keeps pages with
   * an intrinsic /Rotate on the same code path.
   */
  _layoutTextLayer() {
    const viewport = this._viewport;
    const el = this._textLayerEl;
    if (!this._textSpans || !el || !viewport) return;
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
    const wrapperW = this.__canvasWrapper.$el.width() || layerW;
    const refW = REFERENCE_WIDTH;
    const refH = this._refHeight;

    // Nothing moved — build() is driven by a ResizeObserver that also fires for
    // height-only changes.
    const key = `${layerW}:${rotation}:${wrapperW}:${viewport.height}`;
    if (key === this._layoutKey) return;
    this._layoutKey = key;

    // Place the reference-space overlay so its centre coincides with the canvas
    // centre, then scale and spin it about that centre — the canvas is itself
    // centred in the wrapper, so the two stay on one axis at any raster width.
    // Uniform scale and rotation commute, so their order here doesn't matter.
    el.style.left = `${(wrapperW - refW) / 2}px`;
    el.style.top = `${(viewport.height - refH) / 2}px`;
    el.style.transform = `rotate(${rotation}deg) scale(${layerW / refW})`;
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
