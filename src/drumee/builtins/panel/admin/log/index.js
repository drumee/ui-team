class __admin_log extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._page        = 1;
    this._searchQuery = '';
    this._dateRange   = 'last-30-days';
  }

  async onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  getLogs() {
    return this.fetchService(SERVICE.admin.get_logs, {
      page:   this._page,
      search: this._searchQuery,
      range:  this._dateRange,
    });
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'log-list':
        this._list = child;
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'search':
        this.ensurePart('search-input').then((p) => {
          this._searchQuery = p.el.querySelector('input')?.value?.trim() || '';
          this._page = 1;
          if (this._list) this._list.reload();
        });
        break;
      case 'pick-date-range':
        break;
      case 'export-csv':
        this.postService(SERVICE.admin.export_logs, {
          search: this._searchQuery,
          range:  this._dateRange,
        });
        break;
      case 'prev-page':
        if (this._page > 1) {
          this._page--;
          if (this._list) this._list.reload();
        }
        break;
      case 'next-page':
        this._page++;
        if (this._list) this._list.reload();
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __admin_log;
