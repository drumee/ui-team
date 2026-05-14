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

function deriveRole(privilege) {
  const p = parseInt(privilege, 10) || 0;
  if (_K && _K.permission) {
    if (p & _K.permission.owner) {
      return { label: "organization name owner", variant: "owner" };
    }
    if (p & _K.permission.admin) {
      return { label: "Workspace Admin", variant: "admin" };
    }
  }
  return { label: "Member", variant: "member" };
}

const TABS_BY_ROLE = {
  owner: ["member", "audit", "storage", "security"],
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
  if (row && (row.online === 1 || row.online === true)) return "online";
  if (row && row.connected === 0) return "offline";
  return "online";
}

function deriveLastActive(row) {
  if (!row) return "—";
  const t = row.last_login || row.mtime || row.ctime;
  if (!t) return "—";
  try {
    const d = Dayjs(t);
    if (!d.isValid()) return String(t);
    return d.fromNow();
  } catch (e) {
    return String(t);
  }
}

function mapMember(row) {
  const id = row.drumate_id || row.user_id || row.uid || row.id;
  const fullname =
    row.fullname || `${row.firstname || ""} ${row.lastname || ""}`.trim();
  return {
    id,
    raw: row,
    initials: initialsFor(row.firstname, row.lastname, fullname),
    avatar_color: avatarColorFor(id),
    name: fullname || row.email || "—",
    email: row.email || "",
    role: deriveRole(row.privilege),
    workspaces: [],
    status: deriveStatus(row),
    last_active: deriveLastActive(row),
    privilege: row.privilege || 0,
  };
}

class apps_main extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._role = deriveVisitorRole();
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
    this._auditUnlocked = false;
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
    this._onDocumentClick = this._onDocumentClick.bind(this);
    document.addEventListener("click", this._onDocumentClick, true);
  }

  onBeforeDestroy() {
    document.removeEventListener("click", this._onDocumentClick, true);
  }

  _onDocumentClick(e) {
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
    this.feed(require("./skeleton").default(this));
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
        "ctime",
        "actor_name",
        "email",
        "action",
        "category",
        "entity_id",
        "hub_id",
        "log",
      ];
      const escape = (v) => {
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const csv = [cols.join(",")]
        .concat(rows.map((r) => cols.map((c) => escape(r[c])).join(",")))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const ts = Dayjs().format("YYYYMMDD-HHmmss");
      this.getBlob && this.getBlob(blob, `audit-logs-${ts}.csv`);
    } catch (e) {
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
    }
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
          uid: memberId,
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

      case "apps-edit-role-select":
      case "apps-edit-ws-role":
      case "apps-edit-ws-add":
        return;

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
          this._render();
          return this._loadHubFolders(ws.id);
        }
        return;
      }

      case "apps-perm-back":
        this._activeWorkspace = null;
        this._wsFolders = [];
        this._wsFoldersState = "idle";
        return this._render();

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

      case "apps-admin-upgrade":
        this._adminUnlocked = true;
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
    for (const id of ids) {
      try {
        const payload = isAdmin
          ? { hub_id: this._activeAdminHub, uid: id }
          : { uid: id };
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
