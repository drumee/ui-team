// conference.start → the "a meeting has begun" card (Phase 2, meeting half).
//
// The toast itself already existed and is deliberately left alone — its
// capture-phase click delegate is hard-won. All that was missing was the
// wiring, and the wiring is where the hazards are, so that is what these
// tests pin:
//
//  1. conference.start is matched as a STRING LITERAL. SERVICE.conference has
//     no `start` key — it is a push, not an ACL method (verified against the
//     live get_env and against acl/conference.json, which lists twelve
//     services and no `start`). `case SERVICE.conference.start:` would
//     therefore compile to `case undefined:` and swallow every push that
//     arrives without a service.
//  2. A P2P call must never raise a meeting card. conference.js calls
//     `inform(..., "conference.start")` for EVERY room type before the
//     meeting-only hub fan-out beneath it, and conference_join selects a
//     hub_id onto every row — so hub_id cannot tell a call from a meeting.
//     Only the hub fan-out stamps room_type.
//  3. The starter's own other tabs must stay quiet. entity_sockets excludes
//     by SOCKET id (`AND s.id NOT IN (...)`), not by uid.
//  4. A reminder card already on screen for that workspace wins; the two
//     pushes carry different ids for the same meeting (the reminder sends the
//     meeting node's nid, conference_join returns the room id), so the
//     per-key dedup inside _showMeetingToast cannot see they are the same.
//
// The real method bodies are sliced out of push.js and executed, so these
// cannot drift from the shipped code.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const PUSH = join(__dirname, "../src/drumee/modules/desk/wm/push.js");
const src = readFileSync(PUSH, "utf8");

// Comments are stripped before any "this must NOT appear" check. The comment
// above the conference.start case explains why `case SERVICE.conference.start:`
// would be wrong — and spells it out verbatim, which made the first version of
// that guard fail on its own documentation. Same trap harness-hygiene.test.js
// records.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// Slice a class method's body. The parameter list is balanced first because
// `_showMeetingStartToast(data = {})` carries a `{}` default — taking the
// first brace after the name would grab that instead of the body.
function methodBody(name) {
  const at = src.indexOf(`\n  ${name}(`);
  assert.ok(at > -1, `${name} moved or was renamed`);
  let depth = 0;
  let i = src.indexOf("(", at);
  for (; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) break;
  }
  const open = src.indexOf("{", i);
  let braces = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") braces++;
    else if (src[j] === "}" && --braces === 0) return src.slice(open + 1, j);
  }
  throw new Error(`unbalanced braces in ${name}`);
}

if (!String.prototype.format) {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  };
}

// `_a` is a createSafeObject proxy at runtime: a key it does not define
// resolves to the key's own name, so `_a.meeting` is the string "meeting".
const attr = new Proxy({}, { get: (_t, k) => String(k) });
const LOC = {
  MEETING_STARTED: "Meeting Started",
  X_STARTED_A_MEETING: "{0} started a meeting",
};

const START = methodBody("_showMeetingStartToast");
const HAS = methodBody("_hasLiveMeetingToastFor");

// "_a" / "Visitor" / "LOCALE" / "data" are harness parameters and are never
// assigned on global in this file — see harness-hygiene.test.js.
const runStart = new Function(
  "_a",
  "Visitor",
  "LOCALE",
  "data",
  `return (function(){ ${START} }).call(this);`,
);
const runHas = new Function("hub_id", `return (function(){ ${HAS} }).call(this);`);

const ME = "me-uid";

// Drives the real body. `live` seeds the toast map the way _showMeetingToast
// does, so the "already on screen" guard is exercised through the real
// _hasLiveMeetingToastFor rather than a stub of it.
function start(payload, live = []) {
  const shown = [];
  const warned = [];
  const self = {
    _meetingToasts: new Map(
      live.map((l, n) => [
        `k${n}`,
        {
          isDestroyed: () => !!l.destroyed,
          el: { getAttribute: (k) => (k === "data-hub" ? l.hub : null) },
        },
      ]),
    ),
    _showMeetingToast: (d, o) => shown.push({ data: d, opt: o }),
    warn: (...a) => warned.push(a),
  };
  self._hasLiveMeetingToastFor = (h) => runHas.call(self, h);
  runStart.call(self, attr, { id: ME }, LOC, payload);
  return { shown, warned, map: self._meetingToasts };
}

const meeting = (over = {}) => ({
  room_type: "meeting",
  hub_id: "HUB1",
  room_id: "ROOM1",
  uid: "someone-else",
  username: "Duy Nguyen",
  hub_name: "Marketing",
  ...over,
});

// ---------------------------------------------------------------- guards

test("a P2P call never raises a meeting card", () => {
  // The payload inform() sends for a call: no room_type, but conference_join
  // still put a hub_id on it — which is exactly why hub_id cannot be the test.
  const call = { hub_id: "HUB1", room_id: "ROOM1", uid: "peer", username: "Peer" };
  assert.equal(start(call).shown.length, 0);
  assert.ok(call.hub_id, "the call payload really does carry a hub_id");

  // And an explicitly non-meeting room type.
  assert.equal(start(meeting({ room_type: "connect" })).shown.length, 0);
});

test("the starter's own other tabs stay quiet", () => {
  assert.equal(start(meeting({ uid: ME })).shown.length, 0);
  // Somebody else starting it still shows.
  assert.equal(start(meeting({ uid: "other" })).shown.length, 1);
});

test("a payload with no hub_id is dropped rather than opening an unjoinable card", () => {
  // _joinMeetingFromData returns immediately without a hub_id, so a card built
  // from one would render a Join button that silently does nothing.
  assert.equal(start(meeting({ hub_id: "" })).shown.length, 0);
});

test("a card already on screen for that workspace wins", () => {
  assert.equal(start(meeting(), [{ hub: "HUB1" }]).shown.length, 0);
  // A card for a DIFFERENT workspace must not suppress this one.
  assert.equal(start(meeting(), [{ hub: "HUB2" }]).shown.length, 1);
  // A destroyed card is not "on screen".
  assert.equal(start(meeting(), [{ hub: "HUB1", destroyed: true }]).shown.length, 1);
});

test("_hasLiveMeetingToastFor sweeps destroyed entries and never matches an empty hub", () => {
  const { map } = start(meeting(), [{ hub: "HUB1", destroyed: true }]);
  assert.equal(map.size, 0, "the destroyed entry was swept, as _showMeetingToast does");
  // room.scheduled carries no hub_id, so its card renders data-hub="". An
  // empty hub must never match it.
  assert.equal(start(meeting({ hub_id: "" }), [{ hub: "" }]).shown.length, 0);
});

// ---------------------------------------------------------------- payload

test("the card is the 'now' flavour, so it offers Join", () => {
  const { shown } = start(meeting());
  assert.equal(shown.length, 1);
  // reminder:1 plus no lead_min is what _showMeetingToast reads as "now".
  assert.deepEqual(shown[0].opt, { reminder: 1 });
  assert.equal(shown[0].data.lead_min, undefined);
});

test("the workspace is the heading and the sentence never repeats it", () => {
  const { shown } = start(meeting());
  assert.equal(shown[0].data.title, "Marketing");
  assert.equal(shown[0].data.message, "Duy Nguyen started a meeting");
  assert.ok(
    !shown[0].data.message.includes("Marketing"),
    "the workspace must not be named twice on one card",
  );
});

test("details.filename wins over hub_name, and hub_name is the fallback", () => {
  // details is mfs_node_attr(room_id) against the hub's own db and comes back
  // EMPTY for a meeting, which is why the server carries hub_name too.
  const withDetails = start(meeting({ details: { filename: "Design" } }));
  assert.equal(withDetails.shown[0].data.title, "Design");
  const empty = start(meeting({ details: {} }));
  assert.equal(empty.shown[0].data.title, "Marketing");
});

test("no workspace name falls back to the heading rather than rendering blank", () => {
  const { shown } = start(meeting({ hub_name: "" }));
  assert.equal(shown[0].data.title, "Meeting Started");
});

test("an unnamed starter yields no sentence at all, never a dangling one", () => {
  const { shown } = start(
    meeting({ username: "", firstname: "", lastname: "", email: "" }),
  );
  assert.equal(shown[0].data.message, "");
  assert.equal(shown[0].data.title, "Marketing", "the heading still stands alone");
});

test("the name falls back the same way the switchcall popup does", () => {
  const only = (over) => start(meeting({ username: "", firstname: "", lastname: "", email: "", ...over })).shown[0].data.message;
  assert.equal(only({ username: "U" }), "U started a meeting");
  assert.equal(only({ firstname: "F" }), "F started a meeting");
  assert.equal(only({ lastname: "L" }), "L started a meeting");
  assert.equal(only({ email: "e@x.io" }), "e@x.io started a meeting");
  // Precedence: username first.
  assert.equal(only({ username: "U", firstname: "F" }), "U started a meeting");
});

test("room_id keys the card and falls back to hub_id", () => {
  assert.equal(start(meeting()).shown[0].data.room_id, "ROOM1");
  assert.equal(start(meeting({ room_id: "" })).shown[0].data.room_id, "HUB1");
  // hub_id is always carried through — _joinMeetingFromData needs it.
  assert.equal(start(meeting({ room_id: "" })).shown[0].data.hub_id, "HUB1");
});

test("a thrown error is contained, never propagated to the ws dispatcher", () => {
  const self = {
    _hasLiveMeetingToastFor: () => false,
    _showMeetingToast: () => {
      throw new Error("boom");
    },
    warn: () => {},
  };
  assert.doesNotThrow(() => runStart.call(self, attr, { id: ME }, LOC, meeting()));
});

// ---------------------------------------------------------------- wiring

test("conference.start is matched as a string literal, not SERVICE.conference.start", () => {
  assert.ok(
    /case "conference\.start":/.test(code),
    "the ws case must be the literal — SERVICE.conference has no `start` key",
  );
  assert.ok(
    !/case\s+SERVICE\.conference\.start\s*:/.test(code),
    "SERVICE.conference.start is undefined; that case would swallow every " +
      "push with no service",
  );
  // The guard above is only worth anything if comment-stripping actually ran.
  assert.ok(
    /case SERVICE\.conference\.start:/.test(src),
    "the comment explaining this hazard was removed — if it is gone, so is " +
      "the reason the next reader keeps the literal",
  );
});

test("the conference.start case routes to the guarded handler, not straight to the toast", () => {
  const at = src.indexOf('case "conference.start":');
  assert.ok(at > -1);
  const body = src.slice(at, at + 200);
  assert.ok(
    /_showMeetingStartToast\(/.test(body),
    "calling _showMeetingToast directly would skip the room_type, self and " +
      "duplicate guards",
  );
});

test("the toast carries data-hub, which is what the duplicate guard reads", () => {
  assert.ok(
    /"data-hub":\s*String\(data\.hub_id \|\| ""\)/.test(src),
    "_hasLiveMeetingToastFor reads data-hub off the live card",
  );
  // The existing variant attribute must survive alongside it.
  assert.ok(/"data-variant":\s*variant/.test(src), "data-variant must not be dropped");
});

// ------------------------------------------------- Cancel == close == ✕

// Figma's meeting card labels the secondary button "Mute"; the designer has
// not updated that node yet. Duy's ruling 2026-08-25: on the MEETING popup it
// is Cancel, it only closes the card, and it writes nothing — mute belongs to
// the chat card alone, where Phase 3 wires it.
test("the meeting card's secondary action is Cancel, never Mute or Dismiss", () => {
  assert.ok(
    /content: LOCALE\.CANCEL/.test(code),
    "the secondary button must be labelled Cancel",
  );
  assert.ok(
    !/content: LOCALE\.DISMISS/.test(code),
    "the old Dismiss label must be gone",
  );
  assert.ok(
    !/LOCALE\.MUTE/.test(code),
    "the meeting popup must have NO mute entry point — that is chat-only",
  );
});

test("every meeting card lives 30 s — one lifetime, no variant split", () => {
  // Duy, 2026-08-26: meeting cards last 30 s, the same as the chat toast.
  const m = src.match(/const MEETING_TOAST_MS = (\d+);/);
  assert.ok(m, "MEETING_TOAST_MS must exist as a named constant");
  assert.equal(Number(m[1]), 30000, "meeting card lifetime");

  // It must be USED, not merely declared.
  assert.ok(
    /setTimeout\(kill, MEETING_TOAST_MS\)/.test(code),
    "the auto-dismiss must use the constant",
  );

  // 🚨 The old split was `variant === "now" ? 20000 : 8000` — the actionable
  // card lingered while the informational ones cleared in 8 s. That is
  // deliberately gone: an invitation names an organiser, a folder and an
  // attendee count, which is more than 8 s of reading. If a raw number comes
  // back into the dismiss call, the distinction has been silently reinstated.
  assert.ok(
    !/setTimeout\(kill,[^)]*\d{4}/.test(code),
    "no hard-coded duration in the dismiss call",
  );
  assert.ok(
    !/variant === "now" \?\s*\d+/.test(code),
    "the per-variant lifetime split must not return",
  );

  // The two surfaces must agree: same layer, same look, same clock.
  const chat = readFileSync(
    join(__dirname, "../src/drumee/builtins/panel/activity/chat-toast.js"), "utf8",
  ).match(/const CHAT_TOAST_MS = (\d+);/);
  assert.ok(chat, "CHAT_TOAST_MS must exist");
  assert.equal(Number(chat[1]), Number(m[1]),
    "the chat toast and the meeting cards must share one lifetime");
});

test("Cancel still shares the close path, so it cannot drift from ✕", () => {
  // The class keeps its `__dismiss` name on purpose: the capture-phase
  // delegate matches on it and must not be re-plumbed. Only the label moved.
  assert.ok(
    /className: "desk-meeting-toast__dismiss"/.test(code),
    "the class must not be renamed — the delegate selector depends on it",
  );
  const sel = code.indexOf(
    't.closest(".desk-meeting-toast__close, .desk-meeting-toast__dismiss")',
  );
  assert.ok(sel > -1, "✕ and Cancel must be handled by ONE branch");
});

test("Cancel writes nothing — it never calls the server or joins the room", () => {
  // Isolate the ✕/Cancel branch and prove it only closes.
  const at = code.indexOf(
    't.closest(".desk-meeting-toast__close, .desk-meeting-toast__dismiss")',
  );
  assert.ok(at > -1);
  const branch = code.slice(at, code.indexOf("}", code.indexOf("kill()", at)));
  assert.ok(/kill\(\)/.test(branch), "it closes the card");
  for (const forbidden of ["postService", "fetchService", "SERVICE.", "_joinMeetingFromData"]) {
    assert.ok(
      !branch.includes(forbidden),
      `Cancel must not ${forbidden} — it does not cancel the meeting`,
    );
  }
});

// ------------------------------------------------------- card CONTENT vs Figma
//
// Duy, 2026-08-25: "why is the content in the meeting cards not the same as
// Figma?" The styling pass matched the box; these pin the TEXT inside it,
// against the captured `type=schedule` node (component 2561:154660):
//
//   title + live dot / description / avatars + count + "- Start at 9:00 AM"
//
// The real _showMeetingToast body is sliced and executed, so the variant logic
// is exercised rather than described.
const BUILD = methodBody("_showMeetingToast");

// All harness parameters — none is assigned on global in this file
// (harness-hygiene.test.js). SHOW_EARLY_MEETING_REMINDER is a MODULE const, so
// a slice of the method cannot see it and it has to be passed in.
const runBuild = new Function(
  "_",
  "_a",
  "Wm",
  "Skeletons",
  "LOCALE",
  "Dayjs",
  "SHOW_EARLY_MEETING_REMINDER",
  "data",
  "opt",
  `return (function(){ ${BUILD} }).call(this);`,
);

const skelNode = (t) => (o = {}) => ({ t, ...o, kids: (o.kids || []).filter(Boolean) });
const SK = {
  Box: { Y: skelNode("y"), X: skelNode("x") },
  Note: skelNode("note"),
  Image: { Svg: skelNode("svg") },
  Button: { Svg: skelNode("btn") },
  Avatar: (ava, cn, name) => ({ t: "avatar", ava, className: cn, name }),
};
const LOC2 = {
  MEETING: "Meeting",
  DISMISS: "Dismiss",
  CANCEL: "Cancel",
  CLOSE: "Close",
  JOIN_MEETING: "Join meeting",
  MEETING_STARTING_NOW: "Your meeting is starting now",
  X_INVITED_COUNT: "{0} invited",
  X_JOINED_COUNT: "{0} joined",
  MEETING_START_AT: "Start at {0}",
  MEETING_START_NOW: "Start now",
  MEETING_INVITE_TITLE: "You have been invited to a Meeting",
  X_INVITED_YOU_JOIN_MEETING_IN: "{0} invited you to join the meeting in {1}",
  X_INVITED_YOU_TO_MEETING: "{0} invited you to a meeting",
};
const DAYJS = { unix: () => ({ format: () => "9:00 AM" }) };

function build(data, opt = {}) {
  let tree = null;
  const layer = { append: (t) => { tree = t; return { el: null, isDestroyed: () => false }; } };
  const self = { _meetingToasts: new Map(), warn: () => {} };
  const realSet = global.setTimeout;
  global.setTimeout = () => 0; // the card's own auto-dismiss
  try {
    runBuild.call(self, require("lodash"), attr, { windowsLayer: layer }, SK, LOC2, DAYJS, 0, data, opt);
  } finally {
    global.setTimeout = realSet;
  }
  return tree;
}
function pick(tree, cn) {
  if (!tree) return null;
  if (tree.className === cn) return tree;
  for (const k of tree.kids || []) { const h = pick(k, cn); if (h) return h; }
  return null;
}
function all(tree, cn, out = []) {
  if (!tree) return out;
  if (tree.className === cn) out.push(tree);
  (tree.kids || []).forEach((k) => all(k, cn, out));
  return out;
}
const say = (tree, cn) => { const n = pick(tree, `desk-meeting-toast__${cn}`); return n ? n.content : null; };

test("Figma's stack shows TWO faces and rolls the rest into +N", () => {
  const t = build({ title: "M", attendees: ["a", "b", "c", "d"], stime: 1 }, { reminder: 1 });
  assert.equal(all(t, "desk-meeting-toast__avatar").length, 2, "two faces, not three");
  assert.equal(say(t, "avatar-more"), "+2", "the remainder is summarised");
});

test("three attendees still overflow, two do not", () => {
  const t3 = build({ title: "M", attendees: ["a", "b", "c"] }, { reminder: 1 });
  assert.equal(say(t3, "avatar-more"), "+1");
  const t2 = build({ title: "M", attendees: ["a", "b"] }, { reminder: 1 });
  assert.equal(pick(t2, "desk-meeting-toast__avatar-more"), null, "no chip when nothing overflows");
});

test("the meta separator is Figma's dash, not a bullet", () => {
  const t = build({ title: "M", attendees: ["a"], stime: 1 }, { reminder: 1 });
  assert.equal(say(t, "dot"), "-");
  assert.notEqual(say(t, "dot"), "•");
});

test("the separator only appears when there is something on both sides", () => {
  const t = build({ title: "M", stime: 1 }, { reminder: 1 });
  assert.equal(pick(t, "desk-meeting-toast__dot"), null, "a lone time needs no separator");
});

// The count says "invited", NOT Figma's "joined". `attendees` is the meeting
// node's INVITEE list (room.js _index_meeting), so we have no join count at
// all — rendering "joined" would state something we cannot know. Deliberate
// deviation; see the note to Duy.
test("the count reports invitees, which is what the data actually is", () => {
  const t = build({ title: "M", attendees: ["a", "b"] }, { reminder: 1 });
  assert.equal(say(t, "count"), "2 invited");
});

test("the reminder always carries a description, as Figma's card does", () => {
  // A meeting booked with no agenda: the slot would otherwise be empty and the
  // card would read as an invitation rather than "go now".
  const t = build({ title: "M", stime: 1 }, { reminder: 1 });
  assert.equal(say(t, "desc"), "Your meeting is starting now");
});

test("a real agenda is never replaced by the fallback", () => {
  const t = build({ title: "M", message: "Bring the deck" }, { reminder: 1 });
  assert.equal(say(t, "desc"), "Bring the deck");
  assert.equal(all(t, "desk-meeting-toast__desc").length, 1, "exactly one description line");
});

test("the invite keeps its own sentence and gains no fallback", () => {
  const t = build({ title: "M", from: "Duy", stime: 1 }, {});
  assert.equal(say(t, "desc"), "<b>Duy</b> invited you to a meeting");
  assert.equal(all(t, "desk-meeting-toast__desc").length, 1);
});

test("an invite with an agenda shows both lines, not the fallback", () => {
  const t = build({ title: "M", from: "Duy", message: "Bring the deck" }, {});
  const lines = all(t, "desk-meeting-toast__desc").map((n) => n.content);
  assert.deepEqual(lines, ["<b>Duy</b> invited you to a meeting", "Bring the deck"]);
});

// --------------------------------------------------- "joined" vs "invited"
//
// Duy, 2026-08-26: "N joined" belongs to a meeting that has STARTED and has
// people in it; "N invited" belongs to a schedule notice where the meeting has
// not started (or it is not yet time) and nobody has joined. So the wording is
// decided by the actual join count, NOT by which push arrived.

test("a started meeting reports who is IN it", () => {
  const t = build({ title: "M", attendees: [{ uid: "a" }, { uid: "b" }], joined: 2 }, { reminder: 1 });
  assert.equal(say(t, "count"), "2 joined");
});

test("a schedule notice reports invitees, because the room is empty", () => {
  const t = build({ title: "M", attendees: ["a", "b", "c"], stime: 1 }, {});
  assert.equal(say(t, "count"), "3 invited");
});

test("a reminder never claims attendance nobody verified", () => {
  // reminderWorker fires at the start time whether or not anyone turned up,
  // and its payload carries no join data at all.
  const t = build({ title: "M", attendees: ["a", "b"], stime: 1 }, { reminder: 1 });
  assert.equal(say(t, "count"), "2 invited");
});

test("joined:0 is treated as no join data, not as zero attendees", () => {
  const t = build({ title: "M", attendees: ["a"], joined: 0 }, { reminder: 1 });
  assert.equal(say(t, "count"), "1 invited");
});

test("the count and the faces come from the same roster", () => {
  const t = build(
    { title: "M", attendees: [{ uid: "a", name: "Ann" }, { uid: "b", name: "Bo" }, { uid: "c", name: "Cy" }], joined: 3 },
    { reminder: 1 },
  );
  assert.equal(say(t, "count"), "3 joined");
  assert.equal(all(t, "desk-meeting-toast__avatar").length, 2, "still two faces");
  assert.equal(say(t, "avatar-more"), "+1");
});

test("conference.start forwards the roster and the count to the card", () => {
  const { shown } = start(
    meeting({ attendees: [{ uid: "a", name: "Ann" }, { uid: "me", name: "Duy" }], joined: 2 }),
  );
  assert.equal(shown.length, 1);
  assert.equal(shown[0].data.joined, 2, "the count must survive the hand-off");
  assert.equal(shown[0].data.attendees.length, 2, "and so must the faces");
});

test("a conference.start with no roster still renders, with no meta line", () => {
  // An older server that predates the roster: the card must not break.
  const { shown } = start(meeting());
  assert.equal(shown[0].data.joined, 0);
  assert.deepEqual(shown[0].data.attendees, []);
  const t = build(shown[0].data, shown[0].opt);
  assert.equal(pick(t, "desk-meeting-toast__count"), null, "no count without data");
});

// ------------------------------------------------------------- "Start now"
//
// Duy, 2026-08-26: a meeting started on the spot must carry the same "when"
// slot as a scheduled one — "N joined - Start now" beside "N invited - Start
// at 9:00 AM". conference.start has no stime (there is nothing to schedule),
// so the slot cannot key off stime alone.

test("an instantly started meeting says 'Start now' beside the count", () => {
  const t = build(
    { title: "M", attendees: [{ uid: "a" }, { uid: "b" }], joined: 2, starts_now: 1 },
    { reminder: 1 },
  );
  assert.equal(say(t, "count"), "2 joined");
  assert.equal(say(t, "dot"), "-");
  assert.equal(say(t, "when"), "Start now");
});

test("a scheduled meeting still prints its clock time, not 'Start now'", () => {
  const t = build({ title: "M", attendees: ["a"], stime: 1 }, {});
  assert.equal(say(t, "when"), "Start at 9:00 AM");
});

test("a real stime wins over the flag, so a scheduled meeting never loses its time", () => {
  const t = build({ title: "M", attendees: ["a"], stime: 1, starts_now: 1 }, { reminder: 1 });
  assert.equal(say(t, "when"), "Start at 9:00 AM");
});

test("'Start now' stands alone when nobody has joined yet", () => {
  // An older server sends no roster, so there is no count to sit beside.
  const t = build({ title: "M", starts_now: 1 }, { reminder: 1 });
  assert.equal(say(t, "when"), "Start now");
  assert.equal(pick(t, "desk-meeting-toast__dot"), null, "no separator with nothing on the left");
});

test("a card with neither a time nor the flag shows no when slot at all", () => {
  const t = build({ title: "M", attendees: ["a"] }, { reminder: 1 });
  assert.equal(pick(t, "desk-meeting-toast__when"), null);
});

test("conference.start sets the flag on the card it builds", () => {
  const { shown } = start(meeting({ attendees: [{ uid: "a" }], joined: 1 }));
  assert.equal(shown[0].data.starts_now, 1);
  assert.equal(shown[0].data.stime, undefined, "an instant start has no scheduled time");
  // End to end: the payload conference.start produces renders the full line.
  const t = build(shown[0].data, shown[0].opt);
  assert.equal(say(t, "count"), "1 joined");
  assert.equal(say(t, "when"), "Start now");
});

// ------------------------------------------------------- the INVITATION card
//
// Duy, 2026-08-26 (mtp6.jpg): the schedule notice did not match Figma's
// `type=directly` card. It headed with the meeting's own name and said only
// "X invited you to a meeting". Figma leads with a fixed line and names the
// organiser AND the location underneath.
//
// ⚠️ Figma's API was rate limited when this was built, so the exact node could
// not be re-read — the copy comes from Duy's description of it.

test("the invitation heads with Figma's fixed line, not the meeting's name", () => {
  const t = build({ title: "m4", from: "Duy Nguyen", folder_name: "Folder 1", stime: 1 }, {});
  assert.equal(say(t, "title"), "You have been invited to a Meeting");
  assert.notEqual(say(t, "title"), "m4");
});

test("the invitation names the organiser and where the meeting is", () => {
  const t = build({ title: "m4", from: "Duy Nguyen", folder_name: "Folder 1" }, {});
  assert.equal(
    say(t, "desc"),
    "<b>Duy Nguyen</b> invited you to join the meeting in <b>Folder 1</b>",
  );
});

test("with no folder name it falls back rather than trailing a dangling 'in'", () => {
  const t = build({ title: "m4", from: "Duy Nguyen" }, {});
  assert.equal(say(t, "desc"), "<b>Duy Nguyen</b> invited you to a meeting");
  assert.ok(!say(t, "desc").endsWith("in "), "never a dangling preposition");
});

test("a blank folder name is treated as absent", () => {
  const t = build({ title: "m4", from: "Duy Nguyen", folder_name: "   " }, {});
  assert.equal(say(t, "desc"), "<b>Duy Nguyen</b> invited you to a meeting");
});

test("the invitation carries NO live dot — nothing is in progress yet", () => {
  const t = build({ title: "m4", from: "Duy Nguyen", folder_name: "F" }, {});
  assert.equal(pick(t, "desk-meeting-toast__live"), null);
});

test("the live flavours keep both the dot and the meeting's own name", () => {
  const now = build({ title: "m4", attendees: ["a"], joined: 1, starts_now: 1 }, { reminder: 1 });
  assert.equal(say(now, "title"), "m4");
  assert.ok(pick(now, "desk-meeting-toast__live"), "a started meeting IS in progress");
});

test("the invitation still shows its start time", () => {
  const t = build({ title: "m4", from: "Duy Nguyen", folder_name: "F", stime: 1 }, {});
  assert.equal(say(t, "when"), "Start at 9:00 AM");
});

test("the meeting card uses the Phosphor glyph Figma does, not the legacy asset", () => {
  // `video-camera` is an Illustrator export on a 468px viewBox whose paths are
  // solid; outlining it produced the washed-out camera in mtp5.jpg.
  assert.ok(
    /ico: "noti-video-camera"/.test(code),
    "Figma's tile holds the Phosphor VideoCamera, already in the sprite",
  );
  assert.ok(
    !/ico: "video-camera"/.test(code),
    "the legacy video-camera asset must be gone",
  );
});

// ------------------------------------- emphasis, grammar and escaping
//
// Duy, 2026-08-26 (mtp7.jpg): Figma bolds the organiser and the folder inside
// the invitation sentence, and "invited you joining" should read "invited you
// to join". The <b> is applied in CODE, not in the locale string, so the
// translations stay markup-free and their placeholders stay reorderable.

test("the sentence reads 'invited you to join', not 'invited you joining'", () => {
  const t = build({ title: "m4", from: "Duy", folder_name: "F" }, {});
  assert.ok(/invited you to join/.test(say(t, "desc")));
  assert.ok(!/invited you joining/.test(say(t, "desc")), "the old wording is gone");
});

test("only the organiser and the folder are emphasised, not the whole line", () => {
  const t = build({ title: "m4", from: "Duy Nguyen", folder_name: "checkin" }, {});
  const d = say(t, "desc");
  assert.equal((d.match(/<b>/g) || []).length, 2, "exactly two emphasised spans");
  assert.ok(d.includes("<b>Duy Nguyen</b>"));
  assert.ok(d.includes("<b>checkin</b>"));
  assert.ok(!d.startsWith("<b>invited"), "the connecting words stay Regular");
});

test("the locale strings themselves carry NO markup", () => {
  // Emphasis lives in the code so translators never have to preserve tags,
  // and so a reordered sentence still bolds the right words.
  const en = JSON.parse(readFileSync(join(__dirname, "../locale/en.json"), "utf8"));
  for (const k of ["X_INVITED_YOU_JOIN_MEETING_IN", "X_INVITED_YOU_TO_MEETING", "MEETING_INVITE_TITLE"]) {
    assert.ok(!/[<>]/.test(en[k]), `${k} must not contain markup`);
  }
  assert.equal(en.X_INVITED_YOU_JOIN_MEETING_IN, "{0} invited you to join the meeting in {1}");
});

test("a hostile organiser name or folder name cannot inject markup", () => {
  const t = build(
    { title: "m4", from: '<img src=x onerror=alert(1)>', folder_name: "<script>bad</script>" },
    {},
  );
  const d = say(t, "desc");
  assert.ok(!d.includes("<img"), "the name must be escaped");
  assert.ok(!d.includes("<script>"), "the folder must be escaped");
  assert.ok(d.includes("&lt;img"), "escaped, not stripped");
  // The emphasis we added ourselves is still real markup.
  assert.equal((d.match(/<b>/g) || []).length, 2);
});

test("a hostile meeting title or agenda cannot inject markup either", () => {
  const t = build({ title: "<script>x</script>", message: "<b>agenda</b>", stime: 1 }, { reminder: 1 });
  assert.ok(!say(t, "title").includes("<script>"));
  assert.ok(!say(t, "desc").includes("<b>agenda"), "an agenda is not trusted markup");
});

// The invitation card was missing its meta line entirely: room.js never sent
// the invitee list, so there was nothing to count or draw faces for.
test("the invitation counts its invitees, like the other cards do", () => {
  const t = build(
    {
      title: "m4",
      from: "Duy",
      folder_name: "F",
      stime: 1,
      attendees: [{ uid: "a", name: "Ann" }, { uid: "b", name: "Bo" }, { uid: "c", name: "Cy" }],
    },
    {},
  );
  assert.equal(say(t, "count"), "3 invited", "an invitation names invitees, never 'joined'");
  assert.equal(all(t, "desk-meeting-toast__avatar").length, 2);
  assert.equal(say(t, "avatar-more"), "+1");
  assert.equal(say(t, "when"), "Start at 9:00 AM");
  assert.equal(say(t, "dot"), "-");
});
