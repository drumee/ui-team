// Campaign click reporting.
//
// Campaign links tag the URL FRAGMENT (#/welcome/signin?utm_*), and a fragment
// is never transmitted — nginx receives only the path, so the access log
// cannot hold the tags and the dashboard's click count has nothing to read.
// Measured on stage: a real click on such a link logged exactly "/-/huan/".
// The browser is the only party that can see those tags, so it reports them.
//
// What matters here is that the report is fired for a campaign arrival and
// ONLY for one — a beacon on every page load would count every visit as a
// campaign click — and that it can never throw, because it runs in front of
// someone trying to reach a signin form.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = readFileSync(join(__dirname, "../src/drumee/libs/campaign.js"), "utf8");

/** Lift the real function, with the constants it closes over. */
function lift(env) {
  const grab = (re) => {
    const m = SRC.match(re);
    assert.ok(m, `could not lift ${re}`);
    return m[0];
  };
  const body = [
    grab(/const MAX_LEN\s*=\s*\d+;/),
    grab(/const PARAMS = new Set\([^)]*\);/),
    grab(/const CLICK_SERVICE = "[^"]*";/),
    grab(/function readUrlMarkers\(\)[\s\S]*?\n\}/),
    grab(/function reportCampaignClick\([\s\S]*?\n\}/),
  ].join("\n");
  const fn = new Function(
    "location", "document", "fetch", "bootstrap", "Visitor",
    `${body}\n return { reportCampaignClick, readUrlMarkers };`
  );
  return fn(env.location, env.document, env.fetch, env.bootstrap, env.Visitor);
}

function env(hash, opt = {}) {
  const calls = [];
  return {
    calls,
    api: lift({
      location: { hash, search: "", pathname: "/-/huan/" },
      document: { referrer: "" },
      fetch: opt.noFetch ? undefined : (url, o) => { calls.push({ url, o }); return Promise.resolve({}); },
      bootstrap: opt.noBootstrap ? undefined : () => ({ svc: opt.noSvc ? null : "https://drumee.in/-/huan/svc/" }),
      Visitor: {
        parseModuleArgs: () => {
          const out = {};
          String(hash || "").split(/[#/&?]/).forEach((p) => {
            const i = p.indexOf("=");
            if (i > 0) out[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
          });
          return out;
        },
      },
    }),
  };
}

const LINK = "#/welcome/signin?utm_campaign=soft-lauch&utm_source=gmail&utm_medium=organic&utm_content=content";

test("a campaign arrival is reported", () => {
  const e = env(LINK);
  assert.equal(e.api.reportCampaignClick(e.api.readUrlMarkers()), true);
  assert.equal(e.calls.length, 1);
});

test("the report carries every tag the link had", () => {
  const e = env(LINK);
  e.api.reportCampaignClick(e.api.readUrlMarkers());
  const url = e.calls[0].url;
  for (const kv of ["utm_campaign=soft-lauch", "utm_source=gmail",
                    "utm_medium=organic", "utm_content=content"]) {
    assert.ok(url.includes(kv), `${kv} missing from the report`);
  }
  // The server reconstructs a loggable url from these; distribution_clicks
  // parses `[?&]utm_campaign=` out of it and needs no change.
  assert.ok(url.includes("/svc/analytics.utm_click?"), "wrong service");
});

test("keepalive is set, or the routing that follows cancels it", () => {
  const e = env(LINK);
  e.api.reportCampaignClick(e.api.readUrlMarkers());
  assert.equal(e.calls[0].o.keepalive, true);
});

test("an ordinary page load reports NOTHING", () => {
  // Without this guard every visit would count as a campaign click.
  const e = env("#/welcome/signin");
  assert.equal(e.api.reportCampaignClick(e.api.readUrlMarkers()), false);
  assert.equal(e.calls.length, 0);
});

test("a link with tags but no campaign reports nothing", () => {
  const e = env("#/welcome/signin?utm_source=gmail");
  assert.equal(e.api.reportCampaignClick(e.api.readUrlMarkers()), false);
});

test("it never throws when the environment is incomplete", () => {
  // Each of these is legitimately absent somewhere: an old UA with no fetch,
  // a page that has not booted, a bootstrap with no service base.
  for (const opt of [{ noFetch: 1 }, { noBootstrap: 1 }, { noSvc: 1 }]) {
    const e = env(LINK, opt);
    assert.doesNotThrow(() => {
      assert.equal(e.api.reportCampaignClick(e.api.readUrlMarkers()), false);
    }, `threw with ${JSON.stringify(opt)}`);
  }
});

test("it is fired from the arrival hook, before the URL is consumed", () => {
  // captureCampaignArrival strips the tags; reporting after that would send
  // nothing. The order is the whole contract.
  const arrival = SRC.match(/function captureCampaignArrival\(\)[\s\S]*?\n\}/)[0]
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const report = arrival.indexOf("reportCampaignClick(");
  const strip = arrival.indexOf("stripCampaignParams()");
  assert.ok(report > -1, "the arrival hook never reports the click");
  assert.ok(report < strip, "reporting after the strip would send no tags");
});
