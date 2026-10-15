// tests/dmz-meeting-password.test.js — a password-protected meeting link.
//
// dmz.login answers REQUIRED_PASSWORD for such a link, and the guest page used
// to draw the lobby anyway: Join then failed with "insufficient privilege" and
// there was nowhere to type the password. The page now shows the gate
// (Figma 1693:168688) and goes on to the lobby once the password is accepted.
//
//   node --test tests/dmz-meeting-password.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"), EntryBox: node("EntryBox"), Image: { Svg: node("Image.Svg") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._a = { password: "password", commit: "commit", token: "token", socker_id: "socker_id" };

const DIR = path.join(__dirname, "../src/drumee/modules/dmz/meeting");
const gate = require(path.join(DIR, "skeleton/password.js"));
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");

const walk = (n, out = []) => {
  if (!n || typeof n !== "object") return out;
  out.push(n);
  for (const k of [].concat(n.kids || [])) walk(k, out);
  return out;
};
const ui = { fig: { family: "dmz-meeting" } };

test("the gate names the meeting and who shared it, and submits from the field and the button", () => {
  const all = walk(gate(ui, { filename: "Weekly retro", sender: "Lan Anh" }));
  const text = all.map((n) => n.content).filter(Boolean);
  assert.ok(text.includes("Weekly retro"));
  assert.ok(text.includes(`${en.SECURE_SHARE_SHARED_BY_PREFIX} Lan Anh`));
  assert.ok(text.includes(en.DMZ_MEETING_PASSWORD_PROTECTED));
  // Enter in the field and the Continue button both submit.
  const submit = all.filter((n) => n.service === "dmz-submit-password");
  assert.equal(submit.length, 2);
  assert.ok(submit.some((n) => n.sys_pn === "ref-password" && n.type === "password" && n.mode === "commit"));
  assert.ok(submit.some((n) => n.content === en.CONTINUE));
  assert.ok(all.some((n) => n.sys_pn === "password-error"));
  // An owner with no name: no "Share by" line at all, and a generic title.
  const bare = walk(gate(ui, { sender: " " })).map((n) => n.content).filter(Boolean);
  assert.ok(bare.includes(en.MEETING));
  assert.ok(!bare.some((t) => t.startsWith(en.SECURE_SHARE_SHARED_BY_PREFIX)));
});

test("the page shows the gate for REQUIRED_PASSWORD instead of the lobby", () => {
  const body = sliceFunction(SRC, "async loadWindowManager()");
  const gateAt = body.indexOf('data.status === "REQUIRED_PASSWORD"');
  assert.ok(gateAt > 0, "no REQUIRED_PASSWORD branch");
  assert.ok(gateAt < body.indexOf('require("./skeleton/lobby")'), "the lobby is drawn before the gate");
  assert.ok(body.indexOf("data.validity != 'TICKET_OK'") < gateAt, "a dead link asks for its password");
});

const submit = new Function("SERVICE", "LOCALE", "Visitor", "_a",
  `return ${sliceFunction(SRC, "async _submitPassword()")}`);

function page(answer) {
  const calls = { login: [], again: 0, error: null };
  const self = {
    mget: (k) => (k === "token" ? "tok" : null),
    ensurePart: async (pn) =>
      pn === "ref-password"
        ? { getData: () => ({ value: " secret " }) }
        : { set: (o) => { calls.error = o.content; } },
    postService: async (svc, args) => { calls.login.push({ svc, password: args.password }); return answer; },
    loadWindowManager: async () => { calls.again++; },
  };
  const fn = submit({ dmz: { login: "dmz.login" } }, en, { get: () => "s" }, global._a);
  return { run: () => fn.call(self), calls };
}

test("a right password goes on to the lobby; a wrong one says so", async () => {
  const ok = page({ is_verified: 1 });
  await ok.run();
  // Sent as typed, spaces included: that is how the calendar saved it.
  assert.deepEqual(ok.calls.login, [{ svc: "dmz.login", password: " secret " }]);
  assert.equal(ok.calls.again, 1);

  // dmz.login's answer to a refused password.
  const wrong = page({ failed: 1, error: "INVALID_CREDENTIAL", validity: "INVALID_CREDENTIAL" });
  await wrong.run();
  assert.equal(wrong.calls.again, 0);
  assert.equal(wrong.calls.error, en.SECURE_SHARE_WRONG_PASSWORD);
});

test("only a refused password says it was wrong", async () => {
  // The app extends String with format(); the test gives it the same one.
  if (!String.prototype.format) {
    String.prototype.format = function (...a) { return this.replace(/\{(\d+)\}/g, (m, i) => a[i]); };
  }
  const paused = page({ status: "TOO_MANY_ATTEMPTS", retry_after: 600 });
  await paused.run();
  assert.equal(paused.calls.error, en.TOO_MANY_ATTEMPTS.format("10:00"));

  // A right password the server could not take (served from the wrong area).
  const area = page({ failed: 1, error: "WRONG_AREA", validity: "WRONG_AREA" });
  await area.run();
  assert.equal(area.calls.error, en.SOMETHING_WENT_WRONG);
});
