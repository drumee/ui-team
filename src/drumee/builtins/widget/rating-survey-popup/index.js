/**
 * PMF rating-survey popup — shown once after 30 min of cumulative active
 * usage (timer lives in modules/desk). State machine:
 *   rating  → 5 stars + per-star message; "Take the survey" submits the
 *             score immediately (kept even if the wizard is abandoned)
 *             then enters the wizard. "Maybe later"/X → dismiss (7-day snooze).
 *   survey  → 4-page PMF wizard (skeleton/questions.js). Only Q4 is required.
 *   thanks  → confirmation; every close from here is final (done flag set).
 */
class __rating_survey_popup extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._state = "rating"; // rating | survey | thanks
    this._score = 0;
    this._page = 0; // survey wizard page 0..3
    this._answers = {}; // { q1: "...", q2: 0, q2_follow: "...", q7: [..], ... }
    this._q4Error = 0;
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
  getPage() { return this._page; }
  getAnswer(key) { return this._answers[key]; }
  hasQ4Error() { return this._q4Error; }

  // ───────── persistence ─────────

  _submit(withAnswers) {
    const payload = { hub_id: Visitor.id, score: this._score };
    // answers is TEXT server-side — '' is safe; never send null to procs.
    payload.answers = withAnswers ? JSON.stringify(this._answers) : "";
    return this.postService(SERVICE.survey.submit, payload)
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

  /**
   * Persist all visible free-text inputs of the current wizard page into
   * this._answers before a re-render (feed() rebuilds the DOM and would
   * lose them). Textareas carry name="q1" etc.
   */
  _captureTexts() {
    if (!this.el) return;
    this.el.querySelectorAll("textarea[name]").forEach((t) => {
      this._answers[t.name] = t.value.trim();
    });
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
      case "survey-take": {
        if (!this._score) return;
        this._submit(false); // score survives even if the wizard is abandoned
        this._state = "survey";
        this._page = 0;
        this._render();
        return;
      }
      case "survey-choice": {
        this._captureTexts();
        const qid = cmd.mget("qid");
        this._answers[qid] = Number(cmd.mget("idx"));
        if (qid === "q4") this._q4Error = 0;
        this._render(); // re-render: a per-option follow-up textarea may appear
        return;
      }
      case "survey-multi": {
        this._captureTexts();
        const qid = cmd.mget("qid");
        const idx = Number(cmd.mget("idx"));
        const cur = Array.isArray(this._answers[qid]) ? this._answers[qid] : [];
        this._answers[qid] = cur.includes(idx)
          ? cur.filter((i) => i !== idx)
          : cur.concat(idx);
        this._render();
        return;
      }
      case "survey-back": {
        this._captureTexts();
        if (this._page > 0) this._page -= 1;
        this._render();
        return;
      }
      case "survey-next": {
        this._captureTexts();
        // Q4 (Sean Ellis) is the only required answer; it lives on page 1.
        if (this._page === 1 && this._answers.q4 === undefined) {
          this._q4Error = 1;
          this._render();
          return;
        }
        if (this._page < 3) this._page += 1;
        this._render();
        return;
      }
      case "survey-send": {
        this._captureTexts();
        this._submit(true).then(() => {
          this._state = "thanks";
          this._render();
        });
        return;
      }
      case "close-rating-popup": {
        // X button: from the rating screen = "later" (snooze); from the
        // wizard/thanks the score is already saved and done is set — just close.
        if (this._state === "rating") return this._dismiss();
        return this._close();
      }
    }
  }
}

__rating_survey_popup.initClass();
module.exports = __rating_survey_popup;
