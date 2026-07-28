require('./skin');
const { bindPagePointer } = require('../selection/pointer');
const { SELECTION_SURFACE_ATTR } = require('../selection');

/**
 * Normalize a rect to flat `{x, y, width, height}`, top-left origin. @embedpdf
 * uses both shapes — flat for page geometry, `{origin, size}` for selection — so
 * accept either rather than bet on one.
 */
function flatten(rect) {
  if (rect && rect.origin && rect.size) {
    return {
      x: rect.origin.x,
      y: rect.origin.y,
      width: rect.size.width,
      height: rect.size.height,
    };
  }
  return rect;
}

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
    this._releaseSelection();
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
    // feed() replaces the canvas and the selection layers, so anything remembered
    // about the previous set is stale. Without this a second onDomRefresh would
    // find its key already "rendered" and leave the new canvas blank.
    this._renderedKey = null;
    this._viewport = null;
    this._releaseSelection();
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

    // Outside the render lock: attaching selection is async, and a resize that
    // lands during it must still be honoured.
    this._layoutSelection();
    await this._ensureSelection();
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
   * Tear down this page's selection wiring.
   */
  _releaseSelection() {
    if (this._unbindPointer) {
      this._unbindPointer();
      this._unbindPointer = null;
    }
    if (this._unregisterSelection) {
      this._unregisterSelection();
      this._unregisterSelection = null;
    }
    this._selectionPromise = null;
    this._selectionDoc = null;
    this._selectionEl = null;
    this._rectsEl = null;
    this._selectionRects = null;
    this._selectionLayoutKey = null;
  }

  /**
   * Attach this page to @embedpdf/plugin-selection, once.
   *
   * The plugin owns hit-testing and geometry — nothing here measures text.
   * Memoized on the promise, since several rasters can finish while the first
   * registration is still in flight and only one may bind.
   */
  _ensureSelection() {
    if (this._selectionPromise) return this._selectionPromise;
    const pending = this.mget('selectionDocument');
    if (!pending) return Promise.resolve(false);

    this._selectionPromise = (async () => {
      // The player hands over a promise rather than a document: its engine boots
      // in parallel with the first rasters, so this may resolve after the page is
      // already on screen — or to null, when selection is unavailable.
      const [selectionDoc, layer, rects] = await Promise.all([
        pending,
        this.ensurePart('selection'),
        this.ensurePart('selection-rects'),
      ]);
      if (!selectionDoc) return false;
      if (this.isDestroyed() || !layer || layer.isDestroyed() || !rects || rects.isDestroyed()) {
        return false;
      }
      const { documentId, stack } = selectionDoc;
      const pageIndex = this.mget('pageIndex');

      this._selectionDoc = selectionDoc;
      this._selectionEl = layer.el;
      this._rectsEl = rects.el;
      // Lets the document-level right-click handler recognise a click on the PDF
      // without depending on this widget's BEM class.
      layer.el.setAttribute(SELECTION_SURFACE_ATTR, '1');

      this._unregisterSelection = stack.selectionPlugin.registerSelectionOnPage({
        documentId,
        pageIndex,
        onRectsChange: (data) => this._paintSelection(data),
      });

      this._unbindPointer = bindPagePointer(
        stack.interaction,
        { type: 'page', documentId, pageIndex },
        layer.el,
        () => this._selectionGeometry(),
      );

      this._layoutSelection();
      return true;
    })();
    return this._selectionPromise;
  }

  /**
   * Page geometry for the pointer glue, read fresh per event so zoom/rotate need
   * no rebinding. `scale` comes off the UNROTATED displayed width — the axis
   * PDFium's page width maps onto before rotation.
   */
  _selectionGeometry() {
    const pageSize = this._pageSize();
    const viewport = this._viewport;
    if (!pageSize || !viewport || !pageSize.width) return null;
    const rotation = this._selectionRotation();
    const displayedWidth = (rotation % 2) ? viewport.height : viewport.width;
    return { pageSize, rotation, scale: displayedWidth / pageSize.width };
  }

  /**
   * The page's natural, un-rotated size as the engine reports it.
   */
  _pageSize() {
    const selectionDoc = this._selectionDoc;
    const pages = selectionDoc && selectionDoc.document && selectionDoc.document.pages;
    const page = pages && pages[this.mget('pageIndex')];
    return (page && page.size) || null;
  }

  /**
   * Total rotation in quarter turns: the page's own /Rotate (quarters, from the
   * engine) plus the user's rotation (degrees, from our model).
   */
  _selectionRotation() {
    const selectionDoc = this._selectionDoc;
    const pages = selectionDoc && selectionDoc.document && selectionDoc.document.pages;
    const page = pages && pages[this.mget('pageIndex')];
    const own = (page && page.rotation) || 0;
    const user = Math.round((this.mget(_a.rotation) || 0) / 90);
    return ((own + user) % 4 + 4) % 4;
  }

  /**
   * Place the two selection layers over the current raster.
   *
   * The pointer layer must cover the DISPLAYED page box exactly, since page
   * coordinates come from its bounding rect. The rects layer is the opposite:
   * un-rotated page space, rotated as a whole, so PDFium's rects need only
   * scaling.
   */
  _layoutSelection() {
    const el = this._selectionEl;
    const rectsEl = this._rectsEl;
    const viewport = this._viewport;
    const pageSize = this._pageSize();
    if (!el || !rectsEl || !viewport || !pageSize) return;
    if (!viewport.width || !viewport.height) return;
    if (!el.isConnected) {
      // The skeleton was re-fed under us; let the next build() rebind.
      this._releaseSelection();
      return;
    }

    const rotation = this._selectionRotation();
    const rotated = !!(rotation % 2);
    const wrapperW = this.__canvasWrapper.$el.width() || viewport.width;
    const scale = (rotated ? viewport.height : viewport.width) / pageSize.width;
    const key = `${viewport.width}:${viewport.height}:${rotation}:${wrapperW}`;
    if (key === this._selectionLayoutKey) return;
    this._selectionLayoutKey = key;

    // The canvas is centred in the wrapper, so both layers centre on it too.
    el.style.width = `${viewport.width}px`;
    el.style.height = `${viewport.height}px`;
    el.style.left = `${(wrapperW - viewport.width) / 2}px`;
    el.style.top = '0px';

    const pageW = pageSize.width * scale;
    const pageH = pageSize.height * scale;
    rectsEl.style.width = `${pageW}px`;
    rectsEl.style.height = `${pageH}px`;
    rectsEl.style.left = `${(wrapperW - pageW) / 2}px`;
    rectsEl.style.top = `${(viewport.height - pageH) / 2}px`;
    rectsEl.style.transform = rotation ? `rotate(${rotation * 90}deg)` : '';

    this._paintSelection(this._selectionRects);
  }

  /**
   * Draw the current highlight. The rects arrive already merged per line, so they
   * neither overlap each other nor drift from the glyphs.
   */
  _paintSelection(data) {
    this._selectionRects = data || null;
    const rectsEl = this._rectsEl;
    if (!rectsEl) return;
    const geometry = this._selectionGeometry();
    const bounding = data && data.boundingRect;
    if (!geometry || !bounding || !data.rects || !data.rects.length) {
      rectsEl.replaceChildren();
      return;
    }
    const { scale } = geometry;
    const bounds = flatten(bounding);

    const group = document.createElement('div');
    group.className = `${this.fig.family}__selection-group`;
    group.style.left = `${bounds.x * scale}px`;
    group.style.top = `${bounds.y * scale}px`;
    group.style.width = `${bounds.width * scale}px`;
    group.style.height = `${bounds.height * scale}px`;

    for (const rect of data.rects) {
      const box = flatten(rect);
      const el = document.createElement('div');
      el.className = `${this.fig.family}__selection-rect`;
      el.style.left = `${(box.x - bounds.x) * scale}px`;
      el.style.top = `${(box.y - bounds.y) * scale}px`;
      el.style.width = `${box.width * scale}px`;
      el.style.height = `${box.height * scale}px`;
      group.appendChild(el);
    }
    rectsEl.replaceChildren(group);
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
