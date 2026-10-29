// tests/calendar-meeting-edit-invite.test.js — a personal meeting's
// "Meeting Information" form (calendar-main__modal, edit mode) takes the
// "New personal meeting" form's layout: the Invite column (require email,
// restrict to emails / @domains, password) is there too, filled from the
// meeting's existing guest link (room.link_info), and Update saves a changed
// gate onto that SAME link (room.public_link — the server keeps the token;
// keep_password keeps a password nobody retyped).
//
//   node --test tests/calendar-meeting-edit-invite.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const CAL = path.join(__dirname, "../src/drumee/builtins/panel/calendar");
const SRC = fs.readFileSync(path.join(CAL, "index.js"), "utf8");
const FORM = fs.readFileSync(path.join(CAL, "skeleton/meeting-form.js"), "utf8");

/* eslint-disable no-unused-vars */
const SERVICE = { room: {} };
/* eslint-enable no-unused-vars */
const loadLink = eval(`(${sliceFunction(SRC, "async _loadMeetingLink(form)")})`);
const saveGate = eval(`(${sliceFunction(SRC, "async _saveMeetingGate(form, draft)")})`);

test("the Invite column is drawn in edit mode too", () => {
  assert.doesNotMatch(FORM, /editing\s*\?\s*null\s*:\s*Skeletons\.Box\.Y\(\{\s*className: `\$\{pfx\}__modal-col \$\{pfx\}__modal-col--side`/);
  assert.match(FORM, /className: `\$\{pfx\}__modal-col \$\{pfx\}__modal-col--side`,[\s\S]{0,80}kids: \[field\("INVITE", inviteBlock\)\]/);
});

test("a set password shows as dots: leave it empty to keep it", () => {
  assert.match(FORM, /placeholder: draft\.has_password \? "••••••••" : LOCALE\.PASSWORD/);
});

function calendar(answer) {
  const self = {
    sent: [],
    rendered: 0,
    fetchService(args) {
      this.sent.push(args);
      return Promise.resolve(answer);
    },
    postService(args) {
      this.sent.push(args);
      return Promise.resolve(answer);
    },
    _absorbFormText() {},
    // The whole modal: built once on open. Re-feeding it replayed its
    // pop-in entrance, which looked like the modal opening twice.
    _renderModal() {
      this.modals = (this.modals || 0) + 1;
    },
    // Only the Invite column, filled when the link answers.
    _renderMeetingInvite() {
      this.rendered++;
    },
    _personalHub: "me",
  };
  return self;
}
const editForm = () => ({ kind: "meeting", mode: "edit", row: { id: "m1", nid: "m1" }, draft: { title: "T" } });

test("opening reads the meeting's link and fills the gate", async () => {
  const self = calendar({
    link: "https://x/#/dmz/meeting/tok",
    require_email: 1,
    allowed_emails: ["a@x.com", "@y.org"],
    has_password: true,
  });
  const form = editForm();
  self._form = form;
  await loadLink.call(self, form);
  assert.equal(self.sent[0].service, "room.link_info");
  assert.equal(self.sent[0].nid, "m1");
  assert.equal(self.sent[0].hub_id, "me");
  assert.deepEqual(
    {
      require_email: form.draft.require_email,
      restrict: form.draft.restrict,
      recipients: form.draft.recipients,
      password_on: form.draft.password_on,
      has_password: form.draft.has_password,
    },
    { require_email: true, restrict: true, recipients: ["a@x.com", "@y.org"], password_on: true, has_password: true },
  );
  assert.deepEqual(form.linkInfo, { require_email: true, recipients: ["a@x.com", "@y.org"], password_on: true });
  assert.equal(self.rendered, 1, "the Invite column is re-fed");
  assert.equal(self.modals, undefined, "the modal is NOT re-fed (no second entrance)");
});

test("a form closed meanwhile is left alone", async () => {
  const self = calendar({ link: "l", require_email: 1, allowed_emails: [], has_password: false });
  const form = editForm();
  self._form = null;
  await loadLink.call(self, form);
  assert.equal(self.rendered, 0);
});

const loaded = (extra = {}) => ({
  ...editForm(),
  linkInfo: { require_email: true, recipients: ["a@x.com"], password_on: true },
  ...extra,
});

test("an unchanged gate is not re-granted", async () => {
  const self = calendar({ link: "l" });
  const ok = await saveGate.call(self, loaded(), {
    require_email: true, restrict: true, recipients: ["a@x.com"], password_on: true, password: "",
  });
  assert.equal(ok, true);
  assert.equal(self.sent.length, 0);
});

test("a changed gate is saved on the same link, keeping an untyped password", async () => {
  const self = calendar({ link: "l" });
  await saveGate.call(self, loaded(), {
    require_email: true, restrict: true, recipients: ["a@x.com", "b@x.com"], password_on: true, password: "",
  });
  assert.deepEqual(self.sent, [{
    service: "room.public_link", hub_id: "me", nid: "m1",
    require_email: 1, allowed_emails: ["a@x.com", "b@x.com"], keep_password: 1,
  }]);
});

test("a new password replaces the old one; switching it off clears it", async () => {
  const typed = calendar({ link: "l" });
  await saveGate.call(typed, loaded(), {
    require_email: true, restrict: true, recipients: ["a@x.com"], password_on: true, password: "s3cret",
  });
  assert.equal(typed.sent[0].password, "s3cret");
  assert.equal(typed.sent[0].keep_password, undefined);
  const off = calendar({ link: "l" });
  await saveGate.call(off, loaded(), {
    require_email: true, restrict: true, recipients: ["a@x.com"], password_on: false, password: "",
  });
  assert.equal(off.sent[0].password, undefined);
  assert.equal(off.sent[0].keep_password, undefined);
});

test("a refused gate save reports failure", async () => {
  const self = calendar({ error: "NOPE" });
  const ok = await saveGate.call(self, loaded(), {
    require_email: false, restrict: false, recipients: [], password_on: true, password: "",
  });
  assert.equal(ok, false);
});

test("Update saves the gate after the time and title, and closes only then", () => {
  const body = sliceFunction(SRC, "async _updateMeeting(form, draft, title, stime, etime)");
  const gate = body.indexOf("await this._saveMeetingGate(form, draft)");
  const moved = body.indexOf('flag: "when"');
  const close = body.indexOf("this._form = null;");
  assert.ok(moved > 0 && gate > moved && close > gate);
});

test("the restrict-needs-an-email rule holds in edit mode too", () => {
  const body = sliceFunction(SRC, "async _submitMeeting()");
  assert.doesNotMatch(body, /this\._form\.mode !== "edit" &&\s*draft\.require_email/);
});

test("opening an edit form starts the link read", () => {
  assert.match(sliceFunction(SRC, "_openMeetingEdit(row)"), /this\._loadMeetingLink\(this\._form\);/);
});

test("the Invite column is its own part, fed from inviteSide", () => {
  assert.match(FORM, /className: `\$\{pfx\}__modal-col \$\{pfx\}__modal-col--side`,\s*sys_pn: "meeting-invite",\s*partHandler: ui,/);
  assert.match(FORM, /module\.exports\.inviteSide = /);
  const r = sliceFunction(SRC, "_renderMeetingInvite()");
  assert.match(r, /getPart\("meeting-invite"\)/);
  assert.match(r, /\.inviteSide\(this\)/);
});
