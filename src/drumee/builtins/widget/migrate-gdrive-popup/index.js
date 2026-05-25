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
    this._onPostMessage = this._onPostMessage.bind(this);
    window.addEventListener('message', this._onPostMessage, false);
  }

  onBeforeDestroy() {
    window.removeEventListener('message', this._onPostMessage, false);
    this._stopPolling();
  }

  async onDomRefresh() {
    this._render();
    await this._refreshScope();
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
      res = await this.fetchService('google_drive.has_drive_scope', { hub_id: Visitor.id });
    } catch (e) {
      this.warn('[migrate-gdrive] has_drive_scope failed', e);
      res = { ok: false };
    }
    this._state = (res && res.ok) ? 'ready' : 'not-connected';
    this._render();
  }

  _onPostMessage(evt) {
    const data = evt && evt.data;
    if (!data || data.type !== 'gdrive-connected') return;
    if (data.ok) {
      this._refreshScope();
    } else {
      this._connectError = data.reason || 'unknown';
      this._state = 'not-connected';
      this._render();
    }
  }

  async _connect() {
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
    const folderInput = this._getPartEl('source-folder-input');
    const source_folder_id = folderInput
      ? (folderInput.querySelector('input')?.value || '').trim() || 'root'
      : 'root';
    const sharedToggle = this._getPartEl('shared-drives-toggle');
    const include_shared_drives = sharedToggle && sharedToggle.dataset.state === '1' ? 1 : 0;
    return { source_folder_id, include_shared_drives };
  }

  _getPartEl(pn) {
    if (!this.el) return null;
    return this.el.querySelector(`[data-partname="${pn}"]`);
  }

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
        // Flip dataset.state in place — avoids a full re-render so the
        // source-folder input value isn't lost.
        const row = this._getPartEl('shared-drives-toggle');
        if (row) row.dataset.state = row.dataset.state === '1' ? '0' : '1';
        return;
      }
    }
  }

  // Expose state for the skeleton.
  getState() { return this._state; }
  getJobSnap() { return this._jobSnap; }
  isAutoFromOnboarding() { return this._autoFromOnboarding; }
}

__migrate_gdrive_popup.initClass();
module.exports = __migrate_gdrive_popup;
