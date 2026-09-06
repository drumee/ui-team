/**
 * What the work area shows while a rail tour is coming up.
 *
 * A rail press now raises its tour BEFORE switching the tab (desk/index.js
 * _railTabWithTour), which is what stops the pane the tour is about rendering
 * ahead of the tour that explains it. But the window underneath is still
 * showing the tab the user came FROM — press Chat while the Files tour is
 * pending and window-folder__split-body sits there behind it. This covers that.
 *
 * VISUAL ONLY. No services, no controls, nothing to press: it is a curtain, and
 * the tour drawn over it is the thing being read. desk/home-empty is the same
 * shape for a different state (no workspace at all) and is what this is
 * modelled on, down to the slot it lives in.
 *
 * IT NEVER GATES ANYTHING. The curtain's whole lifetime is the tour's — the
 * desk stamps `data-window-tour` when one is raised and clears it on the tour's
 * destroy, and the skin keys on that one attribute. So every way a tour can end
 * — finished, skipped, Escape, a chunk that failed to load — reveals the pane.
 * There is no state in which this screen can strand someone.
 */

class __desk_tour_intro extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }
}

module.exports = __desk_tour_intro;
