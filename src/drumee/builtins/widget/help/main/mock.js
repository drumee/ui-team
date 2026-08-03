/**
 * Content for the Get help screen.
 *
 * The help catalogue has no backend yet — there is no `SERVICE.*` endpoint
 * that serves tour videos, setup articles or FAQ entries. Until one exists
 * this module is the single source the skeletons read from, so swapping in
 * a real fetch later means replacing the getters in index.js and nothing
 * in the skeleton layer.
 *
 * The copy itself is NOT invented: the self-hosting cards mirror the six
 * sub-pages of docs.drumee.com/self-hosting, and the FAQ is the
 * "Get Help → FAQ" document (29 questions across 6 categories). Article
 * `url`s point at the matching published doc page.
 *
 * Copy lives in LOCALE (never inline strings) — see i18n-locale.md. The
 * keys below are resolved lazily inside the getters so the module can be
 * required before LOCALE is populated.
 */

/** Published documentation root that the article cards link into. */
const DOCS = "https://docs.drumee.com";

/** Nav entries for the inner Get-help sidebar, in display order. */
function navPages() {
  return [
    { id: "product-tour", ico: "ph-video", label: LOCALE.HELP_NAV_PRODUCT_TOUR },
    { id: "self-hosting", ico: "ph-hard-drives", label: LOCALE.HELP_NAV_SELF_HOSTING },
    { id: "faq", ico: "ph-question", label: LOCALE.HELP_NAV_FAQ },
  ];
}

/** Product tour page: heading, video placeholder and related articles. */
function productTour() {
  return {
    title: LOCALE.HELP_PRODUCT_TOUR_TITLE,
    intro: null,
    articles: [
      {
        id: "component-definition",
        title: LOCALE.HELP_ARTICLE_COMPONENT_DEFINITION,
        summary: LOCALE.HELP_ARTICLE_COMPONENT_DEFINITION_SUMMARY,
        url: `${DOCS}/introduction/tutorial/component-definition`,
      },
      {
        id: "create-workspace",
        title: LOCALE.HELP_ARTICLE_CREATE_WORKSPACE,
        summary: LOCALE.HELP_ARTICLE_CREATE_WORKSPACE_SUMMARY,
        url: `${DOCS}/introduction/tutorial/getting-started`,
      },
    ],
  };
}

/** Self-hosting page: heading, intro, video placeholder and 6 articles. */
function selfHosting() {
  return {
    title: LOCALE.HELP_SELF_HOSTING_TITLE,
    intro: LOCALE.HELP_SELF_HOSTING_INTRO,
    articles: [
      {
        id: "overview",
        title: LOCALE.HELP_ARTICLE_OVERVIEW,
        summary: LOCALE.HELP_ARTICLE_OVERVIEW_SUMMARY,
        url: `${DOCS}/self-hosting/overview`,
      },
      {
        id: "architecture",
        title: LOCALE.HELP_ARTICLE_ARCHITECTURE,
        summary: LOCALE.HELP_ARTICLE_ARCHITECTURE_SUMMARY,
        url: `${DOCS}/self-hosting/architecture`,
      },
      {
        id: "docker-compose",
        title: LOCALE.HELP_ARTICLE_DOCKER_COMPOSE,
        summary: LOCALE.HELP_ARTICLE_DOCKER_COMPOSE_SUMMARY,
        url: `${DOCS}/self-hosting/docker-compose`,
      },
      {
        id: "debian-packages",
        title: LOCALE.HELP_ARTICLE_DEBIAN_PACKAGES,
        summary: LOCALE.HELP_ARTICLE_DEBIAN_PACKAGES_SUMMARY,
        url: `${DOCS}/self-hosting/debian`,
      },
      {
        id: "production-ops",
        title: LOCALE.HELP_ARTICLE_PRODUCTION_OPS,
        summary: LOCALE.HELP_ARTICLE_PRODUCTION_OPS_SUMMARY,
        url: `${DOCS}/self-hosting/operations`,
      },
      {
        id: "plugins",
        title: LOCALE.HELP_ARTICLE_PLUGINS,
        summary: LOCALE.HELP_ARTICLE_PLUGINS_SUMMARY,
        url: `${DOCS}/self-hosting/plugins`,
      },
    ],
  };
}

/** FAQ category chips. `id` is matched against each entry's `category`. */
function faqCategories() {
  return [
    { id: "*", label: LOCALE.HELP_FAQ_CAT_ALL },
    { id: "getting-started", label: LOCALE.HELP_FAQ_CAT_GETTING_STARTED },
    { id: "files", label: LOCALE.HELP_FAQ_CAT_FILES },
    { id: "self-hosting", label: LOCALE.HELP_FAQ_CAT_SELF_HOSTING },
    { id: "security", label: LOCALE.HELP_FAQ_CAT_SECURITY },
    { id: "billing", label: LOCALE.HELP_FAQ_CAT_BILLING },
    { id: "troubleshooting", label: LOCALE.HELP_FAQ_CAT_TROUBLESHOOTING },
  ];
}

/**
 * FAQ entries — the "Get Help → FAQ" document, in its original order and
 * grouping. The Figma frame shows placeholder rows ("FAQ 01"…"FAQ 11"); the
 * real questions replace them, and the doc's six sections map 1:1 onto the
 * design's category chips.
 *
 * `slug` drives both LOCALE keys (HELP_FAQ_Q_/A_<SLUG>) and the row id, so
 * adding a question means adding one line here plus its two locale keys.
 */
const FAQ_INDEX = [
  ["getting-started", ["HUB", "ACCOUNT_VS_HUB", "INVITE_TEAMMATE", "EMPTY_WORKSPACE", "MULTIPLE_HUBS"]],
  ["files", ["CHAT_SEPARATE", "EDIT_DOCS", "SHARE_EXTERNAL", "WORKSPACE_PERMISSIONS", "VERSION_HISTORY"]],
  ["self-hosting", ["SELF_HOST_TIME", "SELF_HOST_NEEDS", "SELF_HOST_BUNDLED", "OPEN_SOURCE", "MIGRATE_SELF_HOST", "SELF_HOST_PLUGINS"]],
  ["security", ["DATA_LOCATION", "PERMISSIONS_ENFORCED", "AUDIT_LOG", "GDPR"]],
  ["billing", ["PLAN_DIFFERENCE", "STORAGE_LIMIT", "MIGRATE_BILLING", "CANCEL_DOWNGRADE"]],
  ["troubleshooting", ["MOBILE_APP", "BROWSERS", "CALENDAR_TASKS", "LOGIN_ISSUE", "REPORT_BUG"]],
];

function faqEntries() {
  const out = [];
  for (const [category, slugs] of FAQ_INDEX) {
    for (const slug of slugs) {
      out.push({
        id: slug.toLowerCase().replace(/_/g, "-"),
        category,
        question: LOCALE[`HELP_FAQ_Q_${slug}`],
        answer: LOCALE[`HELP_FAQ_A_${slug}`],
      });
    }
  }
  return out;
}

module.exports = {
  navPages,
  productTour,
  selfHosting,
  faqCategories,
  faqEntries,
};
