// Round 3 — the notification types Duy reported as missing or wrong on
// 2026-08-21 (Files 1-3, Task 4-8, Meeting 9-11, Chat 12).
//
// Every check below runs the REAL getActivityMeta and the REAL sentence builder,
// sliced out of the shipped skeleton, because the failure modes here are all
// silent:
//
//   * an unmatched task_kind falls through to the generic mention branch and
//     tells the user someone "mentioned you" when they only left a comment —
//     a false claim, rendered with no error;
//   * a missing locale key renders its own NAME (LOCALE is a createSafeObject),
//     so `LOCALE.TASK_MOVED_TO_ACTION` would ship as the literal text
//     "TASK_MOVED_TO_ACTION";
//   * `noSender` on the wrong branch silently drops the actor from a sentence
//     that needs one, or leaves "MemberA File.md has been updated";
//   * relabelling a media rollup as a meeting on cnt > 1 would hide a real
//     upload behind meeting copy.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const ACT = join(ROOT, "src/drumee/builtins/panel/activity");
const skelSrc = readFileSync(join(ACT, "widget/item/skeleton/index.js"), "utf8");
const itemSrc = readFileSync(join(ACT, "widget/item/index.js"), "utf8");
const sprite = readFileSync(join(ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");
const symbols = new Set([...sprite.matchAll(/id="--icon-([^"]+)"/g)].map((m) => m[1]));

const enLocale = JSON.parse(readFileSync(join(ROOT, "locale/en.json"), "utf8"));
// Reproduces createSafeObject: a MISSING key yields the key's own name, which is
// truthy. Without this a gap would silently read as "copy" in these tests.
const LOCALE = new Proxy(enLocale, { get: (t, k) => (k in t ? t[k] : String(k)) });

// "LOCALE"/"Visitor"/"_a"/"_"/"Dayjs" are harness parameters and are never
// assigned on global in this file — see harness-hygiene.test.js.
const meta = new Function(
  "LOCALE",
  "Visitor",
  "_a",
  "_",
  "Dayjs",
  `${skelSrc.slice(0, skelSrc.indexOf("module.exports"))}
   return getActivityMeta;`,
)(
  LOCALE,
  { id: "me" },
  new Proxy({}, { get: (_t, k) => String(k) }),
  require("lodash"),
  require("dayjs"),
);

const stub = (data) => ({
  getItemName: () => data.filename || data.name || "item",
  mget: (k) => data[k],
  isFolder: () => data.filetype === "folder",
  hasAttachment: () => !!data.attachment,
});
const metaFor = (data) => meta(stub(data), data);

// The real sentence builder, so `noSender` / `tail` are proven end to end rather
// than asserted as object fields nobody renders.
const buildText = (m, sender) => {
  const lead = m.noSender ? "" : `${sender} `;
  const tail = m.tail ? `<span class="x__link ${m.colorClass}">${m.tail}</span>` : "";
  return `<span>${lead}${m.before}</span><span class="x__link ${m.colorClass}">${m.label}</span><span>${m.after}</span>${tail}`;
};
// Plain-text reading of a row, the way a user sees it.
const sentence = (data, sender = "Tran") =>
  buildText(metaFor(data), sender).replace(/<[^>]*>/g, "").trim();

test("the sentence builder in the skeleton matches the one modelled here", () => {
  // If the shipped builder changes shape, every `sentence()` assertion below is
  // measuring a paraphrase instead of the real thing.
  assert.match(skelSrc, /const lead = meta\.noSender \? '' : `\$\{sender\} `;/);
  assert.match(
    skelSrc,
    /const text = `<span>\$\{lead\}\$\{escapeHtml\(meta\.before\)\}<\/span>/,
    "the lead/before order changed",
  );
  assert.ok(skelSrc.includes("${escapeHtml(meta.after)}</span>${tail}"), "tail lost");
  assert.match(skelSrc, /const tail = meta\.tail\s*\n?\s*\?/, "tail must stay conditional");
});

test("no locale key used by the row is missing from any locale", () => {
  // Repeats the sweep in notification-row-redesign for the keys added on
  // 2026-08-21: a gap renders the KEY NAME to the user, in every language.
  const added = [
    "FILE_UPDATED_ACTION", "TASK_COMMENTED_ACTION", "TASK_PRIORITY_ACTION",
    "TASK_PRIORITY_TO", "TASK_MOVED_ACTION", "TASK_MOVED_TO_ACTION",
    "TASK_COMPLETED_ACTION", "TASK_CREATED_ACTION", "TASK_UPDATED_ACTION",
    "MENTIONED_YOU_IN_ACTION", "MEETING_INVITED_ACTION", "MEETING_ON_ACTION",
    "MEETING_CANCELLED_ACTION", "MEETING_RESCHEDULED_ACTION",
    "MEETING_RESCHEDULED_TO_ACTION",
  ];
  const gaps = [];
  for (const lang of ["en", "fr", "es", "ru", "zh", "km"]) {
    const j = JSON.parse(readFileSync(join(ROOT, "locale", `${lang}.json`), "utf8"));
    for (const k of added) {
      if (!(k in j)) gaps.push(`${lang} missing ${k}`);
      else if (!j[k] || j[k] === k) gaps.push(`${lang}.${k} is not copy`);
    }
  }
  assert.deepEqual(gaps, []);
  // Every key the skeleton actually reads must be one of these or pre-existing.
  const used = new Set([...skelSrc.matchAll(/LOCALE\.([A-Z0-9_]+)/g)].map((m) => m[1]));
  for (const k of added) assert.ok(used.has(k), `${k} was added but is never used`);
});

// ── Files 1 + 2: content edit and rename ──────────────────────────────────
test("a replaced or renamed file reads as an update, not as a fresh upload", () => {
  for (const event of ["media.replace", "media.rename"]) {
    const m = metaFor({
      category: "media", event, filename: "budget.xlsx", folder_name: "Finance",
    });
    assert.equal(m.label, "budget.xlsx", "the file is the highlighted span");
    assert.equal(m.after, enLocale.FILE_UPDATED_ACTION);
    assert.ok(m.noSender, `${event} must not open with a person's name`);
    assert.equal(m.folder, "Finance", "the containing folder is the chip");
    assert.equal(
      sentence({ category: "media", event, filename: "budget.xlsx" }),
      "budget.xlsx has been updated",
      `${event} sentence`,
    );
    // The bug being fixed: it used to be announced as an upload.
    assert.ok(!/uploaded/.test(sentence({ category: "media", event, filename: "x" })));
  }
});

test("a real upload is untouched by the update branch", () => {
  // Regression guard: media.new must keep its exact previous sentence.
  const m = metaFor({
    category: "media", event: "media.new", filename: "Finance",
    item_filename: "budget.xlsx", item_filetype: "document", folder_name: "Finance", cnt: "1",
  });
  assert.equal(m.before, enLocale.UPLOADED_ACTION);
  assert.ok(!m.noSender, "an upload still names the uploader");
  assert.equal(sentence({
    category: "media", event: "media.new", filename: "Finance",
    item_filename: "budget.xlsx", item_filetype: "document", cnt: "1",
  }), "Tran uploaded budget.xlsx");
});

test("the share, view and attachment branches still win over the update branch", () => {
  // The update branch sits BELOW them on purpose; if it were hoisted, a
  // forwarded or attachment-bearing row would silently change wording.
  assert.equal(metaFor({
    category: "media", event: "media.replace", is_forward: 1, filename: "x",
  }).after, " with you", "a forwarded row is still a share");
  assert.equal(metaFor({
    category: "media", event: "media.rename", attachment: "[1]", filename: "x",
  }).before, "shared a file in ", "an attachment row is still a share");
  const iShare = skelSrc.indexOf("if (ui.hasAttachment() && data.event !== 'media.new')");
  const iUpdate = skelSrc.indexOf("data.event === 'media.replace' || data.event === 'media.rename'");
  assert.ok(iShare > -1 && iUpdate > iShare, "the update branch must stay below hasAttachment");
});

// ── Files 3: the delete row keeps its actor and gains the chip ─────────────
test("a removed file still names who removed it, and now shows the folder", () => {
  const m = metaFor({
    category: "media", event: "media.remove", filename: "budget.xlsx", folder_name: "Finance",
  });
  assert.equal(m.before, "removed file ", "Duy kept the actor sentence here");
  assert.ok(!m.noSender);
  assert.equal(m.folder, "Finance", "the chip is what was missing");
  assert.equal(m.tone, "error");
  assert.equal(sentence({
    category: "media", event: "media.remove", filename: "budget.xlsx",
  }), "Tran removed file budget.xlsx");
  assert.equal(metaFor({
    category: "media", event: "media.remove", filename: "Docs", filetype: "folder",
  }).before, "removed folder ");
});

// ── Task 4 + 7: the folder chip ───────────────────────────────────────────
test("every task row can carry the folder chip", () => {
  const rows = [
    { event: "task_assigned", task_title: "Ship it" },
    { event: "task_mention", task_title: "Ship it" },
    { event: "task_mention", task_kind: "reply", task_title: "Ship it" },
    { event: "task_mention", task_kind: "comment", task_title: "Ship it" },
    { event: "task_mention", task_kind: "priority", task_title: "Ship it", task_priority: "high" },
    { event: "task_mention", task_kind: "moved", task_title: "Ship it", column_key: "in_progress" },
    { event: "task_column_change", task_title: "Ship it", column_key: "in_progress" },
  ];
  for (const r of rows) {
    const m = metaFor({ ...r, folder_name: "Marketing" });
    assert.equal(m.folder, "Marketing", `${r.event}/${r.task_kind || "-"} lost the chip`);
    // …and with no folder resolved, no chip — never the string "undefined".
    assert.equal(metaFor(r).folder, undefined);
  }
});

// ── Task 5: status move ───────────────────────────────────────────────────
test("a moved task names the column it landed in", () => {
  const m = metaFor({
    event: "task_mention", task_kind: "moved", task_title: "Ship it",
    column_key: "in_progress", mention_ids: '["me"]',
  });
  assert.equal(m.label, "Ship it");
  assert.equal(m.after, enLocale.TASK_MOVED_TO_ACTION);
  assert.equal(m.tail, enLocale.STATUS_IN_PROGRESS, "the column is the second highlight");
  assert.ok(m.noSender, "Figma's status card carries no actor");
  assert.equal(
    sentence({ event: "task_mention", task_kind: "moved", task_title: "Ship it", column_key: "in_progress" }),
    "Ship it has been moved to In progress",
  );
});

test("a task moved into a done column reads as completed", () => {
  const m = metaFor({
    event: "task_mention", task_kind: "moved", task_title: "Ship it",
    column_key: "complete", task_is_done: 1,
  });
  assert.equal(m.after, enLocale.TASK_COMPLETED_ACTION);
  assert.equal(m.tail, undefined, "no dangling column on a completion");
  assert.equal(m.tone, "success");
  assert.equal(m.ico, "noti-check-circle");
  assert.equal(
    sentence({ event: "task_mention", task_kind: "moved", task_title: "Ship it", task_is_done: 1 }),
    "Ship it has been marked as completed",
  );
});

test("a custom column uses its stored name, and an unknown key never leaks", () => {
  assert.equal(metaFor({
    event: "task_mention", task_kind: "moved", task_title: "T",
    column_key: "a1b2c3", column_name: "Blocked",
  }).tail, "Blocked", "a user-created column is named by the server");
  // An unresolvable key must not produce "has been moved to " with nothing
  // after it, and must never print the raw key.
  const m = metaFor({ event: "task_mention", task_kind: "moved", task_title: "T", column_key: "zzz" });
  assert.equal(m.after, enLocale.TASK_MOVED_ACTION);
  assert.equal(m.tail, undefined);
  assert.ok(!/zzz/.test(sentence({ event: "task_mention", task_kind: "moved", task_title: "T", column_key: "zzz" })));
  // A prototype key must not resolve to an inherited member.
  for (const k of ["constructor", "toString", "__proto__"]) {
    const p = metaFor({ event: "task_mention", task_kind: "moved", task_title: "T", column_key: k });
    assert.equal(typeof p.tail, "undefined", `${k} resolved to something`);
  }
});

test("the column-watch row and the assignee row read identically", () => {
  // Same fact, two audiences — one wording, or the feed contradicts itself.
  const a = sentence({ event: "task_mention", task_kind: "moved", task_title: "T", column_key: "to_review" });
  const b = sentence({ event: "task_column_change", task_title: "T", column_key: "to_review" });
  assert.equal(a, b);
  assert.equal(a, "T has been moved to To review");
  // A created-task watch row keeps its actor: nobody "creates" passively.
  const created = metaFor({ event: "task_column_change", task_title: "T", task_action: "created" });
  assert.ok(!created.noSender);
  assert.equal(
    sentence({ event: "task_column_change", task_title: "T", task_action: "created" }),
    "Tran created task T",
  );
});

// ── Task 6 + 8: comment and priority ──────────────────────────────────────
test("a comment on your task says so, and never claims a mention", () => {
  // channel.list_notifications synthesises mention_ids for EVERY task row, so
  // this row arrives looking exactly like an @-mention. That is the trap.
  const data = {
    event: "task_mention", task_kind: "comment", task_title: "Ship it",
    mention_ids: '["me"]', folder_name: "Marketing",
  };
  const m = metaFor(data);
  assert.equal(m.before, enLocale.TASK_COMMENTED_ACTION);
  assert.ok(!/mentioned/i.test(sentence(data)), "must not claim a mention");
  assert.equal(sentence(data), "Tran commented on Ship it");
  assert.equal(m.ico, "noti-chat-teardrop-dots");
});

test("a priority change names the new priority", () => {
  const data = {
    event: "task_mention", task_kind: "priority", task_title: "Ship it",
    task_priority: "urgent", mention_ids: '["me"]',
  };
  assert.equal(sentence(data), "Tran set the priority of Ship it to Urgent");
  assert.equal(metaFor(data).tail, enLocale.PRIORITY_URGENT);
  // An unknown priority leaves the sentence readable rather than trailing "to".
  const unknown = metaFor({ ...data, task_priority: "whenever" });
  assert.equal(unknown.tail, "");
  assert.ok(!/whenever/.test(sentence({ ...data, task_priority: "whenever" })));
});

test("a plain @-mention and a reply keep their existing wording", () => {
  // Regression guard on the two kinds that already worked.
  //
  // The two sources of a task_mention row carry the title under DIFFERENT keys,
  // and a plain mention is rendered by the generic `mentioned` branch (which
  // reads getItemName), not by the task_mention branch:
  //   * channel.list_notifications aliases the title to `name` AND synthesises
  //     mention_ids, so `mentioned` is true and the title comes from `name`;
  //   * the feed merge (contact_task_mention_unread / activity_get_feed_all)
  //     carries no mention_ids and flattens the title to `task_title`, so it
  //     reaches the task_mention branch instead.
  // Both must read the same to the user, which is what this asserts.
  assert.equal(
    sentence({ event: "task_mention", name: "Ship it", mention_ids: '["me"]' }),
    "Tran mentioned you in Ship it",
    "channel.list_notifications shape",
  );
  assert.equal(
    sentence({ event: "task_mention", task_title: "Ship it" }),
    "Tran mentioned you in Ship it",
    "feed-merge shape",
  );
  assert.equal(
    sentence({ event: "task_mention", task_kind: "reply", task_title: "Ship it", mention_ids: '["me"]' }),
    "Tran replied to your comment in Ship it",
  );
  assert.equal(
    sentence({ event: "task_assigned", task_title: "Ship it" }),
    "Tran assigned you to Ship it",
  );
});

test("an unknown task_kind from a newer server never claims a mention", () => {
  const data = { event: "task_mention", task_kind: "something_new", task_title: "T", mention_ids: '["me"]' };
  const m = metaFor(data);
  assert.ok(!/mentioned/i.test(sentence(data)), "the default must not fall through");
  assert.equal(m.before, enLocale.TASK_UPDATED_ACTION);
  assert.ok(symbols.has(m.ico));
});

// ── Meeting 9 + 10: the scheduled-meeting rollup ──────────────────────────
const AUG = Math.floor(new Date("2026-08-14T10:00:00Z").getTime() / 1000);

test("a scheduled meeting reads as a meeting, not as an upload", () => {
  const m = metaFor({
    category: "media", event: "media.new", filename: "Marketing",
    item_filename: "Sprint review", item_filetype: "schedule",
    meeting_stime: AUG, folder_name: "Marketing", cnt: "1",
  });
  assert.equal(m.label, "Sprint review");
  assert.ok(m.noSender, "Figma's card is about the meeting, not the organizer");
  assert.match(m.after, /^ on \w{3} \d+, \d+:\d\d [AP]M$/, `got ${JSON.stringify(m.after)}`);
  assert.equal(m.ico, "noti-video-camera");
  assert.equal(m.folder, "Marketing", "the containing folder is still the chip");
  assert.ok(!/uploaded/.test(sentence({
    category: "media", event: "media.new", item_filename: "Sprint review",
    item_filetype: "schedule", meeting_stime: AUG, cnt: "1",
  })));
});

test("a meeting with no readable start time does not trail a preposition", () => {
  for (const stime of [undefined, 0, "", null, "later"]) {
    const m = metaFor({
      category: "media", event: "media.new", item_filename: "Sprint review",
      item_filetype: "schedule", meeting_stime: stime, cnt: "1",
    });
    assert.equal(m.after, "", `stime ${JSON.stringify(stime)} produced ${JSON.stringify(m.after)}`);
    assert.equal(m.label, "Sprint review");
  }
});

test("a multi-item rollup is NEVER relabelled a meeting", () => {
  // The rollup groups per folder and takes MAX(item_filetype), so a folder
  // holding a meeting AND a file can arrive tagged 'schedule' with cnt > 1.
  // Treating that as a meeting would hide a real upload.
  const m = metaFor({
    category: "media", event: "media.new", filename: "Marketing",
    item_filetype: "schedule", meeting_stime: AUG, cnt: "3",
  });
  assert.equal(m.before, enLocale.UPLOADED_ACTION, "cnt > 1 keeps the upload wording");
  assert.equal(m.after, " and 2 more");
  assert.ok(!m.noSender);
  assert.match(skelSrc, /itemFiletype === 'schedule' && cnt <= 1/, "the cnt guard is load-bearing");
});

// ── Meeting 9 + 11: the targeted lifecycle notices ────────────────────────
test("a meeting invitation names the organizer and the time", () => {
  const data = {
    event: "meeting_notice", meeting_kind: "invite", meeting_title: "Sprint review",
    meeting_stime: AUG, folder_name: "Marketing",
  };
  const m = metaFor(data);
  assert.equal(m.before, enLocale.MEETING_INVITED_ACTION);
  assert.equal(m.label, "Sprint review");
  assert.ok(!m.noSender, "an invitation is something a person did");
  assert.match(sentence(data), /^Tran invited you to Sprint review on \w{3} \d+, /);
  assert.equal(m.folder, "Marketing");
});

test("a cancelled meeting says so, on the error tone", () => {
  const data = {
    event: "meeting_notice", meeting_kind: "cancelled", meeting_title: "Sprint review",
  };
  const m = metaFor(data);
  assert.equal(m.after, enLocale.MEETING_CANCELLED_ACTION);
  assert.ok(m.noSender);
  assert.equal(m.tone, "error");
  assert.equal(m.ico, "noti-x-circle");
  assert.equal(sentence(data), "Sprint review has been cancelled");
});

test("a rescheduled meeting carries the new time, or degrades cleanly", () => {
  const withTime = metaFor({
    event: "meeting_notice", meeting_kind: "moved", meeting_title: "Sprint review",
    meeting_stime: AUG,
  });
  assert.match(withTime.after, /^ has been rescheduled to \w{3} \d+, /);
  const noTime = metaFor({
    event: "meeting_notice", meeting_kind: "moved", meeting_title: "Sprint review",
  });
  assert.equal(noTime.after, enLocale.MEETING_RESCHEDULED_ACTION);
  assert.ok(!/ to $/.test(noTime.after), "no dangling preposition");
});

test("an unknown meeting_kind falls back to the invitation, never to contact copy", () => {
  // meeting_notice has no `category`, so an unmatched branch would drop into
  // the contact case and read "wants to connect".
  const s = sentence({ event: "meeting_notice", meeting_title: "Sprint review" });
  assert.ok(!/wants to connect/.test(s), s);
  assert.match(s, /invited you to Sprint review/);
});

test("every meeting_notice glyph exists in the sprite", () => {
  for (const kind of ["invite", "moved", "cancelled", "??"]) {
    const m = metaFor({ event: "meeting_notice", meeting_kind: kind, meeting_title: "M" });
    assert.ok(symbols.has(m.ico), `${kind} → ${m.ico} is not in the sprite`);
  }
});

// ── Chat 12: a folder mention ─────────────────────────────────────────────
test("a folder chat mention says it was a mention, not just a message", () => {
  const data = {
    category: "teamchat", filename: "Marketing", folder_name: "Marketing",
    mentioned_in: "Marketing", cnt: "2",
  };
  const m = metaFor(data);
  assert.equal(m.before, enLocale.MENTIONED_YOU_IN_ACTION);
  assert.equal(m.label, "Marketing");
  assert.ok(m.folderAlways, "Duy asked for the folder in the sentence AND the chip");
  assert.equal(sentence(data), "Tran mentioned you in Marketing");
});

test("a folder chat rollup with no mention is unchanged", () => {
  const m = metaFor({
    category: "teamchat", filename: "Marketing", folder_name: "Marketing", cnt: "2",
  });
  assert.equal(m.before, enLocale.SENT_A_MESSAGE);
  assert.equal(m.after, " (2)");
  assert.equal(m.folderAlways, undefined);
});

test("a meeting start/end still outranks a mention on the same folder", () => {
  // A rollup can carry both; the meeting is the more specific fact and owns the
  // Meeting tab, so it must be matched first.
  const m = metaFor({
    category: "teamchat", meeting_action: "start", filename: "Marketing",
    folder_name: "Marketing", mentioned_in: "Marketing",
  });
  assert.equal(m.before, enLocale.STARTED_MEETING_ACTION);
  const iMeeting = skelSrc.indexOf("data.meeting_action === 'start'");
  const iMention = skelSrc.indexOf("if (data.mentioned_in)");
  assert.ok(iMeeting > -1 && iMention > iMeeting, "meeting_action must be checked first");
});

// ── routing / dismissal for the new event ─────────────────────────────────
test("a meeting_notice row dismisses through contact_activity, not the mfs path", () => {
  // It is a yp.contact_activity row: falling back to 'mfs' would try to dismiss
  // a changelog id that does not exist, so the row would come back on reload.
  assert.match(
    itemSrc,
    /opt\.event === 'meeting_notice' \? 'contact_invite'/,
    "meeting_notice must map to the contact_invite dismiss branch",
  );
});
