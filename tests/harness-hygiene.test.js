// A harness that shadows a global it also stubs can decide a test by accident.
//
// It happened once: the landing matrix passed `Butler` as a `new Function`
// parameter while also setting `global.Butler` for the assertions to read. The
// extracted code closed over the no-op parameter, so a real pass surfaced as a
// failure. That direction is harmless; the same pattern points the other way
// just as easily, and then a broken feature reads as green.
//
// The rule is mechanical: a test file must not pass a name as a harness
// parameter AND assign that name on `global`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const DIR = __dirname;
const files = readdirSync(DIR).filter((f) => f.endsWith(".test.js"));

// Comments are stripped first. A comment between `new Function(` and its
// parameters can contain a backtick — one does, explaining this very rule —
// which would end the scan before any parameter was seen. That bug made the
// first version of this guard pass while the collision was present.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// Leading string-literal arguments of a `new Function(...)` call are its
// parameter names; the body is the template literal that follows.
function functionParams(src) {
  const names = [];
  const re = /new Function\(([\s\S]*?)`/g;
  let m;
  while ((m = re.exec(stripComments(src)))) {
    for (const s of m[1].matchAll(/"([A-Za-z_$][\w$]*)"/g)) names.push(s[1]);
  }
  return names;
}

const globalAssignments = (src) =>
  [...src.matchAll(/global\.([A-Za-z_$][\w$]*)\s*=/g)].map((m) => m[1]);

test("no harness parameter shadows a global the same file stubs", () => {
  const offences = [];
  for (const f of files) {
    if (f === "harness-hygiene.test.js") continue;
    const src = readFileSync(join(DIR, f), "utf8");
    const params = new Set(functionParams(src));
    for (const g of new Set(globalAssignments(src))) {
      if (params.has(g)) offences.push(`${f}: "${g}" is both a harness parameter and a global`);
    }
  }
  assert.deepEqual(
    offences,
    [],
    "a shadowed global makes the assertion read the stub, not the code under test",
  );
});

test("the guard actually detects the pattern it exists for", () => {
  // Reproduce the original Butler mistake in-memory and confirm it is caught.
  const bad = `
    const landing = new Function("SERVICE", "Butler", \`return {};\`)({}, { say(){} });
    global.Butler = { say: (m) => said.push(m) };
  `;
  const params = new Set(functionParams(bad));
  const globals = new Set(globalAssignments(bad));
  assert.ok(params.has("Butler"), "parameter parsed");
  assert.ok(globals.has("Butler"), "global assignment parsed");
  assert.ok(
    [...globals].some((g) => params.has(g)),
    "the collision is detected",
  );
});
