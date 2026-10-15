// tests/dmz-meeting-join-room.test.js — the guest page joins as the meeting.
//
// The server puts an invite link's guest in the workspace's meeting room and
// answers with that room's details. The page took those details as its own,
// so its node became the workspace root, which the guest holds no access to:
// the join it makes once a host is in was refused, and the guest never got in.
//
//   node --test tests/dmz-meeting-join-room.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(path.join(__dirname, "../src/drumee/modules/dmz/meeting/index.js"), "utf8");
const _a = { nid: "nid", hub_id: "hub_id", room_id: "room_id", firstname: "firstname", lastname: "lastname",
  socket_id: "socket_id", filename: "filename", meeting: "meeting" };
const join = new Function("uiRouter", "Visitor", "_a", "SERVICE",
  `return ${sliceFunction(SRC, "async join()")}`)(
  { ensureWebsocket: async () => {} }, { get: () => "socket" }, _a, { conference: { join: "conference.join" } });

const HUB = "hhhhhhhhhhhhhhhh", ROOT = "0000000000000001", MEET = "aaaaaaaaaaaaaaaa";

test("after joining the workspace room, the page is still the meeting", async () => {
  const model = { nid: MEET, hub_id: HUB, filename: "Weekly retro" };
  const sent = [];
  const self = {
    mget: (k) => model[k],
    mset: (o) => Object.assign(model, o),
    guestName: () => "Guest",
    postService: async (opt) => {
      sent.push({ nid: opt.nid, room_id: opt.room_id });
      return {
        details: { nid: ROOT, hub_id: HUB, filename: "Personal Workspace", privilege: 15 },
        user: { room_id: ROOT, permission: 15, status: "waiting" },
      };
    },
    warn: () => {},
  };
  await join.call(self);
  assert.equal(model.room_id, ROOT, "the room is the server's");
  assert.equal(model.nid, MEET, "the node stays the meeting");
  assert.equal(model.filename, "Weekly retro");
  // The join made once a host is in still names the meeting.
  await join.call(self);
  assert.deepEqual(sent, [{ nid: MEET, room_id: MEET }, { nid: MEET, room_id: MEET }]);
});
