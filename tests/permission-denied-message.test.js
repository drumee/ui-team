// The "not enough permission" popup names the refused action and the viewer's
// level (Lexis, 2026-09-24), and falls back to the old generic sentence when
// the level is unknown or is not the reason.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const ROOT = path.join(__dirname, "..");
const LANGS = ["en", "es", "fr", "km", "ru", "zh"];
const KEYS = [
  "PERMISSION_DENIED_ACTION",
  "PERMISSION_ACTION_UPLOAD", "PERMISSION_ACTION_IMPORT",
  "PERMISSION_ACTION_CREATE_NOTE", "PERMISSION_ACTION_CREATE_DOCUMENT",
  "PERMISSION_ACTION_INVITE", "PERMISSION_ACTION_EDIT_TASKS",
  "PERMISSION_ACTION_SHARE", "PERMISSION_ACTION_MOVE",
];

for (const lang of LANGS) {
  test(`${lang}.json carries every permission-denied key`, () => {
    const t = require(path.join(ROOT, "locale", `${lang}.json`));
    for (const k of KEYS) {
      assert.equal(typeof t[k], "string", `${lang}: missing ${k}`);
      assert.ok(t[k].trim(), `${lang}: empty ${k}`);
    }
    assert.ok(t.PERMISSION_DENIED_ACTION.includes("{0}"), `${lang}: no {0}`);
    assert.ok(t.PERMISSION_DENIED_ACTION.includes("{1}"), `${lang}: no {1}`);
  });
}

// --- helper, with the runtime globals it reads ---------------------------
const en = require(path.join(ROOT, "locale", "en.json"));
String.prototype.format = function (...args) {
  return args.reduce((s, a, i) => s.replace(new RegExp(`\\{${i}\\}`, "g"), a), `${this}`);
};
global.LOCALE = en;
global._a = { privilege: "privilege" };
global._K = { permission: { admin: 0b0010000, write: 0b0001000, download: 0b0000100 } };

// toolkit/permission is ESM-shaped (webpack only); stand in the same
// strongest-bit resolution so the helper's own logic is what is under test.
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === "builtins/skeleton/toolkit/permission") return "toolkit-permission-stub";
  return origResolve.call(this, req, ...rest);
};
require.cache["toolkit-permission-stub"] = {
  id: "toolkit-permission-stub", filename: "toolkit-permission-stub", loaded: true,
  exports: {
    roleFromPrivilege(p) {
      if (p & 16) return { label: en.ROLE_ADMIN };
      if (p & 8) return { label: en.ROLE_EDIT };
      if (p & 4) return { label: en.ROLE_CHAT };
      return { label: en.ROLE_VIEW };
    },
  },
};
const PD = require(path.join(ROOT, "src/drumee/libs/permission-denied.js"));

test("names the action and the level (Lexis template)", () => {
  assert.equal(
    PD.weakPrivilegeMessage(en.PERMISSION_ACTION_UPLOAD, 3, 8),
    "You can’t upload files because your current permission level is View.<br>"
      + "Please ask an admin to grant you a higher access level to perform this action.",
  );
  assert.match(PD.weakPrivilegeMessage(en.PERMISSION_ACTION_CREATE_NOTE, 7, 8), /create notes .* is Chat\./);
  assert.match(PD.weakPrivilegeMessage(en.PERMISSION_ACTION_INVITE, 15, 16), /invite members .* is Edit\./);
});

test("falls back to the generic sentence when the level is unknown", () => {
  for (const p of [undefined, null, 0, ""]) {
    assert.equal(PD.weakPrivilegeMessage(en.PERMISSION_ACTION_UPLOAD, p, 8), en.WEAK_PRIVILEGE);
  }
  assert.equal(PD.weakPrivilegeMessage("", 3, 8), en.WEAK_PRIVILEGE);
});

test("falls back when the level already holds the needed right", () => {
  // a shortcut link refuses an upload even to an editor
  assert.equal(PD.weakPrivilegeMessage(en.PERMISSION_ACTION_UPLOAD, 15, 8), en.WEAK_PRIVILEGE);
  assert.equal(PD.weakPrivilegeMessage(en.PERMISSION_ACTION_INVITE, 31, 16), en.WEAK_PRIVILEGE);
});

test("workspacePrivilege reads the workspace window, 0 when unknown", () => {
  global.Wm = {
    _curWorkspace: { hub_id: "h1" },
    _findWorkspaceWindow: (id) => (id === "h1" ? { mget: () => 7 } : null),
  };
  assert.equal(PD.workspacePrivilege(), 7);
  assert.equal(PD.workspacePrivilege("h1"), 7);
  assert.equal(PD.workspacePrivilege("other"), 0);
  delete global.Wm;
  assert.equal(PD.workspacePrivilege(), 0);
});
