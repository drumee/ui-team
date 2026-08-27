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
      DAILY_REMINDER_MESSAGES: "{0} unread messages",
      DAILY_REMINDER_TASKS: "{0} due tasks",
      DAILY_REMINDER_MEETINGS: "{0} meetings",
      DAILY_REMINDER_SUBLINE: "Check your calendar now",
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
  const t = renderCard({
    getCounts: () => ({ unread_messages: "<b>x</b>", due_tasks: -7, meetings: null }),
  });
  const labels = findAll(t, "daily-reminder-popup__stat-label").map((n) => n.content);
  assert.deepEqual(labels, ["0 unread messages", "0 due tasks", "0 meetings"]);
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

test("the desk marks the day BEFORE fanning out, and skips an all-zero day", () => {
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
  assert.ok(/if \(total <= 0\) return;/.test(code), "an all-zero day renders nothing");
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

test("every locale defines all nine keys", () => {
  const dir = join(ROOT, "locale");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 6);
  const KEYS = [
    "DAILY_REMINDER_TITLE", "DAILY_REMINDER_TITLE_NO_NAME", "DAILY_REMINDER_MESSAGES",
    "DAILY_REMINDER_TASKS", "DAILY_REMINDER_MEETINGS", "DAILY_REMINDER_SUBLINE",
    "DAILY_REMINDER_NO_CALENDAR", "DISCARD", "MY_CALENDAR",
  ];
  const missing = [];
  for (const f of files) {
    const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const k of KEYS) {
      if (!(k in d) || !String(d[k]).trim()) missing.push(`${f}:${k}`);
    }
    // The counted keys must keep their placeholder or the number vanishes.
    for (const k of ["DAILY_REMINDER_MESSAGES", "DAILY_REMINDER_TASKS", "DAILY_REMINDER_MEETINGS", "DAILY_REMINDER_TITLE"]) {
      if (d[k] && !String(d[k]).includes("{0}")) missing.push(`${f}:${k} lost its {0}`);
    }
  }
  assert.deepEqual(missing, []);
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
