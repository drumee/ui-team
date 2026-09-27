// Day groups for the trash list ("Today", "Aug 13" — Figma 43:34212). Rows
// arrive sorted by deletion time, so a group starts wherever a row's day
// differs from the row above. Every row carries its own label; the skin shows
// it only on rows stamped data-group="start".
//
// One owner: each row only records its day (data-day, item/index.js); the
// panel walks the rendered rows in on-screen order and decides the starts.
// Rows used to decide for themselves from the collection, and a row's
// dom:refresh can land after the panel's pass (a list rendered before the
// panel is attached) — on stage every row ended up "start", so every row
// showed its label.

// A model, a plain row object, or anything with get().
function field(m, k) {
  if (!m) return undefined;
  return typeof m.get === "function" ? m.get(k) : m[k];
}

// When the row was trashed. Upload time only for a legacy row stamped 0.
function trashedAt(m) {
  return Number(field(m, "trashed_time")) || Number(field(m, "mtime")) || 0;
}

function dayKey(ts) {
  return ts ? Dayjs.unix(ts).format("YYYY-MM-DD") : "";
}

function dayLabel(ts, now = Dayjs()) {
  if (!ts) return "";
  const d = Dayjs.unix(ts);
  if (d.isSame(now, "day")) return LOCALE.TODAY;
  if (d.isSame(now.subtract(1, "day"), "day")) return LOCALE.YESTERDAY;
  return d.format(d.year() === now.year() ? "MMM D" : "MMM D, YYYY");
}

// root: the list element. Rows are found in DOM order, which is the order
// the user sees, whatever order the views were created or refreshed in.
function markDayGroups(root) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  let prev = null;
  for (const el of root.querySelectorAll("[data-day]")) {
    const key = el.dataset.day;
    el.dataset.group = key !== prev ? "start" : "";
    prev = key;
  }
}

module.exports = { trashedAt, dayKey, dayLabel, markDayGroups };
