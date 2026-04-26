class apps_main extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._tab = "member";
    this._roleFilter = "all";
    this._filterOpen = false;
    this._page = 1;
    this._selected = new Set();
    this._members = require("./skeleton/data").default;
    this._auditUnlocked = false;
    this._storageView = "main";
    this._retentionDays = 30;
    this._applyImmediately = false;
    this._allowMembersView = false;
    this._allowEditorsRestore = false;
    this._showApplyConfirm = false;
    this._onDocumentClick = this._onDocumentClick.bind(this);
    document.addEventListener("click", this._onDocumentClick, true);
  }

  onBeforeDestroy() {
    document.removeEventListener("click", this._onDocumentClick, true);
  }

  _onDocumentClick(e) {
    if (!this._filterOpen) return;
    const filterEl = this.el && this.el.querySelector(".apps-main__table-filter");
    const dropdownEl = this.el && this.el.querySelector(".apps-main__filter-menu");
    if (
      filterEl && !filterEl.contains(e.target) &&
      dropdownEl && !dropdownEl.contains(e.target)
    ) {
      this._filterOpen = false;
      this.feed(require("./skeleton").default(this));
    }
  }

  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
  }

  switchTab(tab) {
    this._tab = tab;
    this.feed(require("./skeleton").default(this));
  }

  toggleMember(id) {
    if (this._selected.has(id)) this._selected.delete(id);
    else this._selected.add(id);
    this.feed(require("./skeleton").default(this));
  }

  toggleAll() {
    if (this._selected.size === this._members.length) {
      this._selected.clear();
    } else {
      this._selected = new Set(this._members.map((m) => m.id));
    }
    this.feed(require("./skeleton").default(this));
  }

  goToPage(page) {
    this._page = page;
    this.feed(require("./skeleton").default(this));
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "apps-switch-tab":
        return this.switchTab(cmd.mget("tab"));

      case "apps-toggle-member":
        return this.toggleMember(cmd.mget("member_id"));

      case "apps-toggle-all":
        return this.toggleAll();

      case "apps-page":
        return this.goToPage(cmd.mget("page_num"));

      case "apps-filter-roles":
        this._filterOpen = !this._filterOpen;
        return this.feed(require("./skeleton").default(this));

      case "apps-select-role":
        this._roleFilter = cmd.mget("role_key");
        this._filterOpen = false;
        return this.feed(require("./skeleton").default(this));

      case "apps-remove-selected":
      case "apps-add-new":
      case "apps-invite":
      case "apps-reward":
      case "apps-edit-member":
      case "apps-delete-member":
      case "apps-audit-upgrade":
        this._auditUnlocked = true;
        return this.feed(require("./skeleton").default(this));

      case "apps-audit-range":
      case "apps-audit-export":
      case "apps-audit-prev":
      case "apps-audit-next":
      case "apps-storage-retention":
        this._storageView = "retention";
        return this.feed(require("./skeleton").default(this));

      case "apps-back-storage":
        this._storageView = "main";
        this._showApplyConfirm = false;
        return this.feed(require("./skeleton").default(this));

      case "apps-apply-policy":
        this._showApplyConfirm = true;
        return this.feed(require("./skeleton").default(this));

      case "apps-apply-confirm-close":
        this._showApplyConfirm = false;
        return this.feed(require("./skeleton").default(this));

      case "apps-apply-confirm-apply":
        this._showApplyConfirm = false;
        this._storageView = "main";
        return this.feed(require("./skeleton").default(this));

      case "apps-select-period":
        this._retentionDays = parseInt(cmd.mget("days"), 10) || 30;
        return this.feed(require("./skeleton").default(this));

      case "apps-toggle-apply-immediately":
        this._applyImmediately = !this._applyImmediately;
        return this.feed(require("./skeleton").default(this));

      case "apps-toggle-members-view":
        this._allowMembersView = !this._allowMembersView;
        return this.feed(require("./skeleton").default(this));

      case "apps-toggle-editors-restore":
        this._allowEditorsRestore = !this._allowEditorsRestore;
        return this.feed(require("./skeleton").default(this));

      case "apps-storage-upgrade":
      case "apps-storage-clear-cache":
      case "apps-storage-archive":
      case "apps-storage-row-settings":
      case "apps-storage-sort":
      case "apps-storage-prev":
      case "apps-storage-next":
        return;

      default:
        return;
    }
  }
}

module.exports = apps_main;
