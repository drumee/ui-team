/**
 * The one-line preview an inbox row shows under the conversation name.
 *
 * A row's preview is NOT the raw message body. The chat carries system cards
 * whose body is machine-readable, and passing it through verbatim is how the
 * inbox came to show
 *
 *   [[MEETING:start:{"hub_id":"...","nid":"...","filename":"...","by":"..."}]]
 *
 * on the left of the very conversation that renders that same row as a proper
 * meeting card on the right (chat-item/template/meeting-event.js).
 *
 * Every list that draws a preview goes through here — the initial render
 * (chat_contact_item's skeleton) and the live paths that overwrite it
 * (chat_p2p and chatcontact_list, on channel.post / chat.roominfo) — so a card
 * type is taught once and can never read one way on load and another way after
 * a websocket push. Those paths also used to each carry their own copy of the
 * attachment fallback and the mention strip, and the two chat_p2p ones were
 * missing the strip entirely: a live message mentioning you previewed as
 * "[@Bob](user:xxx)" until the panel was remounted.
 *
 * Inbox rows are thin on purpose, which decides HOW a card is recognised here:
 * chat.chat_rooms returns a `metadata` column, but chat.share_rooms ->
 * group_chat_rooms selects only {id, group_name, room_count, message, ctime}
 * (room_detail merges the last message's metadata into its result, but
 * group_chat_rooms extracts read_cnt/message/ctime and drops the rest). So for
 * a WORKSPACE row — the only kind a meeting ever posts into — the body is all
 * there is, and the label has to be rebuilt from the sentinel payload rather
 * than from metadata.message_type.
 */

/**
 * Sentinel written into the message BODY by
 * window_meeting._postMeetingSystemMessage, because channel.post drops a
 * custom message_type/metadata. Only ":start:" is ever posted — a meeting that
 * ends flips THAT row's metadata (channel.meeting_end) instead of posting a
 * second card — but both forms are accepted, older rows included.
 *
 * THE CLOSING `]]` IS OPTIONAL, because one of the paths that feeds a preview
 * truncates the body: `channel.roominfo` rows come from `_last_node` in
 * channel_delete.sql, whose `message` column is VARCHAR(100) filled with
 * LEFT(message, 100). A real card is ~146 chars (two 16-char ids, a room_id, a
 * filename and a name), so what arrives there is a HEADLESS sentinel — and
 * requiring the terminator made it fall through to the raw-text branch, which
 * put `[[MEETING:start:{"hub_id":"…` back on the inbox line for anyone who
 * deleted a message in a chat whose previous message was a meeting card.
 */
const MEETING_SENTINEL = /^\s*\[\[MEETING:(start|end):([\s\S]*?)(?:\]\])?\s*$/;

/** Recover one string field from a JSON payload the 100-char cut broke. */
const RECOVER = (src, key) => {
  const m = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(src);
  return m ? m[1] : "";
};

/**
 * Mention markup the messenger writes: `[@Name](user:uid)` and
 * `[@filename](mention:hub_id:nid)`. Lazy label so a filename containing "]"
 * still strips to @name.
 */
const MENTION = /\[@(.+?)\]\((?:user|mention)[^)]*\)/g;

/** A `by` that is really an email — see meeting-event.js resolveAuthor. */
const isEmail = (v) => !!v && String(v).includes("@");

const isBlank = (v) => v == null || `${v}`.trim() === "";

/**
 * metadata reaches the client as a JSON string on some paths and as an already
 * parsed object on others (the live push).
 *
 * @param {Object|String} md
 * @returns {Object}
 */
function asObject(md) {
  if (!md) return {};
  if (typeof md !== "string") return md;
  try {
    return JSON.parse(md) || {};
  } catch (e) {
    return {};
  }
}

/**
 * The meeting card's payload, or null when this is an ordinary message.
 *
 * A truncated body (see MEETING_SENTINEL) still answers a card: the JSON no
 * longer parses, so the fields are recovered by name from whatever survived —
 * usually nothing past `room_id`, which is why the label falls back to the
 * subject-less wording rather than inventing an author.
 *
 * @param {String} message raw message body
 * @returns {{kind: String, payload: Object, truncated: Boolean}|null}
 */
function parseMeetingSentinel(message) {
  if (typeof message !== "string") return null;
  const m = message.match(MEETING_SENTINEL);
  if (!m) return null;
  const body = m[2] || "";
  let payload = null;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    payload = null;
  }
  if (payload && typeof payload === "object") {
    return { kind: m[1], payload, truncated: false };
  }
  return {
    kind: m[1],
    payload: {
      by: RECOVER(body, "by"),
      filename: RECOVER(body, "filename"),
      meeting_status: RECOVER(body, "meeting_status"),
    },
    truncated: true,
  };
}

/**
 * "Alice started a meeting" — the card's own subtitle, which is what makes the
 * two sides of the inbox say the same thing.
 *
 * The name is only used when the sentinel froze a usable one: `by` is written
 * at post time and carries an email address for a card posted before the
 * poster's profile had loaded (the case meeting-event.js rebuilds from the
 * message row — a row an inbox preview does not have). Falls back to the
 * subject-less label rather than previewing an email address.
 */
function meetingLabel(parsed, opt, md, type) {
  const payload = (parsed && parsed.payload) || {};
  const status =
    payload.meeting_status || md.meeting_status || opt.meetingStatus || "";
  const ended =
    (parsed && parsed.kind === "end") ||
    type === "meeting.end" ||
    `${status}` === "ended";
  const by = isEmail(payload.by) ? "" : `${payload.by || ""}`.trim();
  if (!by) return ended ? LOCALE.MEETING_ENDED : LOCALE.MEETING_STARTED;
  return `${by} ${ended ? LOCALE.ENDED_THE_MEETING : LOCALE.STARTED_A_MEETING}`;
}

/**
 * Call log rows have no body either — the side and the outcome live in the
 * shared p2p_time metadata.
 *
 * `role` there is always the writer's ("caller"), since one row serves both
 * parties; caller_id is the side-independent field, with role kept as the
 * fallback for conversations whose last event predates it.
 *
 * @returns {String|null} null = not a recognised call state, keep the body
 */
function callLabel(md) {
  switch (md.call_status) {
    case _e.leave:
      return (md.caller_id ? md.caller_id === Visitor.id : md.role === _a.caller)
        ? LOCALE.OUTGOING_CALL
        : LOCALE.INCOMING_CALL;
    case "reject":
      return LOCALE.CALL_DECLINED;
    case _a.cancel:
      return LOCALE.MISSED_CALL;
    default:
      return null;
  }
}

/**
 * Preview text for one conversation row.
 *
 * @param {String} message              raw message body as stored/broadcast
 * @param {Object} [opt]
 * @param {Boolean} [opt.isAttachment]  the row's last message carried files
 * @param {Object|String} [opt.metadata] the message metadata, when the row has it
 * @param {String} [opt.messageType]    message_type when it arrives beside the
 *                                      metadata (the live push carries both)
 * @param {String} [opt.meetingStatus]  'ended' once channel.meeting_end flipped
 *                                      this row's card
 * @returns {String} display text — never markup, never a sentinel
 */
function chatPreview(message, opt = {}) {
  // Read-only view of the caller's metadata — `data.metadata` on the live paths
  // IS the websocket payload's own object, so nothing here writes to it.
  const md = asObject(opt.metadata);
  const type = `${md.message_type || opt.messageType || ""}`;

  const meeting = parseMeetingSentinel(message);
  if (meeting || type === "meeting.start" || type === "meeting.end") {
    return meetingLabel(meeting, opt, md, type);
  }

  let msg = message;
  if (type === _a.call) msg = callLabel(md) || msg;

  if (isBlank(msg)) {
    // The folder-visible root card of a per-file thread is inserted with a NULL
    // body (channel_file_thread_ensure_root) — everything it displays lives in
    // its metadata — so a workspace whose newest event is one previewed blank.
    if (type === "file.thread") return LOCALE.FILE_THREAD;
    if (opt.isAttachment) return LOCALE.ATTACHMENT;
    return "";
  }

  return `${msg}`.replace(MENTION, "@$1");
}

/**
 * The inbox row a `channel.meeting_end` broadcast belongs to, or null.
 *
 * THE HUB IS IN `key_id` ON THAT SERVICE, not in hub_id: the broadcast is
 * channel_get's row (a `SELECT *` over the hub's own `channel` table, which has
 * neither a hub_id nor an entity_id column) and channel.meeting_end stamps
 * `message.key_id = hub.id` on it, where channel.post stamps `data.hub_id`.
 * Reading only hub_id left the key UNDEFINED — and getItemsByAttr compares
 * `mget(attr) === val` (ui-core box/index.js), so an undefined value collects
 * every descendant widget that merely LACKS that attribute. Hence the explicit
 * bail: no key, no search.
 *
 * Which row, among the hits, is settled by the body: a workspace row is keyed
 * by entity_id (its hub IS the conversation) while hub_id can land on an
 * unrelated contact row, and the body test doubles as the "this card is still
 * the row's last message" guard, so an older meeting ending cannot overwrite
 * what has been said since.
 *
 * @param {Object} list the contact-list widget
 * @param {Object} data the re-broadcast message row
 * @returns {Object|null} the row view
 */
function findMeetingRow(list, data) {
  const key = data && (data.key_id || data.hub_id);
  if (!key || !list || !_.isFunction(list.getItemsByAttr)) return null;
  // The body must BE a card. Without this the body test alone would match any
  // row whose last message happens to equal the payload's, and stamp a
  // meeting_status on a conversation that has no meeting in it.
  if (!parseMeetingSentinel(data.message)) return null;
  const rows = [
    ...(list.getItemsByAttr(_a.entity_id, key) || []),
    ...(list.getItemsByAttr("hub_id", key) || []),
  ];
  return (
    rows.find(
      (r) =>
        r &&
        _.isFunction(r.mget) &&
        `${r.mget(_a.message) || ""}` === `${data.message || ""}`
    ) || null
  );
}

/**
 * The meeting lifecycle status a live payload carries, or null.
 *
 * Worth keeping on the inbox row because nothing else there has it: a workspace
 * row is reloaded from group_chat_rooms, which drops room_detail's metadata
 * merge, so a re-render with no stored status resurrects "started a meeting"
 * for a meeting that is over.
 *
 * @param {Object} data websocket payload / row
 * @returns {String|null} 'ended', or null
 */
function meetingStatusOf(data) {
  if (!data) return null;
  const md = asObject(data.metadata);
  const status = `${md.meeting_status || data.meeting_status || ""}`;
  return status === "ended" ? "ended" : null;
}

module.exports = {
  chatPreview,
  parseMeetingSentinel,
  findMeetingRow,
  meetingStatusOf,
};
