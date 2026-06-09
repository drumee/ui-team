const mfsInteract = require('../interact');
require('./skin');

class ___window_move extends mfsInteract {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.contextmenuSkeleton = _a.none;
    this._selectedDestinations = [];
    this._navStack = [];
    this._currentItems = [];
    this._blockedNids = new Set();
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
      case 'breadcrumb':
        this.__breadcrumb = child;
        this._setupBreadcrumbClicks(child);
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case 'browse-destination':
        // The "+" button resets navigation back to the workspace root level.
        this._navStack = [{ type: 'root', name: LOCALE.WORKSPACES }];
        this._loadLevel();
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

  // --- Click delegation: open (drill-in) vs select (toggle destination) ---
  _setupSuggestionClicks(container) {
    container.el.addEventListener('mousedown', (e) => {
      clearTimeout(this._searchTimer);
      const row = e.target.closest('[data-service="select-suggestion"]');
      if (!row) return;
      const target = e.target.closest('[data-action]');
      const action = target ? target.dataset.action : row.dataset.action;
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      if (action === 'open') {
        if (row.dataset.loading === '1') return;
        row.dataset.loading = 1;
        this._openNode(row.dataset, row);
      } else if (action === 'select') {
        this._toggleDestination(row.dataset, row);
      }
    });
    container.el.addEventListener('click', (e) => {
      const row = e.target.closest('[data-service="select-suggestion"]');
      if (!e.target.closest('[data-action]') && !row) return;
      e.preventDefault();
      e.stopPropagation();
    });
  }

  _setupBreadcrumbClicks(container) {
    container.el.addEventListener('mousedown', (e) => {
      const crumb = e.target.closest('[data-action="crumb"]');
      if (!crumb) return;
      e.preventDefault();
      e.stopPropagation();
      this._navigateTo(Number(crumb.dataset.index));
    });
  }

  // --- Selection (keyed by hub_id:nid to allow many subfolders per hub) ---
  _destKey(d) {
    return `${d.hub_id}:${d.nid}`;
  }

  _toggleDestination(ds = {}, row) {
    const nid = ds.nid;
    const hubId = ds.hub_id;
    if (!nid || !hubId) return;
    if (this._isBlockedDest({ nid })) return; // cyclic guard
    const dest = {
      nid,
      hub_id: hubId,
      filename: ds.filename || ds.wsname,
      wsName: ds.wsname || ds.filename,
      isFolder: ds.isfolder === '1' ? 1 : 0,
      home_nid: ds.home_nid || nid,
    };
    const key = this._destKey(dest);
    const index = this._selectedDestinations.findIndex((d) => this._destKey(d) === key);
    const selected = index < 0;
    if (selected) {
      this._selectedDestinations.push(dest);
    } else {
      this._selectedDestinations.splice(index, 1);
    }
    if (row) {
      row.dataset.selected = selected ? 1 : 0;
      const checkbox = row.querySelector(`.${this.fig.group}-move__checkbox`);
      if (checkbox) checkbox.innerHTML = selected ? '✓' : '&nbsp;';
    }
    this._updateMoveButton();
  }

  _isSelectedDestination(hubId, nid) {
    const key = `${hubId}:${nid}`;
    return this._selectedDestinations.some((d) => this._destKey(d) === key);
  }

  _currentDestination() {
    const level = this._navStack[this._navStack.length - 1];
    if (!level || level.type !== 'folder') return null;
    if (this._isBlockedDest(level)) return null;
    return {
      nid: level.nid,
      hub_id: level.hub_id,
      filename: level.name,
      wsName: level.name,
      isFolder: level.isFolder ? 1 : 0,
      home_nid: level.home_nid || level.nid,
    };
  }

  // A destination is invalid when it is the folder being moved, or any node
  // inside that folder's subtree (would create a cyclic move).
  _isBlockedDest(node = {}) {
    if (!this._blockedNids.size) return false;
    if (node.nid && this._blockedNids.has(String(node.nid))) return true;
    return this._navStack.some((lvl) => lvl.nid && this._blockedNids.has(String(lvl.nid)));
  }

  _updateMoveButton() {
    const btn = this.el.querySelector(`.${this.fig.group}-move__move-btn`);
    const ready = this._selectedDestinations.length || this._currentDestination();
    if (btn) btn.dataset.ready = ready ? 1 : 0;
  }

  _setupSearchInput(entry) {
    const input = entry.el.querySelector('input');
    if (!input) return;
    input.addEventListener('input', (e) => {
      const q = (e.target.value || '').trim();
      clearTimeout(this._searchTimer);
      if (!q) {
        this._renderLevel(this._currentItems);
        return;
      }
      this._searchTimer = setTimeout(() => this._search(q), 100);
    });
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

    // Cyclic-move guard: block the folder(s)/hub(s) being moved as destinations.
    // Files have no descendants, so they never create a cycle.
    this._blockedNids = new Set(
      this._items
        .filter((it) => {
          const ft = it.mget ? it.mget(_a.filetype) : it.filetype;
          return ft === _a.folder || ft === _a.hub;
        })
        .map((it) => String(it.mget ? it.mget(_a.nid) : it.nid))
        .filter(Boolean)
    );

    this._navStack = [{ type: 'root', name: LOCALE.WORKSPACES }];

    this.feed(require('./skeleton')(this));
    this._loadLevel();

    return new Promise((resolve, reject) => {
      this.onConfirmMove = () => {
        this._done = true;
        const currentDestination = this._currentDestination();
        const destinations = this._selectedDestinations.length
          ? this._selectedDestinations
          : currentDestination ? [currentDestination] : [];
        if (!destinations.length) {
          reject({ response: _e.cancel });
          this.goodbye();
          return;
        }
        resolve({
          destination: destinations[0],
          destinations,
          items: this._items,
        });
        this.goodbye();
      };
      this.onClose = () => {
        this._done = true;
        reject({ response: _e.close });
        this.goodbye();
      };
      this.onBeforeDestroy = () => {
        clearTimeout(this._searchTimer);
        if (this._done) return;
        reject({ response: _e.close });
      };
    });
  }

  // --- Level loading (root = workspaces; folder = subfolders via show_node_by) ---
  _loadLevel() {
    const level = this._navStack[this._navStack.length - 1];

    if (!level || level.type === 'root') {
      const workspacesPromise = this.fetchService(SERVICE.desk.home, {
        hub_id: Visitor.id,
        type: _a.hub,
      }).catch((e) => {
        this.warn("Failed to load workspaces", e);
        return [];
      });
      const homeFoldersPromise = this.fetchService(SERVICE.desk.home, {
        hub_id: Visitor.id,
      }).catch((e) => {
        this.warn("Failed to load home folders", e);
        return [];
      });
      Promise.all([
        workspacesPromise,
        homeFoldersPromise,
      ]).then(([workspaceData, homeData]) => {
        const workspaces = this._asList(workspaceData)
          .map((ws) => this._normalizeWorkspace(ws));
        const homeFolders = this._asList(homeData)
          .filter((it) => this._isFolderItem(it))
          .map((it) => this._normalizeHomeFolder(it));
        const items = [...workspaces, ...homeFolders];
        this._currentItems = items;
        this._renderLevel(items);
        this._updateLocationPath();
      }).catch((e) => this.warn("Failed to load root destinations", e));
      return;
    }

    // Drill-down: list folders inside the current node (mirror workspace-item).
    this.fetchService(SERVICE.media.show_node_by, {
      hub_id: level.hub_id,
      nid: level.nid,
      type: _a.folder,
    }).then((data) => {
      const items = this._asList(data)
        .filter((it) => it.filetype === _a.folder || it.type === _a.folder)
        .map((it) => this._normalizeFolder(it, level));
      this._currentItems = items;
      this._renderLevel(items);
    }).catch((e) => {
      this.warn("Failed to load folders", e);
      this._currentItems = [];
      this._renderLevel([]);
    });
  }

  _asList(data) {
    if (_.isArray(data)) return data;
    return (data && (data.data || data.list || data.rows || data.result)) || [];
  }

  _isFolderItem(item = {}) {
    return item.filetype === _a.folder || item.type === _a.folder;
  }

  _normalizeWorkspace(ws = {}) {
    // Per-workspace home node id. actual_home_id is the distinct root nid of
    // each hub; home_id is the visitor's shared home and must not win here
    // (same field priority as the sidebar's workspace-item.getNodeId).
    const nid = ws.actual_home_id || ws.home_id || ws.nid || ws.id || ws.hub_id;
    const hub_id = ws.hub_id || ws.id;
    return {
      nid,
      hub_id,
      name: ws.filename || ws.name || LOCALE.WORKSPACE,
      area: ws.area || this._area,
      isFolder: 0,        // workspace root
      home_nid: nid,
      section: 'workspace',
    };
  }

  _normalizeHomeFolder(item = {}) {
    const nid = item.nid || item.actual_home_id || item.home_id || item.id;
    return {
      nid,
      hub_id: item.hub_id || Visitor.id,
      name: item.filename || item.name || LOCALE.FOLDER,
      area: item.area || _a.personal,
      isFolder: 1,
      home_nid: item.home_id || Visitor.get(_a.home_id),
      section: 'home-folder',
    };
  }

  _normalizeFolder(item = {}, parentLevel = {}) {
    const nid = item.nid || item.actual_home_id || item.home_id || item.id;
    return {
      nid,
      hub_id: item.hub_id || parentLevel.hub_id,
      name: item.filename || item.name || LOCALE.FOLDER,
      area: item.area || parentLevel.area || this._area,
      isFolder: 1,        // subfolder
      home_nid: parentLevel.home_nid || parentLevel.nid,
      section: 'folder',
    };
  }

  _folderIcon(area) {
    const iconArea = area || 'inner-folder';
    return `<svg class="folder-shape ${iconArea}" viewBox="0 0 105 86" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M33.5743 1.5H15C8.37258 1.5 3 6.87258 3 13.5V69C3 75.6274 8.37258 81 15 81H90C96.6274 81 102 75.6274 102 69L102 28.2C102 21.5726 96.6274 16.2 90 16.2H58.8349C55.8072 16.2 52.8913 15.0555 50.672 12.9959L41.7372 4.70411C39.5179 2.64453 36.6021 1.5 33.5743 1.5Z"/></svg>`;
  }

  // --- Navigation ---
  _openNode(ds = {}, row) {
    if (!ds.nid || !ds.hub_id) {
      if (row) row.dataset.loading = 0;
      return;
    }
    this._navStack.push({
      type: 'folder',
      nid: ds.nid,
      hub_id: ds.hub_id,
      name: ds.filename || ds.wsname || LOCALE.FOLDER,
      area: ds.area || this._area,
      isFolder: ds.isfolder === '1' ? 1 : 0,
      home_nid: ds.home_nid || ds.nid,
    });
    this._loadLevel();
  }

  _navigateTo(index) {
    if (index < 0 || index >= this._navStack.length) return;
    this._navStack = this._navStack.slice(0, index + 1);
    this._loadLevel();
  }

  _search(query) {
    const lower = query.toLowerCase();
    const matched = this._currentItems.filter((it) =>
      (it.name || '').toLowerCase().includes(lower)
    );
    this._renderLevel(matched);
  }

  _updateLocationPath() {
    const match = this._currentItems.find((ws) =>
      ws.section === 'workspace' && String(ws.hub_id) === String(this._currentHubId)
    );
    if (!match) return;
    this.ensurePart("location-path").then((n) => {
      if (n && n.el) n.el.textContent = match.name;
    });
  }

  // --- Rendering ---
  _renderLevel(items) {
    this._renderBreadcrumb();

    const pfx = `${this.fig.group}-move`;
    const kids = [];

    items.forEach((node) => {
      const blocked = this._isBlockedDest(node);
      const selected = this._isSelectedDestination(node.hub_id, node.nid) ? 1 : 0;
      kids.push(Skeletons.Box.X({
        className: `${pfx}__ws-row`,
        dataset: {
          service: 'select-suggestion',
          action: 'open',
          nid: node.nid,
          hub_id: node.hub_id,
          filename: node.name,
          wsname: node.name,
          area: node.area,
          isfolder: node.isFolder,
          home_nid: node.home_nid,
          selected,
          disabled: blocked ? 1 : 0,
        },
        kids: [
          Skeletons.Element({ className: `${pfx}__item-icon`, content: this._folderIcon(node.area), dataset: { action: 'open' } }),
          Skeletons.Box.X({
            className: `${pfx}__item-label`,
            dataset: { action: 'open' },
            kids: [
              Skeletons.Note({ className: `${pfx}__item-name`, content: node.name }),
              Skeletons.Element({ className: `${pfx}__item-loader` }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__checkbox-hit`,
            dataset: { action: 'select' },
            kids: [
              Skeletons.Element({ className: `${pfx}__checkbox`, content: selected ? '✓' : '&nbsp;' }),
            ],
          }),
        ],
      }));
    });

    if (kids.length === 0) {
      kids.push(Skeletons.Note({ className: `${pfx}__no-results`, content: LOCALE.EMPTY_FOLDER_WORKSPACE }));
    }

    const s = this.__suggestionsList;
    if (!s) return;
    s.feed(kids);
    s.el.dataset.state = 1;
    this._updateMoveButton();
  }

  _renderBreadcrumb() {
    const b = this.__breadcrumb;
    if (!b) return;
    const pfx = `${this.fig.group}-move`;
    const kids = [];
    this._navStack.forEach((lvl, i) => {
      if (i > 0) {
        kids.push(Skeletons.Note({ className: `${pfx}__crumb-sep`, content: '›' }));
      }
      kids.push(Skeletons.Note({
        className: `${pfx}__crumb`,
        content: lvl.name,
        dataset: { action: 'crumb', index: i },
      }));
    });
    b.feed(kids);
    b.el.dataset.state = this._navStack.length > 1 ? 1 : 0;
  }

}

module.exports = ___window_move;
