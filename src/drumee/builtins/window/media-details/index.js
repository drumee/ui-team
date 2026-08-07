
const mfsInteract = require('../interact');

/**
 * "Get info" details window for a regular file (spec 2026-06-10) — name,
 * type, size, dates, owner, location. Opened from the media context menu
 * (media/interact.js openDetailsWindow), singleton per node.
 */
// This panel's own geometry. `height` is only the opening guess — the real
// height is measured from the rendered rows in `_fitToContent`, because the
// row count varies (rows with no value are dropped) and a fixed height left
// a large empty band under the last one.
const SIZE = { width: 420, height: 320, minWidth: 340, minHeight: 180 };

class __window_media_details extends mfsInteract {

  static initClass() {
    this.prototype.figName = 'window_media_details';
    this.prototype.size = { ...SIZE };
  }

  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    // `Wm.getWindowPreset` copies the LAUNCHING view's geometry into the
    // preset, so `this.size` arrives as whatever window opened this one —
    // a document player, say, at 750x640. Take our own back.
    this.size = { ...SIZE };
    this.style.set({ width: this.size.width, height: this.size.height });
    this._center();
    this.declareHandlers();
  }

  /**
   * Centre on the viewport, never off the top-left edge.
   *
   * Skipped once an opener has placed this card itself — the document
   * player parks it under its header (`_placeDetails`) and sets the flag.
   * Without this, the re-centre at the end of `_fitToContent` would run on
   * a later frame and drag the card back to the middle of the screen.
   */
  _center() {
    if (this._anchored) return;
    this.style.set({
      left: Math.max(0, Math.round((window.innerWidth - this.size.width) / 2)),
      top: Math.max(0, Math.round((window.innerHeight - this.size.height) / 2)),
    });
  }

  /**
   * Cap the card to a box its opener supplies — a player passes its own
   * window, so the card is always smaller than the player it belongs to.
   * Re-fits immediately, since the width change alters how the rows wrap
   * and therefore the height they need.
   */
  constrainTo(box) {
    if (!box) return;
    this._box = box;
    if (box.width) {
      this.size = { ...this.size, width: box.width };
      this.style.set({ width: box.width });
      this.$el.css({ width: box.width });
    }
    this._fitToContent();
  }

  /**
   * Shrink the window to the height its rows actually need.
   *
   * The skin lets `__container` size to content, so its `scrollHeight` is
   * the natural height. Clamped to the opener's box when there is one, and
   * to 80% of the viewport otherwise, so a long location path cannot
   * produce a window taller than its parent or the screen; the body
   * scrolls past that point.
   */
  _fitToContent() {
    const box = this.el && this.el.querySelector(`.${this.fig.family}__container`);
    if (!box) return;
    const natural = box.scrollHeight;
    if (!natural) return;
    const ceiling = Math.min(
      Math.round(window.innerHeight * 0.8),
      (this._box && this._box.maxHeight) || Infinity,
    );
    const height = Math.max(SIZE.minHeight, Math.min(natural, ceiling));

    // Width is re-applied here, not just in `initialize`. The preset from
    // `Wm.getWindowPreset` carries `style: getWindowPosition(...)` — the
    // LAUNCHING window's geometry — and the base applies it during render,
    // after initialize has run. So a width set at init is overwritten and
    // the card comes up as wide as whatever opened it.
    const width = (this._box && this._box.width) || this.size.width || SIZE.width;
    if (width) {
      this.size = { ...this.size, width };
      this.style.set({ width });
      this.$el.css({ width });
    }
    this.size = { ...this.size, height };
    this.style.set({ height });
    this.$el.css({ height });
    this._center();
  }

  async onDomRefresh() {
    // Refresh node attributes so size/dates are current; the preset copied
    // from the grid item may be stale. Render from the local model on failure.
    try {
      const data = await this.fetchService(SERVICE.media.get_node_attr, {
        nid: this.mget(_a.nid),
        hub_id: this.mget(_a.hub_id),
      });
      if (data && !data.error) this.mset(data);
    } catch (e) {
      this.warn('media-details: get_node_attr failed', e);
    }
    this.feed(require('./skeleton')(this));
    // One frame, so the rows the feed just queued are laid out and
    // `scrollHeight` reports the real content height rather than 0.
    requestAnimationFrame(() => this._fitToContent());
    this.raise();
    this.setupInteract();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case _e.close:
        return this.goodbye();
      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__window_media_details.initClass();
module.exports = __window_media_details;
