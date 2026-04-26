// Avatar palette cycled by id-hash so initials avatars stay stable per user.
const AVATAR_COLORS = ["cyan", "purple", "amber", "pink"];

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
  const id = row.drumate_id || row.user_id || row.id;
  const fullname = row.fullname || `${row.firstname || ""} ${row.lastname || ""}`.trim();
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
    this._tab = "member";
    this._roleFilter = "all";
    this._filterOpen = false;
    this._page = 1;
    this._selected = new Set();
    this._members = [];
    this._memberStats = null;
    this._membersState = "idle"; // idle | loading | loaded | error
    this._statsState = "idle";
    this._auditUnlocked = false;
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
    this._fpermMode = "restricted"; // "restricted" | "shared"
    this._fpermAutoRevoke = false;
    this._fpermAutoRevokeMins = 30;
    this._fpermOneTimeOn = false;
    this._fpermOneTimeUrl = "drumee.com/s/pink-folder-2023-x92...";
    this._fpermAccess = { view: true, edit: false, chat: true };
    this._fvSelected = new Set();
    this._adminStorageView = "main"; // "main" | "all" | "detail"
    this._fvAllPage = 1;
    this._fvActiveFile = null;
    this._editDevices = [];
    this._editWorkspaces = [];
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
      this._render();
    }
  }

  _render() {
    if (this.isDestroyed && this.isDestroyed()) return;
    this.feed(require("./skeleton").default(this));
  }

  onDomRefresh() {
    this._render();
    if (this._tab === "member") this._loadMembersTab();
  }

  // ─────────────────────────────────────────────────────────
  //  Backend loaders
  // ─────────────────────────────────────────────────────────
  _loadMembersTab() {
    this._loadMemberStats();
    this._loadMembers();
  }

  async _loadMembers() {
    this._membersState = "loading";
    this._render();
    try {
      const roleId = this._roleFilter && this._roleFilter !== "all"
        ? this._roleFilter
        : 0;
      const res = await this.postService(SERVICE.adminpanel.member_list, {
        role_id: roleId,
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

  async _loadMemberStats() {
    this._statsState = "loading";
    try {
      const res = await this.postService(SERVICE.admin.member_stats, {});
      this._memberStats = res || {};
      this._statsState = "loaded";
    } catch (e) {
      this._statsState = "error";
      this._memberStats = null;
    }
    this._render();
  }

  // ─────────────────────────────────────────────────────────
  //  Tabs / table chrome
  // ─────────────────────────────────────────────────────────
  switchTab(tab) {
    this._tab = tab;
    this._render();
    if (tab === "member" && this._membersState !== "loading") {
      this._loadMembersTab();
    }
  }

  toggleMember(id) {
    if (this._selected.has(id)) this._selected.delete(id);
    else this._selected.add(id);
    this._render();
  }

  toggleAll() {
    if (this._selected.size === this._members.length) {
      this._selected.clear();
    } else {
      this._selected = new Set(this._members.map((m) => m.id));
    }
    this._render();
  }

  goToPage(page) {
    this._page = page;
    this._render();
    this._loadMembers();
  }

  // ─────────────────────────────────────────────────────────
  //  Edit-member popup
  // ─────────────────────────────────────────────────────────
  async _openEditMember(memberId) {
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
          user_id: userId,
        }).catch(() => []),
        this.postService(SERVICE.admin.member_list_workspaces, {
          user_id: userId,
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
    const m = this._editingMember;
    if (!m || !m.raw) return this._closeEdit();
    try {
      await this.postService(SERVICE.adminpanel.member_update, {
        user_id: m.id,
        firstname: m.raw.firstname,
        lastname: m.raw.lastname,
        email: m.raw.email,
      });
    } catch (e) {
      this.warn && this.warn("member_update failed", e);
    }
    this._closeEdit();
    this._loadMembers();
  }

  async _removeDevice(deviceId) {
    if (!this._editingMember) return;
    const userId = this._editingMember.id;
    try {
      await this.postService(SERVICE.admin.member_device_remove, {
        user_id: userId,
        device_id: deviceId,
      });
      this._editDevices = (this._editDevices || []).filter(
        (d) => (d.id || d.sys_id) !== deviceId
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
        user_id: userId,
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
    try {
      await this.postService(SERVICE.adminpanel.member_delete, {
        user_id: memberId,
      });
      this._selected.delete(memberId);
    } catch (e) {
      this.warn && this.warn("member_delete failed", e);
    }
    this._loadMembers();
    this._loadMemberStats();
  }

  // ─────────────────────────────────────────────────────────
  //  Event router
  // ─────────────────────────────────────────────────────────
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
        return this._render();

      case "apps-select-role":
        this._roleFilter = cmd.mget("role_key");
        this._filterOpen = false;
        this._page = 1;
        this._render();
        return this._loadMembers();

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
        const data = require("./skeleton/permission-data").default;
        const ws = data.find((w) => w.id === id);
        if (ws) {
          this._activeWorkspace = ws;
          this._wsDetailPage = 1;
          return this._render();
        }
        return;
      }

      case "apps-perm-back":
        this._activeWorkspace = null;
        return this._render();

      case "apps-perm-page": {
        const n = parseInt(cmd.mget("page_num"), 10);
        if (!isNaN(n) && n >= 1) {
          this._wsDetailPage = n;
          return this._render();
        }
        return;
      }

      case "apps-perm-edit-folder": {
        const id = cmd.mget("folder_id");
        const data = require("./skeleton/permission-detail-data").default;
        const f = data.find((row) => row.id === id);
        if (f) {
          this._editingFolder = f;
          // Inherit popup mode from the workspace this folder lives in.
          this._fpermMode =
            (this._activeWorkspace && this._activeWorkspace.mode) ||
            "restricted";
          return this._render();
        }
        return;
      }

      case "apps-fperm-close":
      case "apps-fperm-save":
        this._editingFolder = null;
        return this._render();

      case "apps-fperm-toggle-auto":
        this._fpermAutoRevoke = !this._fpermAutoRevoke;
        return this._render();

      case "apps-fperm-toggle-onetime":
        this._fpermOneTimeOn = !this._fpermOneTimeOn;
        return this._render();

      case "apps-fperm-copy-link":
        if (this._fpermOneTimeUrl && navigator && navigator.clipboard) {
          navigator.clipboard
            .writeText(this._fpermOneTimeUrl)
            .catch(() => {});
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

      case "apps-audit-upgrade":
        this._auditUnlocked = true;
        return this._render();

      case "apps-audit-range":
      case "apps-audit-export":
      case "apps-audit-prev":
      case "apps-audit-next":
        return;

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

      case "apps-storage-upgrade":
      case "apps-storage-clear-cache":
      case "apps-storage-archive":
      case "apps-storage-row-settings":
      case "apps-storage-sort":
      case "apps-storage-prev":
      case "apps-storage-next":
        return;

      case "apps-fv-toggle-row": {
        const id = cmd.mget("file_id");
        if (this._fvSelected.has(id)) this._fvSelected.delete(id);
        else this._fvSelected.add(id);
        return this._render();
      }

      case "apps-fv-toggle-all": {
        const data = require("./skeleton/admin-storage-data").default;
        if (this._fvSelected.size === data.length) {
          this._fvSelected.clear();
        } else {
          this._fvSelected = new Set(data.map((f) => f.id));
        }
        return this._render();
      }

      case "apps-fv-delete-selected":
        this._fvSelected.clear();
        return this._render();

      case "apps-fv-view-all":
        this._adminStorageView = "all";
        return this._render();

      case "apps-fv-back":
        this._adminStorageView = "main";
        this._fvActiveFile = null;
        return this._render();

      case "apps-fv-open-detail": {
        const id = cmd.mget("file_id");
        const data = require("./skeleton/admin-storage-data").default;
        const f = data.find((row) => row.id === id) || {
          id,
          name: "Q2_Growth_Plan_v2.docx",
        };
        this._fvActiveFile = f;
        this._adminStorageView = "detail";
        return this._render();
      }

      case "apps-fv-detail-back":
        this._fvActiveFile = null;
        this._adminStorageView = "all";
        return this._render();

      case "apps-fv-show-in-folder":
      case "apps-fv-download-all":
      case "apps-fv-delete-old":
      case "apps-fv-delete-version":
        return;

      case "apps-fv-page": {
        const n = parseInt(cmd.mget("page_num"), 10);
        if (!isNaN(n) && n >= 1) {
          this._fvAllPage = n;
          return this._render();
        }
        return;
      }

      case "apps-fv-delete-all":
      case "apps-fv-delete-row":
      case "apps-fv-row-menu":
      case "apps-fv-filter-workspace":
        return;

      default:
        return;
    }
  }

  async _removeSelected() {
    const ids = Array.from(this._selected);
    if (!ids.length) return;
    for (const id of ids) {
      try {
        await this.postService(SERVICE.adminpanel.member_delete, {
          user_id: id,
        });
      } catch (e) {
        this.warn && this.warn(`member_delete ${id} failed`, e);
      }
    }
    this._selected.clear();
    this._loadMembers();
    this._loadMemberStats();
  }
}

module.exports = apps_main;
