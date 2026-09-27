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

/**
 * One share-to-SA run, for one destination.
 *
 * NO VIEW. The caller renders `snapshot()` from `onChange`; everything here
 * is the protocol. `service` is any widget with fetchService/postService —
 * the calls go out as that widget, exactly as they did from the popup.
 *
 * `onChange` fires after every transition, and after a poll only when the
 * job's signature moved: re-feeding identical content every 2s replaced the
 * Cancel button for nothing and ate clicks (the popup learned that first).
 *
 * `timers` is injectable for tests; production uses the globals.
 */
function createSaImport(opt = {}) {
  const { service, hub_id, nid } = opt;
  const direct = opt.direct ? 1 : 0;
  const onChange = opt.onChange || (() => {});
  const onFinished = opt.onFinished || (() => {});
  const timers = opt.timers || {
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
  };
  // The account asking — get_state / sa_check / get_status / cancel / ack are
  // keyed on the user, not on the destination hub.
  const me = () => opt.account_id || (typeof Visitor !== 'undefined' ? Visitor.id : undefined);

  const blank = (state, saEmail = null) => ({
    state, saEmail, folder: null, error: null, job: null, fileLog: [], cancelRequested: 0,
  });

  let s = blank('loading');
  let poll = null;
  let lastSig = null;
  let finishedFor = null;
  let starting = false;
  let disposed = false;

  function snapshot() {
    return {
      ...s,
      folder: s.folder && { ...s.folder },
      job: s.job && { ...s.job },
      fileLog: s.fileLog.map((e) => ({ ...e })),
    };
  }
  function emit() {
    if (!disposed) onChange(snapshot());
  }
  function set(patch) {
    Object.assign(s, patch);
    emit();
  }
  function stopPoll() {
    if (poll) {
      timers.clearInterval(poll);
      poll = null;
    }
  }

  async function tick() {
    if (disposed || !s.job) return;
    const job_id = s.job.job_id;
    let r;
    try {
      r = await service.fetchService('google_drive.get_status', { hub_id: me(), job_id });
    } catch (e) {
      return;
    }
    // A reset or a newer attach while the request was out: this answer is
    // about a job nobody is watching any more.
    if (disposed || !r || !s.job || s.job.job_id !== job_id) return;
    // Two ticks can overlap on a slow server. Once one of them has seen the
    // job finish, an older answer saying "running" must not bring it back —
    // polling has stopped, so nothing would ever correct it.
    if (FINISHED.includes(s.state)) return;
    const sig = [r.status, r.processed_files, r.total_files, r.errors_count,
      r.current_filename, r.bytes_done, r.bytes_in_flight].join('|');
    const changed = sig !== lastSig;
    lastSig = sig;
    s.job = { job_id, ...r };
    s.fileLog = trackFileLog(s.fileLog, r);
    if (FINISHED.includes(r.status)) {
      stopPoll();
      s.state = r.status;
      s.cancelRequested = 0;
      emit();
      if (finishedFor !== job_id) {
        finishedFor = job_id;
        onFinished(snapshot().job);
      }
      return;
    }
    s.state = 'in-progress';
    if (changed) emit();
  }

  /** Watch a job, whoever started it. */
  function attach(job_id, job) {
    if (disposed || !job_id) return;
    stopPoll();
    lastSig = null;
    s.job = { status: 'queued', ...(job || {}), job_id };
    s.state = 'in-progress';
    s.fileLog = [];
    s.cancelRequested = 0;
    s.error = null;
    emit();
    tick();
    poll = timers.setInterval(tick, POLL_INTERVAL_MS);
  }

  async function load() {
    set({ state: 'loading' });
    let res;
    try {
      res = await service.fetchService('google_drive.get_state', { hub_id: me() });
    } catch (e) {
      res = null;
    }
    if (disposed) return snapshot();
    s.saEmail = (res && res.sa_email) || null;
    const job = res && res.job;
    if (job && RUNNING.includes(job.status)) {
      attach(job.job_id, job);
      return snapshot();
    }
    if (!res || !res.sa) {
      set({ state: 'unavailable' });
      return snapshot();
    }
    set({ state: 'idle', error: null });
    return snapshot();
  }

  /**
   * For a caller that already read get_state itself (the popup, which needs
   * the OAuth fields too). Silent: that caller renders on its own.
   */
  function seed(patch = {}) {
    if ('saEmail' in patch) s.saEmail = patch.saEmail || null;
    if (s.state === 'loading') s.state = 'idle';
  }

  async function doVerify(link) {
    const folder = String(link || '').trim();
    // An empty field is answered here, not sent: a press of Import now with
    // nothing pasted must say why nothing happened.
    if (!folder) {
      set({ state: 'idle', folder: null, error: 'SA_BAD_LINK' });
      return null;
    }
    set({ state: 'checking', folder: null, error: null });
    let res;
    try {
      res = await service.fetchService('google_drive.sa_check', { hub_id: me(), folder });
    } catch (e) {
      res = null;
    }
    if (disposed) return null;
    if (res && res.ok && res.folder_id) {
      set({
        state: 'verified',
        folder: { folder_id: res.folder_id, name: res.name, is_folder: !!res.is_folder, raw: folder },
      });
      return { ...s.folder };
    }
    set({ state: 'idle', error: (res && res.error) || 'SA_NOT_SHARED' });
    return null;
  }

  async function verify(link) {
    if (disposed || starting || s.state === 'checking' || s.state === 'in-progress') return null;
    return doVerify(link);
  }

  /**
   * Verify when needed, then enqueue. `link` is what the field holds now; a
   * link different from the verified one is verified again, an empty one
   * falls back to the verified folder (the field is rebuilt on re-render).
   */
  async function start(link) {
    if (disposed || starting || s.state === 'checking' || s.state === 'in-progress') return null;
    starting = true;
    try {
      const raw = link == null ? '' : String(link).trim();
      if (!s.folder || (raw && raw !== s.folder.raw)) {
        const ok = await doVerify(raw);
        if (!ok || disposed) return null;
      }
      set({ state: 'starting', error: null });
      let res;
      try {
        res = await service.postService('google_drive.start_migration', {
          hub_id,
          nid,
          direct_into: direct,
          auth_kind: 'sa',
          sa_folder: s.folder.raw || s.folder.folder_id,
          conflict_policy: 'skip',
        });
      } catch (e) {
        if (!disposed) {
          set({ state: 'verified', error: (e && (e.reason || e.error || e.message)) || 'SA_NOT_SHARED' });
        }
        return null;
      }
      if (disposed) return null;
      if (!res || !res.job_id) {
        set({ state: 'verified', error: 'START_FAILED' });
        return null;
      }
      attach(res.job_id);
      return res.job_id;
    } finally {
      starting = false;
    }
  }

  async function cancel() {
    if (disposed || s.state !== 'in-progress' || !s.job || s.cancelRequested) return;
    set({ cancelRequested: 1 });
    try {
      await service.postService('google_drive.cancel', { hub_id: me(), job_id: s.job.job_id });
    } catch (e) {
      if (!disposed) set({ cancelRequested: 0 });
    }
  }

  /** Tell the server this result has been seen, so it is not replayed. */
  function ack() {
    if (!s.job || !FINISHED.includes(s.state)) return Promise.resolve();
    try {
      return Promise.resolve(
        service.postService('google_drive.ack_result', { hub_id: me(), job_id: s.job.job_id }),
      ).catch(() => {});
    } catch (e) {
      return Promise.resolve();
    }
  }

  /** Back to an empty form. Never acks — the caller decides that. */
  function reset() {
    if (disposed) return;
    stopPoll();
    lastSig = null;
    finishedFor = null;
    s = blank('idle', s.saEmail);
    emit();
  }

  function dispose() {
    disposed = true;
    stopPoll();
  }

  return { load, seed, verify, start, attach, cancel, ack, reset, dispose, snapshot };
}

module.exports = {
  POLL_INTERVAL_MS,
  RUNNING,
  FINISHED,
  errorText,
  progressOf,
  summaryOf,
  trackFileLog,
  createSaImport,
};
