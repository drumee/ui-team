// Daily reminder card — Round 3 Phase 4 (xlsx row 7).
//
// "Hi X, today you have ..." with three counts, shown once on the first desk
// load of each day.
//
// What is pinned here:
//
//  · [MY CALENDAR] IS DELIBERATELY NOT WIRED. There is no personal Calendar
//    yet. It is drawn per the design and says so when clicked. This test
//    exists so that state cannot silently reach a PR — the Phase 2 Mute
//    button sat drawn-but-dead for a whole phase because nothing pinned it.
//    When the Calendar ships: wire that ONE case and DELETE this test. Do not
//    "fix" the test by pointing the button somewhere plausible.
//  · DISCARD AND ✕ ARE THE SAME ACTION, and neither writes anything. There is
//    no server-side seen-state; the once-a-day rule is localStorage alone.
//  · THE DAY KEY IS LOCAL, NOT UTC. A UTC key flips mid-afternoon for anyone
//    far enough east, so the card would reappear during their working day.
//  · localStorage IS ALWAYS WRAPPED. It throws outright in some privacy
//    modes, and a greeting card must never be what breaks a desk load. It
//    fails toward showing the card, not toward breaking.
//  · EVERY NON-INTERACTIVE NODE CARRIES active: 0. ui-core binds an onclick to
//    every widget that does not say otherwise, and __handleClick
//    stopPropagation()s before dispatching — so a decorative node silently
//    swallows clicks meant for what is under it.
//  · USER-CONTROLLED TEXT IS ESCAPED. Skeletons.Note renders content as
//    MARKUP.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const WIDGET = join(ROOT, "src/drumee/builtins/widget/daily-reminder-popup/index.js");
const SKEL = join(ROOT, "src/drumee/builtins/widget/daily-reminder-popup/skeleton/index.js");
const SKIN = join(ROOT, "src/drumee/builtins/widget/daily-reminder-popup/skin/index.scss");
const DESK = join(ROOT, "src/drumee/modules/desk/index.js");
const widgetSrc = readFileSync(WIDGET, "utf8");
const skelSrc = readFileSync(SKEL, "utf8");
const skinSrc = readFileSync(SKIN, "utf8");
const deskSrc = readFileSync(DESK, "utf8");

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── render the REAL skeleton ────────────────────────────────────────────────
const node = (kind) => (props = {}) => ({ __kind: kind, ...props });
function renderCard(over = {}) {
  const saved = {};
  const set = (k, v) => { saved[k] = global[k]; global[k] = v; };
  const Box = node("box");
  set("Skeletons", {
    Box: Object.assign(node("box"), { X: Box, Y: Box, Z: Box, G: Box }),
    Note: node("note"),
    Button: { Svg: node("button.svg"), Label: node("button.label") },
    Image: { Svg: node("image.svg") },
  });
  set("LOCALE", new Proxy(
    {
      DAILY_REMINDER_TITLE: "Hi {0}, today you have ...",
      DAILY_REMINDER_TITLE_NO_NAME: "Today you have ...",
      DAILY_REMINDER_MESSAGES_ONE: "{0} unread message",
      DAILY_REMINDER_MESSAGES_OTHER: "{0} unread messages",
      DAILY_REMINDER_TASKS_ONE: "{0} due task",
      DAILY_REMINDER_TASKS_OTHER: "{0} due tasks",
      DAILY_REMINDER_MEETINGS_ONE: "{0} meeting",
      DAILY_REMINDER_MEETINGS_OTHER: "{0} meetings",
      DAILY_REMINDER_SUBLINE: "Check your calendar now",
      DAILY_REMINDER_NOTHING: "Nothing due today",
      DISCARD: "Discard",
      MY_CALENDAR: "My calendar",
    },
    { get: (t, k) => (k in t ? t[k] : String(k)) },
  ));
  set("_a", new Proxy({}, { get: (_t, k) => String(k) }));
  set("_", require("lodash"));
  try {
    const path = require.resolve(SKEL);
    delete require.cache[path];
    const make = require(path);
    return make({
      fig: { family: "daily-reminder-popup" },
      getCounts: () => ({ unread_messages: 35, due_tasks: 5, meetings: 3 }),
      getFirstName: () => "Duy",
      ...over,
    });
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete global[k];
      else global[k] = saved[k];
    }
  }
}
function* walk(n) {
  if (!n || typeof n !== "object") return;
  yield n;
  for (const k of [].concat(n.kids || [])) yield* walk(k);
}
const hasClass = (n, c) => typeof n.className === "string" && n.className.split(/\s+/).includes(c);
const find = (t, c) => { for (const n of walk(t)) if (hasClass(n, c)) return n; return null; };
const findAll = (t, c) => { const o = []; for (const n of walk(t)) if (hasClass(n, c)) o.push(n); return o; };

test("the backdrop is a REAL flex container, or the card is not centred", () => {
  // Measured on the endpoint: Skeletons.Box.Z renders `display: block`, so
  // align-items / justify-content on it are inert and the card rendered at
  // 0,0 instead of centred. Box.Y is a real flex column. This is the mirror
  // of the Skeletons.Note trap, where text-align is what does nothing.
  const code = stripComments(skelSrc);
  const ret = /return Skeletons\.Box\.([A-Z])\(\{\s*className: `\$\{pfx\}__backdrop`/.exec(code);
  assert.ok(ret, "the backdrop is the returned root");
  assert.equal(ret[1], "Y", "Box.Z renders display:block and would leave the card at 0,0");
  // And the centring must come from flex properties, not from a display
  // override in the skin — Box variants own that property.
  assert.ok(/&__backdrop \{[\s\S]*?align-items: center;/.test(skinSrc), "centres on the cross axis");
  assert.ok(/&__backdrop \{[\s\S]*?justify-content: center;/.test(skinSrc), "and on the main axis");
  const bd = /&__backdrop \{([\s\S]*?)\n  \}/.exec(skinSrc);
  assert.ok(!/display:\s*flex/.test(bd[1]), "no display override in the skin");
  assert.ok(/position: fixed/.test(bd[1]), "and it covers the viewport");
});

test("the card renders the three counts from the digest", () => {
  const tree = renderCard();
  const labels = findAll(tree, "daily-reminder-popup__stat-label").map((n) => n.content);
  assert.deepEqual(labels, ["35 unread messages", "5 due tasks", "3 meetings"]);
  assert.equal(
    find(tree, "daily-reminder-popup__title").content,
    "Hi Duy, today you have ...",
  );
  assert.equal(
    find(tree, "daily-reminder-popup__subline").content,
    "Check your calendar now",
  );
});

test("the three glyphs are the ones that exist in the sprite", () => {
  const icos = findAll(renderCard(), "daily-reminder-popup__stat-ico").map((n) => n.ico);
  assert.deepEqual(icos, ["noti-chat-teardrop-dots", "noti-list-checks", "noti-video-camera"]);
  // A missing sprite name renders an empty box with no error, so confirm the
  // source files are actually present rather than trusting the string.
  const dir = readdirSync(join(ROOT, "icons/src/normalized"));
  for (const ico of icos) {
    assert.ok(dir.includes(`${ico}.svg`), `${ico}.svg exists in the sprite source`);
  }
});

test("a missing display name drops the greeting, never renders '[User name]'", () => {
  const t = renderCard({ getFirstName: () => "" });
  const title = find(t, "daily-reminder-popup__title").content;
  assert.equal(title, "Today you have ...");
  assert.ok(!/\[User name\]/.test(title), "the mockup placeholder never ships");
  assert.ok(!/\{0\}/.test(title), "no unreplaced placeholder");
});

test("the display name is escaped — Note renders content as MARKUP", () => {
  const t = renderCard({ getFirstName: () => '<img src=x onerror="boom">' });
  const title = find(t, "daily-reminder-popup__title").content;
  assert.ok(!title.includes("<img"), "raw markup never reaches the DOM");
  assert.ok(title.includes("&lt;img"), "it is escaped, not stripped");
  assert.ok(
    /escapeHtml\(ui\.getFirstName\(\)\)/.test(stripComments(skelSrc)),
    "and the source really escapes it at the source",
  );
});

test("counts are coerced — a malformed response can only render a number", () => {
  // Garbage in every field coerces to 0, which is now the empty-day branch.
  const t = renderCard({
    getCounts: () => ({ unread_messages: "<b>x</b>", due_tasks: -7, meetings: null }),
  });
  assert.equal(findAll(t, "daily-reminder-popup__stat-label").length, 0);
  assert.equal(find(t, "daily-reminder-popup__empty").content, "Nothing due today");
  // With one real count present the tiles come back, and 0 stays PLURAL in
  // English (0 is CLDR "other", not "one").
  const t2 = renderCard({
    getCounts: () => ({ unread_messages: "<b>x</b>", due_tasks: 2, meetings: null }),
  });
  assert.deepEqual(
    findAll(t2, "daily-reminder-popup__stat-label").map((n) => n.content),
    ["0 unread messages", "2 due tasks", "0 meetings"],
  );
});

test("an all-zero day shows a LINE, not three zeroes", () => {
  // Suppressing the card entirely on a quiet day made the feature look
  // broken: you open the desk, see nothing, and cannot tell "nothing due"
  // apart from "it didn't work". That is exactly how it was first reported.
  const t = renderCard({ getCounts: () => ({ unread_messages: 0, due_tasks: 0, meetings: 0 }) });
  assert.ok(find(t, "daily-reminder-popup__card"), "the card still renders");
  const empty = find(t, "daily-reminder-popup__empty");
  assert.ok(empty, "the empty-day line renders");
  assert.equal(empty.content, "Nothing due today");
  assert.equal(empty.active, 0, "it is decorative, so it must not bind a click");
  assert.equal(findAll(t, "daily-reminder-popup__stat-label").length, 0, "no zero tiles");
  assert.equal(find(t, "daily-reminder-popup__stats"), null, "the tile row is gone entirely");
  // The rest of the card is unchanged — it is still a greeting with actions.
  assert.ok(find(t, "daily-reminder-popup__subline"), "the sub-line stays");
  assert.equal(findAll(t, "daily-reminder-popup__btn").length, 2, "both buttons stay");
});

test("one non-zero count is enough to bring the tiles back", () => {
  for (const counts of [
    { unread_messages: 1, due_tasks: 0, meetings: 0 },
    { unread_messages: 0, due_tasks: 1, meetings: 0 },
    { unread_messages: 0, due_tasks: 0, meetings: 1 },
  ]) {
    const t = renderCard({ getCounts: () => counts });
    assert.equal(find(t, "daily-reminder-popup__empty"), null,
      `${JSON.stringify(counts)} is not an empty day`);
    assert.equal(findAll(t, "daily-reminder-popup__stat-label").length, 3);
  }
});

test("the desk no longer suppresses a quiet day", () => {
  const fn = /async _maybeShowDailyReminder\(\) \{[\s\S]*?\n  \}/.exec(deskSrc);
  const code = stripComments(fn[0]);
  assert.ok(
    !/total\s*<=\s*0/.test(code),
    "an all-zero day must reach the card, which renders its own empty state",
  );
  // But a request that did not come back still shows nothing — a card with no
  // data is worse than no card.
  assert.ok(
    /if \(!counts \|\| typeof counts !== "object" \|\| Array\.isArray\(counts\)\) return;/.test(code),
    "a failed request still renders nothing",
  );
});

test("a count of 1 reads SINGULAR — '1 unread messages' was the bug", () => {
  const t = renderCard({
    getCounts: () => ({ unread_messages: 1, due_tasks: 1, meetings: 1 }),
  });
  assert.deepEqual(
    findAll(t, "daily-reminder-popup__stat-label").map((n) => n.content),
    ["1 unread message", "1 due task", "1 meeting"],
  );
});

test("the plural form comes from Intl.PluralRules, not from n === 1", () => {
  // A hand-rolled `n === 1 ? one : other` is right for English and Spanish,
  // wrong for French (0 takes the singular) and badly wrong for Russian
  // (three integer forms keyed on n%10 and n%100). Assert the real CLDR
  // table is what selects the key.
  const code = stripComments(skelSrc);
  assert.ok(/new Intl\.PluralRules\(/.test(code), "uses Intl.PluralRules");
  assert.ok(
    /\$\{base\}_\$\{cat\.toUpperCase\(\)\}/.test(code),
    "and builds the key from the category it returns",
  );
  // Sanity-check the categories the locale files must cover, using the same
  // API the code uses — so this test fails if a form is missing rather than
  // rendering a raw key name.
  const need = {
    en: new Set(), fr: new Set(), es: new Set(), ru: new Set(), zh: new Set(), km: new Set(),
  };
  for (const lang of Object.keys(need)) {
    const pr = new Intl.PluralRules(lang);
    for (const n of [0, 1, 2, 3, 4, 5, 11, 21, 22, 25, 35, 100]) need[lang].add(pr.select(n));
  }
  // Russian genuinely needs more than two.
  assert.ok(need.ru.size >= 3, `ru uses ${[...need.ru].join(",")} — more than one/other`);
  assert.ok(need.zh.size === 1, "zh does not inflect");
  const dir = join(ROOT, "locale");
  const missing = [];
  for (const [lang, cats] of Object.entries(need)) {
    const d = JSON.parse(readFileSync(join(dir, `${lang}.json`), "utf8"));
    for (const base of ["DAILY_REMINDER_MESSAGES", "DAILY_REMINDER_TASKS", "DAILY_REMINDER_MEETINGS"]) {
      for (const c of cats) {
        const k = `${base}_${c.toUpperCase()}`;
        if (!d[k] || !String(d[k]).includes("{0}")) missing.push(`${lang}:${k}`);
      }
    }
  }
  assert.deepEqual(missing, [], "every category a language actually uses has a key carrying {0}");
});

test("a missing plural form falls back to _OTHER, never to a raw key name", () => {
  // LOCALE is a createSafeObject: an absent key resolves to the key's own
  // NAME, so `LOCALE.X || fallback` is dead code and a naive lookup would
  // render "DAILY_REMINDER_TASKS_FEW" on screen.
  const code = stripComments(skelSrc);
  assert.ok(/v !== key/.test(code), "the miss is detected by comparing against the key name");
  assert.ok(/_OTHER/.test(code), "and falls back to the _OTHER form");
  assert.ok(
    !/LOCALE\[[^\]]+\]\s*\|\|/.test(code),
    "no `LOCALE[...] || fallback` — that never fires with a safe object",
  );
});

test("EVERY non-interactive node carries active: 0", () => {
  const tree = renderCard();
  // Nodes that SHOULD be clickable.
  const interactive = new Set(["daily-reminder-popup__close", "daily-reminder-popup__btn"]);
  const offenders = [];
  for (const n of walk(tree)) {
    const cls = typeof n.className === "string" ? n.className.split(/\s+/) : [];
    const isInteractive = cls.some((c) => interactive.has(c)) || n.service != null;
    // The card and backdrop are containers, not decoration.
    const isShell = cls.some((c) =>
      ["daily-reminder-popup__backdrop", "daily-reminder-popup__card"].includes(c));
    if (isInteractive || isShell) continue;
    if (n.active !== 0) offenders.push(n.className || n.__kind);
  }
  assert.deepEqual(
    offenders,
    [],
    "a decorative node left at ui-core's default active:1 binds its own onclick and stopPropagation()s clicks meant for what is under it",
  );
});

test("🚨 [My calendar] is DELIBERATELY NOT WIRED", () => {
  const btns = findAll(renderCard(), "daily-reminder-popup__btn");
  assert.equal(btns.length, 2, "two buttons");
  const cal = btns.find((b) => b.content === "My calendar");
  assert.ok(cal, "the button is drawn, exactly as designed");
  assert.equal(cal.service, "daily-reminder-calendar", "and it has its own service");

  // The handler must ONLY warn. If someone wires it, this fails loudly and
  // they must come here, read why, and delete this test on purpose.
  const code = stripComments(widgetSrc);
  const branch = /case "daily-reminder-calendar":([\s\S]*?)return;/.exec(code);
  assert.ok(branch, "the case exists");
  const body = branch[1];
  assert.ok(/Butler\.say/.test(body), "it tells the user, rather than doing nothing at all");
  for (const forbidden of ["postService", "fetchService", "Wm.launch", "location", "href", "route("]) {
    assert.ok(
      !body.includes(forbidden),
      `[My calendar] must not ${forbidden} — there is no personal Calendar yet. ` +
        `If one now exists: wire it and DELETE this test deliberately, do not edit it.`,
    );
  }
});

test("Discard and ✕ are the same action, and neither writes", () => {
  const code = stripComments(widgetSrc);
  assert.ok(
    /case "daily-reminder-discard":\s*case "daily-reminder-close":\s*return this\._close\(\);/.test(code),
    "both fall through to the same close",
  );
  // Nothing in the whole widget may post to the server.
  assert.ok(!/postService/.test(code), "the card never writes anything server-side");
  const btns = findAll(renderCard(), "daily-reminder-popup__btn");
  assert.equal(
    btns.find((b) => b.content === "Discard").service,
    "daily-reminder-discard",
  );
  assert.equal(find(renderCard(), "daily-reminder-popup__close").service, "daily-reminder-close");
});

test("the day key is the viewer's LOCAL date, not UTC", () => {
  const code = stripComments(widgetSrc);
  const fn = /static dayKey\(d\) \{[\s\S]*?\n  \}/.exec(code);
  assert.ok(fn, "dayKey is found");
  for (const utc of ["getUTCFullYear", "getUTCMonth", "getUTCDate", "toISOString"]) {
    assert.ok(
      !fn[0].includes(utc),
      `${utc} would flip the key mid-afternoon for anyone far enough east, so the card reappears during their working day`,
    );
  }
  assert.ok(/getFullYear|getMonth|getDate/.test(fn[0]), "it uses the local accessors");
});

test("every localStorage access is wrapped and fails toward SHOWING the card", () => {
  const code = stripComments(widgetSrc);
  const reads = [...code.matchAll(/localStorage\.(getItem|setItem)/g)];
  assert.ok(reads.length >= 2, "there are storage accesses to check");
  // Each must sit inside a try.
  for (const m of reads) {
    const before = code.slice(Math.max(0, m.index - 200), m.index);
    assert.ok(/try\s*\{[^}]*$/.test(before), `${m[0]} is inside a try block`);
  }
  const shown = /static alreadyShownToday\(key\) \{[\s\S]*?\n  \}/.exec(code);
  assert.ok(/catch \(e\) \{\s*return false;/.test(shown[0]),
    "unreadable storage reports NOT-shown — showing twice beats breaking a desk load");
});

test("the desk marks the day BEFORE fanning out", () => {
  const fn = /async _maybeShowDailyReminder\(\) \{[\s\S]*?\n  \}/.exec(deskSrc);
  assert.ok(fn, "_maybeShowDailyReminder is found");
  const code = stripComments(fn[0]);
  const markAt = code.indexOf("markShownToday");
  const fetchAt = code.indexOf("fetchService");
  assert.ok(markAt > -1 && fetchAt > -1);
  assert.ok(
    markAt < fetchAt,
    "the day is consumed BEFORE the request — two quick desk loads would otherwise both pass the check and fan out across every workspace twice",
  );
  assert.ok(
    /SERVICE\.activity && SERVICE\.activity\.daily_digest/.test(code),
    "the activity namespace is guarded — it lives only in the backend map, so it can be undefined",
  );
  assert.ok(/day: key/.test(code) && /stime:/.test(code) && /etime:/.test(code),
    "the viewer's own day window is what gets sent");
  assert.ok(!/getUTC/.test(code), "the window is built from local date parts");
});

test("the widget kind is registered, or Wm.launch silently never resolves", () => {
  const seeds = readFileSync(join(ROOT, "src/drumee/seeds.js"), "utf8");
  assert.ok(
    /daily_reminder_popup:\s*function/.test(seeds),
    "registered in seeds.js under the name the desk launches",
  );
  assert.ok(
    /builtins\/widget\/daily-reminder-popup/.test(seeds),
    "pointing at the real directory",
  );
  assert.ok(/kind: "daily_reminder_popup"/.test(deskSrc), "and the desk launches that exact kind");
});

test("every locale defines every card key", () => {
  const dir = join(ROOT, "locale");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 6);
  const KEYS = [
    "DAILY_REMINDER_TITLE", "DAILY_REMINDER_TITLE_NO_NAME",
    "DAILY_REMINDER_MESSAGES_ONE", "DAILY_REMINDER_MESSAGES_OTHER",
    "DAILY_REMINDER_TASKS_ONE", "DAILY_REMINDER_TASKS_OTHER",
    "DAILY_REMINDER_MEETINGS_ONE", "DAILY_REMINDER_MEETINGS_OTHER",
    "DAILY_REMINDER_SUBLINE", "DAILY_REMINDER_NO_CALENDAR", "DAILY_REMINDER_NOTHING",
    "DISCARD", "MY_CALENDAR",
  ];
  const missing = [];
  for (const f of files) {
    const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const k of KEYS) {
      if (!(k in d) || !String(d[k]).trim()) missing.push(`${f}:${k}`);
    }
    // The counted keys must keep their placeholder or the number vanishes.
    for (const k of KEYS.filter((x) => /_(ONE|OTHER)$/.test(x)).concat("DAILY_REMINDER_TITLE")) {
      if (d[k] && !String(d[k]).includes("{0}")) missing.push(`${f}:${k} lost its {0}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("the card matches Figma call-pop-up 58222:35191", () => {
  // Every number here was read off the node itself (file
  // MVL1Q9puypsTAJXvx9whCa, section Notification 58187:57778) on 2026-08-27,
  // NOT off the screenshot. The first build guessed these from the sibling
  // cards and got the tiles, the button radius and every gap wrong, so they
  // are pinned rather than left to drift back.
  const rule = (sel) => {
    const m = new RegExp("&__" + sel + " \\{([\\s\\S]*?)\\n  \\}").exec(skinSrc);
    assert.ok(m, `rule for &__${sel} exists`);
    return m[1];
  };
  const has = (sel, re, why) =>
    assert.ok(re.test(rule(sel)), `${sel}: ${why}`);

  has("card", /gap:\s*32px/, "Figma itemSpacing 32 between the two groups");
  has("card", /border-radius:\s*12px/, "radius 12");
  has("card", /padding:\s*24px/, "padding 24");
  has("card", /width:\s*520px/, "520 wide");
  has("card", /rgba\(0,\s*0,\s*0,\s*0\.3\)/, "shadow is pure black at 30%, not the ink token");
  has("head", /gap:\s*24px/, "title+stats group is gap 24");
  has("foot", /gap:\s*12px/, "sub-line+buttons group is gap 12");
  has("title", /\$line:\s*24px/, "title line-height 24 (via drumee.typo $line)");
  has("title", /#34343a/, "title colour #34343a — Figma Grey/90, no token exists");
  has("stat-tile", /width:\s*32px/, "tile is 32, not the 48 that was guessed");
  has("stat-tile", /border-radius:\s*8px/, "tile radius 8, not 12");
  has("stat-tile", /padding:\s*4px/, "tile padding 4");
  has("stat-tile", /rgba\(89,\s*80,\s*255,\s*0\.1\)/,
    "tile fill is Primary/40 at 10% OPACITY — a wash. --primary-purple-10 is a different colour");
  has("stat-label", /\$line:\s*17px/, "label line-height 17 (via drumee.typo $line)");
  has("subline", /#34343a/, "sub-line colour #34343a");
  has("subline", /\$line:\s*19px/, "sub-line line-height 19 (via drumee.typo $line)");
  has("actions", /gap:\s*12px/, "buttons gap 12, not 16");
  has("btn", /border-radius:\s*4px/, "button radius 4, not 8");
  has("btn", /padding:\s*12px 24px/, "button padding 12/24, not 16/24");
  has("close", /width:\s*14px/, "close icon is 14, not 24");
  has("close", /--tertiary-grey-80/, "close icon is Grey/80, not an opacity fade");
});

test("the card keeps Figma's two-group structure", () => {
  // Flattening these into one evenly spaced column puts the wrong air
  // between every pair — most of why the first build did not match.
  const t = renderCard();
  const head = find(t, "daily-reminder-popup__head");
  const foot = find(t, "daily-reminder-popup__foot");
  assert.ok(head, "title + stats live in one group");
  assert.ok(foot, "sub-line + buttons live in another");
  assert.ok(find(head, "daily-reminder-popup__title"), "title is inside __head");
  assert.ok(find(head, "daily-reminder-popup__stats"), "stats are inside __head");
  assert.ok(find(foot, "daily-reminder-popup__subline"), "sub-line is inside __foot");
  assert.ok(find(foot, "daily-reminder-popup__actions"), "buttons are inside __foot");
  // Both wrappers are pure layout and must not intercept clicks.
  assert.equal(head.active, 0);
  assert.equal(foot.active, 0);
});

test("every typo rule writes font-weight out", () => {
  // drumee.typo maps $weight onto a font-FAMILY and emits no font-weight at
  // all, so a rule that passes $weight and stops there renders at whatever it
  // inherits. Five Phase 1 rules were silently light for exactly this reason.
  const offenders = [];
  for (const m of skinSrc.matchAll(/&__([a-z-]+)\s*\{([\s\S]*?)\n  \}/g)) {
    if (/@include drumee\.typo/.test(m[2]) && !/font-weight:\s*\d+;/.test(m[2])) {
      offenders.push(m[1]);
    }
  }
  assert.deepEqual(offenders, [], "each of these includes drumee.typo but never writes font-weight");
});
