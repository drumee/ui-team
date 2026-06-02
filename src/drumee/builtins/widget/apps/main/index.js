const { filesize } = require("@drumee/ui-essentials");

// Avatar palette cycled by id-hash so initials avatars stay stable per user.
const AVATAR_COLORS = ["cyan", "purple", "amber", "pink"];

// Map a row from `file_version_list` to the shape the FE skeleton consumes.
function normalizeFileVersionRow(r) {
  return {
    ...r,
    id: r.id || r.nid,
    name: r.name || r.filename,
    ext: r.ext || r.extension,
    folder: r.folder || r.folder_name || "",
    workspace: r.workspace || r.workspace_name || "",
    size: r.size || (r.filesize != null ? filesize(r.filesize) : ""),
    versions: r.versions != null ? r.versions : r.version_count || 0,
  };
}

// `file_version_get` returns two result sets: file metadata + versions list.
// Different transports flatten this differently; accept both shapes.
function normalizeFileVersionDetail(res) {
  if (!res) return null;
  let head = null;
  let versions = [];
  if (Array.isArray(res)) {
    // Two-result-set raw form: [[fileRow], [v1, v2, ...]] or [fileRow, [versions]].
    if (Array.isArray(res[0])) {
      head = res[0][0] || null;
      versions = Array.isArray(res[1]) ? res[1] : [];
    } else {
      head = res[0] || null;
      versions = Array.isArray(res[1]) ? res[1] : [];
    }
  } else if (typeof res === "object") {
    head = res.file || res.head || res;
    versions = Array.isArray(res.versions)
      ? res.versions
      : Array.isArray(res.list)
        ? res.list
        : [];
  }
  if (!head) return null;
  return {
    id: head.id || head.nid,
    nid: head.nid || head.id,
    title: head.title || head.filename,
    filename: head.filename,
    ext: head.ext || head.extension,
    size: head.size || (head.filesize != null ? filesize(head.filesize) : ""),
    retention: head.retention || "",
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version || `v${v.version_num}.0`,
      version_num: v.version_num,
      timestamp: v.ctime ? Dayjs(v.ctime * 1000).fromNow() : "",
      file: v.filename,
      size: v.filesize != null ? filesize(v.filesize) : "",
      editor: v.editor || v.editor_name || "",
      active: v.is_active === 1 || v.is_active === true || v.active === true,
    })),
  };
}

function avatarColorFor(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initialsFor(firstname, lastname, fullname) {
  const f = (firstname || "").trim();
  const l = (lastname || "").trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  const n = (fullname || `${f} ${l}`).trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// role_label is the canonical signal from hub_member_list ("OWNER" |
// "HUB_ADMIN" | "MEMBER"). hub_permission is a fallback for endpoints that
// only return the bitmask.
function deriveRole(row) {
  const label = String(
    (row && (row.role_label || row.role)) || "",
  ).toUpperCase();
  if (label === "OWNER") {
    return {
      label: LOCALE.ORGANIZATION_OWNER || "Organization Owner",
      variant: "owner",
    };
  }
  if (
    label === "HUB_ADMIN" ||
    label === "ADMIN" ||
    label === "WORKSPACE_ADMIN"
  ) {
    return {
      label: LOCALE.WORKSPACE_ADMIN || "Workspace Admin",
      variant: "admin",
    };
  }
  if (label === "MEMBER") {
    return { label: LOCALE.MEMBER || "Member", variant: "member" };
  }
  const p =
    parseInt(
      (row &&
        (row.hub_permission != null ? row.hub_permission : row.privilege)) ||
        0,
      10,
    ) || 0;
  if (_K && _K.permission) {
    if (p & _K.permission.owner) {
      return {
        label: LOCALE.ORGANIZATION_OWNER || "Organization Owner",
        variant: "owner",
      };
    }
    if (p & _K.permission.admin) {
      return {
        label: LOCALE.WORKSPACE_ADMIN || "Workspace Admin",
        variant: "admin",
      };
    }
  }
  return { label: LOCALE.MEMBER || "Member", variant: "member" };
}

const TABS_BY_ROLE = {
  // 'security' is UI-only for now — toggles update local state, no SP calls.
  owner: ["member", "security", "audit", "storage"],
  admin: ["member", "permissions", "admin-storage"],
  member: [],
};

function deriveVisitorRole() {
  if (typeof Visitor !== "undefined" && Visitor && Visitor.domainCan) {
    if (Visitor.domainCan(_K.permission.owner)) return "owner";
    if (Visitor.domainCan(_K.permission.admin)) return "admin";
  }
  return "member";
}

function deriveStatus(row) {
  const s = String((row && row.status) || "").toLowerCase();
  if (s === "online" || s === "away" || s === "offline") return s;
  if (row && (row.online === 1 || row.online === true)) return "online";
  if (row && row.connected === 0) return "offline";
  return "offline";
}

// last_active arrives as a unix timestamp in seconds (e.g. 1779085588) or null.
function deriveLastActive(row) {
  if (!row) return "—";
  const t = row.last_active || row.last_login || row.mtime || row.ctime;
  if (!t) return "—";
  try {
    const ms = Number(t) > 1e12 ? Number(t) : Number(t) * 1000;
    const d = Dayjs(ms);
    if (!d.isValid()) return String(t);
    return d.fromNow();
  } catch (e) {
    return String(t);
  }
}

function mapMember(row) {
  const id = row.uid || row.drumate_id || row.user_id || row.id;
  const fullname =
    row.fullname || `${row.firstname || ""} ${row.lastname || ""}`.trim();
  return {
    id,
    raw: row,
    initials: initialsFor(row.firstname, row.lastname, fullname),
    avatar_color: avatarColorFor(id),
    name: fullname || row.email || "—",
    email: row.email || "",
    role: deriveRole(row),
    workspaces: [],
    status: deriveStatus(row),
    last_active: deriveLastActive(row),
    hub_permission:
      row.hub_permission != null ? row.hub_permission : row.privilege || 0,
  };
}

class apps_main extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._role = deriveVisitorRole();
    this._isPrivileged = this._role === "owner" || this._role === "admin";
    this._visibleTabs = TABS_BY_ROLE[this._role] || [];
    this._tab = this._visibleTabs[0] || "member";
    this._adminHubs = [];
    this._activeAdminHub = null;
    this._adminHubsState = "idle";
    this._adminHubMenuOpen = false;
    this._adminHubSearch = "";
    // overview = workspace cards, detail = members of the picked hub.
    // Owner role ignores this state (always renders the flat list).
    this._memberView = "overview";
    this._roleFilter = "all";
    this._filterOpen = false;
    this._page = 1;
    this._membersPageSize = 20;
    this._membersTotal = 0;
    this._memberQuery = "";
    this._selected = new Set();
    this._members = [];
    this._memberStats = null;
    this._membersState = "idle"; // idle | loading | loaded | error
    this._statsState = "idle";
    // Default unlocked — the upsell overlay was a placeholder; reintroduce
    // when billing wires up a real plan gate.
    this._auditUnlocked = true;
    this._auditLogs = [];
    this._auditLogsTotal = 0;
    this._auditPageSize = 20;
    this._auditStats = null;
    this._auditState = "idle";
    this._auditPage = 1;
    this._auditUsername = "";
    // '7d' | '30d' | '90d' | 'all' — the date-range pill is a preset picker;
    // _auditFrom/_auditTo are derived from this on every fetch so the key is
    // the single source of truth.
    this._auditRangeKey = "30d";
    this._auditRangeOpen = false;
    this._orgStorageStats = [];
    this._orgUserStorage = [];
    this._orgUserStorageTotal = 0;
    this._orgUserStoragePageSize = 20;
    this._storageState = "idle";
    this._storagePage = 1;
    this._storageSort = "usage_high";
    this._storageView = "main";
    this._retentionDays = 30;
    this._applyImmediately = false;
    this._allowMembersView = false;
    this._allowEditorsRestore = false;
    this._showApplyConfirm = false;
    this._editingMember = null;
    this._activeWorkspace = null;
    this._wsDetailPage = 1;
    this._editingFolder = null;
    // Security tab: UI-only state (no backend wiring yet).
    this._securityPlan = "normal"; // "normal" | "self-hosting"
    this._security2fa = {
      authenticator: true,
      passkeys: false,
      hardware: true,
    };
    this._securitySso = { okta: false, google: false, azure: false };
    this._securityTags = {};
    this._editingHub = null; // Access-control overlay (Security tab pencil)
    this._secCtrl = null;
    this._fpermMembers = [];
    this._fpermDevices = [];
    this._permWorkspaces = [];
    this._permState = "idle"; // idle | loading | loaded | error
    this._wsFolders = [];
    this._wsFoldersState = "idle";
    this._wsFoldersTotal = 0;
    this._fpermLoading = false;
    this._fpermMode = "restricted"; // "restricted" | "shared"
    this._fpermAutoRevoke = false;
    this._fpermAutoRevokeMins = 30;
    this._fpermOneTimeOn = false;
    this._fpermOneTimeUrl = "drumee.com/s/pink-folder-2023-x92...";
    this._fpermAccess = { view: true, edit: false, chat: true };
    this._fvSelected = new Set();
    this._adminStorageView = "main"; // "main" | "all" | "detail"
    this._adminStorageState = "idle";
    this._hubStorageStats = null;
    this._hubUserStorage = [];
    this._fileVersions = [];
    this._fileVersionsTotal = 0;
    this._fileDetail = null;
    this._fileDetailLoading = false;
    this._fvAllPage = 1;
    this._fvActiveFile = null;
    this._fvSelectedVersionId = null;
    this._editDevices = [];
    this._editWorkspaces = [];
    this._editWorkspacesCache = null;
    this._editWsSearchTimer = null;
    this._editWsSearchInput = null;
    this._editWsSuggestionsBox = null;
    this._editWsBound = new WeakSet();
    this._onDocumentClick = this._onDocumentClick.bind(this);
    document.addEventListener("click", this._onDocumentClick, true);
  }

  onBeforeDestroy() {
    document.removeEventListener("click", this._onDocumentClick, true);
  }

  _onDocumentClick(e) {
    // Edit-member workspace role dropdown: options have no `service` so they
    // need delegated handling, and clicks outside an open panel close it.
    if (this._editingMember && this.el) {
      // Per-row × button. The framework's service routing on this Note is
      // unreliable (an inner widget on the bubble path stopPropagation's),
      // so we dispatch the click here in capture phase against data-idx.
      const removeEl =
        e.target.closest && e.target.closest(".apps-main__edit-ws-remove");
      if (removeEl && this.el.contains(removeEl)) {
        const rmIdx = parseInt(removeEl.dataset.idx, 10);
        if (!Number.isNaN(rmIdx)) {
          e.stopPropagation();
          this._removeEditWorkspace(rmIdx);
          return;
        }
      }
      const optEl =
        e.target.closest && e.target.closest(".apps-main__edit-ws-role-option");
      if (optEl && this.el.contains(optEl)) {
        const optIdx = parseInt(optEl.dataset.idx, 10);
        const roleId = optEl.dataset.id;
        if (!Number.isNaN(optIdx) && roleId) {
          e.stopPropagation();
          this._pickEditWsRole(optIdx, roleId);
          return;
        }
      }
      const openOpts = this.el.querySelectorAll(
        '.apps-main__edit-ws-role-options[data-state="1"]',
      );
      if (openOpts.length) {
        const inSelect =
          e.target.closest &&
          e.target.closest(".apps-main__edit-ws-role-select");
        const inOpts =
          e.target.closest &&
          e.target.closest(".apps-main__edit-ws-role-options");
        if (!inSelect && !inOpts) {
          openOpts.forEach((node) => (node.dataset.state = "0"));
        }
      }
      const openSug = this.el.querySelector(
        '.apps-main__edit-ws-suggestions[data-state="1"]',
      );
      if (openSug) {
        const inInput =
          e.target.closest &&
          e.target.closest(".apps-main__edit-ws-search-input");
        const inSug =
          e.target.closest &&
          e.target.closest(".apps-main__edit-ws-suggestions");
        if (!inInput && !inSug) this._hideEditWsSuggestions();
      }
    }
    if (this._filterOpen) {
      const filterEl =
        this.el && this.el.querySelector(".apps-main__table-filter");
      const dropdownEl =
        this.el && this.el.querySelector(".apps-main__filter-menu");
      if (
        filterEl &&
        !filterEl.contains(e.target) &&
        dropdownEl &&
        !dropdownEl.contains(e.target)
      ) {
        this._filterOpen = false;
        this._render();
      }
    }
    if (this._secCtrl && this._secCtrl.countryPickerOpen && this.el) {
      const openRow = this.el.querySelector(".apps-main__ac-country-row--open");
      const dropdown = this.el.querySelector(".apps-main__ac-cdrop");
      const insideRow = openRow && openRow.contains(e.target);
      const insideDropdown = dropdown && dropdown.contains(e.target);
      if (!insideRow && !insideDropdown) {
        this._secCtrl.countryPickerOpen = null;
        this._secCtrl.countrySearch = "";
        this._render();
      }
    }
    if (this._secCtrl && this._secCtrl.timePickerOpen && this.el) {
      const openField = this.el.querySelector(
        ".apps-main__ac-time-field--open",
      );
      const tdrop = this.el.querySelector(".apps-main__ac-tdrop");
      const insideField = openField && openField.contains(e.target);
      const insideTdrop = tdrop && tdrop.contains(e.target);
      if (!insideField && !insideTdrop) {
        this._secCtrl.timePickerOpen = null;
        this._secCtrl.timeUnitOpen = null;
        this._render();
      } else if (this._secCtrl.timeUnitOpen) {
        // Inside the time popup — check whether the click is outside the
        // open hour/minute flyout (and its pill). Click on the other pill or
        // anywhere else inside the popup closes the flyout.
        const flyout = this.el.querySelector(".apps-main__ac-tdrop-flyout");
        const openPill = this.el.querySelector(
          ".apps-main__ac-tdrop-pill--open",
        );
        const insideFlyout = flyout && flyout.contains(e.target);
        const insidePill = openPill && openPill.contains(e.target);
        if (!insideFlyout && !insidePill) {
          this._secCtrl.timeUnitOpen = null;
          this._render();
        }
      }
    }
    if (this._adminHubMenuOpen) {
      const chipEl = this.el && this.el.querySelector(".apps-main__hub-chip");
      const menuEl =
        this.el && this.el.querySelector(".apps-main__hub-chip-menu");
      if (
        chipEl &&
        !chipEl.contains(e.target) &&
        menuEl &&
        !menuEl.contains(e.target)
      ) {
        this._adminHubMenuOpen = false;
        this._render();
      }
    }
    if (this._auditRangeOpen) {
      const rangeEl =
        this.el && this.el.querySelector(".apps-main__audit-range");
      const menuEl =
        this.el && this.el.querySelector(".apps-main__audit-range-menu");
      if (
        rangeEl &&
        !rangeEl.contains(e.target) &&
        menuEl &&
        !menuEl.contains(e.target)
      ) {
        this._auditRangeOpen = false;
        this._render();
      }
    }
  }

  // Derive Unix-second from_time/to_time from the current preset key. The
  // backend already treats 0 as "no bound", so 'all' returns {0, 0}.
  _auditRangeWindow() {
    const key = this._auditRangeKey || "30d";
    if (key === "all") return { from: 0, to: 0 };
    const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    const now = Math.floor(Date.now() / 1000);
    return { from: now - days * 86400, to: now };
  }

  _render() {
    if (this.isDestroyed && this.isDestroyed()) return;
    // Every interaction (toggles, dropdowns, pickers) rebuilds the whole
    // skeleton via feed(), which tears down and recreates the scrollable
    // Access-control body and resets its scroll to the top. Capture the
    // offset before the rebuild and restore it afterwards so the overlay
    // stays put instead of jumping to the top on each click.
    const acBody = this.el && this.el.querySelector(".apps-main__ac-body");
    const acScrollTop = acBody ? acBody.scrollTop : 0;
    this.feed(require("./skeleton").default(this));
    if (acScrollTop) this._restoreAcScroll(acScrollTop);
    this._scheduleTableScrollSync();
  }

  // feed() rebuilds the body element, so the saved offset must be reapplied to
  // the fresh node. Marionette mounts synchronously when the widget root is
  // already attached (the case for every re-render), making this flicker-free;
  // the rAF retries cover the rare case where the node isn't in the DOM yet.
  _restoreAcScroll(top, attempt = 0) {
    if (this.isDestroyed && this.isDestroyed()) return;
    const body = this.el && this.el.querySelector(".apps-main__ac-body");
    if (body) {
      body.scrollTop = top;
      return;
    }
    if (attempt < 5) {
      requestAnimationFrame(() => this._restoreAcScroll(top, attempt + 1));
    }
  }

  // Keep each table thead's horizontal scroll in sync with its tbody/list, so
  // column headers stay aligned when the user scrolls the data horizontally.
  _scheduleTableScrollSync(attempt = 0) {
    if (this._tableScrollSyncScheduled) return;
    this._tableScrollSyncScheduled = true;
    requestAnimationFrame(() => {
      this._tableScrollSyncScheduled = false;
      if (this.isDestroyed && this.isDestroyed()) return;
      const auditBound = this._bindTableScrollSync(
        "audit",
        ".apps-main__audit-list",
        ".apps-main__audit-thead",
      );
      const storageBound = this._bindTableScrollSync(
        "storage",
        ".apps-main__storage-tbody",
        ".apps-main__storage-thead",
      );
      // feed() mounts asynchronously; retry a few frames if the table DOM
      // isn't ready yet so the sync attaches on tab activation too.
      if (!auditBound && !storageBound && attempt < 5) {
        setTimeout(() => this._scheduleTableScrollSync(attempt + 1), 50);
      }
    });
  }

  _bindTableScrollSync(key, listSelector, theadSelector) {
    if (!this.el) return false;
    const list = this.el.querySelector(listSelector);
    const thead = this.el.querySelector(theadSelector);
    if (!list || !thead) return false;
    this._tableScrollRefs ||= {};
    const prev = this._tableScrollRefs[key];
    if (prev && prev.list === list && prev.thead === thead) return true;
    if (prev) {
      prev.list.removeEventListener("scroll", prev.handler);
    }
    const handler = () => {
      thead.scrollLeft = list.scrollLeft;
    };
    list.addEventListener("scroll", handler, { passive: true });
    thead.scrollLeft = list.scrollLeft;
    this._tableScrollRefs[key] = { list, thead, handler };
    return true;
  }

  async onDomRefresh() {
    this._render();
    // Admin role's tabs are hub-scoped — load the workspace list before
    // bootstrapping so service calls have hub_id available.
    if (this._role === "admin") await this._loadAdminHubs();
    this._bootstrapTab();
  }

  _bootstrapTab() {
    if (this._tab === "member") this._loadMembersTab();
    else if (this._tab === "audit") this._loadAuditTab();
    else if (this._tab === "storage") this._loadStorageTab();
    else if (this._tab === "permissions") this._loadPermissionsTab();
    else if (this._tab === "admin-storage") this._loadAdminStorageTab();
  }

  async _loadAdminHubs() {
    this._adminHubsState = "loading";
    try {
      const res = await this.postService(SERVICE.admin.member_list_workspaces, {
        uid: Visitor.id,
      });
      const rows = Array.isArray(res) ? res : (res && res.data) || [];
      // Keep workspaces where the user has admin perm (>=31) on a real
      // collaborative area. `private` covers what the UX calls "restricted".
      const WORKSPACE_AREAS = new Set(["private", "restricted", "share"]);
      this._adminHubs = rows.filter(
        (r) =>
          (parseInt(r.permission, 10) || 0) >= 31 &&
          WORKSPACE_AREAS.has(r.area),
      );
      this._activeAdminHub = this._adminHubs.length
        ? this._adminHubs[0].hub_id
        : null;
      this._adminHubsState = "loaded";
    } catch (e) {
      this.warn && this.warn("member_list_workspaces failed", e);
      this._adminHubs = [];
      this._activeAdminHub = null;
      this._adminHubsState = "error";
    }
  }

  _loadMembersTab() {
    if (this._role === "admin") {
      // Admin: workspace overview first, drill-down to per-hub members.
      // Reuses _permWorkspaces (same source as Permissions tab).
      if (this._memberView === "overview") return this._loadWorkspaceOverview();
      this._loadMemberStats();
      this._loadMembers();
      return;
    }
    this._loadMemberStats();
    this._loadMembers();
  }

  async _loadMembers() {
    this._membersState = "loading";
    this._render();
    try {
      // Role facet (_roleFilter) is applied client-side in the skeleton —
      // the SP expects a numeric map_role.role_id, not these semantic labels.
      const res =
        this._role === "admin"
          ? await this.postService(SERVICE.admin.hub_member_list, {
              hub_id: this._activeAdminHub,
              role_id: this._roleFilter || "all",
              key: this._memberQuery || "",
              page: this._page || 1,
            })
          : await this.postService(SERVICE.adminpanel.member_list, {
              key: this._memberQuery || "",
              page: this._page || 1,
              option: "member",
            });
      const rows = Array.isArray(res) ? res : (res && res.data) || [];
      this._members = rows.map(mapMember);
      this._membersState = "loaded";
    } catch (e) {
      this.warn && this.warn("member_list failed", e);
      this._membersState = "error";
      this._members = [];
    }
    this._render();
  }

  _loadAuditTab() {
    this._loadAuditStats();
    this._loadAuditLogs();
  }

  async _loadAuditLogs() {
    this._auditState = "loading";
    this._render();
    try {
      const { from, to } = this._auditRangeWindow();
      const res = await this.postService(SERVICE.admin.get_audit_logs, {
        username: this._auditUsername || "",
        from_time: from,
        to_time: to,
        page: this._auditPage || 1,
      });
      this._auditLogs = Array.isArray(res) ? res : (res && res.data) || [];
      this._auditLogsTotal =
        res && res.total != null
          ? parseInt(res.total, 10) || 0
          : this._auditLogs.length;
      if (res && res.page_size)
        this._auditPageSize = parseInt(res.page_size, 10) || 20;
      this._auditState = "loaded";
    } catch (e) {
      this.warn && this.warn("get_audit_logs failed", e);
      this._auditLogs = [];
      this._auditLogsTotal = 0;
      this._auditState = "error";
    }
    this._render();
  }

  async _loadAuditStats() {
    try {
      const { from, to } = this._auditRangeWindow();
      const res = await this.postService(SERVICE.admin.get_audit_stats, {
        from_time: from,
        to_time: to,
      });
      this._auditStats = res || null;
    } catch (e) {
      this._auditStats = null;
    }
    this._render();
  }

  async _exportAuditLogs() {
    try {
      const { from, to } = this._auditRangeWindow();
      const res = await this.postService(SERVICE.admin.export_audit_logs, {
        username: this._auditUsername || "",
        from_time: from,
        to_time: to,
      });
      const rows = Array.isArray(res) ? res : (res && res.data) || [];
      const cols = [
        { key: "ctime", header: LOCALE.TIMESTAMP || "Timestamp" },
        { key: "actor_name", header: LOCALE.USER || "User" },
        { key: "email", header: LOCALE.EMAIL || "Email" },
        { key: "action", header: LOCALE.ACTION || "Action" },
        { key: "category", header: LOCALE.CATEGORY || "Category" },
        {
          key: "entity_id",
          header: LOCALE.TARGET_RESOURCE || "Target Resource",
        },
        { key: "hub_id", header: LOCALE.WORKSPACE || "Workspace" },
        { key: "log", header: LOCALE.MESSAGE || "Message" },
      ];
      const titleCase = (s) => {
        if (!s) return "";
        const t = String(s).replace(/_/g, " ");
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      };
      const cellValue = (row, key) => {
        if (key === "ctime") {
          const t = parseInt(row.ctime, 10);
          if (!t) return "";
          return Dayjs.unix(t).format("YYYY-MM-DD HH:mm:ss");
        }
        if (key === "action" || key === "category") return titleCase(row[key]);
        return row[key];
      };
      const escape = (v) => {
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const csv = [cols.map((c) => escape(c.header)).join(",")]
        .concat(
          rows.map((r) =>
            cols.map((c) => escape(cellValue(r, c.key))).join(","),
          ),
        )
        .join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const ts = Dayjs().format("YYYYMMDD-HHmmss");
      const filename = `audit-logs-${ts}.csv`;
      const url = URL.createObjectURL(blob);
      console.log(
        "[audit-export] rows:",
        rows.length,
        "bytes:",
        blob.size,
        "url:",
        url,
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      try {
        a.click();
      } catch (clickErr) {
        console.warn(
          "[audit-export] a.click() failed, falling back to window.open",
          clickErr,
        );
        window.open(url, "_blank");
      }
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      console.warn("[audit-export] export_audit_logs failed", e);
      this.warn && this.warn("export_audit_logs failed", e);
    }
  }

  _loadStorageTab() {
    this._loadOrgStorageStats();
    this._loadOrgUserStorage();
  }

  async _loadOrgStorageStats() {
    try {
      const res = await this.postService(
        SERVICE.admin.get_org_storage_stats,
        {},
      );
      this._orgStorageStats = Array.isArray(res)
        ? res
        : (res && res.data) || [];
    } catch (e) {
      this._orgStorageStats = [];
    }
    this._render();
  }

  async _loadOrgUserStorage() {
    this._storageState = "loading";
    this._render();
    try {
      const res = await this.postService(SERVICE.admin.get_org_user_storage, {
        sort_by: this._storageSort || "usage_high",
        page: this._storagePage || 1,
      });
      this._orgUserStorage = Array.isArray(res) ? res : (res && res.data) || [];
      this._orgUserStorageTotal =
        res && res.total != null
          ? parseInt(res.total, 10) || 0
          : this._orgUserStorage.length;
      if (res && res.page_size)
        this._orgUserStoragePageSize = parseInt(res.page_size, 10) || 20;
      this._storageState = "loaded";
    } catch (e) {
      this.warn && this.warn("get_org_user_storage failed", e);
      this._orgUserStorage = [];
      this._orgUserStorageTotal = 0;
      this._storageState = "error";
    }
    this._render();
  }

  // ── Permissions tab (admin) ──────────────────────────────
  _loadPermissionsTab() {
    this._loadWorkspaceOverview();
  }

  async _loadWorkspaceOverview() {
    this._permState = "loading";
    this._render();
    try {
      const res = await this.postService(SERVICE.admin.get_workspace_overview, {
        hub_id: this._activeAdminHub,
      });
      const rows = Array.isArray(res) ? res : (res && res.data) || [];
      // Normalize: id<-hub_id, name<-hub_name, mode<-area
      // (BE 'share' → 'shared' for the icon's visual semantics).
      this._permWorkspaces = rows.map((w) => ({
        ...w,
        id: w.id || w.hub_id,
        name: w.name || w.hub_name,
        mode: w.mode || (w.area === "share" ? "shared" : w.area) || null,
        updated: w.mtime ? Dayjs.unix(w.mtime).fromNow() : null,
        storage_size: w.storage_size != null ? filesize(w.storage_size) : null,
      }));
      this._permState = "loaded";
    } catch (e) {
      this.warn && this.warn("get_workspace_overview failed", e);
      this._permWorkspaces = [];
      this._permState = "error";
    }
    this._render();
  }

  async _loadHubFolders(hubId) {
    this._wsFoldersState = "loading";
    this._wsFolders = [];
    this._render();
    try {
      const res = await this.postService(SERVICE.admin.get_hub_folders, {
        hub_id: hubId,
        page: this._wsDetailPage || 1,
        query: this._wsFolderQuery || "",
      });
      const rows = Array.isArray(res) ? res : (res && res.data) || [];
      // SP returns nid/filename/mtime/filesize — alias to FE shape.
      this._wsFolders = rows.map((r) => ({
        ...r,
        id: r.id || r.nid,
        name: r.name || r.filename,
        updated: r.updated || r.mtime,
        size: r.size || r.filesize,
      }));
      this._wsFoldersTotal = (res && res.total) || this._wsFolders.length;
      this._wsFoldersState = "loaded";
    } catch (e) {
      this.warn && this.warn("get_hub_folders failed", e);
      this._wsFolders = [];
      this._wsFoldersState = "error";
    }
    this._render();
  }

  async _loadFolderPermissions(folderId) {
    this._fpermLoading = true;
    this._fpermMembers = [];
    this._fpermDevices = [];
    this._render();
    try {
      const hubId =
        (this._activeWorkspace && this._activeWorkspace.id) ||
        this._activeAdminHub;
      const res = await this.postService(SERVICE.admin.get_folder_permissions, {
        hub_id: hubId,
        nid: folderId,
      });
      const data = res || {};
      if (data.mode) this._fpermMode = data.mode;
      if (data.access)
        this._fpermAccess = { ...this._fpermAccess, ...data.access };
      if (typeof data.auto_revoke === "boolean")
        this._fpermAutoRevoke = data.auto_revoke;
      if (data.auto_revoke_minutes != null)
        this._fpermAutoRevokeMins = data.auto_revoke_minutes;
      if (typeof data.one_time === "boolean")
        this._fpermOneTimeOn = data.one_time;
      if (data.one_time_url) this._fpermOneTimeUrl = data.one_time_url;
      this._fpermMembers = Array.isArray(data.members) ? data.members : [];
      this._fpermDevices = Array.isArray(data.devices) ? data.devices : [];
    } catch (e) {
      this.warn && this.warn("get_folder_permissions failed", e);
    }
    this._fpermLoading = false;
    this._render();
  }

  async _saveFolderPermissions() {
    if (!this._editingFolder) return;
    try {
      const hubId =
        (this._activeWorkspace && this._activeWorkspace.id) ||
        this._activeAdminHub;
      await this.postService(SERVICE.admin.save_folder_permissions, {
        hub_id: hubId,
        nid: this._editingFolder.id,
        config: {
          mode: this._fpermMode,
          access: this._fpermAccess,
          auto_revoke: this._fpermAutoRevoke,
          auto_revoke_minutes: this._fpermAutoRevokeMins,
          one_time: this._fpermOneTimeOn,
        },
      });
    } catch (e) {
      this.warn && this.warn("save_folder_permissions failed", e);
    }
    this._editingFolder = null;
    this._render();
  }

  // ── Admin Storage tab (admin) ────────────────────────────
  // Fetches run in parallel and the loaders skip per-call renders so
  // we only re-render once at the start (loading state) and once when
  // everything settles. Otherwise hub switching triggered up to 3 full
  // skeleton rebuilds.
  async _loadAdminStorageTab() {
    this._adminStorageTabLoading = true;
    this._adminStorageState = "loading";
    this._render();
    await Promise.all([
      this._loadHubStorageStats({ skipRender: true }),
      this._loadHubUserStorage({ skipRender: true }),
      this._loadFileVersions({ skipRender: true }),
    ]);
    this._adminStorageTabLoading = false;
    this._render();
  }

  async _loadHubStorageStats(opts = {}) {
    try {
      const res = await this.postService(SERVICE.admin.get_hub_storage_stats, {
        hub_id: this._activeAdminHub,
      });
      // SP returns one row; flatten array-of-one to a plain object.
      const row = Array.isArray(res) ? res[0] : (res && res.data) || res;
      this._hubStorageStats = row && typeof row === "object" ? row : null;
    } catch (e) {
      this._hubStorageStats = null;
    }
    if (!opts.skipRender) this._render();
  }

  async _loadHubUserStorage(opts = {}) {
    try {
      const res = await this.postService(SERVICE.admin.get_hub_user_storage, {
        hub_id: this._activeAdminHub,
        sort_by: this._storageSort || "usage_high",
        page: this._storagePage || 1,
      });
      this._hubUserStorage = Array.isArray(res) ? res : (res && res.data) || [];
    } catch (e) {
      this._hubUserStorage = [];
    }
    if (!opts.skipRender) this._render();
  }

  async _loadFileVersions(opts = {}) {
    if (!this._activeAdminHub) {
      this._fileVersions = [];
      this._fileVersionsTotal = 0;
      this._adminStorageState = "loaded";
      if (!opts.skipRender) this._render();
      return;
    }
    this._adminStorageState = "loading";
    if (!opts.skipRender) this._render();
    try {
      const res = await this.postService(SERVICE.admin.get_file_versions, {
        hub_id: this._activeAdminHub,
        page: this._fvAllPage || 1,
        search: this._fvSearch || "",
      });
      const rows = Array.isArray(res) ? res : (res && res.data) || [];
      this._fileVersions = rows.map(normalizeFileVersionRow);
      this._fileVersionsTotal = (res && res.total) || this._fileVersions.length;
      this._adminStorageState = "loaded";
    } catch (e) {
      this.warn && this.warn("get_file_versions failed", e);
      this._fileVersions = [];
      this._adminStorageState = "error";
    }
    if (!opts.skipRender) this._render();
  }

  async _loadFileVersionDetail(nid) {
    if (!this._activeAdminHub || !nid) {
      this._fileDetail = null;
      this._fileDetailLoading = false;
      this._fvSelectedVersionId = null;
      return this._render();
    }
    this._fileDetailLoading = true;
    this._fileDetail = null;
    this._fvSelectedVersionId = null;
    this._render();
    try {
      const res = await this.postService(
        SERVICE.admin.get_file_version_detail,
        {
          hub_id: this._activeAdminHub,
          nid,
        },
      );
      this._fileDetail = normalizeFileVersionDetail(res);
      // Pre-select the active version so the preview pane has something
      // meaningful to show before the user clicks anything.
      const versions = (this._fileDetail && this._fileDetail.versions) || [];
      const active = versions.find((v) => v.active) || versions[0] || null;
      this._fvSelectedVersionId = active && active.id;
    } catch (e) {
      this.warn && this.warn("get_file_version_detail failed", e);
      this._fileDetail = null;
    }
    this._fileDetailLoading = false;
    this._render();
  }

  // Backend takes a single `nid` (or null = purge old across the whole hub).
  // For multi-select, fan out one request per file, then refresh once.
  async _deleteOldFileVersions(nidOrNids) {
    if (!this._activeAdminHub) return;
    const list = Array.isArray(nidOrNids) ? nidOrNids : [nidOrNids];
    const nids = list.filter(Boolean);
    if (!nids.length) return;
    try {
      await Promise.all(
        nids.map((nid) =>
          this.postService(SERVICE.admin.delete_file_old_versions, {
            hub_id: this._activeAdminHub,
            nid,
          }),
        ),
      );
    } catch (e) {
      this.warn && this.warn("delete_file_old_versions failed", e);
    }
    this._fvSelected.clear();
    return this._loadFileVersions();
  }

  // Purge every old version in the active hub (nid=null).
  async _deleteAllOldVersionsInHub() {
    if (!this._activeAdminHub) return;
    try {
      await this.postService(SERVICE.admin.delete_file_old_versions, {
        hub_id: this._activeAdminHub,
        nid: null,
      });
    } catch (e) {
      this.warn && this.warn("delete_file_old_versions(all) failed", e);
    }
    this._fvSelected.clear();
    return this._loadFileVersions();
  }

  async _downloadFileVersions(nid) {
    if (!this._activeAdminHub || !nid) return;
    try {
      await this.postService(SERVICE.admin.download_file_versions, {
        hub_id: this._activeAdminHub,
        nid,
      });
    } catch (e) {
      this.warn && this.warn("download_file_versions failed", e);
    }
  }

  async _loadMemberStats() {
    this._statsState = "loading";
    try {
      const svc =
        this._role === "admin"
          ? SERVICE.admin.hub_member_stats
          : SERVICE.admin.member_stats;
      const payload =
        this._role === "admin" ? { hub_id: this._activeAdminHub } : {};
      const res = await this.postService(svc, payload);
      this._memberStats = res || {};
      const t =
        this._memberStats.total_members != null
          ? this._memberStats.total_members
          : this._memberStats.total;
      this._membersTotal = parseInt(t, 10) || 0;
      this._statsState = "loaded";
    } catch (e) {
      this._statsState = "error";
      this._memberStats = null;
      this._membersTotal = 0;
    }
    this._render();
  }

  // ── Tabs / table chrome ──────────────────────────────────
  switchTab(tab) {
    if (
      this._visibleTabs &&
      this._visibleTabs.length &&
      !this._visibleTabs.includes(tab)
    )
      return;
    this._tab = tab;
    // Admin Member tab always re-enters at the workspace overview.
    if (this._role === "admin" && tab === "member")
      this._memberView = "overview";
    this._render();
    if (tab === "member" && this._membersState !== "loading") {
      this._loadMembersTab();
    } else if (tab === "audit" && this._auditState !== "loading") {
      this._loadAuditTab();
    } else if (tab === "storage" && this._storageState !== "loading") {
      this._loadStorageTab();
    } else if (tab === "permissions" && this._permState !== "loading") {
      this._loadPermissionsTab();
    } else if (
      tab === "admin-storage" &&
      this._adminStorageState !== "loading"
    ) {
      this._loadAdminStorageTab();
    } else if (tab === "security") {
      this._bootstrapSecurityTab();
    }
  }

  // Security tab needs the workspace list (admins load it at boot; owners
  // don't, so fetch lazily on first entry).
  async _bootstrapSecurityTab() {
    if (this._adminHubsState === "loading") return;
    if (!this._adminHubs.length && this._adminHubsState !== "loaded") {
      await this._loadAdminHubs();
      this._render();
    }
  }

  _securityTagsFor(hubId) {
    if (!this._securityTags[hubId]) {
      this._securityTags[hubId] = {
        ipgeo: true,
        vpn: true,
        onetime: true,
        managed: true,
      };
    }
    return this._securityTags[hubId];
  }

  toggleMember(id) {
    if (this._isSelf(id)) return;
    if (this._selected.has(id)) this._selected.delete(id);
    else this._selected.add(id);
    this._render();
  }

  toggleAll() {
    // Operate on the visible (role-filtered) subset so the header checkbox
    // reflects what the user sees. The current visitor is excluded so the
    // header checkbox can never schedule self-removal.
    const visible = (
      this._roleFilter && this._roleFilter !== "all"
        ? this._members.filter(
            (m) => m && m.role && m.role.variant === this._roleFilter,
          )
        : this._members
    ).filter((m) => !this._isSelf(m.id));
    const allSelected =
      visible.length > 0 && visible.every((m) => this._selected.has(m.id));
    if (allSelected) {
      visible.forEach((m) => this._selected.delete(m.id));
    } else {
      visible.forEach((m) => this._selected.add(m.id));
    }
    this._render();
  }

  _searchMembers(rawValue) {
    const next = (rawValue || "").toString().trim();
    if (next === (this._memberQuery || "")) return;
    this._memberQuery = next;
    this._page = 1;
    this._selected.clear();
    this._loadMembersTab();
  }

  goToPage(page) {
    const totalPages = Math.max(
      1,
      Math.ceil((this._membersTotal || 0) / (this._membersPageSize || 20)),
    );
    const next = Math.max(1, Math.min(totalPages, parseInt(page, 10) || 1));
    if (next === this._page) return;
    this._page = next;
    this._selected.clear();
    this._render();
    this._loadMembers();
  }

  // ─────────────────────────────────────────────────────────
  //  Edit-member popup
  // ─────────────────────────────────────────────────────────
  async _openEditMember(memberId) {
    if (this._isSelf(memberId)) return;
    const member = this._members.find((m) => m.id === memberId);
    if (!member) return;
    this._editingMember = member;
    this._editDevices = [];
    this._editWorkspaces = [];
    this._editWorkspacesCache = null;
    this._render();
    this._loadEditMemberData(memberId);
  }

  async _loadEditMemberData(userId) {
    try {
      const [devices, workspaces] = await Promise.all([
        this.postService(SERVICE.admin.member_device_list, {
          uid: userId,
        }).catch(() => []),
        this.postService(SERVICE.admin.member_list_workspaces, {
          uid: userId,
        }).catch(() => []),
      ]);
      this._editDevices = Array.isArray(devices) ? devices : [];
      this._editWorkspaces = Array.isArray(workspaces) ? workspaces : [];
    } catch (e) {
      this._editDevices = [];
      this._editWorkspaces = [];
    }
    if (this._editingMember) this._render();
  }

  _closeEdit() {
    this._editingMember = null;
    this._editDevices = [];
    this._editWorkspaces = [];
    this._editWorkspacesCache = null;
    this._editWsSearchInput = null;
    this._editWsSuggestionsBox = null;
    if (this._editWsSearchTimer) {
      clearTimeout(this._editWsSearchTimer);
      this._editWsSearchTimer = null;
    }
    this._render();
  }

  async _saveEdit() {
    this._closeEdit();
  }

  async _removeDevice(deviceId) {
    if (!this._editingMember) return;
    const userId = this._editingMember.id;
    try {
      await this.postService(SERVICE.admin.member_device_remove, {
        uid: userId,
        device_id: deviceId,
      });
      this._editDevices = (this._editDevices || []).filter(
        (d) => (d.id || d.sys_id) !== deviceId,
      );
      this._render();
    } catch (e) {
      this.warn && this.warn("member_device_remove failed", e);
    }
  }

  async _removeAllDevices() {
    if (!this._editingMember) return;
    const userId = this._editingMember.id;
    try {
      await this.postService(SERVICE.admin.member_device_remove_all, {
        uid: userId,
      });
      this._editDevices = [];
      this._render();
    } catch (e) {
      this.warn && this.warn("member_device_remove_all failed", e);
    }
  }

  // Framework hook: fires after each child widget tagged with partHandler:ui
  // is rendered. The popup re-builds its skeleton on every _render(), so we
  // re-bind DOM listeners each time the Entry is recreated. Guarded by a
  // WeakSet to skip if the same child instance is reported twice.
  onPartReady(child, pn) {
    if (!child || this._editWsBound.has(child)) return;
    if (pn === "edit-ws-search-input") {
      this._editWsBound.add(child);
      this._editWsSearchInput = child;
      const bind = () => {
        const inputEl = child.el && child.el.querySelector("input");
        if (!inputEl) return;
        inputEl.setAttribute("autocomplete", "off");
        inputEl.addEventListener("input", (e) =>
          this._fetchEditWsSuggestions((e.target.value || "").trim()),
        );
        inputEl.addEventListener("focus", () =>
          this._fetchEditWsSuggestions(inputEl.value.trim()),
        );
        inputEl.addEventListener("click", () =>
          this._fetchEditWsSuggestions(inputEl.value.trim()),
        );
      };
      bind();
      if (!child.el || !child.el.querySelector("input")) setTimeout(bind, 50);
    } else if (pn === "edit-ws-suggestions") {
      this._editWsBound.add(child);
      this._editWsSuggestionsBox = child;
    }
  }

  // Inviteable-workspace filter: privilege bitmask must include admin (31),
  // and the area must be a real collaborative workspace — not personal,
  // infra, or one-shot dmz buckets. Mirrors invite-popup's NON_INVITEABLE.
  static get _EDIT_WS_NON_INVITEABLE() {
    return new Set([
      _a.personal,
      "system",
      "pool",
      "pool/dmz",
      "template",
      "dummy",
      "dmz",
      "dmz-public",
      "dmz-private",
    ]);
  }

  _fetchEditWsSuggestions(value) {
    if (!this._editingMember) return;
    if (this._editWsSearchTimer) clearTimeout(this._editWsSearchTimer);
    const delay = value ? 200 : 0;
    this._editWsSearchTimer = setTimeout(async () => {
      let list = this._editWorkspacesCache;
      if (!list) {
        const data = await this.fetchService(
          {
            service: SERVICE.desk.home,
            hub_id: Visitor.id,
            type: _a.hub,
          },
          { async: 1 },
        ).catch(() => []);
        list = Array.isArray(data) ? data : [];
        this._editWorkspacesCache = list;
      }
      const ADMIN = 0b0011111;
      const NON_INVITEABLE = apps_main._EDIT_WS_NON_INVITEABLE;
      const picked = new Set(
        (this._editWorkspaces || [])
          .map((w) => String(w.hub_id || w.id || ""))
          .filter(Boolean),
      );
      const inviteable = list.filter((w) => {
        if (((w.privilege | 0) & ADMIN) !== ADMIN) return false;
        if (NON_INVITEABLE.has(w.area || "")) return false;
        const id = String(w.hub_id || w.id || w.actual_hub_id || "");
        if (id && picked.has(id)) return false;
        return true;
      });
      const q = (value || "").toLowerCase();
      const filtered = q
        ? inviteable.filter((w) =>
            (w.filename || w.name || "").toLowerCase().includes(q),
          )
        : inviteable;
      this._showEditWsSuggestions(filtered);
    }, delay);
  }

  _showEditWsSuggestions(list) {
    const box = this._editWsSuggestionsBox;
    if (!box || !box.el) return;
    if (!list.length) {
      this._hideEditWsSuggestions();
      return;
    }
    const pfx = this.fig.family;
    const items = list.map((row) => {
      const hub_id = row.hub_id || row.id || row.actual_hub_id;
      const hub_name = row.filename || row.name;
      return Skeletons.Note({
        className: `${pfx}__edit-ws-suggestion`,
        content: hub_name,
        // Top-level props — consistent with how other apps/main Notes pass
        // data (e.g. apps-edit-remove-ws uses `idx`, `hub_id`). cmd.mget()
        // reads the widget model; raw `dataset:` keys are not always
        // mirrored there, which is why invite-popup needs a getter helper.
        hub_id,
        hub_name,
        service: "apps-edit-pick-workspace",
        uiHandler: [this],
      });
    });
    box.feed(items);
    this._positionEditWsSuggestions();
    box.el.dataset.state = 1;
  }

  // The suggestions box is a direct child of __edit-card (not __edit-body)
  // so it isn't clipped by the body's overflow scroll. Position it under
  // the search input each time we open it, with max-height clamped to the
  // remaining space inside the card.
  _positionEditWsSuggestions() {
    const box = this._editWsSuggestionsBox;
    const inputWidget = this._editWsSearchInput;
    if (!box || !box.el || !inputWidget || !inputWidget.el) return;
    const card = this.el && this.el.querySelector(".apps-main__edit-card");
    if (!card) return;
    const cardRect = card.getBoundingClientRect();
    const inputRect = inputWidget.el.getBoundingClientRect();
    const top = inputRect.bottom - cardRect.top + 4;
    const left = inputRect.left - cardRect.left;
    const width = inputRect.width;
    const availableBelow = cardRect.bottom - inputRect.bottom - 16;
    box.el.style.top = `${top}px`;
    box.el.style.left = `${left}px`;
    box.el.style.width = `${width}px`;
    box.el.style.maxHeight = `${Math.max(80, Math.min(240, availableBelow))}px`;
  }

  _hideEditWsSuggestions() {
    const box = this._editWsSuggestionsBox;
    if (!box || !box.el) return;
    box.el.dataset.state = 0;
    if (typeof box.clear === "function") box.clear();
  }

  _pickEditWorkspace(hub_id, name) {
    if (!hub_id) return;
    const id = String(hub_id);
    const already = (this._editWorkspaces || []).some(
      (w) => String(w.hub_id || w.id || "") === id,
    );
    if (already) {
      this._hideEditWsSuggestions();
      return;
    }
    this._editWorkspaces = this._editWorkspaces || [];
    // Default privilege = view (bit 2). The user picks a different role via
    // the per-row role dropdown rendered by workspaceRow().
    // `_pending: true` marks this as a client-only addition that hasn't been
    // persisted yet — _removeEditWorkspace uses it to skip the server call.
    this._editWorkspaces.push({
      hub_id,
      hub_name: name,
      name,
      privilege: 2,
      permission: 2,
      _pending: true,
    });
    this._render();
  }

  // Toggle a workspace-row role dropdown open/closed. The skeleton hardcodes
  // data-state=0 on render, so we mutate the DOM directly to avoid losing
  // the open state on every _render(). Other open dropdowns are closed first.
  _toggleEditWsRole(idx) {
    if (!this.el || Number.isNaN(idx)) return;
    const all = this.el.querySelectorAll(".apps-main__edit-ws-role-options");
    let target = null;
    all.forEach((node) => {
      const nodeIdx = parseInt(node.dataset.idx, 10);
      if (nodeIdx === idx) {
        target = node;
      } else {
        node.dataset.state = "0";
      }
    });
    if (!target) return;
    target.dataset.state = target.dataset.state === "1" ? "0" : "1";
  }

  _pickEditWsRole(idx, roleId) {
    if (Number.isNaN(idx) || !roleId) return;
    const ws = (this._editWorkspaces || [])[idx];
    if (!ws) return;
    const bits = { admin: 31, edit: 7, view: 2 };
    const bit = bits[roleId];
    if (bit == null) return;
    ws.privilege = bit;
    ws.permission = bit;
    this._render();
  }

  async _removeEditWorkspace(idx) {
    if (Number.isNaN(idx)) return;
    if (!Array.isArray(this._editWorkspaces) || !this._editWorkspaces[idx])
      return;
    const ws = this._editWorkspaces[idx];
    const hub_id = ws.hub_id || ws.id || ws.actual_hub_id;
    const uid = this._editingMember && this._editingMember.id;

    // _pending = the row was added client-side via the search dropdown and
    // hasn't been persisted yet, so there's nothing to revoke server-side.
    if (ws._pending || !hub_id || !uid) {
      this._editWorkspaces.splice(idx, 1);
      this._render();
      return;
    }

    // Optimistic remove — mirrors the device-remove flow's pattern of
    // re-rendering on success, leaving state untouched (and surfacing a warn)
    // on failure so the row reappears on the next render via _editWorkspaces.
    const removed = this._editWorkspaces.splice(idx, 1)[0];
    this._render();
    try {
      await this.postService(SERVICE.admin.hub_member_remove, {
        hub_id,
        uid,
      });
    } catch (e) {
      this.warn && this.warn("hub_member_remove failed", e);
      this._editWorkspaces.splice(idx, 0, removed);
      this._render();
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Delete member
  // ─────────────────────────────────────────────────────────
  async _deleteMember(memberId) {
    if (memberId == null || memberId === "") {
      this.warn && this.warn("member_delete: missing memberId", memberId);
      return;
    }
    if (this._isSelf(memberId)) return;
    try {
      if (this._role === "admin") {
        await this.postService(SERVICE.admin.hub_member_remove, {
          hub_id: this._activeAdminHub,
          uid: memberId,
        });
      } else {
        await this.postService(SERVICE.adminpanel.member_delete, {
          orgid: Visitor.get("org_id"),
          user_id: memberId,
        });
      }
      this._selected.delete(memberId);
    } catch (e) {
      this.warn && this.warn("member_delete failed", e);
    }
    await this._loadMemberStats();
    this._clampPage();
    this._loadMembers();
  }

  _isSelf(memberId) {
    if (memberId == null) return false;
    const me = typeof Visitor !== "undefined" && Visitor ? Visitor.id : null;
    if (me == null) return false;
    return String(memberId) === String(me);
  }

  _clampPage() {
    const totalPages = Math.max(
      1,
      Math.ceil((this._membersTotal || 0) / (this._membersPageSize || 20)),
    );
    if (this._page > totalPages) this._page = totalPages;
  }

  // ── Event router ─────────────────────────────────────────
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "apps-switch-tab":
        return this.switchTab(cmd.mget("tab"));

      case "apps-member-open-workspace": {
        const id = cmd.mget("workspace_id");
        if (!id) return;
        this._activeAdminHub = id;
        this._memberView = "detail";
        this._page = 1;
        this._selected.clear();
        this._members = [];
        this._memberStats = null;
        this._render();
        this._loadMemberStats();
        return this._loadMembers();
      }

      case "apps-member-back":
        this._memberView = "overview";
        this._members = [];
        this._memberStats = null;
        this._selected.clear();
        return this._render();

      case "apps-toggle-admin-hub-menu":
        this._adminHubMenuOpen = !this._adminHubMenuOpen;
        if (!this._adminHubMenuOpen) this._adminHubSearch = "";
        return this._render();

      case "apps-admin-hub-search": {
        const value =
          (args && args.value != null
            ? args.value
            : cmd && cmd.mget && cmd.mget(_a.value)) || "";
        this._adminHubSearch = String(value).trim();
        return this._render();
      }

      case "apps-select-admin-hub": {
        const id = cmd.mget("hub_id");
        if (!id || id === this._activeAdminHub) {
          this._adminHubMenuOpen = false;
          this._adminHubSearch = "";
          return this._render();
        }
        this._activeAdminHub = id;
        this._adminHubMenuOpen = false;
        this._adminHubSearch = "";
        // Reset per-hub caches so the new context loads fresh.
        this._members = [];
        this._memberStats = null;
        this._membersTotal = 0;
        this._page = 1;
        this._selected.clear();
        this._permWorkspaces = [];
        this._activeWorkspace = null;
        this._wsFolders = [];
        this._editingFolder = null;
        this._hubStorageStats = null;
        this._hubUserStorage = [];
        this._fileVersions = [];
        this._fvActiveFile = null;
        this._fileDetail = null;
        this._render();
        return this._bootstrapTab();
      }

      case "apps-search":
        return this._searchMembers(
          (args && args.value != null
            ? args.value
            : cmd && cmd.mget && cmd.mget(_a.value)) || "",
        );

      case "apps-search-submit":
        return this.ensurePart("apps-search-input").then((p) => {
          const value = p && p.getValue ? p.getValue() : "";
          this._searchMembers(value);
        });

      case "apps-toggle-member":
        return this.toggleMember(cmd.mget("member_id"));

      case "apps-toggle-all":
        return this.toggleAll();

      case "apps-page":
        return this.goToPage(cmd.mget("page_num"));

      case "apps-filter-roles":
        this._filterOpen = !this._filterOpen;
        return this._render();

      case "apps-select-role":
        // Client-side filter — no refetch needed; skeleton filters _members.
        this._roleFilter = cmd.mget("role_key");
        this._filterOpen = false;
        this._selected.clear();
        return this._render();

      case "apps-edit-member":
        return this._openEditMember(cmd.mget("member_id"));

      case "apps-edit-close":
        return this._closeEdit();

      case "apps-edit-save":
        return this._saveEdit();

      case "apps-edit-remove-device":
        return this._removeDevice(cmd.mget("device_id"));

      case "apps-edit-remove-all-devices":
        return this._removeAllDevices();

      case "apps-edit-toggle-ws-role":
        return this._toggleEditWsRole(parseInt(cmd.mget("idx"), 10));

      case "apps-edit-remove-ws":
        return this._removeEditWorkspace(parseInt(cmd.mget("idx"), 10));

      case "apps-edit-role-select":
      case "apps-edit-ws-role":
      case "apps-edit-ws-add":
        return;

      case "apps-edit-ws-search":
        // Keystrokes are handled by the DOM input listener bound in
        // onPartReady; Entry's "commit" event (Enter key) is a no-op here.
        return;

      case "apps-edit-pick-workspace":
        return this._pickEditWorkspace(
          cmd.mget("hub_id"),
          cmd.mget("hub_name"),
        );

      case "apps-delete-member":
        return this._deleteMember(cmd.mget("member_id"));

      case "apps-remove-selected":
        return this._removeSelected();

      case "apps-add-new":
      case "apps-invite":
      case "apps-reward":
        return;

      case "apps-perm-open-workspace": {
        const id = cmd.mget("workspace_id");
        const ws = (this._permWorkspaces || []).find((w) => w.id === id);
        if (ws) {
          this._activeWorkspace = ws;
          this._wsDetailPage = 1;
          this._wsFolderQuery = "";
          this._render();
          return this._loadHubFolders(ws.id);
        }
        return;
      }

      case "apps-perm-back":
        this._activeWorkspace = null;
        this._wsFolders = [];
        this._wsFoldersState = "idle";
        this._wsFolderQuery = "";
        return this._render();

      case "apps-ws-search": {
        const next = (
          (args && args.value != null
            ? args.value
            : cmd && cmd.mget && cmd.mget(_a.value)) || ""
        )
          .toString()
          .trim();
        if (next === (this._wsFolderQuery || "")) return;
        this._wsFolderQuery = next;
        this._wsDetailPage = 1;
        if (this._activeWorkspace) {
          return this._loadHubFolders(this._activeWorkspace.id);
        }
        return;
      }

      case "apps-perm-page": {
        const n = parseInt(cmd.mget("page_num"), 10);
        if (!isNaN(n) && n >= 1) {
          this._wsDetailPage = n;
          this._render();
          if (this._activeWorkspace) {
            return this._loadHubFolders(this._activeWorkspace.id);
          }
        }
        return;
      }

      case "apps-security-switch-plan": {
        const plan = cmd.mget("security_plan");
        if (
          (plan === "normal" || plan === "self-hosting") &&
          plan !== this._securityPlan
        ) {
          this._securityPlan = plan;
          this._render();
        }
        return;
      }

      case "apps-security-toggle-sso": {
        const key = cmd.mget("security_sso_key");
        if (key && this._securitySso[key] != null) {
          this._securitySso[key] = !this._securitySso[key];
          this._render();
        }
        return;
      }

      case "apps-security-toggle-2fa": {
        const key = cmd.mget("security_2fa_key");
        if (key && this._security2fa[key] != null) {
          this._security2fa[key] = !this._security2fa[key];
          this._render();
        }
        return;
      }

      case "apps-security-toggle-tag": {
        const hubId = cmd.mget("hub_id");
        const tag = cmd.mget("security_tag");
        if (!hubId || !tag) return;
        const tags = this._securityTagsFor(hubId);
        if (tags[tag] != null) {
          tags[tag] = !tags[tag];
          this._render();
        }
        return;
      }

      case "apps-security-edit-hub": {
        const hubId = cmd.mget("hub_id");
        const h = (this._adminHubs || []).find((x) => x.hub_id === hubId);
        if (!h) return;
        // Open the owner Access-control overlay (UI-only state).
        this._editingHub = {
          id: h.hub_id,
          name: h.hub_name || h.hub_id,
          area: h.area || "private",
          mtime: h.mtime,
          updated: h.updated,
          filesize: h.filesize,
          size: h.size,
        };
        const tags = this._securityTags && this._securityTags[h.hub_id];
        // "share" / "dmz" workspaces use the shared-mode layout (no Member
        // Permissions; gains an Access Audit Log section). Everything else
        // defaults to the restricted layout.
        const area = h.area || "private";
        const mode =
          area === "share" || area === "dmz" ? "shared" : "restricted";
        this._secCtrl = {
          mode,
          geoOn: !!(tags && tags.ipgeo),
          vpnOn: !!(tags && tags.vpn),
          timeOn: false,
          autoOn: false,
          autoMins: 30,
          oneTimeOn: !!(tags && tags.onetime),
          oneTimeUrl: "drumee.com/s/pink-folder-2023-x92...",
          startTime: { hour: 9, minute: 0, period: "AM" },
          endTime: { hour: 6, minute: 0, period: "PM" },
          timePickerOpen: null, // null | "start" | "end"
          // null | "start-hour" | "start-minute" | "end-hour" | "end-minute"
          timeUnitOpen: null,
          days: { mon: true, tue: true, wed: true, thu: true, fri: true },
          allowedCountry: null,
          blockedCountry: null,
          countryPickerOpen: null, // null | "allowed" | "blocked"
          countrySearch: "",
          members: [],
          devices: [],
          // Access Audit Log drill-in (shared mode)
          auditView: false,
          auditOn: true,
          auditPage: 1,
          auditPageSize: 25,
          auditTotal: 1460,
        };
        return this._render();
      }

      case "apps-ac-close":
        this._editingHub = null;
        this._secCtrl = null;
        return this._render();

      case "apps-ac-toggle-geo":
        if (!this._secCtrl) return;
        this._secCtrl.geoOn = !this._secCtrl.geoOn;
        return this._render();

      case "apps-ac-toggle-vpn":
        if (!this._secCtrl) return;
        this._secCtrl.vpnOn = !this._secCtrl.vpnOn;
        return this._render();

      case "apps-ac-toggle-time":
        if (!this._secCtrl) return;
        this._secCtrl.timeOn = !this._secCtrl.timeOn;
        return this._render();

      case "apps-ac-toggle-auto":
        if (!this._secCtrl) return;
        this._secCtrl.autoOn = !this._secCtrl.autoOn;
        return this._render();

      case "apps-ac-toggle-onetime":
        if (!this._secCtrl) return;
        this._secCtrl.oneTimeOn = !this._secCtrl.oneTimeOn;
        return this._render();

      case "apps-ac-toggle-day": {
        if (!this._secCtrl) return;
        const k = cmd.mget("day_key");
        if (!k) return;
        const days = this._secCtrl.days || {};
        days[k] = !days[k];
        this._secCtrl.days = days;
        return this._render();
      }

      case "apps-ac-copy-link":
        if (
          this._secCtrl &&
          this._secCtrl.oneTimeUrl &&
          navigator &&
          navigator.clipboard
        ) {
          navigator.clipboard
            .writeText(this._secCtrl.oneTimeUrl)
            .catch(() => {});
        }
        return;

      case "apps-ac-save":
        this._editingHub = null;
        this._secCtrl = null;
        return this._render();

      case "apps-ac-view-audit":
        // Shared workspaces have their own in-modal Access Audit Log
        // drill-in; restricted workspaces fall back to the global Audit tab.
        if (this._secCtrl && this._secCtrl.mode === "shared") {
          this._secCtrl.auditView = true;
          return this._render();
        }
        this._editingHub = null;
        this._secCtrl = null;
        return this.switchTab("audit");

      case "apps-ac-open-audit":
        if (!this._secCtrl) return;
        this._secCtrl.auditView = true;
        return this._render();

      case "apps-ac-back-from-audit":
        if (!this._secCtrl) return;
        this._secCtrl.auditView = false;
        return this._render();

      case "apps-ac-toggle-audit":
        if (!this._secCtrl) return;
        this._secCtrl.auditOn = !this._secCtrl.auditOn;
        return this._render();

      case "apps-ac-audit-prev":
        if (!this._secCtrl) return;
        if (this._secCtrl.auditPage > 1) {
          this._secCtrl.auditPage -= 1;
          this._render();
        }
        return;

      case "apps-ac-audit-next": {
        if (!this._secCtrl) return;
        const pageCount = Math.max(
          1,
          Math.ceil(this._secCtrl.auditTotal / this._secCtrl.auditPageSize),
        );
        if (this._secCtrl.auditPage < pageCount) {
          this._secCtrl.auditPage += 1;
          this._render();
        }
        return;
      }

      case "apps-ac-pick-country": {
        if (!this._secCtrl) return;
        const kind = cmd.mget("country_kind");
        if (kind !== "allowed" && kind !== "blocked") return;
        // Toggle the picker: clicking the open row collapses it.
        this._secCtrl.countryPickerOpen =
          this._secCtrl.countryPickerOpen === kind ? null : kind;
        this._secCtrl.countrySearch = "";
        return this._render();
      }

      case "apps-ac-country-search": {
        if (!this._secCtrl) return;
        const next = (
          (args && args.value != null
            ? args.value
            : cmd && cmd.mget && cmd.mget(_a.value)) || ""
        ).toString();
        if (next === (this._secCtrl.countrySearch || "")) return;
        this._secCtrl.countrySearch = next;
        return this._render();
      }

      case "apps-ac-select-country": {
        if (!this._secCtrl) return;
        const kind = cmd.mget("country_kind");
        const code = cmd.mget("country_code");
        if (!code || (kind !== "allowed" && kind !== "blocked")) return;
        if (kind === "allowed") this._secCtrl.allowedCountry = code;
        else this._secCtrl.blockedCountry = code;
        this._secCtrl.countryPickerOpen = null;
        this._secCtrl.countrySearch = "";
        return this._render();
      }

      case "apps-ac-pick-time": {
        if (!this._secCtrl) return;
        const kind = cmd.mget("time_kind");
        if (kind !== "start" && kind !== "end") return;
        this._secCtrl.timePickerOpen =
          this._secCtrl.timePickerOpen === kind ? null : kind;
        this._secCtrl.timeUnitOpen = null;
        return this._render();
      }

      case "apps-ac-time-hour-toggle":
      case "apps-ac-time-minute-toggle": {
        if (!this._secCtrl) return;
        const kind = cmd.mget("time_kind");
        if (kind !== "start" && kind !== "end") return;
        const unit = service.endsWith("hour-toggle") ? "hour" : "minute";
        const next = `${kind}-${unit}`;
        this._secCtrl.timeUnitOpen =
          this._secCtrl.timeUnitOpen === next ? null : next;
        return this._render();
      }

      case "apps-ac-time-hour-pick":
      case "apps-ac-time-minute-pick": {
        if (!this._secCtrl) return;
        const kind = cmd.mget("time_kind");
        const v = parseInt(cmd.mget("time_value"), 10);
        if (Number.isNaN(v)) return;
        const key = kind === "start" ? "startTime" : "endTime";
        const t = this._secCtrl[key] || { hour: 12, minute: 0, period: "AM" };
        if (service.endsWith("hour-pick")) {
          t.hour = Math.max(1, Math.min(12, v));
        } else {
          t.minute = Math.max(0, Math.min(59, v));
        }
        this._secCtrl[key] = t;
        this._secCtrl.timeUnitOpen = null;
        return this._render();
      }

      case "apps-ac-time-hour-input":
      case "apps-ac-time-minute-input": {
        if (!this._secCtrl) return;
        const kind = cmd.mget("time_kind");
        const raw = (
          (args && args.value != null
            ? args.value
            : cmd && cmd.mget && cmd.mget(_a.value)) || ""
        )
          .toString()
          .trim();
        const v = parseInt(raw, 10);
        if (Number.isNaN(v)) return this._render();
        const key = kind === "start" ? "startTime" : "endTime";
        const t = this._secCtrl[key] || { hour: 12, minute: 0, period: "AM" };
        if (service.endsWith("hour-input")) {
          t.hour = Math.max(1, Math.min(12, v));
        } else {
          t.minute = Math.max(0, Math.min(59, v));
        }
        this._secCtrl[key] = t;
        this._secCtrl.timeUnitOpen = null;
        return this._render();
      }

      case "apps-ac-time-period": {
        if (!this._secCtrl) return;
        const kind = cmd.mget("time_kind");
        const value = cmd.mget("period_value");
        const key = kind === "start" ? "startTime" : "endTime";
        const t = this._secCtrl[key] || { hour: 12, minute: 0, period: "AM" };
        t.period = value === "PM" ? "PM" : "AM";
        this._secCtrl[key] = t;
        return this._render();
      }

      case "apps-ac-add-member":
      case "apps-ac-remove-all-members":
      case "apps-ac-change-role":
      case "apps-ac-remove-member":
      case "apps-ac-add-device":
      case "apps-ac-remove-all-devices":
      case "apps-ac-remove-device":
        return;

      case "apps-perm-edit-folder": {
        const id = cmd.mget("folder_id");
        const f = (this._wsFolders || []).find((row) => row.id === id);
        if (f) {
          this._editingFolder = f;
          this._fpermMode =
            (this._activeWorkspace && this._activeWorkspace.mode) ||
            "restricted";
          this._render();
          return this._loadFolderPermissions(f.id);
        }
        return;
      }

      case "apps-fperm-close":
        this._editingFolder = null;
        return this._render();

      case "apps-fperm-save":
        return this._saveFolderPermissions();

      case "apps-fperm-toggle-auto":
        this._fpermAutoRevoke = !this._fpermAutoRevoke;
        return this._render();

      case "apps-fperm-toggle-onetime":
        this._fpermOneTimeOn = !this._fpermOneTimeOn;
        return this._render();

      case "apps-fperm-copy-link":
        if (this._fpermOneTimeUrl && navigator && navigator.clipboard) {
          navigator.clipboard.writeText(this._fpermOneTimeUrl).catch(() => {});
        }
        return;

      case "apps-fperm-toggle-access": {
        const key = cmd.mget("access_key");
        if (key && this._fpermAccess.hasOwnProperty(key)) {
          this._fpermAccess = {
            ...this._fpermAccess,
            [key]: !this._fpermAccess[key],
          };
        }
        return this._render();
      }

      case "apps-fperm-add-member":
      case "apps-fperm-remove-all-members":
      case "apps-fperm-change-role":
      case "apps-fperm-remove-member":
      case "apps-fperm-add-device":
      case "apps-fperm-remove-all-devices":
      case "apps-fperm-remove-device":
      case "apps-perm-open-folder":
        return;

      case "apps-audit-search": {
        const next = (
          (args && args.value != null
            ? args.value
            : cmd && cmd.mget && cmd.mget(_a.value)) || ""
        )
          .toString()
          .trim();
        if (next === (this._auditUsername || "")) return;
        this._auditUsername = next;
        this._auditPage = 1;
        return this._loadAuditLogs();
      }

      case "apps-audit-upgrade":
        this._auditUnlocked = true;
        return this._render();

      case "apps-audit-export":
        return this._exportAuditLogs();

      case "apps-audit-prev":
        if (this._auditPage > 1) {
          this._auditPage -= 1;
          this._loadAuditLogs();
        }
        return;

      case "apps-audit-next":
        this._auditPage += 1;
        return this._loadAuditLogs();

      case "apps-audit-range":
        this._auditRangeOpen = !this._auditRangeOpen;
        return this._render();

      case "apps-audit-select-range": {
        const key = (cmd && cmd.mget && cmd.mget("range_key")) || "30d";
        this._auditRangeOpen = false;
        if (key === this._auditRangeKey) return this._render();
        this._auditRangeKey = key;
        this._auditPage = 1;
        this._render();
        this._loadAuditStats();
        return this._loadAuditLogs();
      }

      case "apps-storage-retention":
        this._storageView = "retention";
        return this._render();

      case "apps-back-storage":
        this._storageView = "main";
        this._showApplyConfirm = false;
        return this._render();

      case "apps-apply-policy":
        this._showApplyConfirm = true;
        return this._render();

      case "apps-apply-confirm-close":
        this._showApplyConfirm = false;
        return this._render();

      case "apps-apply-confirm-apply":
        this._showApplyConfirm = false;
        this._storageView = "main";
        return this._render();

      case "apps-select-period":
        this._retentionDays = parseInt(cmd.mget("days"), 10) || 30;
        return this._render();

      case "apps-toggle-apply-immediately":
        this._applyImmediately = !this._applyImmediately;
        return this._render();

      case "apps-toggle-members-view":
        this._allowMembersView = !this._allowMembersView;
        return this._render();

      case "apps-toggle-editors-restore":
        this._allowEditorsRestore = !this._allowEditorsRestore;
        return this._render();

      case "apps-storage-sort":
        this._storageSort =
          this._storageSort === "usage_high" ? "usage_low" : "usage_high";
        this._storagePage = 1;
        this._render();
        return this._loadOrgUserStorage();

      case "apps-storage-prev":
        if (this._storagePage > 1) {
          this._storagePage -= 1;
          this._loadOrgUserStorage();
        }
        return;

      case "apps-storage-next":
        this._storagePage += 1;
        return this._loadOrgUserStorage();

      case "apps-storage-upgrade":
      case "apps-storage-clear-cache":
      case "apps-storage-archive":
      case "apps-storage-row-settings":
        return;

      case "apps-fv-toggle-row": {
        const id = cmd.mget("file_id");
        if (this._fvSelected.has(id)) this._fvSelected.delete(id);
        else this._fvSelected.add(id);
        return this._render();
      }

      case "apps-fv-toggle-all": {
        const rows = this._fileVersions || [];
        if (this._fvSelected.size === rows.length) {
          this._fvSelected.clear();
        } else {
          this._fvSelected = new Set(rows.map((f) => f.id));
        }
        return this._render();
      }

      case "apps-fv-delete-selected": {
        const ids = Array.from(this._fvSelected);
        return this._deleteOldFileVersions(ids);
      }

      case "apps-fv-view-all":
        this._adminStorageView = "all";
        return this._render();

      case "apps-fv-back":
        this._adminStorageView = "main";
        this._fvActiveFile = null;
        return this._render();

      case "apps-fv-open-detail": {
        const id = cmd.mget("file_id");
        const f = (this._fileVersions || []).find((row) => row.id === id) || {
          id,
        };
        this._fvActiveFile = f;
        this._adminStorageView = "detail";
        this._render();
        return this._loadFileVersionDetail(id);
      }

      case "apps-fv-detail-back":
        this._fvActiveFile = null;
        this._fileDetail = null;
        this._fileDetailLoading = false;
        this._fvSelectedVersionId = null;
        this._adminStorageView = "all";
        return this._render();

      case "apps-fv-select-version": {
        const vid = cmd.mget("version_id");
        if (vid && vid !== this._fvSelectedVersionId) {
          this._fvSelectedVersionId = vid;
          this._render();
        }
        return;
      }

      case "apps-fv-download-all":
        if (this._fvActiveFile)
          return this._downloadFileVersions(this._fvActiveFile.id);
        return;

      case "apps-fv-delete-old":
        if (this._fvActiveFile)
          return this._deleteOldFileVersions(this._fvActiveFile.id);
        return;

      case "apps-fv-show-in-folder":
        return;

      case "apps-fv-page": {
        const n = parseInt(cmd.mget("page_num"), 10);
        if (!isNaN(n) && n >= 1) {
          this._fvAllPage = n;
          this._render();
          return this._loadFileVersions();
        }
        return;
      }

      case "apps-fv-delete-all":
        return this._deleteAllOldVersionsInHub();

      case "apps-fv-search": {
        const value = (cmd.mget(_a.value) || "").trim();
        if (this._fvSearch === value) return;
        this._fvSearch = value;
        this._fvAllPage = 1;
        return this._loadFileVersions();
      }

      case "apps-fv-delete-row":
        return this._deleteOldFileVersions(cmd.mget("file_id"));

      case "apps-fv-row-menu":
      case "apps-fv-filter-workspace":
        return;

      default:
        return;
    }
  }

  async _removeSelected() {
    const ids = Array.from(this._selected).filter((id) => !this._isSelf(id));
    if (!ids.length) return;
    const isAdmin = this._role === "admin";
    const svc = isAdmin
      ? SERVICE.admin.hub_member_remove
      : SERVICE.adminpanel.member_delete;
    const orgId = isAdmin ? null : Visitor.get("org_id");
    for (const id of ids) {
      try {
        const payload = isAdmin
          ? { hub_id: this._activeAdminHub, uid: id }
          : { orgid: orgId, user_id: id };
        await this.postService(svc, payload);
      } catch (e) {
        this.warn && this.warn(`member_delete ${id} failed`, e);
      }
    }
    this._selected.clear();
    await this._loadMemberStats();
    this._clampPage();
    this._loadMembers();
  }
}

module.exports = apps_main;
