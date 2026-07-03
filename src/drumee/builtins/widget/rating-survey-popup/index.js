/**
 * PMF rating popup — shown once after 30 min of cumulative active usage
 * (timer lives in modules/desk). State machine:
 *   rating → 5 stars + per-rating message. "Take the survey" opens the full
 *            PMF survey (external Google Form) in a new tab; "Confirm" sends
 *            the star rating alone. Either records the score server-side and
 *            marks the survey done (never shown again); "Cancel"/X snoozes.
 *   thanks → confirmation; every close from here is final.
 * The detailed questionnaire now lives in the external Google Form, so this
 * popup no longer embeds an in-app wizard.
 */
const SURVEY_FORM_URL =
  "https://docs.google.com/forms/d/1jiHwBNX3D2fkYueU5l_M5ODKWqHzqr2lRNe8rCNcRqs/viewform?edit_requested=true";

class __rating_survey_popup extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._state = "rating"; // rating | thanks
    this._score = 0;
  }

  /**
   * Wm.launch({singleton:1}) reuses the instance and calls .raise() on the
   * second trigger — LetcBox has none, so this stub is mandatory.
   */
  raise() {
    if (this.el) {
      this.el.style.display = "";
      this.el.style.zIndex = 99998;
    }
    return this;
  }

  onDomRefresh() {
    this._portalToBody();
    this._render();
  }

  /**
   * Wm renders the popup inside window-manager (z-auto) while overlays sit
   * at z 1500+. Move to document.body so fixed + high z-index actually wins.
   */
  _portalToBody() {
    if (!this.el) return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  _render() {
    this.feed(require("./skeleton")(this));
  }

  // ───────── skeleton accessors ─────────
  getState() { return this._state; }
  getScore() { return this._score; }

  // ───────── persistence ─────────

  /** Record the star rating (marks the survey done server-side). */
  _submitScore() {
    return this.postService(SERVICE.survey.submit, { hub_id: Visitor.id, score: this._score })
      .catch((e) => this.warn("[rating-survey] submit failed", e));
  }

  _dismiss() {
    this.postService(SERVICE.survey.dismiss, { hub_id: Visitor.id })
      .catch(() => {});
    this._close();
  }

  _close() {
    if (this.parent && _.isFunction(this.parent.clear)) this.parent.clear();
    else this.softDestroy();
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "rate-star": {
        this._score = Number(cmd.mget("rating")) || 0;
        this._render();
        return;
      }
      case "survey-later":
        return this._dismiss();
      case "survey-confirm": {
        // Confirm sends the star rating alone (primary action of the card).
        if (!this._score) return;
        this._submitScore().then(() => {
          this._state = "thanks";
          this._render();
        });
        return;
      }
      case "survey-take": {
        // Open the full PMF survey (external Google Form) in a new tab. The
        // window.open MUST run synchronously in this click gesture or the
        // popup blocker kills it — do it before the async submit. Record the
        // (possibly 0) star rating too, so the popup is marked done.
        window.open(SURVEY_FORM_URL, "_blank", "noopener,noreferrer");
        this._submitScore();
        this._state = "thanks";
        this._render();
        return;
      }
      case "close-rating-popup": {
        // X button: from the rating screen = "later" (snooze); from thanks
        // the score is already saved and done is set — just close.
        if (this._state === "rating") return this._dismiss();
        return this._close();
      }
    }
  }
}

__rating_survey_popup.initClass();
module.exports = __rating_survey_popup;
