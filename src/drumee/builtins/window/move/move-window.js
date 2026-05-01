const mfsInteract = require('../interact');
require('./skin');

class ___window_move extends mfsInteract {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.contextmenuSkeleton = _a.none;
    this._selectedDestination = null;
    this._workspaces = [];
    this._searchTimer = null;
  }

  onBeforeRender() {
    this.el.dataset.state = _a.closed;
    this.el.dataset.type = "move";
    this.el.classList.add(`${this.fig.family}__ui`);
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'destination-search':
        this._setupSearchInput(child);
        break;
      case 'suggestions':
        this.__suggestionsList = child;
        this._setupSuggestionClicks(child);
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case 'remove-destination':
        this._selectedDestination = null;
        this._renderSelectedList();
        this._updateMoveButton();
        break;
      case 'confirm-move':
        if (this.onConfirmMove) this.onConfirmMove(cmd, args);
        break;
      case _e.close:
        if (this.onClose) this.onClose(cmd, args);
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }

  // --- Event delegation: single click handler on suggestions container ---
  _setupSuggestionClicks(container) {
    // Cancel pending search on mousedown — prevents debounce from destroying
    // the suggestion element before the click event fires
    container.el.addEventListener('mousedown', () => {
      clearTimeout(this._searchTimer);
    });
    container.el.addEventListener('click', (e) => {
      const row = e.target.closest('[data-service="select-suggestion"]');
      if (!row) return;
      const ds = row.dataset;
      this._selectedDestination = {
        nid: ds.nid || ds.hub_id,
        hub_id: ds.hub_id,
        filename: ds.filename || ds.wsname,
        wsName: ds.wsname || ds.filename,
      };
      this._hideSuggestions();
      this._renderSelectedList();
      this._updateMoveButton();
    });
  }

  _renderSelectedList() {
    const chipEl = this.el.querySelector('.window-move__selected-item');
    const nameEl = this.el.querySelector('.window-move__selected-name');
    if (!chipEl) return;
    if (!this._selectedDestination) {
      chipEl.dataset.active = 0;
      return;
    }
    const { filename, wsName } = this._selectedDestination;
    if (nameEl) nameEl.textContent = filename || wsName || '';
    chipEl.dataset.active = 1;
  }

  _updateMoveButton() {
    const btn = this.el.querySelector('.window-move__move-btn');
    if (btn) btn.dataset.ready = this._selectedDestination ? 1 : 0;
  }

  _setupSearchInput(entry) {
    const input = entry.el.querySelector('input');
    if (!input) return;
    input.addEventListener('input', (e) => {
      const q = (e.target.value || '').trim();
      clearTimeout(this._searchTimer);
      if (!q) { this._hideSuggestions(); return; }
      this._searchTimer = setTimeout(() => this._search(q), 100);
    });
    // Remove blur hide — let user click freely, suggestions hide only on select
  }

  // --- Popup lifecycle ---
  move(items) {
    this.el.dataset.state = _a.open;

    const item = _.isArray(items) ? items[0] : items;
    const filename = item ? (item.mget ? item.mget(_a.filename) : item.filename) : '';
    const folderName = this.mget('folderName') || filename || LOCALE.FOLDER;

    this._items = _.isArray(items) ? items : [items];
    this._folderName = folderName;
    this._workspaceName = LOCALE.WORKSPACE;
    this._filename = filename;
    this._area = this.mget(_a.area) || this.mget('area') || 'inner-folder';
    this._currentHubId = this.mget(_a.hub_id) || this.mget('hub_id');

    this.feed(require('./skeleton')(this));
    this.ensurePart("destination-search").then((entry) => this._setupSearchInput(entry));
    this._loadWorkspaces();

    return new Promise((resolve, reject) => {
      this.onConfirmMove = () => {
        this._done = true;
        if (!this._selectedDestination) {
          reject({ response: _e.cancel });
          this.goodbye();
          return;
        }
        resolve({ destination: this._selectedDestination, items: this._items });
        this.goodbye();
      };
      this.onClose = () => {
        this._done = true;
        reject({ response: _e.close });
        this.goodbye();
      };
      this.onBeforeDestroy = () => {
        if (this._done) return;
        reject({ response: _e.close });
      };
    });
  }

  // --- Workspace loading ---
  _loadWorkspaces() {
    this.fetchService(SERVICE.desk.home, {
      hub_id: Visitor.id,
      type: _a.hub,
    }).then((data) => {
      this._workspaces = _.isArray(data) ? data : (data.data || data.list || data.rows || []);
      const match = this._workspaces.find((ws) => (ws.hub_id || ws.id) === this._currentHubId);
      if (match) {
        const wsName = match.filename || match.name || LOCALE.WORKSPACE;
        this.ensurePart("location-path").then((n) => {
          if (n && n.el) n.el.textContent = wsName;
        });
      }
    }).catch((e) => this.warn("Failed to load workspaces", e));
  }

  // --- Search ---
  _search(query) {
    const lower = query.toLowerCase();
    const matchedWs = this._workspaces.filter((ws) => {
      const wsId = ws.hub_id || ws.id;
      if (wsId === this._currentHubId) return false;
      const name = ws.filename || ws.name || '';
      return name.toLowerCase().includes(lower);
    });
    this._renderSuggestions(matchedWs);
  }

  _renderSuggestions(workspaces) {
    const pfx = `${this.fig.group}-move`;
    const kids = workspaces.map((ws) => {
      const wsName = ws.filename || ws.name || 'Workspace';
      const hubId = ws.hub_id || ws.id;
      const destNid = ws.home_id || ws.actual_home_id || ws.nid || hubId;
      return Skeletons.Box.X({
        className: `${pfx}__ws-row`,
        dataset: { service: 'select-suggestion', nid: destNid, hub_id: hubId, filename: wsName, wsname: wsName },
        kids: [
          Skeletons.Image.Svg({ ico: 'addmenu-folder', className: `${pfx}__item-icon` }),
          Skeletons.Note({ className: `${pfx}__item-name`, content: wsName }),
        ],
      });
    });

    if (kids.length === 0) {
      kids.push(Skeletons.Note({
        className: `${pfx}__no-results`,
        content: LOCALE.NO_RESULTS || 'No results',
      }));
    }

    const s = this.__suggestionsList;
    if (!s) return;
    s.feed(kids);
    s.el.dataset.state = 1;
  }

  _hideSuggestions() {
    const s = this.__suggestionsList;
    if (s) s.el.dataset.state = 0;
  }

}

module.exports = ___window_move;
