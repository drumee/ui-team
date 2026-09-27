// Trash panel filters. The value goes to media.show_bin as `sort`; the
// server (service/lib/trash-sort) and mfs_show_bin_sorted accept the same three
// and read anything else as "latest", so an old server simply ignores it.
const TRASH_FILTERS = Object.freeze(["latest", "earliest", "expiring"]);
const DEFAULT_FILTER = "latest";
const FILTER_LABELS = Object.freeze({
  latest: "TRASH_FILTER_LATEST",
  earliest: "TRASH_FILTER_EARLIEST",
  expiring: "TRASH_FILTER_EXPIRING",
});

function normalizeFilter(value) {
  return TRASH_FILTERS.includes(value) ? value : DEFAULT_FILTER;
}

function showBinApi(filter, hub_id) {
  return {
    service: SERVICE.media.show_bin,
    page: 1,
    hub_id,
    sort: normalizeFilter(filter),
  };
}

module.exports = { TRASH_FILTERS, DEFAULT_FILTER, FILTER_LABELS, normalizeFilter, showBinApi };
