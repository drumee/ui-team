/**
 * Google Drive migration popup — state machine.
 *
 *   checking      → fetch has_drive_scope
 *     ├ not-connected → "Connect Google Drive" button opens OAuth popup;
 *     │   listens for window.postMessage({ type: 'gdrive-connected', ok })
 *     │   from butler.google_drive_callback's closing page → re-checks
 *     │   scope on success.
 *     └ ready     → settings form (source folder + Shared Drives toggle)
 *                  → "Start migration" → POST google_drive.start_migration
 *                  → state = in-progress with job_id
 *   in-progress  → poll google_drive.get_status every 2s until status
 *                  != 'queued' and != 'running'
 *   done | failed | cancelled → summary + close
 *
 * When opened with opt.autoFromOnboarding = 1 the popup shows a "Skip
 * for now" link in the not-connected + ready states; clicking it POSTs
 * google_drive.dismiss_post_onboarding then closes.
 */

const POLL_INTERVAL_MS = 2000;

class __migrate_gdrive_popup extends LetcBox {
  static initClass() {
    require('./skin');
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._hub_id = opt.hub_id || Visitor.id;
    this._nid = opt.nid || Visitor.get(_a.home_id);
    this._destinationName = opt.destinationName || LOCALE.MY_HOME || 'My home';
    // direct=1 (folder-window launch): the import lands IN the destination
    // folder itself — the user picked it by standing in it. Without it (the
    // settings / Home / onboarding launches) the importer keeps its
    // GoogleDriveMigration wrapper so loose files never scatter into a home.
    this._direct = opt.direct ? 1 : 0;
    this._autoFromOnboarding = !!opt.autoFromOnboarding;
    this._state = 'checking';
    this._jobId = null;
    this._jobSnap = null;
    this._poll = null;
    // Last result the user already dismissed (profile.gdrive_seen_job from the
    // server) — so a migration that finished while the popup was closed is
    // shown exactly once.
    this._seenJobId = null;
    // True once the user has at least one prior migration job — lets the
    // "ready" screen frame re-running as an incremental sync (new files only).
    this._hasPriorJob = false;
    // Form values persisted on the instance — the popup re-renders on every
    // state transition (post-OAuth, post-poll, etc.) and `feed()` rebuilds
    // the DOM, so reading raw `<input>` / `dataset` is unreliable. Skeleton
    // reads these via the getters below.
    this._includeShared = 0;
    // Migration mode + lazy folder-tree state (Selected mode). All of this
    // lives on the instance so it survives the re-render cycle.
    this._migrateMode = 'all';                 // 'all' | 'selected'
    // drive.file flow (Google Picker). scope_kind comes from get_state:
    // 'readonly' keeps the legacy in-app tree (whole-Drive capable);
    // 'file' (or none yet) uses the Google Picker instead — the app can
    // only see what the user explicitly picks there.
    this._scopeKind = null;                    // 'readonly' | 'file' | null
    this._connected = false;                   // has a usable Drive OAuth grant
    this._connectedEmail = null;               // Google account currently connected
    this._pickerAvail = 0;                     // server has api_key+project_number
    this._pickerDocs = [];                     // [{ id, name, is_folder }]
    // Whole-folder import via share-to-SA (drive-sa.json present on server).
    this._saAvail = 0;
    this._saEmail = null;
    this._saFolder = null;                     // { folder_id, name } after sa_check
    this._saError = null;                      // last sa_check error code
    this._saChecking = 0;
    this._treeCache = {};                      // folderId → { items, next_page_token, error? }
    this._expanded = new Set();
    this._checkedFolders = new Set();
    this._checkedFiles = new Set();
    this._loading = new Set();
    this._onPostMessage = this._onPostMessage.bind(this);
    this._onStorage = this._onStorage.bind(this);
    window.addEventListener('message', this._onPostMessage, false);
    // Google's consent screen sets Cross-Origin-Opener-Policy, which severs
    // the OAuth popup's window.opener — so the callback page can't reliably
    // postMessage back. Listen on same-origin channels that survive opener
    // severance instead.
    window.addEventListener('storage', this._onStorage, false);
    try {
      this._bc = new BroadcastChannel('gdrive-oauth');
      this._bc.onmessage = (evt) => {
        const d = evt && evt.data;
        if (d && d.type === 'gdrive-migration-started') return this._onMigrationStarted(d);
        return this._handleConnectResult(d);
      };
    } catch (e) {
      this._bc = null;
    }
  }

  onBeforeDestroy() {
    window.removeEventListener('message', this._onPostMessage, false);
    window.removeEventListener('storage', this._onStorage, false);
    if (this._bc) { try { this._bc.close(); } catch (e) {} this._bc = null; }
    this._stopPolling();
    this._disposePicker();
    clearTimeout(this._saCopyTimer);
  }

  /**
   * Wm.launch({ singleton: 1 }) reuses the existing popup instance and
   * calls .raise() on it instead of relaunching. LetcBox doesn't ship
   * one; without this stub the second click would throw `w.raise is not
   * a function` and never bring the popup back to the user.
   */
  raise() {
    if (this.el) {
      this.el.style.display = '';
      this.el.style.zIndex = 9999;
    }
    return this;
  }

  async onDomRefresh() {
    this._portalToBody();
    this._render();
    await this._refreshScope();
  }

  /**
   * Wm.launch renders the popup inside window-manager (z-auto), but the
   * Settings overlay slot has z-index 1500 — Settings paints on top.
   * Move the root element to document.body so its position:fixed + high
   * z-index actually wins.
   */
  _portalToBody() {
    if (!this.el) return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  // ───────── state transitions ─────────

  _render() {
    this.feed(require('./skeleton')(this));
  }

  async _refreshScope() {
    this._state = 'checking';
    this._render();
    let res;
    try {
      // get_state is the source of truth: it tells us whether a migration is
      // running in the worker (so we reconnect instead of showing "Start"),
      // whether one just finished (show the result once), and the drive scope.
      res = await this.fetchService('google_drive.get_state', { hub_id: Visitor.id });
    } catch (e) {
      this.warn('[migrate-gdrive] get_state failed', e);
      res = {};
    }
    this._seenJobId = (res && res.seen_job_id) || null;
    this._scopeKind = (res && res.scope_kind) || null;
    this._connected = !!(res && res.ok);
    this._connectedEmail = (res && res.email) || null;
    this._pickerAvail = (res && res.picker) ? 1 : 0;
    this._saAvail = (res && res.sa) ? 1 : 0;
    this._saEmail = (res && res.sa_email) || null;
    const job = res && res.job;
    this._hasPriorJob = !!job;

    // 1) A migration is still running in the worker → reconnect + resume poll.
    if (job && (job.status === 'queued' || job.status === 'running')) {
      this._jobId = job.job_id;
      this._jobSnap = job;
      this._state = 'in-progress';
      this._render();
      this._startPolling();
      return;
    }

    // 2) A migration finished while the popup was closed → show its result
    //    once. _close() acks it (server: profile.gdrive_seen_job) so later
    //    opens fall through to the normal ready screen.
    if (job && ['done', 'failed', 'cancelled'].includes(job.status)
        && String(job.job_id) !== String(this._seenJobId)) {
      this._jobId = job.job_id;
      this._jobSnap = job;
      this._state = job.status;
      this._render();
      return;
    }

    // 2b) Downgrade over-limit: migration is OFF while the workspace is over
    // its plan limits — an import only ADDS bytes. A RUNNING job fell through
    // to (1) above on purpose (watching + cancelling it makes the overage
    // smaller); with nothing running, say why and leave instead of offering
    // an import that the clamp refuses (its get_state 401 used to strand
    // this popup on the legacy OAuth pane — reported live).
    if (require('libs/over-limit').isLocked()) {
      require('libs/over-limit').notifyBlocked('write');
      this._close();
      return;
    }

    // 3) No active/unseen job → go straight to the share-to-SA flow.
    // The Google Picker was removed: its iframe needs third-party cookies that
    // Safari blocks by default (and Chrome is dropping), so it can't work
    // cross-browser. The SA flow needs no OAuth / Google sign-in / cookies and
    // works on every browser, so it's now the only import path. (Falls back to
    // the legacy connect/ready screen only if the server has no SA key.)
    this._state = this._saAvail ? 'sa' : ((res && res.ok) ? 'ready' : 'not-connected');
    this._render();
  }

  _onPostMessage(evt) {
    // Only accept messages from our own origin — the callback page is
    // served same-origin and posts with window.location.origin as target.
    if (evt && evt.origin && evt.origin !== window.location.origin) return;
    this._handleConnectResult(evt && evt.data);
  }

  _onStorage(evt) {
    // The callback page writes the result to localStorage when its
    // window.opener was severed by Google's COOP. `storage` events fire only
    // in *other* same-origin documents — i.e. this widget's window.
    if (!evt || evt.key !== 'gdrive-oauth-result' || !evt.newValue) return;
    let data;
    try { data = JSON.parse(evt.newValue); } catch (e) { return; }
    this._handleConnectResult(data);
  }

  _handleConnectResult(data) {
    if (!data || data.type !== 'gdrive-connected') return;
    // The same result can arrive on several channels (BroadcastChannel,
    // storage event, postMessage) — act on it once.
    if (this._connectHandled) return;
    this._connectHandled = 1;
    setTimeout(() => { this._connectHandled = 0; }, 1500);
    if (data.ok) {
      this._refreshScope();
    } else {
      this._connectError = data.reason || 'unknown';
      this._state = 'not-connected';
      this._render();
    }
  }

  async _connect() {
    // Clear any prior connect error so the retry doesn't keep showing it.
    this._connectError = null;
    let res;
    try {
      res = await this.fetchService('google_drive.connect', { hub_id: Visitor.id });
    } catch (e) {
      this.warn('[migrate-gdrive] connect failed', e);
      return;
    }
    if (!res || !res.auth_url) return;
    const w = window.open(res.auth_url, 'gdrive-oauth', 'width=520,height=640');
    if (!w) Wm.alert(LOCALE.POPUP_BLOCKED || 'Popup blocked — allow popups and try again.');
  }

  /**
   * Forget the connected Google account (server revokes + clears the Drive
   * tokens, keeping sign-in intact), then re-evaluate → 'not-connected', where
   * the user can Connect a different account. `connect` already uses
   * prompt=select_account, so "Switch account" is just _connect() (the OAuth
   * popup shows Google's account chooser) — no separate endpoint needed.
   */
  async _disconnect() {
    try {
      await this.postService('google_drive.disconnect', { hub_id: Visitor.id });
    } catch (e) {
      this.warn('[migrate-gdrive] disconnect failed', e);
    }
    this._connectedEmail = null;
    await this._refreshScope();
  }

  _getInputs() {
    // drive.file: the only meaningful input is the Picker pick set — the
    // token can't see anything else, so mode is forced to 'selected'.
    if (this.usesPicker()) {
      return {
        mode: 'selected',
        source_folder_id: 'root',
        include_shared_drives: 0,
        selections: {
          folder_ids: this._pickerDocs.filter((d) => d.is_folder).map((d) => d.id),
          file_ids: this._pickerDocs.filter((d) => !d.is_folder).map((d) => d.id),
        },
      };
    }
    const sharedToggle = this._getPartEl('shared-drives-toggle');
    if (sharedToggle) {
      this._includeShared = sharedToggle.dataset.state === '1' ? 1 : 0;
    }
    return {
      mode: this._migrateMode,
      source_folder_id: 'root',
      include_shared_drives: this._includeShared,
      selections: {
        folder_ids: Array.from(this._checkedFolders),
        file_ids: Array.from(this._checkedFiles),
      },
    };
  }

  _getPartEl(pn) {
    if (!this.el) return null;
    return this.el.querySelector(`[data-partname="${pn}"]`);
  }

  /**
   * Skeleton reads these to rebuild the ready screen + tree on every
   * re-render, so toggle state + selection survive re-render cycles
   * triggered by polling / postMessage / state transitions.
   */
  getIncludeShared() { return this._includeShared; }
  getMigrateMode() { return this._migrateMode; }
  getTreeNode(folderId) { return this._treeCache[folderId]; }
  isExpanded(id) { return this._expanded.has(id); }
  isFolderChecked(id) { return this._checkedFolders.has(id); }
  isFileChecked(id) { return this._checkedFiles.has(id); }
  isTreeLoading(id) { return this._loading.has(id); }
  hasSelection() {
    if (this.usesPicker()) return this._pickerDocs.length > 0;
    return this._checkedFolders.size > 0 || this._checkedFiles.size > 0;
  }

  // ───────── Google Picker (drive.file flow) ─────────

  /** Legacy drive.readonly grants keep the in-app tree; everyone else picks. */
  usesPicker() { return this._scopeKind !== 'readonly'; }
  isPickerAvailable() { return !!this._pickerAvail; }
  getPickerDocs() { return this._pickerDocs; }

  /**
   * Load Google's picker library once (api.js → gapi.load('picker')).
   * The promise is cached: loadJS() appends a fresh <script> on EVERY call,
   * so a double-click before the first load resolves would inject api.js
   * twice without this guard.
   */
  _loadPickerApi() {
    if (window.google && window.google.picker) return Promise.resolve();
    if (this._pickerApiPromise) return this._pickerApiPromise;
    const { loadJS } = require('@drumee/ui-essentials');
    this._pickerApiPromise = loadJS('https://apis.google.com/js/api.js')
      .then(() => new Promise((done, fail) => {
        if (!window.gapi) return fail(new Error('gapi unavailable'));
        window.gapi.load('picker', { callback: done, onerror: fail });
      }))
      .catch((e) => {
        // Allow a retry on the next click instead of caching the failure.
        this._pickerApiPromise = null;
        throw e;
      });
    return this._pickerApiPromise;
  }

  /**
   * Open the Google Picker with a fresh drive.file token. Every item the
   * user picks is granted to OUR app by Google at pick time — that grant is
   * exactly what the worker's token can later read.
   */
  async _openGooglePicker() {
    if (this._pickerOpening) return;        // debounce double-clicks
    this._pickerOpening = 1;
    try {
      let cfg;
      try {
        cfg = await this.fetchService('google_drive.picker_token', { hub_id: Visitor.id });
      } catch (e) {
        this.warn('[migrate-gdrive] picker_token failed', e);
        cfg = null;
      }
      if (!cfg || cfg.error || !cfg.access_token) {
        const reason = (cfg && cfg.error) || '';
        if (/NEEDS_RECONNECT/.test(reason)) {
          this._state = 'not-connected';
          this._render();
          return;
        }
        Wm.alert(LOCALE.GDRIVE_PICKER_UNAVAILABLE);
        return;
      }
      try {
        await this._loadPickerApi();
      } catch (e) {
        this.warn('[migrate-gdrive] picker api load failed', e);
        Wm.alert(LOCALE.GDRIVE_PICKER_UNAVAILABLE);
        return;
      }
      this._disposePicker();                // never stack picker instances
      const g = window.google.picker;
      // Folders are NAVIGABLE but not SELECTABLE (the Dropbox pattern).
      // Live-verified on this app: picking a folder grants only the folder
      // node — its children list back EMPTY (jobs 36/37: "skeletons",
      // "widgets" both NOT_GRANTED), so a folder pick silently imports an
      // empty shell. Users open the folder and multi-select the files inside.
      const view = new g.DocsView(g.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);
      const picker = new g.PickerBuilder()
        .addView(view)
        .enableFeature(g.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(cfg.access_token)
        .setDeveloperKey(cfg.api_key)
        // Cloud project NUMBER — without it Google records no per-app grant
        // and the worker 403/404s on the very ids the user just picked.
        .setAppId(String(cfg.app_id))
        // The Picker returns the user's selection via window.postMessage.
        // Without an explicit origin it targets a guessed one that does NOT
        // match this deployment (custom domain + `/-/<user>/` subpath), so the
        // PICKED message — and our _onPicked callback — is silently dropped:
        // the picker closes but the popup never shows the staged files. Pin it
        // to this page's real origin so the result always reaches us.
        .setOrigin(window.location.protocol + '//' + window.location.host)
        .setCallback((data) => this._onPicked(data))
        .build();
      picker.setVisible(true);
      this._picker = picker;
    } finally {
      this._pickerOpening = 0;
    }
  }

  /** Picker mounts its dialog on <body> — it outlives this.el unless disposed. */
  _disposePicker() {
    if (!this._picker) return;
    try { this._picker.dispose(); } catch (e) { /* already gone */ }
    this._picker = null;
  }

  /** Merge picked docs into the staging list (deduped), switch to selected. */
  _onPicked(data) {
    const g = window.google && window.google.picker;
    if (!g || !data || data[g.Response.ACTION] !== g.Action.PICKED) return;
    const FOLDER = 'application/vnd.google-apps.folder';
    for (const d of (data[g.Response.DOCUMENTS] || [])) {
      if (!d || !d.id) continue;
      if (this._pickerDocs.some((x) => x.id === d.id)) continue;
      this._pickerDocs.push({
        id: d.id,
        name: d.name || d.id,
        is_folder: d.mimeType === FOLDER ? 1 : 0,
      });
    }
    this._migrateMode = 'selected';
    this._render();
  }

  /**
   * Another open popup (same browser) started a migration — switch this one to
   * live progress instead of leaving "Start migration" visible. The first poll
   * tick fills in the real %, so we seed a queued snapshot meanwhile.
   */
  _onMigrationStarted(d) {
    if (!d || !d.job_id) return;
    if (this._state === 'in-progress' && String(this._jobId) === String(d.job_id)) return;
    this._jobId = d.job_id;
    this._jobSnap = { job_id: d.job_id, status: 'queued' };
    this._state = 'in-progress';
    this._render();
    this._startPolling();
  }

  async _loadFolder(folderId) {
    if (this._treeCache[folderId] || this._loading.has(folderId)) return;
    this._loading.add(folderId);
    this._renderTree();
    try {
      const res = await this.fetchService('google_drive.list', {
        hub_id: Visitor.id, folder_id: folderId,
      });
      this._treeCache[folderId] = {
        items: (res && res.files) || [],
        next_page_token: (res && res.next_page_token) || null,
      };
    } catch (e) {
      this.warn('[migrate-gdrive] list failed', e);
      this._treeCache[folderId] = { items: [], next_page_token: null, error: 1 };
    } finally {
      this._loading.delete(folderId);
      this._renderTree();
    }
  }

  async _loadMore(folderId) {
    const node = this._treeCache[folderId];
    if (!node || !node.next_page_token || this._loading.has(folderId)) return;
    this._loading.add(folderId);
    this._renderTree();
    try {
      const res = await this.fetchService('google_drive.list', {
        hub_id: Visitor.id, folder_id: folderId, page_token: node.next_page_token,
      });
      node.items = node.items.concat((res && res.files) || []);
      node.next_page_token = (res && res.next_page_token) || null;
    } catch (e) {
      this.warn('[migrate-gdrive] list more failed', e);
    } finally {
      this._loading.delete(folderId);
      this._renderTree();
    }
  }

  /**
   * Tree changed (expand/check/page). The tree lives on the Choose-folders
   * step (Figma 1639:52297) and its selection-summary footer sits OUTSIDE
   * the tree part, so re-feed the whole screen to keep counts in sync.
   */
  _renderTree() {
    if (!this.el || this._state !== 'choose') return;
    this._render();
  }

  /** Toggle the Start button's disabled look without a full re-render. */
  _refreshStartState() {
    const btn = this._getPartEl('gdrive-start-btn');
    if (!btn) return;
    const empty = (this.usesPicker() || this._migrateMode === 'selected') && !this.hasSelection();
    btn.dataset.disabled = empty ? '1' : '';
  }

  async _startMigration() {
    if (this._starting) return;
    this._starting = 1;
    if ((this.usesPicker() || this._migrateMode === 'selected') && !this.hasSelection()) {
      Wm.alert(LOCALE.MIGRATE_GDRIVE_NOTHING_SELECTED || 'Select at least one folder or file.');
      this._starting = 0;
      return;
    }
    const { mode, source_folder_id, include_shared_drives, selections } = this._getInputs();
    let res;
    try {
      res = await this.postService('google_drive.start_migration', {
        hub_id: this._hub_id,
        nid: this._nid,
        direct_into: this._direct,
        mode,
        source_folder_id,
        include_shared_drives,
        selections,
        conflict_policy: 'skip',
      });
    } catch (e) {
      this.warn('[migrate-gdrive] start_migration failed', e);
      const raw = (e && (e.reason || e.error || e.message)) || '';
      // The server pre-flights the source with the user's own token and
      // refuses a start whose share was already revoked on Google's side —
      // say that in words, not as a raw status code.
      Wm.alert(/SOURCE_ACCESS_REVOKED/.test(raw)
        ? (LOCALE.MIGRATE_GDRIVE_SOURCE_REVOKED
          || 'Drumee no longer has access to the selected folder on Google Drive. Restore sharing (or pick it again), then retry.')
        : raw || (LOCALE.TRY_AGAIN || 'Try again'));
      this._starting = 0;
      return;
    }
    this._starting = 0;
    if (!res || !res.job_id) {
      Wm.alert(LOCALE.TRY_AGAIN || 'Try again');
      return;
    }
    this._jobId = res.job_id;
    this._fileLog = [];
    this._state = 'in-progress';
    this._render();
    this._startPolling();
    // Tell other open popups (same browser, e.g. another tab sitting on the
    // "ready" screen) that a migration just started, so they switch to live
    // progress instead of still offering "Start migration".
    try {
      if (this._bc) this._bc.postMessage({ type: 'gdrive-migration-started', job_id: res.job_id });
    } catch (e) { /* noop */ }
  }

  _installCancelDelegate() {
    if (this._cancelDelegate || !this.el) return;
    // pointerup, not click: the poll's re-feed can replace the button
    // BETWEEN mousedown and mouseup, and the browser only fires click when
    // both land on the SAME element — which is exactly why the button felt
    // dead. pointerup always fires on whatever is under the pointer.
    this._cancelDelegate = (e) => {
      const btn = e.target && e.target.closest
        && e.target.closest(`.${this.fig.family}__primary-btn--cancel-job`);
      if (!btn || btn.dataset.disabled) return;
      e.stopPropagation();
      this._cancelJob();
    };
    this.el.addEventListener('pointerup', this._cancelDelegate, true);
  }

  _startPolling() {
    this._stopPolling();
    this._installCancelDelegate();
    const tick = async () => {
      if (!this._jobId) return;
      try {
        const r = await this.fetchService('google_drive.get_status', {
          hub_id: Visitor.id,
          job_id: this._jobId,
        });
        if (!r) return;
        const sig = [r.status, r.processed_files, r.total_files,
          r.errors_count, r.current_filename].join('|');
        const changed = sig !== this._lastPollSig;
        this._lastPollSig = sig;
        this._jobSnap = r;
        this._trackFileLog(r);
        if (['done', 'failed', 'cancelled'].includes(r.status)) {
          this._stopPolling();
          this._state = r.status;
          this._cancelRequested = 0;
          // The files exist now, so show them where the user already is —
          // without waiting for a click on "Open in Drumee". A cancelled or
          // failed run can still have imported part of the set, so those
          // refresh too; there is nothing to gain from leaving a stale grid.
          this._refreshDestination();
        }
        // Re-feeding identical content every 2s replaced the Cancel button
        // element for nothing, eating clicks. Only paint real changes.
        if (changed) this._render();
      } catch (e) {
        this.warn('[migrate-gdrive] get_status failed', e);
      }
    };
    tick();
    this._poll = setInterval(tick, POLL_INTERVAL_MS);
  }

  _stopPolling() {
    if (this._poll) { clearInterval(this._poll); this._poll = null; }
  }

  /**
   * Rolling per-file list for the in-progress screen (Figma 1640:83630).
   * The worker only reports `current_filename` (flushed every few files), so
   * we reconstruct a log client-side: when the name changes, the previous
   * entry flips to "done" and the new one shows "uploading".
   */
  _trackFileLog(snap) {
    if (!this._fileLog) this._fileLog = [];
    const cur = snap && snap.current_filename;
    const last = this._fileLog[this._fileLog.length - 1];
    if (cur && (!last || last.name !== cur)) {
      if (last && last.status === 'uploading') last.status = 'done';
      this._fileLog.push({ name: cur, status: 'uploading' });
      if (this._fileLog.length > 12) this._fileLog.shift();
    }
    if (snap && ['done', 'cancelled', 'failed'].includes(snap.status)) {
      const tail = this._fileLog[this._fileLog.length - 1];
      if (tail && tail.status === 'uploading') tail.status = 'done';
    }
  }

  getFileLog() { return this._fileLog || []; }

  /**
   * Footer summary for the Choose-folders step (Figma 1639:52297):
   * "N folders selected" + best-effort byte total (Drive only reports sizes
   * for FILES; folder totals would need a full recursion, so the sum covers
   * checked files plus nothing for folders).
   */
  getSelectionSummary() {
    let bytes = 0;
    for (const node of Object.values(this._treeCache)) {
      for (const it of (node && node.items) || []) {
        if (!it.is_folder && this._checkedFiles.has(it.id) && it.size) {
          bytes += parseInt(it.size, 10) || 0;
        }
      }
    }
    return { folders: this._checkedFolders.size, files: this._checkedFiles.size, bytes };
  }

  // ───────── whole-folder import (share-to-SA) ─────────

  isSaAvailable() { return !!this._saAvail; }
  getSaEmail() { return this._saEmail; }
  getSaFolder() { return this._saFolder; }
  getConnectedEmail() { return this._connectedEmail; }
  isConnected() { return !!this._connected; }
  getSaError() { return this._saError; }
  isSaChecking() { return !!this._saChecking; }

  _readSaInput() {
    const el = this._getPartEl('sa-folder-row');
    const input = el && el.querySelector('input');
    return input ? String(input.value || '').trim() : '';
  }

  /** Validate the pasted folder link with the server (share + ownership). */
  async _saVerify() {
    const folder = this._readSaInput();
    if (!folder) return null;
    this._saChecking = 1;
    this._saError = null;
    this._saFolder = null;
    this._render();
    let res;
    try {
      res = await this.fetchService('google_drive.sa_check', { hub_id: Visitor.id, folder });
    } catch (e) {
      res = null;
    }
    this._saChecking = 0;
    if (res && res.ok && res.folder_id) {
      this._saFolder = { folder_id: res.folder_id, name: res.name, is_folder: !!res.is_folder, raw: folder };
      this._saError = null;
    } else {
      this._saError = (res && res.error) || 'SA_NOT_SHARED';
    }
    this._render();
    return this._saFolder;
  }

  /** Verify (if not yet) then enqueue the SA whole-folder migration. */
  async _saStart() {
    if (this._starting) return;
    if (!this._saFolder) {
      const ok = await this._saVerify();
      if (!ok) return;
    }
    this._starting = 1;
    let res;
    try {
      res = await this.postService('google_drive.start_migration', {
        hub_id: this._hub_id,
        nid: this._nid,
        direct_into: this._direct,
        auth_kind: 'sa',
        sa_folder: this._saFolder.raw || this._saFolder.folder_id,
        conflict_policy: 'skip',
      });
    } catch (e) {
      this.warn('[migrate-gdrive] sa start failed', e);
      this._saError = (e && (e.reason || e.error || e.message)) || 'SA_NOT_SHARED';
      this._starting = 0;
      this._render();
      return;
    }
    this._starting = 0;
    if (!res || !res.job_id) {
      Wm.alert(LOCALE.TRY_AGAIN || 'Try again');
      return;
    }
    this._jobId = res.job_id;
    this._fileLog = [];
    this._state = 'in-progress';
    this._render();
    this._startPolling();
    try {
      if (this._bc) this._bc.postMessage({ type: 'gdrive-migration-started', job_id: res.job_id });
    } catch (e) { /* noop */ }
  }

  async _cancelJob() {
    if (!this._jobId || this._cancelRequested) return;
    // Immediate feedback: the button flips to "Cancelling…" on the next
    // render (and every 2s poll re-render keeps it), so the click visibly
    // took even though the worker needs a moment to notice the flag.
    this._cancelRequested = 1;
    this._render();
    try {
      await this.postService('google_drive.cancel', {
        hub_id: Visitor.id, job_id: this._jobId,
      });
    } catch (e) {
      this.warn('[migrate-gdrive] cancel failed', e);
      this._cancelRequested = 0;
      this._render();
    }
  }

  async _skipForNow() {
    try {
      await this.postService('google_drive.dismiss_post_onboarding', { hub_id: Visitor.id });
    } catch (e) {
      this.warn('[migrate-gdrive] dismiss_post_onboarding failed', e);
    }
    this._close();
  }

  /**
   * Where the import landed, as a nid.
   *
   * With direct_into=1 the worker reports the destination folder ITSELF
   * (importer.js: `_destNidOut = (rootFolder && rootFolder.nid) || nid`), so
   * this is the folder the user was standing in when they hit "+ New →
   * Migrate from Google Drive". Without it, it is the GoogleDriveMigration
   * wrapper the worker created underneath.
   */
  _destNid() {
    const snap = this._jobSnap || {};
    return snap.dest_nid || this._nid;
  }

  /**
   * The open folder window already showing that folder, or null.
   *
   * Same predicate as window/utils `_findFolderWindow`, rewritten here because
   * that one lives on the window base class and this popup is a LetcBox.
   * getItemsByKind walks the whole Wm tree, so it finds the workspace folder in
   * headlessLayer as well as a floating one in windowsLayer.
   */
  _openFolderWindow(nid) {
    if (typeof Wm === 'undefined' || !_.isFunction(Wm.getItemsByKind)) return null;
    try {
      return (Wm.getItemsByKind('window_folder') || []).find(
        (w) => w
          && !(w.isDestroyed && w.isDestroyed())
          && `${w.mget(_a.hub_id)}` === `${this._hub_id}`
          && `${w.mget(_a.nid)}` === `${nid}`,
      ) || null;
    } catch (e) {
      this.warn('[migrate-gdrive] folder window lookup failed', e);
      return null;
    }
  }

  /**
   * Show the imported files where the user already is.
   *
   * The direct_into flow exists so nobody has to move files out of a
   * GoogleDriveMigration folder afterwards — but the folder they were standing
   * in was rendered BEFORE the import, so it kept showing the old contents and
   * the migration read as having done nothing. The only way to see the files
   * was "Open in Drumee", which opened a SECOND window on the very folder
   * already on screen: the destination nid is that folder's own nid, and
   * openFileLocation's reuse path only matches a rendered media node, not the
   * window. Two windows on one folder, to see something that should simply
   * have appeared.
   *
   * refreshContent re-runs loadContent in place, which is what an upload into
   * an open folder already does.
   *
   * @param {Object} [opt]
   * @param {Boolean} [opt.raise] bring the window forward as well
   * @returns {Boolean} true when a window was found and refreshed
   */
  _refreshDestination(opt = {}) {
    const win = this._openFolderWindow(this._destNid());
    if (!win) return false;
    if (opt.raise && _.isFunction(win.raise)) win.raise();
    if (!_.isFunction(win.refreshContent)) return false;
    try {
      win.refreshContent({});
    } catch (e) {
      this.warn('[migrate-gdrive] destination refresh failed', e);
      return false;
    }
    return true;
  }

  _close() {
    // Closing from a finished-result view (whether it just finished here or
    // we reconnected to a completed job) → tell the server we've seen it, so
    // reopening the popup won't replay the same result.
    if (this._jobId && ['done', 'failed', 'cancelled'].includes(this._state)) {
      this.postService('google_drive.ack_result', { hub_id: Visitor.id, job_id: this._jobId })
        .catch(() => {});
    }
    // parent.clear() is only right when the parent is a single-widget modal
    // host (clearing resets its data-state — the stuck-overlay rule). Under
    // Wm.launch the parent is the shared windowsLayer: clear() there wipes
    // EVERY open window — closing this popup after a folder-window import
    // took the folder window down with it (reported live). When we share the
    // parent with anyone else, remove only ourselves.
    const p = this.parent;
    const soleChild = p?.children?.length === 1;
    if (soleChild && _.isFunction(p.clear)) p.clear();
    else if (_.isFunction(this.goodbye)) this.goodbye();
    else this.softDestroy();
  }

  /**
   * From a finished-result view, go back to the ready screen to run another
   * (incremental) migration instead of closing. Acks the shown result so it
   * won't reappear, then jumps straight to 'ready' (the user is connected,
   * having just migrated) — avoiding a get_state round-trip that would replay
   * the same result.
   */
  _restart() {
    if (this._jobId) {
      this.postService('google_drive.ack_result', { hub_id: Visitor.id, job_id: this._jobId })
        .catch(() => {});
    }
    this._jobId = null;
    this._jobSnap = null;
    this._seenJobId = null;
    this._migrateMode = 'all';
    this._treeCache = {};
    this._expanded.clear();
    this._checkedFolders.clear();
    this._checkedFiles.clear();
    this._loading.clear();
    // Picker flow: the previous pick set was just imported — start the next
    // round with an empty staging list instead of silently re-importing it.
    this._pickerDocs = [];
    this._fileLog = [];
    // SA flow likewise: drop the verified-folder state so "Migrate again"
    // doesn't show a stale folder name from the previous run.
    this._saFolder = null;
    this._saError = null;
    // SA-only: "Migrate again" returns to the share-to-SA screen, not the
    // removed Picker/ready screen.
    this._state = this._saAvail ? 'sa' : 'ready';
    this._render();
  }

  /**
   * From a NEEDS_RECONNECT failure, re-authorize Drive instead of dead-ending.
   * The stored token is dead (revoked, or clobbered by a later Google login
   * writing a login-client refresh_token over the row), so just going to
   * 'ready' and pressing Start would re-fail. Ack the failed job first so
   * get_state won't replay it after re-auth, clear job state, then open the
   * OAuth flow. On success _handleConnectResult → _refreshScope lands on
   * 'ready' with a fresh Drive-scoped refresh_token.
   */
  async _reconnect() {
    // The failed job is replayed by get_state until acked — ack it (AWAITED, so
    // the get_state inside _refreshScope below doesn't race and re-surface the
    // same NEEDS_RECONNECT result) before re-evaluating the connection.
    if (this._jobId) {
      try {
        await this.postService('google_drive.ack_result', { hub_id: Visitor.id, job_id: this._jobId });
      } catch (e) { /* best-effort ack */ }
    }
    this._jobId = null;
    this._jobSnap = null;
    this._seenJobId = null;
    // We only reach here from a NEEDS_RECONNECT failure, which the worker
    // raises ONLY on a fatal token error (invalid_grant / invalid_client /
    // unauthorized_client) — i.e. the stored Drive token is provably dead
    // (revoked, minted by a DIFFERENT OAuth client than the current Drive
    // client, or clobbered by a later Google login). get_state/has_drive_scope
    // only check that the row EXISTS (scope + refresh_token present), never
    // that the token still WORKS, so re-checking scope would wrongly land on
    // 'ready' and the next Start would re-fail — trapping the user in a loop.
    // Force the OAuth flow to mint a fresh token from the current Drive client.
    // Show 'not-connected' meanwhile so a blocked/cancelled popup leaves the
    // user on the re-authorize screen, not a stale failed-job view.
    this._state = 'not-connected';
    this._render();
    return this._connect();
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case 'close-migrate-popup':
        return this._close();
      case 'gdrive-connect':
        return this._connect();
      case 'gdrive-disconnect':
        return this._disconnect();
      // "Switch account" — reuse connect; its prompt=select_account makes
      // Google show the account chooser so the user can pick a different Drive.
      case 'gdrive-switch-account':
        return this._connect();
      case 'gdrive-start':
        return this._startMigration();
      case 'gdrive-cancel':
        return this._cancelJob();
      case 'gdrive-skip':
        return this._skipForNow();
      case 'gdrive-retry-connect':
        return this._refreshScope();
      case 'gdrive-restart':
        return this._restart();
      case 'gdrive-reconnect':
        return this._reconnect();
      case 'gdrive-toggle-shared': {
        // Flip dataset.state in place AND persist to instance so the
        // value survives re-renders (skeleton seeds dataset.state from
        // `getIncludeShared()`).
        this._includeShared = this._includeShared ? 0 : 1;
        const row = this._getPartEl('shared-drives-toggle');
        if (row) row.dataset.state = String(this._includeShared);
        return;
      }
      case 'gdrive-mode': {
        const mode = cmd.mget('mode') === 'selected' ? 'selected' : 'all';
        if (mode === this._migrateMode) return;
        this._migrateMode = mode;
        this._render();
        if (mode === 'selected' && !this._treeCache.root) this._loadFolder('root');
        return;
      }
      case 'gdrive-tree-expand': {
        const id = cmd.mget('gid');
        if (!id) return;
        if (this._expanded.has(id)) {
          this._expanded.delete(id);
        } else {
          this._expanded.add(id);
          if (!this._treeCache[id]) this._loadFolder(id);
        }
        this._renderTree();
        return;
      }
      case 'gdrive-tree-check': {
        const id = cmd.mget('gid');
        if (!id) return;
        const set = cmd.mget('gtype') === 'folder' ? this._checkedFolders : this._checkedFiles;
        if (set.has(id)) set.delete(id); else set.add(id);
        this._renderTree();
        this._refreshStartState();
        return;
      }
      case 'gdrive-tree-more': {
        return this._loadMore(cmd.mget('gid'));
      }
      // Step 1 → Step 2 (legacy readonly, mode=selected): the folder tree is
      // its own screen per Figma 1639:52297, not inline under the radio.
      case 'gdrive-next':
        if (!this.usesPicker() && this._migrateMode === 'selected') {
          this._state = 'choose';
          if (!this._treeCache.root) this._loadFolder('root');
          this._render();
          return;
        }
        return this._startMigration();
      case 'gdrive-back':
        this._state = 'ready';
        this._render();
        return;
      // Done screen "Open in Drumee →": reveal the import folder. Prefer the
      // GoogleDriveMigration root the worker reports (dest_nid) — the raw
      // destination is usually the HOME the user is already looking at, so
      // opening it reads as "nothing happened".
      case 'gdrive-open-dest': {
        // Already open — which is the NORMAL case for the direct_into launch,
        // where the destination is the folder the user started from. Raise and
        // refresh it instead of opening a second window on the same folder:
        // openFileLocation would launch one, because its reuse path matches a
        // rendered media node rather than the folder's own window.
        if (this._refreshDestination({ raise: true })) return this._close();

        // Not open: the popup was launched from Settings / Home / onboarding,
        // where the destination is somewhere the user is not. Its overlay sits
        // above the desk, so the revealed folder would open BEHIND it — close
        // the main panels first (same guard pattern as desk/wm).
        try {
          if (window.Desk && typeof window.Desk.closeMainPanels === 'function') {
            window.Desk.closeMainPanels();
          }
        } catch (e) { /* non-fatal */ }
        try {
          Wm.openFileLocation({ nid: this._destNid(), hub_id: this._hub_id, filetype: _a.folder });
        } catch (e) { /* non-fatal — still close */ }
        return this._close();
      }
      case 'gdrive-open-picker':
        return this._openGooglePicker();
      case 'gdrive-picker-remove': {
        const id = cmd.mget('gid');
        if (!id) return;
        this._pickerDocs = this._pickerDocs.filter((d) => d.id !== id);
        this._render();
        return;
      }
      // ── whole-folder import (share-to-SA) ──
      case 'gdrive-sa-open':
        this._saError = null;
        this._state = 'sa';
        this._render();
        return;
      case 'gdrive-sa-back':
        // Return to wherever the user entered the SA flow from: the ready
        // screen if connected, the connect screen if not (SA needs no OAuth).
        this._state = this._connected ? 'ready' : 'not-connected';
        this._render();
        return;
      case 'gdrive-sa-copy': {
        const email = this._saEmail || '';
        try { navigator.clipboard.writeText(email); } catch (e) { /* http ctx */ }
        const b = this._getPartEl('sa-copy-btn');
        if (b) {
          const card = b.closest(`.${this.fig.family}__sa-email-card`);
          b.textContent = LOCALE.COPIED || 'Copied';
          // reset → reflow → set so the green "pop" replays on every click,
          // even rapid repeat clicks within the revert window.
          b.dataset.copied = '';
          if (card) card.dataset.copied = '';
          void b.offsetWidth;
          b.dataset.copied = '1';
          if (card) card.dataset.copied = '1';
          // Revert to the idle "Copy" label after a short, visible beat.
          clearTimeout(this._saCopyTimer);
          this._saCopyTimer = setTimeout(() => {
            if (b.isConnected) { b.dataset.copied = ''; b.textContent = LOCALE.COPY || 'Copy'; }
            if (card && card.isConnected) card.dataset.copied = '';
          }, 1800);
        }
        return;
      }
      case 'gdrive-sa-verify':
        return this._saVerify();
      case 'gdrive-sa-start':
        return this._saStart();
    }
  }

  // Expose state for the skeleton.
  getState() { return this._state; }
  getJobSnap() { return this._jobSnap; }
  isAutoFromOnboarding() { return this._autoFromOnboarding; }
  hasPriorJob() { return this._hasPriorJob; }
  getConnectError() { return this._connectError; }
}

__migrate_gdrive_popup.initClass();
module.exports = __migrate_gdrive_popup;
