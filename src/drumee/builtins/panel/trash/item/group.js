// Day groups for the trash list ("Today", "Aug 13" — Figma 43:34212). Rows
// arrive sorted by deletion time, so a group starts wherever a row's day
// differs from the row above. Every row carries its own label; the skin shows
// it only on rows stamped data-group="start".

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

// views: rendered rows in list order, each with .model and .el.
function markGroupStarts(views) {
  let prev = null;
  for (const v of views || []) {
    if (!v || !v.el) continue;
    const key = dayKey(trashedAt(v.model));
    v.el.dataset.group = key !== prev ? "start" : "";
    prev = key;
  }
}

module.exports = { trashedAt, dayKey, dayLabel, markGroupStarts };
