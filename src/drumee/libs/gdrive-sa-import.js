/**
 * Google Drive import by sharing a folder with Drumee's service account
 * ("share-to-SA") — the protocol, with no view attached.
 *
 * TWO SURFACES DRAW IT: migrate_gdrive_popup's `sa` screen, and the migrate
 * tour's own dialog once the tour is done (modules/desk/tutorial/migrate,
 * goLive). They look different on purpose and must behave the same, so the
 * calls, the error wording and the progress maths live here, once.
 *
 * The helpers below are pure. createSaImport (further down) is the stateful
 * run.
 */

const POLL_INTERVAL_MS = 2000;
const RUNNING = ['queued', 'running'];
const FINISHED = ['done', 'failed', 'cancelled'];
// Reported through `errors` but not failures: a Drive shortcut is deliberately
// not followed. Counting them as errors told users a clean run was broken.
const SKIP_CODES = ['SHORTCUT_SKIPPED'];
const FILE_LOG_MAX = 12;

function _L() {
  return (typeof LOCALE !== 'undefined' && LOCALE) || {};
}

/**
 * Words for a share-to-SA failure.
 *
 * `code` is whatever the server said — an SA_* code from sa_check, or the raw
 * reason a rejected start_migration carried, which is why the revoked case is
 * matched anywhere in the string rather than by equality.
 */
function errorText(code) {
  const t = _L();
  const c = String(code || '');
  if (/SOURCE_ACCESS_REVOKED/.test(c)) {
    return t.MIGRATE_GDRIVE_SOURCE_REVOKED
      || 'Drumee no longer has access to the selected folder on Google Drive. Restore sharing (or pick it again), then retry.';
  }
  const map = {
    SA_NOT_SHARED: t.GDRIVE_SA_NOT_SHARED,
    SA_NOT_OWNER: t.GDRIVE_SA_NOT_OWNER,
    SA_NEEDS_GOOGLE: t.GDRIVE_SA_NEEDS_GOOGLE,
    SA_BAD_LINK: t.GDRIVE_SA_BAD_LINK,
    SA_NOT_A_FOLDER: t.GDRIVE_SA_NOT_A_FOLDER,
    START_FAILED: t.TRY_AGAIN || 'Try again',
  };
  return map[c] || t.GDRIVE_SA_NOT_SHARED;
}

/**
 * Progress of a job snapshot, byte-weighted when the worker reports sizes so
 * the bar moves while a big file is still downloading. Held under 100 until
 * every file is counted done.
 */
function progressOf(job = {}) {
  const total = job.total_files || 0;
  const done = job.processed_files || 0;
  const bytesTotal = job.bytes_total || 0;
  const bytesSeen = Math.min(bytesTotal, (job.bytes_done || 0) + (job.bytes_in_flight || 0));
  let pct;
  if (total > 0 && done >= total) pct = 100;
  else if (bytesTotal > 0) pct = Math.min(99, Math.round((bytesSeen / bytesTotal) * 100));
  else pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { pct, done, total, bytesSeen, bytesTotal };
}

/** What a finished job did: counts, and its reported items split in two. */
function summaryOf(job = {}) {
  const errors = job.errors || [];
  return {
    processed: job.processed_files || 0,
    folders: job.total_folders || 0,
    skipped: errors.filter((e) => SKIP_CODES.includes(e.code)),
    failures: errors.filter((e) => !SKIP_CODES.includes(e.code)),
  };
}

/**
 * The rolling per-file list. The worker only reports `current_filename`, so
 * the list is rebuilt here: a new name closes the previous entry. Pure — the
 * caller's array is not touched.
 */
function trackFileLog(log, job) {
  const next = (log || []).map((e) => ({ ...e }));
  const cur = job && job.current_filename;
  const last = next[next.length - 1];
  if (cur && (!last || last.name !== cur)) {
    if (last && last.status === 'uploading') last.status = 'done';
    next.push({ name: cur, status: 'uploading' });
    if (next.length > FILE_LOG_MAX) next.shift();
  }
  if (job && FINISHED.includes(job.status)) {
    const tail = next[next.length - 1];
    if (tail && tail.status === 'uploading') tail.status = 'done';
  }
  return next;
}

module.exports = {
  POLL_INTERVAL_MS,
  RUNNING,
  FINISHED,
  errorText,
  progressOf,
  summaryOf,
  trackFileLog,
};
