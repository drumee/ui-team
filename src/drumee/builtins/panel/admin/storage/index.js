class __admin_storage extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._selected     = [];
    this._searchQuery  = '';
    this._wsFilter     = '';
    this._userPage     = 1;
    this._userSort     = 'usage_desc';
  }

  async onDomRefresh() {
    try {
      const data = await this.fetchService(SERVICE.admin.get_storage_stats, {});
      this.model.set(data);
    } catch (e) {
    }
    this.feed(require('./skeleton')(this));
  }

  getUsers() {
    return this.fetchService(SERVICE.admin.get_storage_users, {
      page: this._userPage,
      sort: this._userSort,
    });
  }

  getFiles() {
    return this.fetchService(SERVICE.admin.get_storage_files, {
      search:    this._searchQuery,
      workspace: this._wsFilter,
    });
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'files-list':
        this._list = child;
        break;
      case 'user-list':
        this._userList = child;
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'upgrade-plan':
        this.triggerHandlers({ service: 'upgrade-plan' });
        break;
      case 'capacity-options':
        break;
      case 'storage-action-required':
        this.triggerHandlers({ service: 'storage-action-required' });
        break;
      case 'browse-archive':
        this.triggerHandlers({ service: 'browse-archive' });
        break;
      case 'clear-cache':
        this.postService(SERVICE.admin.clear_cache, {});
        break;
      case 'filter-workspace':
        break;
      case 'search-files':
        this.ensurePart('file-search').then((p) => {
          this._searchQuery = p.el.querySelector('input')?.value?.trim() || '';
          if (this._list) this._list.reload();
        });
        break;
      case 'retention-policy':
        this.triggerHandlers({ service: 'retention-policy' });
        break;
      case 'select-all-files':
        if (this._list) {
          this._list.children.each((child) => child.mset('selected', true));
        }
        break;
      case 'file-selection-changed':
        this._syncSelected(args.item);
        break;
      case 'view-all-files':
        this.triggerHandlers({ service: 'view-all-files' });
        break;
      case 'delete-selected-files':
        if (this._selected.length) {
          this.postService(SERVICE.admin.delete_storage_files, { ids: [...this._selected] });
        }
        break;
      case 'file-options':
        this.triggerHandlers({ service: 'file-options', data: args.data });
        break;
      case 'delete-file':
        this.postService(SERVICE.admin.delete_storage_files, { ids: [args.data?.id] });
        break;
      case 'sort-users':
        this._userSort = this._userSort === 'usage_desc' ? 'usage_asc' : 'usage_desc';
        this.mset('sort_label', this._userSort === 'usage_desc' ? LOCALE.USAGE_HIGH_TO_LOW : LOCALE.USAGE_LOW_TO_HIGH);
        if (this._userList) this._userList.reload();
        break;
      case 'prev-users':
        if (this._userPage > 1) { this._userPage--; if (this._userList) this._userList.reload(); }
        break;
      case 'next-users':
        this._userPage++;
        if (this._userList) this._userList.reload();
        break;
      case 'user-storage-settings':
        this.triggerHandlers({ service: 'user-storage-settings', data: args.data });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  _syncSelected(item) {
    if (!item) return;
    const id = item.mget(_a.id);
    if (item.mget('selected')) {
      if (!this._selected.includes(id)) this._selected.push(id);
    } else {
      this._selected = this._selected.filter((i) => i !== id);
    }
  }
}

module.exports = __admin_storage;
