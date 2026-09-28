/**
 * Pure helpers for the folder window's Chat details panel (Figma 775:131699).
 * No DOM, no services — the folder window and the skeleton both call these,
 * and tests/chat-details-model.test.js drives them directly.
 */
const PAGES = ["photo", "video", "file", "link"];

const COUNT_KEYS = {
  photo: ["CD_PHOTO", "CD_PHOTOS"],
  video: ["CD_VIDEO", "CD_VIDEOS"],
  file: ["CD_FILE", "CD_FILES"],
  link: ["CD_LINK", "CD_LINKS"],
};

function countLabel(n, page) {
  const v = Number(n) || 0;
  const [one, many] = COUNT_KEYS[page] || COUNT_KEYS.file;
  return LOCALE[v === 1 ? one : many].format(v);
}

function pageTitle(page) {
  return {
    photo: LOCALE.CD_PHOTOS_TITLE,
    video: LOCALE.VIDEOS,
    file: LOCALE.FILES,
    link: LOCALE.CD_LINKS_TITLE,
  }[page] || "";
}

function groupByMonth(rows, now = Dayjs()) {
  const groups = [];
  const byKey = new Map();
  const sorted = [...(rows || [])].sort((a, b) => (b.ctime || 0) - (a.ctime || 0));
  for (const r of sorted) {
    const d = Dayjs.unix(Number(r.ctime) || 0);
    const key = d.format("YYYY-MM");
    if (!byKey.has(key)) {
      const label = d.year() === now.year() ? d.format("MMMM") : d.format("MMMM YYYY");
      const g = { label, rows: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    byKey.get(key).rows.push(r);
  }
  return groups;
}

function lastSeenLabel(member = {}, now = Math.floor(Date.now() / 1000)) {
  if (Number(member.online) > 0) return { text: LOCALE.CD_ONLINE, online: true };
  const ts = Number(member.last_seen) || 0;
  if (!ts) return { text: LOCALE.CD_LAST_SEEN_RECENTLY, online: false };
  const rel = Dayjs.unix(ts).from(Dayjs.unix(now));
  return { text: LOCALE.CD_LAST_SEEN.format(rel), online: false };
}

function durationLabel(seconds) {
  const s = Math.floor(Number(seconds));
  if (!isFinite(s) || s < 0 || seconds == null || seconds === "") return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// Same stop-set as channel_media_list's REGEXP_SUBSTR, so client and
// server agree on where an HTML-wrapped URL ends.
function extractUrl(text) {
  const m = /https?:\/\/[^\s<>"']+/.exec(text == null ? "" : `${text}`);
  return m ? m[0] : "";
}

// Tile image for a shared photo/video: the node's server-side vignette,
// addressed like widget/chat/node-icon (file/<format>/<nid>/<hub_id>, keyed
// for the session unless public). `boot` is bootstrap(), injected so this
// stays pure.
function thumbUrl(row = {}, hub_id, boot = {}) {
  if (!row.nid || !hub_id) return "";
  const format = row.category === "vector" ? "orig" : "vignette";
  const url = `${boot.endpoint || ""}file/${format}/${row.nid}/${hub_id}`;
  return boot.keysel && row.area !== "public" ? `${url}?keysel=${boot.keysel}` : url;
}

function uniqueMembers(list) {
  const seen = new Set();
  return (list || []).filter((m) => {
    const id = m && `${m.id}`;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function generation() {
  let current = 0;
  return {
    next: () => ++current,
    isCurrent: (n) => n === current,
  };
}

module.exports = {
  PAGES,
  countLabel,
  pageTitle,
  groupByMonth,
  lastSeenLabel,
  durationLabel,
  extractUrl,
  thumbUrl,
  uniqueMembers,
  generation,
};
