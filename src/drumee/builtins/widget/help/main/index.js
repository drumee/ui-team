const mock = require("./mock");
const { openSupportMail } = require("libs/support");

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
    // Set once the poster has been swapped for a real player, so a click
    // that lands on the playing video does not rebuild it. The hls.js
    // instance is held so it can be torn down with the element it feeds.
    this._playing = false;
    this._hls = null;
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

  /**
   * Video source for the current page, or null when the install configured
   * none. Whether a source is usable at all is decided once, in mock.js
   * pageVideo() — this is just the shared accessor, so the frame that gets
   * drawn (skeleton/common.videoBlock) and the click that starts it
   * (playVideo) can never disagree about what is playable.
   */
  getVideo() {
    return this.getPageData().video || null;
  }

  /**
   * DOM id of the `<video>`, derived from the view's own cid so it stays
   * unique if this widget is ever mounted twice. Shared by the skeleton that
   * writes it and the handler that looks the element up.
   */
  videoElId() {
    return `${this.cid}-help-video`;
  }

  /**
   * Resolved poster for the current page's video, or null when the install
   * configured none. Resolved the same way as the video itself, so a poster
   * can sit beside its file in the static tree.
   */
  videoPosterUrl() {
    const video = this.getVideo();
    return video && video.poster ? this._staticUrl(video.poster) : null;
  }

  onDomRefresh() {
    this._render();
  }

  _render() {
    // Any rebuild of the content column throws the <video> away, so the
    // player state has to go with it: an hls.js left attached to a detached
    // element keeps pulling segments, and a stale `_playing` would leave the
    // play badge of the freshly drawn frame dead to the touch.
    this._stopVideo();
    this.feed(require("./skeleton").default(this));
  }

  /** Re-render only the content column, leaving the nav/search untouched. */
  _renderContent() {
    this._stopVideo();
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
   * Start the page's video.
   *
   * The frame is drawn as a poster and the `<video>` is created here, on the
   * first click, so opening Get help costs no media bytes until someone
   * actually asks for the video. The native controls sit inside the frame,
   * so their clicks reach this handler too — `_playing` keeps them from
   * rebuilding the player out from under the person using it.
   */
  playVideo() {
    if (this._playing || !this.getVideo()) return;
    this._playing = true;
    return this.ensurePart("help-video").then((p) => {
      if (p) return p.feed(require("./skeleton/common").videoPlayer(this));
      // Nothing was swapped in, so the poster is still there — leaving the
      // flag set would strand its play badge as a no-op.
      this._playing = false;
    });
  }

  /**
   * Attach a source to the freshly created `<video>`.
   *
   * A Drumee-hosted node streams as HLS over the same `/-/vdo/` route as the
   * in-app player (builtins/player/video): the browser pulls segments on
   * demand instead of the whole file, and the server-side transcode means
   * the stored file's codec does not have to be one the browser can decode.
   * hls.js drives that everywhere except Safari, which reports no support
   * because it plays the playlist natively from a plain `src`.
   */
  _startVideo(el) {
    const video = this.getVideo();
    // A page switch during the waitElement() poll tears the player down
    // before it ever starts; nothing to attach to in that case.
    if (!el || !video || !this._playing) return;

    if (video.src) {
      el.src = this._staticUrl(video.src);
      return this._play(el);
    }

    const b = (typeof bootstrap === "function" && bootstrap()) || {};
    let url = `${b.vdo || ""}${video.nid}/${video.hub_id}/master.m3u8`;
    if (b.keysel) url = `${url}?keysel=${b.keysel}`;

    // Required lazily, as builtins/player/video does — hls.js is far too
    // heavy to sit in this widget's chunk for the sake of a click that
    // usually never happens.
    const Hls = require("hls.js");
    if (!Hls.isSupported()) {
      el.src = url;
      return this._play(el);
    }
    this._hls = new Hls();
    this._hls.loadSource(url);
    this._hls.attachMedia(el);
    this._hls.on(Hls.Events.MANIFEST_PARSED, () => this._play(el));
  }

  /**
   * Resolve a configured file source to something the element can load.
   *
   * An absolute or root-relative value is used untouched, so a video can be
   * pointed at any host. A bare path is resolved against this install's own
   * static base — the same one the welcome wallpaper and the sample CSV use,
   * and it already ends in a slash — so a self-hosted deployment serves its
   * own copy instead of reaching back to app.drumee.com.
   */
  _staticUrl(src) {
    if (/^(https?:)?\/\//.test(src) || src.startsWith("/")) return src;
    const b = (typeof bootstrap === "function" && bootstrap()) || {};
    return `${b.static || ""}${src}`;
  }

  /**
   * play() rejects rather than throws when the browser declines (autoplay
   * policy, or the element was torn down mid-load). Either way it must not
   * surface as an unhandled rejection.
   */
  _play(el) {
    const started = el.play();
    if (started && started.catch) {
      started.catch((e) => this.warn("help_main: video play refused", e));
    }
  }

  /**
   * Drop the player and fall back to the poster. Safe to call when nothing
   * is playing, which is why both the page switch and the teardown can call
   * it unconditionally.
   */
  _stopVideo() {
    if (this._hls) {
      this._hls.destroy();
      this._hls = null;
    }
    this._playing = false;
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
   * Contact support.
   *
   * The bare link opens a live 1:1 conversation with the support account —
   * the desk owns that (it owns the chat panel), so this hands off upward the
   * same way `start-product-tour` does. When no support account is configured,
   * or it has been deleted, or the lookup fails, the desk answers false and we
   * fall back to the mail link, which is what this button did before.
   *
   * `telegram` and `mail` remain the two icon buttons beside the link. Both
   * destinations stay LOCALE-configured so a self-hosted install can point
   * them at its own channels — same approach as SALES_CONTACT_EMAIL in
   * settings_billing. HELP_SUPPORT_TELEGRAM_URL ships empty (no public Drumee
   * support channel yet), so that button no-ops until one is set.
   */
  contactSupport(channel = "chat") {
    if (channel === "telegram") {
      const url = LOCALE.HELP_SUPPORT_TELEGRAM_URL;
      if (!url) return this.warn("help_main: no support telegram configured");
      return window.open(url, "_blank", "noopener");
    }
    if (channel === "mail") return openSupportMail();
    // Live chat. The desk owns the chat panel and owns the fallback to mail
    // when no support account can be resolved, so this is a plain hand-off —
    // triggerHandlers reports nothing back to branch on.
    return this.triggerHandlers({ service: "contact-support" });
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
   * Start the interactive product tour.
   *
   * The tour is the desk's to run, not this screen's: it mounts desk_tutorial
   * into the desk `overlay` part, and this screen has to be closed on the way
   * (the tour paints its own mock workspace over the desk). Both belong to
   * desk_module, so hand off upward rather than reaching across.
   *
   * `triggerHandlers` is the route: _loadKind() mounts this widget with
   * `uiHandler: [desk_module]`, so the desk already receives our events —
   * exactly how settings_main raises `upgrade-plan`.
   */
  startProductTour() {
    this.triggerHandlers({ service: "start-product-tour" });
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
      case "help-video-el":
        // The part being ready does not mean the element is attached yet —
        // resolve it by id first, same as builtins/player/video does.
        return this.waitElement(this.videoElId(), (el) => this._startVideo(el));
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
    this._stopVideo();
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
        return this.playVideo();

      case "help-product-tour":
        return this.startProductTour();

      default:
        return;
    }
  }
}

module.exports = help_main;
