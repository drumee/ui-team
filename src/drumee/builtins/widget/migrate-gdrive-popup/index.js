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
    this._autoFromOnboarding = !!opt.autoFromOnboarding;
    this._state = 'checking';
    this._jobId = null;
    this._jobSnap = null;
    this._poll = null;
    // Form values persisted on the instance — the popup re-renders on every
    // state transition (post-OAuth, post-poll, etc.) and `feed()` rebuilds
    // the DOM, so reading raw `<input>` / `dataset` is unreliable. Skeleton
    // reads these via the getters below.
    this._sourceFolderId = 'root';
    this._includeShared = 0;
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
      this._bc.onmessage = (evt) => this._handleConnectResult(evt && evt.data);
    } catch (e) {
      this._bc = null;
    }
  }

  onBeforeDestroy() {
    window.removeEventListener('message', this._onPostMessage, false);
    window.removeEventListener('storage', this._onStorage, false);
    if (this._bc) { try { this._bc.close(); } catch (e) {} this._bc = null; }
    this._stopPolling();
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
    // Mirror DOM → instance on every keystroke so subsequent re-renders
    // (post-OAuth, post-poll) seed the Entry with the user's latest value
    // instead of resetting to ''.
    requestAnimationFrame(() => this._wireFormSync());
  }

  _wireFormSync() {
    if (!this.el) return;
    const folderEl = this._getPartEl('source-folder-input');
    const input = folderEl && folderEl.querySelector('input');
    if (input && !input._gdriveBound) {
      input._gdriveBound = 1;
      input.value = this._sourceFolderId;
      input.addEventListener('input', () => {
        this._sourceFolderId = (input.value || '').trim() || 'root';
      });
    }
  }

  async _refreshScope() {
    this._state = 'checking';
    this._render();
    let res;
    try {
      res = await this.fetchService('google_drive.has_drive_scope', { hub_id: Visitor.id });
    } catch (e) {
      this.warn('[migrate-gdrive] has_drive_scope failed', e);
      res = { ok: false };
    }
    this._state = (res && res.ok) ? 'ready' : 'not-connected';
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

  _getInputs() {
    // Read the latest DOM values first (user may have typed/toggled since
    // the last cache), then persist to instance so a subsequent re-render
    // can restore them from `getSourceFolderId()` / `getIncludeShared()`.
    const folderInput = this._getPartEl('source-folder-input');
    if (folderInput) {
      const v = (folderInput.querySelector('input')?.value || '').trim();
      this._sourceFolderId = v || 'root';
    }
    const sharedToggle = this._getPartEl('shared-drives-toggle');
    if (sharedToggle) {
      this._includeShared = sharedToggle.dataset.state === '1' ? 1 : 0;
    }
    return {
      source_folder_id: this._sourceFolderId,
      include_shared_drives: this._includeShared,
    };
  }

  _getPartEl(pn) {
    if (!this.el) return null;
    return this.el.querySelector(`[data-partname="${pn}"]`);
  }

  /**
   * Skeleton reads these to seed Entry value + toggle state on every
   * re-render, so user input survives re-render cycles triggered by
   * polling / postMessage / state transitions.
   */
  getSourceFolderId() { return this._sourceFolderId; }
  getIncludeShared() { return this._includeShared; }

  async _startMigration() {
    if (this._starting) return;
    this._starting = 1;
    const { source_folder_id, include_shared_drives } = this._getInputs();
    let res;
    try {
      res = await this.postService('google_drive.start_migration', {
        hub_id: this._hub_id,
        nid: this._nid,
        source_folder_id,
        include_shared_drives,
        conflict_policy: 'skip',
      });
    } catch (e) {
      this.warn('[migrate-gdrive] start_migration failed', e);
      Wm.alert((e && (e.reason || e.error || e.message)) || (LOCALE.TRY_AGAIN || 'Try again'));
      this._starting = 0;
      return;
    }
    this._starting = 0;
    if (!res || !res.job_id) {
      Wm.alert(LOCALE.TRY_AGAIN || 'Try again');
      return;
    }
    this._jobId = res.job_id;
    this._state = 'in-progress';
    this._render();
    this._startPolling();
  }

  _startPolling() {
    this._stopPolling();
    const tick = async () => {
      if (!this._jobId) return;
      try {
        const r = await this.fetchService('google_drive.get_status', {
          hub_id: Visitor.id,
          job_id: this._jobId,
        });
        if (!r) return;
        this._jobSnap = r;
        if (['done', 'failed', 'cancelled'].includes(r.status)) {
          this._stopPolling();
          this._state = r.status;
        }
        this._render();
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

  async _cancelJob() {
    if (!this._jobId) return;
    try {
      await this.postService('google_drive.cancel', {
        hub_id: Visitor.id, job_id: this._jobId,
      });
    } catch (e) {
      this.warn('[migrate-gdrive] cancel failed', e);
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

  _close() {
    if (this.parent && _.isFunction(this.parent.clear)) this.parent.clear();
    else this.softDestroy();
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case 'close-migrate-popup':
        return this._close();
      case 'gdrive-connect':
        return this._connect();
      case 'gdrive-start':
        return this._startMigration();
      case 'gdrive-cancel':
        return this._cancelJob();
      case 'gdrive-skip':
        return this._skipForNow();
      case 'gdrive-retry-connect':
        return this._refreshScope();
      case 'gdrive-toggle-shared': {
        // Flip dataset.state in place AND persist to instance so the
        // value survives re-renders (skeleton seeds dataset.state from
        // `getIncludeShared()`).
        this._includeShared = this._includeShared ? 0 : 1;
        const row = this._getPartEl('shared-drives-toggle');
        if (row) row.dataset.state = String(this._includeShared);
        return;
      }
    }
  }

  // Expose state for the skeleton.
  getState() { return this._state; }
  getJobSnap() { return this._jobSnap; }
  isAutoFromOnboarding() { return this._autoFromOnboarding; }
  getConnectError() { return this._connectError; }
}

__migrate_gdrive_popup.initClass();
module.exports = __migrate_gdrive_popup;
