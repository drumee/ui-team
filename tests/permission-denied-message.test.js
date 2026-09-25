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
global._a = { privilege: "privilege", hub_id: "hub_id", destination: "destination" };
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

// --- server 403 → popup (onServerComplain hook) --------------------------
const NEW_KEYS = [
  "PERMISSION_ACTION_COPY", "PERMISSION_ACTION_DELETE", "PERMISSION_ACTION_RENAME",
  "PERMISSION_ACTION_CREATE_FOLDER", "PERMISSION_ACTION_SAVE", "PERMISSION_ACTION_MANAGE_MEMBERS",
  "PERMISSION_ACTION_RENAME_WORKSPACE", "PERMISSION_ACTION_DELETE_WORKSPACE", "PERMISSION_ACTION_MANAGE_SHARE",
];
for (const lang of LANGS) {
  test(`${lang}.json carries every server-refusal action key`, () => {
    const t = require(path.join(ROOT, "locale", `${lang}.json`));
    for (const k of NEW_KEYS) {
      assert.equal(typeof t[k], "string", `${lang}: missing ${k}`);
      assert.ok(t[k].trim(), `${lang}: empty ${k}`);
    }
  });
}

function withButler(fn) {
  const said = [];
  global.Butler = { say: (m) => said.push(m) };
  try { fn(said); } finally { delete global.Butler; }
}
const SVC = "https://team-5202.drumee.in/-/svc/";
const view = (o = {}) => ({ mget: (k) => o[k] });
// Each case needs a fresh throttle window.
function freshModule() {
  delete require.cache[require.resolve(path.join(ROOT, "src/drumee/libs/permission-denied.js"))];
  return require(path.join(ROOT, "src/drumee/libs/permission-denied.js"));
}

test("a refused POST on a user action says what and why", () => {
  const P = freshModule();
  withButler((said) => {
    const handled = P.notifyServerDenied(view({ privilege: 3 }), { status: 403, url: `${SVC}media.copy` });
    assert.equal(handled, true);
    assert.equal(said.length, 1);
    assert.match(said[0], /^You can’t copy items here because your current permission level is View\./);
    assert.ok(P.saidRecently());
  });
});

test("editor namespace varies: any *.new_doc is 'create documents'", () => {
  const P = freshModule();
  withButler((said) => {
    P.notifyServerDenied(view({ privilege: 7 }), { status: 403, url: `${SVC}euroffice.new_doc` });
    assert.match(said[0], /create documents .* is Chat\./);
  });
});

test("GETs, other statuses, and services off the allowlist stay silent", () => {
  const P = freshModule();
  withButler((said) => {
    assert.equal(P.notifyServerDenied(view({ privilege: 3 }), { status: 403, url: `${SVC}media.copy?nid=1` }), false);
    assert.equal(P.notifyServerDenied(view({ privilege: 3 }), { status: 401, url: `${SVC}media.copy` }), false);
    assert.equal(P.notifyServerDenied(view({ privilege: 3 }), { status: 500, url: `${SVC}media.copy` }), false);
    // quiet calls the UI makes on its own
    for (const s of ["secure_share.list", "secure_share.access_list", "secure_share.mark_open_seen",
      "channel.enter", "hub.get_statistics", "media.get_lock"]) {
      assert.equal(P.notifyServerDenied(view({ privilege: 3 }), { status: 403, url: `${SVC}${s}` }), false, s);
    }
    // a 200 carrying `error`, a network TypeError, nothing at all
    assert.equal(P.notifyServerDenied(view(), { error: "limit_exceeded" }), false);
    assert.equal(P.notifyServerDenied(view(), new TypeError("Failed to fetch")), false);
    assert.equal(P.notifyServerDenied(view(), undefined), false);
    assert.equal(said.length, 0);
    assert.equal(P.saidRecently(), false);
  });
});

test("a multi-file refusal is said once", () => {
  const P = freshModule();
  withButler((said) => {
    for (let i = 0; i < 5; i++) {
      assert.equal(P.notifyServerDenied(view({ privilege: 3 }), { status: 403, url: `${SVC}media.move` }), true);
    }
    assert.equal(said.length, 1);
  });
});

test("an admin refused an owner-only action is not told to ask an admin", () => {
  const P = freshModule();
  withButler((said) => {
    P.notifyServerDenied(view({ privilege: 31 }), { status: 403, url: `${SVC}hub.delete_hub` });
    assert.equal(said[0], en.WEAK_PRIVILEGE);
  });
});

test("the level comes from the workspace the request aimed at", () => {
  const P = freshModule();
  global.Wm = { _findWorkspaceWindow: (id) => (id === "dest" ? { mget: () => 7 } : null) };
  try {
    withButler((said) => {
      // tile carries the SOURCE privilege (15); the paste targets `dest` (7)
      P.notifyServerDenied(view({ privilege: 15, hub_id: "src", destination: { hub_id: "dest" } }),
        { status: 403, url: `${SVC}media.copy` });
      assert.match(said[0], /is Chat\./);
    });
  } finally { delete global.Wm; }
});

test("sayWeakPrivilege falls back to Wm.alert without Butler", () => {
  const P = freshModule();
  const alerts = [];
  global.Wm = { alert: (m) => alerts.push(m) };
  try {
    P.sayWeakPrivilege(en.PERMISSION_ACTION_COPY, 3, 8);
    assert.match(alerts[0], /copy items here .* is View\./);
  } finally { delete global.Wm; }
});
