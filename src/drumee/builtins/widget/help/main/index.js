const mock = require("./mock");

/**
 * Full-area "Get help" page rendered into the desk settings-main-slot when
 * the sidebar Get help entry is clicked — same host pattern as settings_main
 * and settings_billing (desk_module.togglePanel).
 *
 * Three pages (Product tour / Self-hosting setup / FAQ) share one inner
 * sidebar. There is no help catalogue service yet, so the content comes from
 * ./mock.js and every filter is resolved client-side.
 */
class help_main extends LetcBox {
  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this.model.set({ hub_id: Visitor.id });
    this._page = "product-tour";
    // Nav search narrows the page list; the FAQ filter narrows the accordion.
    this._navQuery = "";
    this._faqQuery = "";
    this._faqCategory = "*";
    // A Set, not a single id: nothing forbids several rows being open.
    this._openFaq = new Set();
    // Keyed by page so switching pages doesn't carry a vote over.
    this._votes = {};
    // One debounce timer per search box — a shared timer let one box cancel
    // the other's pending filter.
    this._searchTimers = {};
  }

  /** Nav entries, narrowed by the sidebar search box. */
  getNavPages() {
    const pages = mock.navPages();
    const q = (this._navQuery || "").trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => String(p.label || "").toLowerCase().includes(q));
  }

  /** Re-seeded into the input on every re-render so it survives a rebuild. */
  getNavQuery() {
    return this._navQuery || "";
  }

  getPage() {
    return this._page;
  }

  /**
   * Content model for the current page. FAQ never reaches here — it has its
   * own skeleton and reads the entries/categories getters directly.
   */
  getPageData() {
    return this._page === "self-hosting"
      ? mock.selfHosting()
      : mock.productTour();
  }

  getFaqCategories() {
    return mock.faqCategories();
  }

  getFaqCategory() {
    return this._faqCategory;
  }

  getFaqQuery() {
    return this._faqQuery;
  }

  /** FAQ rows after the category chip AND the free-text filter are applied. */
  getFaqEntries() {
    const q = (this._faqQuery || "").trim().toLowerCase();
    return mock.faqEntries().filter((e) => {
      if (this._faqCategory !== "*" && e.category !== this._faqCategory) return false;
      if (!q) return true;
      return (
        String(e.question || "").toLowerCase().includes(q) ||
        String(e.answer || "").toLowerCase().includes(q)
      );
    });
  }

  isFaqOpen(id) {
    return this._openFaq.has(id);
  }

  /** Current "Was this helpful?" vote for the active page: "up"/"down"/null. */
  getVote() {
    return this._votes[this._page] || null;
  }

  onDomRefresh() {
    this._render();
  }

  _render() {
    this.feed(require("./skeleton").default(this));
  }

  /** Re-render only the content column, leaving the nav/search untouched. */
  _renderContent() {
    return this.ensurePart("help-content").then((p) => {
      if (p) p.feed(require("./skeleton/content").default(this));
    });
  }

  /**
   * Switch pages. Resets the FAQ filters so returning to FAQ starts clean,
   * and re-renders both columns (the nav's active highlight moves too).
   */
  loadPage(id) {
    if (!id || id === this._page) return;
    this._page = id;
    this._faqQuery = "";
    this._faqCategory = "*";
    this._openFaq.clear();
    this._render();
  }

  /**
   * Expand/collapse one FAQ row by flipping `data-open` on it and nothing
   * else. Re-feeding the "faq-list" part would rebuild every row, so opening
   * one question visibly re-rendered all the others. The answer is always in
   * the DOM (skeleton/faq.js) and the skin transitions its height.
   *
   * `_openFaq` is still tracked so open rows survive a genuine list rebuild
   * (filter typing / category change).
   */
  toggleFaq(id, cmd) {
    if (!id) return;
    const wasOpen = this._openFaq.has(id);
    if (wasOpen) this._openFaq.delete(id);
    else this._openFaq.add(id);

    // Fall back to a data-faq lookup if the event came from a descendant.
    const el =
      (cmd && cmd.el) ||
      (this.el && this.el.querySelector(`[data-faq="${id}"]`));
    if (el) el.dataset.open = wasOpen ? "0" : "1";
  }

  /**
   * Record a helpful/not-helpful vote. There is no endpoint to post it to
   * yet, so it only drives the button's active state. Re-clicking clears it.
   */
  setVote(vote) {
    if (!vote) return;
    this._votes[this._page] = this.getVote() === vote ? null : vote;
    return this.ensurePart("help-feedback").then((p) => {
      if (p) p.feed(require("./skeleton/common").feedbackRow(this));
    });
  }

  /**
   * Contact support. `telegram` and `mail` come from the two icon buttons
   * beside the "Contact Support" link; the bare link defaults to mail.
   *
   * Both destinations are LOCALE-configured so a self-hosted install can
   * point them at its own channels — same approach as SALES_CONTACT_EMAIL
   * in settings_billing. HELP_SUPPORT_TELEGRAM_URL ships empty (no public
   * Drumee support channel yet), so that button no-ops until one is set.
   */
  contactSupport(channel = "mail") {
    if (channel === "telegram") {
      const url = LOCALE.HELP_SUPPORT_TELEGRAM_URL;
      if (!url) return this.warn("help_main: no support telegram configured");
      return window.open(url, "_blank", "noopener");
    }
    const to = LOCALE.HELP_SUPPORT_EMAIL || "contact@drumee.org";
    const subject = LOCALE.HELP_SUPPORT_MAIL_SUBJECT || "Drumee support request";
    // mailto via location.assign, not window.open: a popup blocker silently
    // swallows the latter (see settings_billing._openSalesMail).
    window.location.assign(`mailto:${to}?subject=${encodeURIComponent(subject)}`);
  }

  /**
   * Open an article. There is no in-app reader yet, so cards deep-link to
   * the matching published page on docs.drumee.com (see mock.js). Cards
   * without a url are inert rather than opening a dead tab.
   */
  openArticle(url) {
    if (!url) return this.warn("help_main: article has no url");
    window.open(url, "_blank", "noopener");
  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "nav-search":
        return this._wireSearch(child, pn, (v) => {
          this._navQuery = v;
          return this.ensurePart("help-nav-list").then((p) => {
            if (p) p.feed(require("./skeleton/nav").navList(this));
          });
        });
      case "faq-search":
        return this._wireSearch(child, pn, (v) => {
          this._faqQuery = v;
          return this.ensurePart("faq-list").then((p) => {
            if (p) p.feed(require("./skeleton/faq").faqList(this));
          });
        });
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  /**
   * Filter-as-you-type on a Skeletons.Entry. `mode:"commit"` only fires on
   * Enter, which is wrong for a filter box, so listen on the raw input and
   * debounce it — each keystroke otherwise rebuilds the whole list.
   */
  _wireSearch(child, key, apply) {
    if (!child || !child.el) return;
    const input = child.el.querySelector("input");
    if (!input) return;
    input.addEventListener("input", () => {
      clearTimeout(this._searchTimers[key]);
      const value = input.value || "";
      this._searchTimers[key] = setTimeout(() => apply(value), 150);
    });
  }

  onBeforeDestroy() {
    for (const t of Object.values(this._searchTimers)) clearTimeout(t);
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "help-load-page":
        return this.loadPage(cmd.mget("page_id"));

      case "help-faq-category":
        this._faqCategory = cmd.mget("category_id") || "*";
        this._openFaq.clear();
        return this._renderContent();

      case "help-faq-toggle":
        return this.toggleFaq(cmd.mget("faq_id"), cmd);

      case "help-vote":
        return this.setVote(cmd.mget("vote"));

      case "help-contact-support":
        return this.contactSupport(cmd.mget("channel"));

      case "help-open-article":
        return this.openArticle(cmd.mget("article_url"));

      case "help-play-video":
        // Placeholder: mock pages carry no media source (mock.js video.src
        // is null), so there is nothing to start.
        return;

      default:
        return;
    }
  }
}

module.exports = help_main;
