class __admin_members extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._page = 1;
    this._selected = [];
    this._searchQuery = '';
  }

  async onDomRefresh() {
    // await this._loadStats();
    this.feed(require('./skeleton')(this));
  }

  async _loadStats() {
    try {
      const data = await this.fetchService(SERVICE.admin.get_members_stats, {});
      this.mset('total_members',   data.total_members);
      this.mset('admin_count',     data.admin_count);
      this.mset('guest_count',     data.guest_count);
      this.mset('pending_invites', data.pending_invites);
    } catch (e) {
    }
  }

  getMembers() {
    return this.fetchService(SERVICE.admin.get_members, {
      page: this._page,
      search: this._searchQuery,
    });
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'members-list':
        this._list = child;
        break;
      case 'page-nums':
        this._pageNums = child;
        this._renderPageNums();
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  _renderPageNums() {
    if (!this._pageNums) return;
    const pfx = this.fig.family;
    const total = this.mget('total_pages') || 1;
    const pages = [1, 2, 3].filter((p) => p <= total);
    this._pageNums.feed([
      ...pages.map((p) =>
        Skeletons.Note({
          className: `${pfx}__page-num${p === this._page ? ' active' : ''}`,
          content: String(p),
          service: 'go-to-page',
          dataset: { page: p },
          uiHandler: [this],
        })
      ),
      total > 3 ? Skeletons.Note({ className: `${pfx}__page-ellipsis`, content: '…' }) : null,
      total > 3 ? Skeletons.Note({
        className: `${pfx}__page-num`,
        content: String(total),
        service: 'go-to-page',
        dataset: { page: total },
        uiHandler: [this],
      }) : null,
    ].filter(Boolean));
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
      case 'invite-member':
        this.triggerHandlers({ service: 'invite-member' });
        break;
      case 'select-all':
        this._toggleSelectAll(trigger);
        break;
      case 'member-selection-changed':
        this._syncSelected(args.item);
        break;
      case 'remove-selected':
        if (this._selected.length) {
          this.triggerHandlers({ service: 'remove-members', ids: [...this._selected] });
        }
        break;
      case 'filter-roles':
        this.triggerHandlers({ service: 'filter-roles' });
        break;
      case 'edit-member':
        this.triggerHandlers({ service: 'edit-member', data: args.data });
        break;
      case 'delete-member':
        this.triggerHandlers({ service: 'delete-member', data: args.data });
        break;
      case 'prev-page':
        if (this._page > 1) {
          this._page--;
          if (this._list) this._list.reload();
          this._renderPageNums();
        }
        break;
      case 'next-page':
        this._page++;
        if (this._list) this._list.reload();
        this._renderPageNums();
        break;
      case 'go-to-page':
        this._page = parseInt(trigger.el.dataset.page, 10) || 1;
        if (this._list) this._list.reload();
        this._renderPageNums();
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  _toggleSelectAll(trigger) {
    const allSelected = trigger.mget('state') === 1;
    if (this._list) {
      this._list.children.each((child) => {
        child.mset('selected', allSelected);
      });
    }
  }

  _syncSelected(item) {
    if (!item) return;
    const id = item.mget('drumate_id') || item.mget(_a.id);
    if (item.mget('selected')) {
      if (!this._selected.includes(id)) this._selected.push(id);
    } else {
      this._selected = this._selected.filter((i) => i !== id);
    }
  }
}

module.exports = __admin_members;
