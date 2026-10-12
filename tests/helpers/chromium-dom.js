// chromium-dom.js — run a function against real DOM in headless Chromium and
// get its JSON result back. `--dump-dom` snapshots the page at load, so the
// function may await promises / MutationObserver callbacks (microtasks) but no
// timers; `--virtual-time-budget` hangs on this machine.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CHROMIUM = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

function runInChromium({ modules = {}, body = "", fn }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chromium-dom-"));
  const load = Object.entries(modules)
    .map(
      ([name, file]) =>
        `<script>var module = { exports: {} };</script>` +
        `<script src="file://${path.resolve(file)}"></script>` +
        `<script>window.__mods = window.__mods || {}; window.__mods[${JSON.stringify(name)}] = module.exports;</script>`,
    )
    .join("\n");
  const run = `<script>
(async () => {
  let res;
  try { res = { ok: true, value: await (${fn.toString()})(window.__mods || {}, document) }; }
  catch (e) { res = { ok: false, error: String((e && e.stack) || e) }; }
  document.getElementById("__out").textContent =
    btoa(unescape(encodeURIComponent(JSON.stringify(res))));
})();
</script>`;
  const file = path.join(dir, "index.html");
  fs.writeFileSync(
    file,
    `<!doctype html><meta charset="utf-8"><body>${body}<pre id="__out"></pre>${load}${run}</body>`,
  );
  try {
    const html = execFileSync(
      CHROMIUM,
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--allow-file-access-from-files",
        `--user-data-dir=${path.join(dir, "profile")}`,
        "--dump-dom",
        `file://${file}`,
      ],
      { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "ignore"] },
    );
    const m = html.match(/<pre id="__out">([^<]*)<\/pre>/);
    if (!m || !m[1]) throw new Error("page produced no result (did it wait on a timer?)");
    const res = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
    if (!res.ok) throw new Error(res.error);
    return res.value;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { CHROMIUM, runInChromium };
