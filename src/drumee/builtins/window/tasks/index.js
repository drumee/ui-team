const { uploadFile } = require("@drumee/ui-essentials");
const { isTaskViewAllowed, canUpgradePlan } = require("libs/billing");
const { keepListThroughClick } = require("libs/pick-guard");
const { resolveZone } = require("./drop-zones");
const {
  markerRe,
  contentTokenRe,
  imgMarker,
  linkMarker,
  linkifyTokens,
  safeUrl,
  uidsFromText,
} = require("./mention-markers");

// Mention-editor scopes where a bare Enter posts, and the method it calls. The
// description editors (create / detail) are deliberately absent: they have no
// submit action of their own — a description is saved by its panel — so Enter
// keeps inserting a newline there. Each target re-checks its own draft, so
// Enter on an empty box is a no-op.
const COMMENT_SUBMIT_BY_SCOPE = {
  comment: "_submitComment",
  "comment-edit": "_saveCommentEdit",
  "comment-reply": "_submitReply",
};

// Scopes the file picker accepts, i.e. the drafts _draftForKey can queue a file
// on. Anything else falls back to "detail" and attaches to the task.
const PICK_ATTACHMENT_SCOPES = [
  "create",
  "detail",
  "comment",
  "comment-reply",
];

// Row-scoped services refused while that row has attachment work in flight
// (see _refuseWhileRowBusy). Every one of them either mutates the comment the
// files are landing on, or moves the row out from under them. Reply and the
// reactions are in the list because the whole row reads as disabled while it is
// busy; a service without a `commentId` cannot be resolved to a row and so can
// never appear here.
const ROW_BUSY_SERVICES = [
  "comment-edit",
  "comment-delete",
  "comment-reply",
  "comment-react-add",
  "comment-react-remove",
  "comment-react-toggle",
  "comment-react-more",
  "comment-unlink-attachment",
  "retry-pending-file",
  // Discarding a queued file while a sibling is still uploading would edit the
  // list the upload loop is walking. The chip's ✕ is inert while the row is
  // busy anyway (the skin), and this keeps the handler agreeing with it.
  "discard-row-file",
];

// A paperclip inside a comment row carries "comment-row:<id>" — the same key
// resolveZone produces for a drop there, so picking and dropping in that row
// land identically and both attach to THAT comment rather than a new one.
const ROW_SCOPE = /^comment-row:(.+)$/;

// 10-swatch column palette (Figma 2040-106090). Dot/accent color per theme;
// the skin derives the column tint from the accent (--col-accent) and pill
// tints from data-theme.
const COLUMN_THEMES = {
  default: "#AEAEB2",
  orange: "#E8A13B",
  yellow: "#EBD212", // Figma Signal/Yellow (was #EFC443, an off-palette amber)
  green: "#54B684",
  cyan: "#65D0EA",
  blue: "#71A3F4",
  purple: "#847EFF",
  pink: "#FFA8DC",
  red: "#D74E49",
};

// Built-in columns. These are the DEFAULTS the server seeds as real task_column
// rows (with these exact ids) the first time a folder scope is opened — after
// which they are ordinary rows: reorderable, renamable, recolourable and
// deletable like any custom column (see getColumns). This array is used only as
// a pre-load placeholder before task.column_list resolves; a column's id
// doubles as the task.status key.
const COLUMNS = [
  { key: "todo", label: "STATUS_TODO", color: "#AEAEB2", theme: "default" },
  {
    key: "in_progress",
    label: "STATUS_IN_PROGRESS",
    color: "#5950FF",
    theme: "purple",
  },
  {
    key: "to_review",
    label: "STATUS_TO_REVIEW",
    color: "#E8A13B",
    theme: "orange",
  },
  {
    key: "complete",
    label: "STATUS_COMPLETE",
    color: "#54B684",
    theme: "green",
  },
];

// Canonical built-in ids → { locale label, seeded English name }. Used so an
// UNTOUCHED built-in still shows a localized title, while a user-renamed one
// shows the stored name verbatim (the seed name equals the English default).
const BUILTIN_META = {
  todo: { label: "STATUS_TODO", seed: "To do" },
  in_progress: { label: "STATUS_IN_PROGRESS", seed: "In progress" },
  to_review: { label: "STATUS_TO_REVIEW", seed: "To review" },
  complete: { label: "STATUS_COMPLETE", seed: "Complete" },
};

// Every people-picker scope. "create" / "detail" are the multi-select assignee
// fields; the "-reporter" pair are single-select. A scope is the identity of one
// picker: it names its Entry (assignee-search-{scope}), its two parts
// ({scope}-assignee-chips / -suggestions) and its onUiEvent service
// (pickerService). Keep it in sync with pickerService().
const PICKER_SCOPES = [
  "create",
  "detail",
  "create-reporter",
  "detail-reporter",
];

// How long a "a peer changed this out from under you" notice stays up before
// dismissing itself. Long enough to read mid-typing, short enough not to camp
// on the screen.
const PEER_NOTICE_MS = 10000;

// How long a remembered pointer position stays usable for resolving a drop
// that arrives without one (see _pointerScope). A drop follows its last
// mousemove within a frame or two; anything older is an idle mouse, not a drag.
const POINTER_TTL = 2000;

// Signal palette (Figma): Success / Info / Warning / Error — must match the
// skin's [data-priority] pill colors so dots and pills agree everywhere.
const PRIORITIES = [
  { key: "low", label: "PRIORITY_LOW", color: "#54B684" },
  { key: "medium", label: "PRIORITY_MEDIUM", color: "#71A3F4" },
  { key: "high", label: "PRIORITY_HIGH", color: "#E8A13B" },
  { key: "urgent", label: "PRIORITY_URGENT", color: "#D74E49" },
];

class __tasks_panel extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    // LetcBox auto-binds fetchService/postService but not uploadFile.
    this.uploadFile = uploadFile.bind(this);
    this._hubId = this.mget(_a.hub_id) || Host.get(_a.id);
    // Upload destination — must be a real folder/home node, not the hub_id.
    // The folder window passes `actual_home_id || nid` when launching us.
    this._destNid = this.mget(_a.actual_home_id) || this.mget(_a.nid) || 0;
    // Folder scope for the task list/create. `scope_nid` is the canonical
    // current-directory node (root window → actual_home_id, subfolder → own
    // nid); `scope_is_root` makes the root view also show legacy nid-less
    // tasks. Falls back to _destNid for safety if not supplied.
    this._scopeNid = this.mget("scope_nid") || this._destNid || null;
    this._scopeIsRoot = this.mget("scope_is_root") ? 1 : 0;
    // Deep-link target from a task mention/assignment notification (forwarded by
    // the folder window). Consumed once after the initial load in onDomRefresh.
    this._openTaskId = this.mget("open_task_id") || null;
    this._tasks = [];
    this._members = [];
    this._labels = [];
    this._creating = false;
    this._createDefaults = null;
    this._detailId = null;
    this._detailDraft = null;
    // Set when a CHILD is opened from its parent's panel: closing the child
    // then returns to the parent instead of dismissing the whole thing. There
    // is only one detail panel, so without this a child replaced the parent and
    // the X closed both at once, with no route back.
    this._detailReturnTo = null;
    // List-view expand state: ids of the parents whose subtasks are showing.
    // Purely local — collapsed is the default on every open, matching Jira.
    this._subtasksOpen = new Set();
    // Panel-wide commit mutex: gates commit-task / commit-detail so two
    // commits cannot overlap.
    this._submitting = false;
    // Inline subtask creator in the detail panel. null = the "+ Add subtask"
    // row is showing; an object = the creator is open on that draft.
    this._subtaskDraft = null;
    this._attachments = {};
    this._pickerOpen = null;
    // Member filter — empty = show all. Uids stored as strings. Shared across
    // every view (it drives the Assignee dimension of the List filter too).
    this._filterUids = [];
    // List-view multi-dimension filter (Figma 2099-50501). Applies only while
    // the List view is active; other views keep the member-only filter.
    // priority/status hold arrays (OR within), due/files are single-select,
    // keyword is a title substring.
    this._filters = { keyword: "", priority: [], status: [], due: null, files: null };
    // Accordion open-state for the List filter popup (dimension key -> bool).
    this._filterExpanded = {};
    // Active sub-view (board | calendar | list | summary) and the List view's
    // sort state.
    this._view = "board";
    this._sort = null; // { key, dir } — null = natural (status, rank) order
    // Calendar view: month|week granularity + the anchor date (YYYY-MM-DD) of
    // the displayed period. null cursor = today.
    this._calMode = "month";
    this._calCursor = null;
    // Gantt view: weeks|months axis granularity + the multi-select set (task
    // ids) backing the checkboxes / "Delete selected".
    this._ganttMode = "weeks";
    this._ganttSelected = new Set();
    // Custom Kanban columns (server rows {id,name,theme,position}) + the
    // "New board" modal / column-menu UI state.
    this._customColumns = [];
    // Column keys (built-in status strings or custom column ids) this user has
    // subscribed to via the header bell — server-backed, folder-scoped.
    this._columnWatches = new Set();
    this._boardModalOpen = false;
    this._boardTheme = "default";
    this._boardTitle = ""; // typed board name, kept in state so a colour pick never wipes it
    this._boardDefault = true; // "Set as default" toggle (Figma default: on)
    this._colMenuFor = null; // custom column id whose menu popover is open
    this._colRenameDraft = null; // typed draft for the rename field, kept so a re-render never wipes it
    // page/hasMore/loading drive infinite scroll of the results dropdown;
    // an empty query lists all linkable files (most-recent first), a
    // non-empty one searches — both paginate through the same procedure.
    this._fileSearch = {
      query: "",
      results: [],
      scope: null,
      page: 1,
      hasMore: false,
      loading: false,
      loadingMore: false,
    };
    this._fileSearchTimer = null;
    this._fileSearchBlurTimer = null;
    // Active @-mention session (null when the popup is closed): the "@token"
    // range in the focused description editor + the filtered member list.
    this._mention = null;
    // Active Ctrl+K session (null when the prompt is closed): the caret range
    // it will wrap, plus the link being edited when the caret sits in one.
    this._linkPrompt = null;
    // Recent-activity feed for the Project Health view (folder-scoped).
    this._activity = [];
    // Comment feed state for the open task detail.
    this._comments = [];
    this._commentDraft = null; // composer buffer { body, mention_uids }
    this._editingCommentId = null;
    this._commentEditDraft = null; // inline-edit buffer { body, mention_uids }
    this._replyingTo = null; // id of the comment (root or child) being replied to
    this._replyDraft = null; // reply buffer { body, mention_uids }
    this._reactPickerFor = null; // comment id whose reaction palette is open
    this._activityTab = "comments"; // detail popup: comments | history
    this._taskActivity = []; // change-log rows for the open task
    this._emojiPickerFor = null; // comment id whose full emoji grid is open
    // In-flight files per comment row (immediate uploads). Entries live
    // until they settle; the map is cleared only on destroy — see
    // _dropOnCommentRow.
    this._rowUploads = new Map();
    // In-flight run count per comment id (see _markRowBusy). Separate from
    // _rowUploads: that is what is queued, this is what is moving.
    this._rowBusy = new Map();
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    // Parts that never mounted leave their waiter behind (their promise simply
    // never settles, exactly as ensurePart's would) — drop them with the panel.
    for (const cb of this._partWaiters || []) this.off(_e.part.ready, cb);
    this._partWaiters = null;
    this._closeCommentReactionsPicker();
    if (this._fileSearchTimer) clearTimeout(this._fileSearchTimer);
    if (this._fileSearchBlurTimer) clearTimeout(this._fileSearchBlurTimer);
    if (this._assigneeBlurTimer) clearTimeout(this._assigneeBlurTimer);
    if (this._filterKwTimer) clearTimeout(this._filterKwTimer);
    if (this._submitWatchdog) clearTimeout(this._submitWatchdog);
    if (
      this._mediaDroppableInstalled &&
      typeof $ !== "undefined" &&
      $.fn &&
      $.fn.droppable &&
      this.el
    ) {
      try {
        $(this.el).droppable("destroy");
      } catch (_) {}
    }
    if (this._pointerTracker && typeof document !== "undefined") {
      document.removeEventListener("mousemove", this._pointerTracker, true);
      this._pointerTracker = null;
    }
    if (this._pointerRelease && typeof document !== "undefined") {
      document.removeEventListener("mouseup", this._pointerRelease, true);
      this._pointerRelease = null;
    }
    if (this._pasteHandler && typeof document !== "undefined") {
      document.removeEventListener("paste", this._pasteHandler);
      this._pasteHandler = null;
    }
    if (this._pointerExit && this.el) {
      this.el.removeEventListener("mouseleave", this._pointerExit);
      this._pointerExit = null;
    }
    // Release pending-file image-preview blob URLs — the two task forms and
    // the three comment drafts, which carry their own queued files.
    for (const draft of [
      this._createDefaults,
      this._detailDraft,
      this._commentDraft,
      this._commentEditDraft,
      this._replyDraft,
      ...Array.from((this._rowUploads || new Map()).values()).map((l) => ({
        pending_files: l,
      })),
    ]) {
      for (const f of (draft && draft.pending_files) || []) {
        if (f.previewUrl) {
          try {
            URL.revokeObjectURL(f.previewUrl);
          } catch (_) {}
        }
      }
    }
  }

  // ── Host-window controls (filter button lives on the tab bar) ──
  // Toggle the member-filter dropdown (rendered top-right of the board).
  toggleFilter() {
    this._pickerOpen = this._pickerOpen === "filter" ? null : "filter";
    this._render();
  }

  isFilterActive() {
    if ((this._filterUids || []).length > 0) return true;
    const f = this._filters || {};
    return !!(
      f.keyword ||
      (f.priority && f.priority.length) ||
      (f.status && f.status.length) ||
      f.due ||
      f.files
    );
  }

  // Which filter dimensions currently hold a value. Drives `data-active` on the
  // accordion head, which the skin renders as a brand tint — the parent rows
  // carry no checkbox. Assignee reads the shared member filter.
  isFilterDimActive(dim) {
    const f = this._filters || {};
    switch (dim) {
      case "assignee":
        return (this._filterUids || []).length > 0;
      case "keyword":
        return !!f.keyword;
      case "priority":
        return !!(f.priority && f.priority.length);
      case "status":
        return !!(f.status && f.status.length);
      case "due":
        return !!f.due;
      case "files":
        return !!f.files;
      default:
        return false;
    }
  }

  getFilters() {
    return this._filters;
  }

  isFilterCatOpen(dim) {
    return !!(this._filterExpanded && this._filterExpanded[dim]);
  }

  // Let the host window reflect the active filter on its tab-bar button.
  _notifyFilterState() {
    if (typeof this.triggerHandlers === "function") {
      this.triggerHandlers({
        service: "task-filter-state",
        active: this.isFilterActive() ? 1 : 0,
      });
    }
  }

  // Re-point the panel at a different folder when the host window navigates
  // (breadcrumb / into a child). Mirrors the chat panel's setScopedFolderNid.
  setScope({ scopeNid = null, isRoot = 0, destNid } = {}) {
    const nextScope = scopeNid != null ? scopeNid : null;
    const nextRoot = isRoot ? 1 : 0;
    const nextDest = destNid != null ? destNid : this._destNid;
    const sameScope =
      this._scopeNid === nextScope &&
      this._scopeIsRoot === nextRoot &&
      this._destNid === nextDest;
    // Same scope and the last fetch succeeded: nothing to do. When the last
    // list fetch failed silently, fall through to refetch — otherwise
    // reopening the Tasks tab (which re-calls setScope with identical args)
    // would latch the empty board until page reload.
    if (sameScope && !this._loadFailed) {
      return;
    }
    this._scopeNid = nextScope;
    this._scopeIsRoot = nextRoot;
    this._destNid = nextDest;
    if (!sameScope) {
      // The create/detail popups, pending file search AND the loaded rows
      // belong to the folder we just left — close/drop them so nothing
      // commits into (or renders on) the new scope. On a failed-load RETRY
      // of the SAME scope, keep all of it: wiping here would discard the
      // user's open draft just because the board needed a refetch.
      this._creating = false;
      this._createDefaults = null;
      this._detailId = null;
      this._detailDraft = null;
      this._detailReturnTo = null;
      this._pickerOpen = null;
      this._tasks = [];
      if (typeof this._resetFileSearch === "function") this._resetFileSearch();
    }
    if (!this.el) return; // not mounted yet — onDomRefresh loads fresh
    Promise.all([
      this._loadTasks(),
      this._loadColumns(),
      this._loadColumnWatches(),
    ]).then(() => this._render());
  }

  async onDomRefresh() {
    // Before any wiring: refuse task writes this viewer cannot perform, so an
    // edit says why instead of silently reverting on reopen.
    this._guardTaskWrites();
    this._installDnd();
    this._installBoardPan();
    this._installMediaDroppable();
    this._trackPointer();
    this._installPasteAttach();
    this._installFileSearchFocus();
    this._installAssigneeSearch();
    this._installSubtaskDateWatch();
    await Promise.all([
      this._loadTasks(),
      this._loadColumns(),
      this._loadColumnWatches(),
      this._loadActivity(),
      this._loadMembers(),
      this._loadLabels(),
    ]);
    this._render();
    // Deep-link: a mention/assignment notification asked to open a specific
    // task. Routed through openTaskById so this path also recovers when the
    // task is missing from the load that just finished (it can be newer than
    // the rows this panel was serving) instead of silently staying on the
    // board. It still refuses to open a task belonging to another folder.
    if (this._openTaskId) {
      const id = this._openTaskId;
      this._openTaskId = null;
      this.openTaskById(id);
    }
  }

  // Same deep link as above, but for a panel that is ALREADY mounted: the
  // mount-time `open_task_id` is consumed once in onDomRefresh, so a second
  // notification click (folder already open) has to reach the detail this way.
  // Called by the folder window's openTaskDeepLink.
  async openTaskById(id) {
    if (!id) return;
    // Not rendered yet: hand it back to the mount-time path, which opens the
    // detail as soon as the first load lands.
    if (!this.el) {
      this._openTaskId = id;
      return;
    }
    // The board routinely PREDATES the task the notification points at: the
    // panel caches its rows, and reopening the Task tab calls setScope, which
    // skips the refetch when the scope has not changed. So a task created after
    // this panel last loaded is simply absent — it only appeared after a full
    // page reload, and the deep link below then found nothing to open. Refresh
    // once before concluding the task is not in this folder.
    if (!Array.isArray(this._tasks) || !this._tasks.some((t) => t.id === id)) {
      await this._loadTasks();
      // The window can be closed while the refetch is in flight.
      if (!this.el || (this.isDestroyed && this.isDestroyed())) return;
      this._render();
    }
    // Same guard as onDomRefresh — only open a task that really belongs to this
    // folder's list, never an empty detail panel.
    if (this._tasks.some((t) => t.id === id)) this._openDetail(id);
  }

  // Files dragged from the home grid use Drumee's internal jQuery-UI drag, not
  // native dataTransfer — register the panel as a droppable so they attach.
  _installMediaDroppable() {
    if (!this.el || this._mediaDroppableInstalled) return;
    if (typeof $ === "undefined" || !$.fn || !$.fn.droppable) return;
    this._mediaDroppableInstalled = true;
    $(this.el).droppable({
      tolerance: "pointer",
      greedy: true,
      // The jQuery-UI drag carries no DOM target, so the zone is resolved from
      // the pointer (see _dropPointEl) against the same ZONES table the native
      // drag uses. `over` fires only once, on the boundary crossing — inner
      // zones are lit by _syncDragAffordance off the tracked pointer.
      over: (e) => {
        const s = this._activeUploadScope(e);
        this._setDragAffordance(s);
        this._rememberDropScope(s);
      },
      out: () => {
        this._setDragAffordance(null);
      },
      drop: (e, ui) => {
        const scope = this._activeUploadScope(e);
        this._setDragAffordance(null);
        if (!scope) return;
        const selection =
          (typeof Wm !== "undefined" &&
            Wm.getGlobalSelection &&
            Wm.getGlobalSelection()) ||
          [];
        const moving = ui && ui.helper && ui.helper.moving;
        const nodes = selection.length ? selection : moving ? [moving] : [];
        if (nodes.length) this.attachExistingNodes(nodes, scope);
      },
    });
  }

  // Flag a native drag as in-app so Wm skips its file-drop targeting pass —
  // a document-wide style recalc + layout on every dragover event
  // (window/manager.js _isInternalDrag). Own try/catch so an engine refusing a
  // custom MIME type can't also drop the text/plain payload or effectAllowed.
  _tagInternalDrag(e) {
    try {
      e.dataTransfer.setData(_K.internalDragType, "1");
    } catch (_) {
      /* the stopPropagation guard below still holds */
    }
  }

  /**
   * May this viewer change tasks? The folder window hands the panel `may_write`
   * at mount, derived from its own canUpload(). Shared with the skeleton so the
   * board's buttons and this guard can never disagree.
   */
  _mayWriteTasks() {
    return require("./skeleton/helpers").mayCreateTask(this);
  }

  /**
   * Task mutations, as declared `src: "write"` in acl/task.json. A view (3) or
   * chat (7) member is refused server-side, so every one of these was a silent
   * revert: the card moved, the field accepted text, and reopening showed the
   * old value — which is exactly what Duy reported from the Task tab.
   *
   * Guarded at postService rather than per control: there are 43 mutating call
   * sites across 86 onUiEvent cases, and gating them one by one would certainly
   * miss some. This is the single point they all pass through.
   *
   * Anything NOT listed here (list, comment_list, activity, column_list, the
   * column_watch_* notification toggles, and every non-task service) is
   * untouched — fail-open, consistent with the rest of this batch. The server
   * stays the real gate; this only stops offering a write that cannot land.
   */
  static get TASK_MUTATIONS() {
    return [
      "task.create", "task.update", "task.update_status", "task.update_assignee",
      "task.delete", "task.link_file", "task.unlink_file", "task.link_label",
      "task.unlink_label", "task.comment_create", "task.comment_update",
      "task.comment_delete", "task.comment_react", "task.column_create",
      "task.column_update", "task.column_delete", "task.column_reorder",
      // Both comment-file services were missing from this list while being
      // `src: write` server-side. _zoneFor already refuses a viewer without
      // task rights, but that is UX — this is the boundary, and nothing stops
      // a crafted call bypassing the zone entirely.
      "task.comment_link_file", "task.comment_unlink_file",
    ];
  }

  /**
   * Install the mutation guard.
   *
   * postService is an OWN INSTANCE PROPERTY, bound in ui-core's box constructor
   * (`this.postService = postService.bind(this)`) — NOT a prototype method. A
   * subclass `postService(){}` would therefore be shadowed and never run, and
   * `super.postService` does not exist at all. So wrap the bound instance
   * function instead, after super.initialize() has created it.
   */
  _guardTaskWrites() {
    if (this._taskWriteGuardInstalled) return;
    const original = this.postService;
    if (typeof original !== "function") return; // nothing to wrap: leave as-is
    this._taskWriteGuardInstalled = 1;
    this.postService = (...args) => {
      try {
        const a0 = args[0];
        const name = typeof a0 === "string" ? a0 : (a0 && a0.service) || "";
        if (
          this.constructor.TASK_MUTATIONS.includes(`${name}`)
          && !this._mayWriteTasks()
        ) {
          if (typeof Butler !== "undefined" && Butler.say) Butler.say(LOCALE.WEAK_PRIVILEGE);
          // postService resolves UNDEFINED when a call does not complete, and
          // every caller here already tolerates that — so refusing this way
          // reproduces a shape they handle rather than adding a rejection path.
          return Promise.resolve(undefined);
        }
      } catch (e) {
        /* never let the guard break a legitimate call */
      }
      return original(...args);
    };
  }

  // Delegated drag-and-drop on this.el — survives every _render()'s feed() rebuild.
  _installDnd() {
    if (!this.el || this._dndInstalled) return;
    // Dragging a card between columns is task.update_status, and reordering a
    // column header is task.column_reorder — both `src: write`, so the server
    // refuses them for a view or chat member and the board snapped back. Don't
    // wire the drag at all rather than let them move a card that cannot land.
    // One guard here covers dragstart, dragover AND drop together.
    if (!this._mayWriteTasks()) return;
    this._dndInstalled = true;
    const root = this.el;

    const findCard = (target) => {
      if (!target || !target.closest) target = target && target.parentElement;
      if (!target || !target.closest) return null;
      const n = target.closest(".tasks-panel__task-card");
      return n && root.contains(n) ? n : null;
    };
    const findColumn = (target) => {
      if (!target || !target.closest) target = target && target.parentElement;
      if (!target || !target.closest) return null;
      let n = target.closest("[data-dropcol]");
      // The header / add-button sit outside the scroller, so a pointer over
      // them isn't inside [data-dropcol] — resolve via the column root.
      if (!n) {
        const colEl = target.closest(".tasks-panel__column");
        n = colEl && colEl.querySelector("[data-dropcol]");
      }
      return n && root.contains(n) ? n : null;
    };

    // Column reorder: a draggable custom-column header (data-coldrag) starts a
    // column drag, kept separate from the card drag below (cards live in the
    // column body, headers don't).
    const findColHeader = (target) => {
      if (!target || !target.closest) target = target && target.parentElement;
      if (!target || !target.closest) return null;
      const n = target.closest("[data-coldrag]");
      return n && root.contains(n) ? n : null;
    };

    root.addEventListener("dragstart", (e) => {
      const colHead = findColHeader(e.target);
      if (colHead) {
        this._dragColKey = colHead.dataset.coldrag;
        const colEl = colHead.closest("[data-column]");
        if (colEl) colEl.classList.add("is-col-dragging");
        try {
          e.dataTransfer.setData("text/plain", "col:" + this._dragColKey);
          e.dataTransfer.effectAllowed = "move";
        } catch (_) {}
        this._tagInternalDrag(e);
        return;
      }
      const card = findCard(e.target);
      if (!card) return;
      const tid = card.dataset.tid;
      if (!tid) return;
      this._dragTaskId = tid;
      card.classList.add("is-dragging");
      try {
        e.dataTransfer.setData("text/plain", tid);
        e.dataTransfer.effectAllowed = "move";
      } catch (_) {
        /* ignore */
      }
      this._tagInternalDrag(e);
    });

    root.addEventListener("dragend", (e) => {
      if (this._dragColKey) {
        this._dragColKey = null;
        this._colDropEl = null;
        root
          .querySelectorAll(".tasks-panel__column.is-col-dragging, .tasks-panel__column.is-col-drop")
          .forEach((n) => n.classList.remove("is-col-dragging", "is-col-drop"));
      }
      const card = findCard(e.target);
      if (card) card.classList.remove("is-dragging");
      this._dragTaskId = null;
      this._clearDropAffordance();
    });

    // A card / column drag is ours alone — keep it off the desk's file-drop
    // machinery, whose per-dragover targeting pass (Wm.fileDragOver → capture)
    // forces a document-wide style recalc + layout and made dragging a card
    // between columns stutter. Belt and braces with the _K.internalDragType tag
    // set in dragstart: that covers the drag once it leaves this panel.
    // A file drag is left alone UNTIL it resolves to one of our zones — from
    // that point it is ours too and is stopped on the same terms (see the
    // dragover / drop file branches below), because the desk would otherwise
    // upload the same file into the folder body a second time. A file drag over
    // panel chrome, resolving to no zone, still reaches Wm for upload.
    const isOurDrag = () => !!(this._dragTaskId || this._dragColKey);

    root.addEventListener("dragenter", (e) => {
      if (isOurDrag()) e.stopPropagation();
    });

    root.addEventListener("dragover", (e) => {
      if (isOurDrag()) e.stopPropagation();
      // Column reorder in progress → highlight the column under the pointer as
      // the drop target; the card-reorder path below is skipped.
      if (this._dragColKey) {
        const colEl =
          e.target && e.target.closest && e.target.closest("[data-column]");
        e.preventDefault();
        try {
          e.dataTransfer.dropEffect = "move";
        } catch (_) {}
        // Track the highlighted column instead of sweeping the whole panel —
        // dragover fires at pointer rate, so a per-event querySelectorAll
        // over a packed board is real work.
        const next = colEl && root.contains(colEl) ? colEl : null;
        if (this._colDropEl !== next) {
          if (this._colDropEl) this._colDropEl.classList.remove("is-col-drop");
          if (next) next.classList.add("is-col-drop");
          this._colDropEl = next;
        }
        return;
      }
      // OS file drag → attach to the open task; preventDefault so the drop
      // fires on us. Takes priority over the card-reorder path.
      if (this._isFileDrag(e)) {
        e.preventDefault();
        // Region-addressed: the pointer resolves to exactly one zone, or to
        // nothing at all. `none` on no zone is what makes a drop on the
        // description or the panel chrome read as a refusal before it happens.
        const s = this._activeUploadScope(e);
        // Over one of our zones this drag is ours: keep it off Wm.fileDragOver
        // → capture, which lights the desk's own upload affordance over ours
        // AND parks Wm._target on the window under the pointer — the target a
        // bubbled drop uploads into. Off-zone the pass still runs, so a drop on
        // panel chrome keeps landing in the folder as before.
        if (s) {
          e.stopPropagation();
          // Warm the folder listing while the pointer is still travelling, so
          // the name resolution _uploadPendingFile now waits on is already
          // resolved by the time a file lands. Guarded on both cache fields, so
          // this fires ONCE per panel and not per dragover event — and only for
          // someone who is actually dragging a file at a zone, unlike a warm-up
          // on every detail open.
          if (!this._folderFilenames && !this._folderFilenamesJob) {
            this._ensureFolderFilenames();
          }
        }
        try {
          e.dataTransfer.dropEffect = s ? "copy" : "none";
        } catch (_) {}
        this._setDragAffordance(s);
        this._rememberDropScope(s);
        return;
      }
      const col = findColumn(e.target);
      if (!col) return;
      e.preventDefault();
      try {
        e.dataTransfer.dropEffect = "move";
      } catch (_) {}
      // Track the active drop column instead of querySelectorAll-ing the
      // whole panel per event — dragover fires at pointer rate (100+/s) and
      // a full-board subtree scan each time is measurable on packed boards.
      if (this._dropTargetEl !== col) {
        if (this._dropTargetEl)
          this._dropTargetEl.classList.remove("is-drop-target");
        this._dropTargetEl = col;
        col.classList.add("is-drop-target");
      }
      // Show a placeholder at the exact insertion point so the drop reads as
      // precise (Jira/Trello-style) rather than "somewhere in this column".
      // `dragover` fires far more often than the screen refreshes, and the
      // placeholder math (`_dragAfterCard`) reads every card's geometry — O(N).
      // Coalesce to one run per animation frame so a packed column stays smooth.
      this._dragOverPending = { col, y: e.clientY };
      if (!this._dragOverRaf && typeof requestAnimationFrame === "function") {
        this._dragOverRaf = requestAnimationFrame(() => {
          this._dragOverRaf = 0;
          const p = this._dragOverPending;
          this._dragOverPending = null;
          if (!p || !p.col.isConnected) return;
          const ph = this._ensurePlaceholder();
          const after = this._dragAfterCard(p.col, p.y);
          if (after) {
            if (after.previousElementSibling !== ph) p.col.insertBefore(ph, after);
          } else if (p.col.lastElementChild !== ph) {
            p.col.appendChild(ph);
          }
        });
      }
    });

    root.addEventListener("dragleave", (e) => {
      if (isOurDrag()) e.stopPropagation();
      // One rule now the affordance lives on the zone element: clear when the
      // pointer leaves the zone that lit it. relatedTarget, not target — on
      // dragleave `target` is the element being LEFT, which is still inside the
      // zone, so testing it would keep the overlay lit for a pointer that has
      // already moved off. Covers leaving the panel entirely too, since the
      // zone cannot contain a node outside root.
      if (
        this._activeZoneEl &&
        !this._activeZoneEl.contains(e.relatedTarget)
      ) {
        this._setDragAffordance(null);
      }
      const col = findColumn(e.target);
      // Only clear the highlight when the pointer actually leaves the column
      // (relatedTarget outside it) — child→child transitions also fire
      // dragleave and would otherwise strobe the outline + placeholder.
      // Scope the containment test to the whole column, not just the scroller:
      // the header and add-button are SIBLINGS of the body, so a card→header
      // move would otherwise read as a leave and flicker the outline.
      const scope = (col && col.closest(".tasks-panel__column")) || col;
      if (col && scope && !scope.contains(e.relatedTarget)) {
        col.classList.remove("is-drop-target");
        if (this._dropTargetEl === col) this._dropTargetEl = null;
      }
    });

    root.addEventListener("drop", (e) => {
      // Same reasoning as dragover: a card/column drop is fully handled here,
      // so it must not also land in the desk's upload path (the DMZ Wm binds
      // native `drop` too — modules/dmz/wm/index.js).
      if (isOurDrag()) e.stopPropagation();
      // Column reorder drop → place the dragged column before/after the target
      // depending on which half of it the pointer is over.
      if (this._dragColKey) {
        e.preventDefault();
        const dragId = this._dragColKey;
        // Prefer the column the dragover pass tracked — at drop time e.target is
        // frequently a card, gap, or placeholder that has no [data-column]
        // ancestor, so re-resolving from it misses ~half the time. Fall back to
        // the pointer resolution only if nothing was tracked.
        const colEl =
          (this._colDropEl && root.contains(this._colDropEl) && this._colDropEl) ||
          (e.target && e.target.closest && e.target.closest("[data-column]"));
        this._dragColKey = null;
        this._colDropEl = null;
        root
          .querySelectorAll(".tasks-panel__column.is-col-drop, .tasks-panel__column.is-col-dragging")
          .forEach((n) => n.classList.remove("is-col-drop", "is-col-dragging"));
        if (colEl && root.contains(colEl)) {
          const rect = colEl.getBoundingClientRect();
          const before = e.clientX < rect.left + rect.width / 2;
          this._reorderColumn(dragId, colEl.dataset.column, before);
        }
        return;
      }
      if (this._isFileDrag(e)) {
        e.preventDefault();
        // Resolve the zone ONCE, here, and hand it to _onFilesDropped so the
        // decision that stops propagation is the same one that picks the draft.
        const zone = this._activeUploadScope(e);
        // A drop we accept must not ALSO reach the desk's upload handler
        // (modules/desk/index.js `{drop: "_upload"}` → Wm.upload →
        // _bundleDrop), which uploads the dropped file into the folder body
        // independently of the attach path — a second, collision-renamed copy
        // of every file attached by drag-and-drop. Only a drop that resolves to
        // no zone falls through: there the folder-body upload IS the right
        // outcome.
        if (zone) e.stopPropagation();
        const dropped = this._onFilesDropped(e, zone);
        this._setDragAffordance(null);
        return dropped;
      }
      const col = findColumn(e.target);
      if (!col) {
        this._clearDropAffordance();
        return;
      }
      e.preventDefault();
      const transferId = (() => {
        try {
          return e.dataTransfer.getData("text/plain");
        } catch (_) {
          return null;
        }
      })();
      const taskId = this._dragTaskId || transferId;
      const targetStatus = col.dataset.dropcol;
      // Resolve the insertion point BEFORE tearing down the placeholder.
      const afterEl = this._dragAfterCard(col, e.clientY);
      this._dragTaskId = null;
      this._clearDropAffordance();
      if (!taskId || !targetStatus) return;
      this._moveTaskTo(taskId, targetStatus, afterEl);
    });
  }

  // Click-and-drag ("grab to pan") horizontal scrolling for the board's __main.
  // Native overflow-x only gives a scrollbar + wheel; press-and-drag panning is
  // not a browser behavior, so we drive scrollLeft ourselves. Delegated on
  // this.el (root) so it survives every _render()'s feed() rebuild of __main.
  //
  // Panning only starts on EMPTY board area: a press on a task card must still
  // begin the native card drag-and-drop (_installDnd), and presses on the
  // add-task box / inputs / editors keep their normal behavior. Mouse events
  // only (not pointer) so touch keeps its native momentum panning on mobile.
  _installBoardPan() {
    if (!this.el || this._boardPanInstalled) return;
    this._boardPanInstalled = true;
    const root = this.el;

    let main = null; // the __main element currently being panned
    let startX = 0; // pointer pageX at grab
    let startScroll = 0; // scrollLeft at grab
    let moved = false; // crossed the drag threshold → treat as a pan

    const onMove = (e) => {
      if (!main) return;
      const dx = e.pageX - startX;
      // Small tolerance so a plain click isn't read as a (zero-length) pan.
      if (!moved && Math.abs(dx) < 3) return;
      moved = true;
      main.scrollLeft = startScroll - dx;
      e.preventDefault(); // suppress text selection while dragging
    };

    const end = () => {
      if (!main) return;
      main.classList.remove("is-panning");
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", end, true);
      // A real pan is followed by a click — swallow it once so releasing over a
      // card doesn't also open its detail. A plain click (no pan) is untouched.
      if (moved) {
        const swallow = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        root.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => root.removeEventListener("click", swallow, true), 0);
      }
      main = null;
      moved = false;
    };

    root.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // left button only
      const board =
        e.target.closest && e.target.closest(".tasks-panel__main");
      if (!board || !root.contains(board)) return;
      // Let card DnD and interactive controls keep the press.
      if (
        e.target.closest(
          ".tasks-panel__task-card, button, input, textarea, a, [contenteditable]",
        )
      )
        return;
      // Nothing to pan when the board isn't overflowing.
      if (board.scrollWidth <= board.clientWidth) return;
      main = board;
      startX = e.pageX;
      startScroll = board.scrollLeft;
      moved = false;
      board.classList.add("is-panning");
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("mouseup", end, true);
    });
  }

  // Lazily-created insertion placeholder shared across columns.
  _ensurePlaceholder() {
    if (this._placeholder) return this._placeholder;
    const ph = document.createElement("div");
    ph.className = "tasks-panel__card-placeholder";
    this._placeholder = ph;
    return ph;
  }

  // The card the dragged item should be inserted *before*, based on pointer Y.
  // null → append to the end of the column. Excludes the in-flight card and
  // the placeholder itself so geometry stays stable mid-drag.
  _dragAfterCard(colBody, y) {
    // Runs on every animation frame of a drag. Cards are DIRECT children of
    // the column body, so walk children instead of querySelectorAll — the
    // selector scan descends into every card's ~30-node subtree and was the
    // per-frame hot spot on packed columns. Early-exits on the first hit.
    for (const c of colBody.children) {
      const cl = c.classList;
      if (!cl.contains("tasks-panel__task-card")) continue;
      if (cl.contains("is-dragging")) continue;
      const r = c.getBoundingClientRect();
      if (y < r.top + r.height / 2) return c;
    }
    return null;
  }

  _clearDropAffordance() {
    if (this._dragOverRaf && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._dragOverRaf);
    }
    this._dragOverRaf = 0;
    this._dragOverPending = null;
    this._dropTargetEl = null;
    if (!this.el) return;
    this.el
      .querySelectorAll(".tasks-panel__column-body.is-drop-target")
      .forEach((n) => n.classList.remove("is-drop-target"));
    if (this._placeholder && this._placeholder.parentNode) {
      this._placeholder.parentNode.removeChild(this._placeholder);
    }
  }

  async _moveTaskTo(taskId, status, afterEl) {
    const task = this._tasks.find((t) => t.id === taskId);
    if (!task) return;
    const originalStatus = task.status;
    const sameColumn = originalStatus === status;

    const card =
      this.el &&
      this.el.querySelector(`.tasks-panel__task-card[data-tid="${taskId}"]`);
    const targetBody =
      this.el &&
      this.el.querySelector(
        `.tasks-panel__column-body[data-dropcol="${status}"]`,
      );

    // No-op: same column and dropped onto itself / its own slot.
    if (sameColumn && (!afterEl || afterEl === card)) return;

    // Fall back to a full render if we can't locate the DOM nodes (defensive).
    if (!card || !targetBody) {
      task.status = status;
      this._render();
    } else {
      const sourceBody = card.closest(".tasks-panel__column-body");
      card.classList.remove("is-dragging");
      // FLIP: capture every card's position, perform the DOM move, then animate
      // the deltas so the dragged card glides into place and siblings reflow
      // smoothly — instead of the whole board snapping after a re-render.
      this._animateMove(() => {
        if (afterEl && afterEl.parentNode === targetBody) {
          targetBody.insertBefore(card, afterEl);
        } else {
          targetBody.appendChild(card);
        }
        card.dataset.status = status;
        task.status = status;
      }, [sourceBody, targetBody]);
      // Mirror the DOM move into the model so getState() — and therefore every
      // _render() — rebuilds the column in the dropped order. Without this the
      // move is cosmetic and the next re-render (e.g. opening the create/detail
      // panel) reverts to the stale array order.
      this._reorderTaskModel(taskId, status, afterEl);
      // Refresh counts + empty-state on both affected columns in place.
      this._syncColumn(sourceBody);
      if (targetBody !== sourceBody) this._syncColumn(targetBody);
      // The card shows its column as a status pill — retint it in place too
      // (the drag path is surgical; nothing else re-renders the card).
      this._syncCardStatus(card, status);
    }

    // Same-column reorder has no server-side rank to persist yet, so skip the
    // round-trip. The model reorder above keeps the order across re-renders; it
    // reverts only on a server reload (_loadTasks), which returns tasks unranked.
    if (sameColumn) return;

    try {
      const updated = await this.postService({
        service: SERVICE.task.update_status,
        hub_id: this._hubId,
        id: taskId,
        status,
      });
      this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    } catch (err) {
      console.error("[tasks_panel] update_status (drag) failed:", err);
      task.status = originalStatus;
      await this._loadTasks();
      this._render();
    }
  }

  // Move `taskId` within this._tasks to match a drag drop: place it before the
  // task the card was dropped above (afterEl's data-tid), or — when dropped at
  // the end — after the last task already in `status`. getState() filters
  // this._tasks by status preserving array order, so this is what makes the
  // dropped order survive a _render() rebuild.
  _reorderTaskModel(taskId, status, afterEl) {
    const from = this._tasks.findIndex((t) => String(t.id) === String(taskId));
    if (from < 0) return;
    const [task] = this._tasks.splice(from, 1);
    task.status = status;
    const beforeId = afterEl && afterEl.dataset ? afterEl.dataset.tid : null;
    let insertAt = -1;
    if (beforeId != null) {
      insertAt = this._tasks.findIndex(
        (t) => String(t.id) === String(beforeId),
      );
    }
    if (insertAt < 0) {
      // Append within the column — after the last same-column task so the card
      // lands at the column's end and stays adjacent to its peers in the flat
      // array (keeps List/Summary ordering sensible too).
      insertAt = this._tasks.length;
      for (let i = this._tasks.length - 1; i >= 0; i--) {
        if (this._tasks[i].status === status) {
          insertAt = i + 1;
          break;
        }
      }
    }
    this._tasks.splice(insertAt, 0, task);
  }

  // FLIP helper: run `mutate` (a synchronous DOM change), then transition each
  // card from its previous box to its new one. Cards with no delta are skipped.
  _animateMove(mutate, scopeBodies) {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function") {
      mutate();
      return;
    }
    // Only the source + target columns reflow on a move, so scope the FLIP to
    // their cards instead of every card on the board (a board-wide O(N) scan +
    // rect read per drop is what made a full board lag). Fall back to the whole
    // panel if no scope is supplied.
    let cards;
    if (Array.isArray(scopeBodies) && scopeBodies.some(Boolean)) {
      const seen = new Set();
      scopeBodies.forEach((b) => {
        if (!b) return;
        b.querySelectorAll(".tasks-panel__task-card").forEach((c) => seen.add(c));
      });
      cards = Array.from(seen);
    } else {
      cards = Array.from(this.el.querySelectorAll(".tasks-panel__task-card"));
    }
    const first = new Map();
    cards.forEach((c) => first.set(c, c.getBoundingClientRect()));

    mutate();

    // Two passes: read ALL new rects first, THEN write ALL transforms. Reading
    // geometry and writing styles in the same loop forces a synchronous reflow
    // per card (O(N²)) — the batched read/write split keeps it O(N).
    //
    // Only animate cards actually visible in their column's scrollport: a
    // transform transition promotes each card to its own compositor layer,
    // and dropping into a packed column rasterized every shifted card below
    // the insertion point at once — the visible drop hitch. Offscreen cards
    // just take their new position instantly; nobody sees the jump.
    const vpCache = new Map();
    const viewportOf = (el) => {
      if (!el) return null;
      let r = vpCache.get(el);
      if (r === undefined) {
        r = el.getBoundingClientRect();
        vpCache.set(el, r);
      }
      return r;
    };
    const moves = [];
    cards.forEach((c) => {
      const f = first.get(c);
      if (!f) return; // card wasn't present before the move
      const l = c.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (!dx && !dy) return;
      const vp = viewportOf(c.parentElement);
      if (vp && (l.bottom < vp.top || l.top > vp.bottom)) return;
      moves.push({ c, dx, dy });
    });
    moves.forEach(({ c, dx, dy }) => {
      if (Math.abs(dx) > 8) {
        // Crossed columns: a translate FLIP would be clipped by the column's
        // overflow (`overflow-y:auto` / `overflow:hidden`), so settle the card
        // in place with a quick pop rather than a clipped horizontal slide.
        // (Only the dragged card ever changes column; siblings move vertically.)
        c.style.animation = "tasks-panel-pop-in 0.18s cubic-bezier(0.2, 0, 0, 1)";
        const done = () => {
          c.style.animation = "";
          c.removeEventListener("animationend", done);
        };
        c.addEventListener("animationend", done);
      } else {
        c.style.transition = "none";
        c.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          c.style.transition = "transform 0.18s cubic-bezier(0.2, 0, 0, 1)";
          c.style.transform = "";
        });
        const clear = () => {
          c.style.transition = "";
          c.style.transform = "";
          c.removeEventListener("transitionend", clear);
        };
        c.addEventListener("transitionend", clear);
      }
    });
  }

  // Keep a column's count badge and empty-state hint in sync after a surgical
  // card move (no full re-render). Mirrors what the skeleton renders initially.
  // Update a moved card's status pill (label / dot / theme tint) in place —
  // companion to _syncColumn for the surgical drag path.
  _syncCardStatus(card, statusKey) {
    if (!card) return;
    const col = this.getColumns().find((c) => c.key === statusKey);
    if (!col) return;
    const pill = card.querySelector(".tasks-panel__task-status");
    if (pill) pill.dataset.theme = col.theme || "default";
    const dot = card.querySelector(".tasks-panel__task-status-dot");
    if (dot) dot.style.background = col.color || "";
    const label = card.querySelector(".tasks-panel__task-status-label");
    if (label) label.textContent = col.name || "";
  }

  _syncColumn(colBody) {
    if (!colBody) return;
    const count = colBody.querySelectorAll(".tasks-panel__task-card").length;
    // The count badge lives in the pinned header, which is a SIBLING of the
    // scroller — look it up from the column root, not from colBody.
    const colEl = colBody.closest(".tasks-panel__column") || colBody;
    const countEl = colEl.querySelector(".tasks-panel__column-count-text");
    if (countEl) countEl.textContent = String(count);
    let empty = colBody.querySelector(".tasks-panel__column-empty");
    if (count === 0 && !empty) {
      empty = document.createElement("div");
      empty.className = "tasks-panel__column-empty";
      empty.textContent = LOCALE.DROP_TASKS_HERE || "";
      colBody.appendChild(empty);
    } else if (count > 0 && empty) {
      empty.remove();
    }
  }

  async onUiEvent(trigger, args = {}) {
    let service =
      args.service || (trigger && trigger.get && trigger.get(_a.service));
    // Drumee dispatches click on the deepest widget; if it has no service of
    // its own (e.g. a Note inside a card), walk up to find an ancestor that does.
    if (!service && trigger && trigger.parent) {
      let p = trigger.parent;
      let depth = 0;
      while (p && depth < 8) {
        const s = p.mget && p.mget(_a.service);
        if (s) {
          service = s;
          trigger = p;
          break;
        }
        p = p.parent;
        depth += 1;
      }
    }
    // After the service has been resolved (the walk above is what turns a click
    // on a Note into its ancestor's service), before any case can act on it.
    if (this._refuseWhileRowBusy(service, trigger)) return;
    switch (service) {
      case "task-input-changed":
        return this._onTaskInputChanged(args, trigger);

      case "add-task":
        this._creating = true;
        this._createDefaults = {
          status: trigger.mget("taskColumn") || this.getDefaultStatus(),
          reporter_uid: Visitor.id,
          title: "",
          description: "",
          priority: "medium",
          due_date: "",
          start_date: "",
          duration_on: false,
          assignees: [],
          labels: [],
          pending_files: [],
        };
        // Force a fresh fetch on first attachment pick so name-collision
        // preview reflects whatever the folder body holds right now.
        this._folderFilenames = null;
        this._resetFileSearch();
        return this._render();

      case "commit-task":
        if (this._submitting) return;
        // _commitTask resets the mutex in a finally, but a throw escaping that
        // finally would strand it; catch here so the create modal always
        // recovers.
        return this._commitTask().catch((err) => {
          console.error("[tasks_panel] commit-task failed:", err);
          this._setSubmitting(".tasks-panel__create-submit", false);
          this._render();
          // Say so: a commit that fails silently is indistinguishable from a
          // dead button, which makes it needlessly hard to diagnose.
          Wm.alert(LOCALE.ERROR_NETWORK);
        });

      case "cancel-add":
        this._creating = false;
        this._createDefaults = null;
        this._pickerOpen = null;
        this._resetFileSearch();
        this._dismissOverlayNow("create-backdrop");
        return this._renderDeferred();

      case "create-status":
        if (this._createDefaults) {
          const next = trigger.mget("taskStatus");
          this._createDefaults.status = next;
          this._updateStatusPills(
            ".tasks-panel__create-modal",
            ".tasks-panel__create-status-pill",
            next,
          );
        }
        return;

      case "create-priority":
        if (this._createDefaults) {
          const next = trigger.mget("taskPriority");
          this._createDefaults.priority = next;
          this._updatePriorityPills(".tasks-panel__create-modal", next);
        }
        return;

      case "create-assignee": {
        if (this._createDefaults) {
          const before = (this._createDefaults.assignees || []).length;
          this._createDefaults.assignees = this._toggleAssignee(
            this._createDefaults.assignees,
            trigger.mget("memberUid"),
          );
          this._applyAssigneeChange(
            "create-assignee",
            this._createDefaults.assignees,
            this._createDefaults.assignees.length > before,
          );
        }
        return;
      }

      // Reporter pick — single-select, so it REPLACES rather than toggles, and
      // the list closes after the pick (an assignee pick keeps it open so the
      // next member can be added).
      case "create-reporter":
      case "set-reporter": {
        const scope =
          service === "create-reporter" ? "create-reporter" : "detail-reporter";
        const draft = this._pickerDraft(scope);
        const uid = trigger.mget("memberUid");
        // No empty reporter: a task always reads as reported by somebody. A row
        // with no uid can only come from a stale dropdown, so ignore it.
        if (!draft || !uid) return;
        draft.reporter_uid = String(uid);
        return this._applyReporterChange(scope);
      }

      case "toggle-assignee-list": {
        // The caret names its own scope. Pass it through instead of collapsing
        // to create|detail: there are four pickers now (assignee + reporter, in
        // each of the two cards), and a normalised scope would open the wrong
        // dropdown — or the same one twice.
        const scope = trigger.mget("assigneeScope");
        return this._toggleAssigneeList(
          PICKER_SCOPES.includes(scope) ? scope : "create",
        );
      }

      case "create-toggle-label":
        if (this._createDefaults) {
          const id = trigger.mget("labelId");
          const set = new Set(this._createDefaults.labels);
          if (set.has(id)) set.delete(id);
          else set.add(id);
          this._createDefaults.labels = Array.from(set);
          this._updateLabelOptions(
            ".tasks-panel__create-modal",
            this._createDefaults.labels,
          );
        }
        return;

      case "filter-member": {
        // Empty uid ("All members") clears; any other uid multi-toggles. The
        // dropdown stays open so several members can be picked in a row.
        const uid = trigger.mget("memberUid");
        if (!uid) this._filterUids = [];
        else this._filterUids = this._toggleAssignee(this._filterUids, uid);
        this._notifyFilterState();
        return this._render();
      }

      case "filter-cat": {
        // Accordion expand/collapse of a filter dimension — toggle in
        // place (no re-render), so opening a section doesn't rebuild the list.
        const dim = trigger.mget("filterDim");
        if (!dim) return;
        this._filterExpanded[dim] = !this._filterExpanded[dim];
        const cat =
          this.el &&
          this.el.querySelector(
            `.tasks-panel__filter-cat[data-dim="${dim}"]`,
          );
        if (cat) cat.dataset.open = this._filterExpanded[dim] ? "1" : "0";
        return;
      }

      case "filter-set": {
        // Set/toggle a value in a filter dimension, then re-filter.
        const dim = trigger.mget("filterDim");
        const val = trigger.mget("filterVal");
        if (!dim) return;
        const f = this._filters;
        if (dim === "priority" || dim === "status") {
          const arr = Array.isArray(f[dim]) ? f[dim].slice() : [];
          const i = arr.indexOf(val);
          if (i >= 0) arr.splice(i, 1);
          else arr.push(val);
          f[dim] = arr;
        } else {
          // Single-select (due / files): tapping the active value clears it.
          f[dim] = f[dim] === val ? null : val;
        }
        this._notifyFilterState();
        return this._render();
      }

      case "filter-keyword": {
        // Live task-title search — debounce so fast typing doesn't refilter on
        // every keystroke.
        //
        // Deliberately NOT this._render(): a full feed() destroys and rebuilds
        // the very input being typed in. ui-core seeds <input> values through a
        // 200ms waitElement poll, so the rebuilt field starts EMPTY and then,
        // 200ms later, overwrites whatever was typed in the meantime with the
        // value the skeleton was built with — characters vanish, reappear and
        // revert, and the caret jumps to 0. Refresh only the view body plus the
        // two "a filter is active" flags; the popup (and the caret) stay put.
        this._filters.keyword =
          args && args.value != null ? String(args.value) : "";
        if (this._filterKwTimer) clearTimeout(this._filterKwTimer);
        this._filterKwTimer = setTimeout(() => {
          this._filterKwTimer = null;
          this._notifyFilterState();
          this._syncFilterAffordances();
          this._refreshViewBody();
        }, 200);
        return;
      }

      case "filter-clear": {
        // Reset every filter dimension (and the shared member filter).
        this._filters = {
          keyword: "",
          priority: [],
          status: [],
          due: null,
          files: null,
        };
        this._filterUids = [];
        this._notifyFilterState();
        return this._render();
      }

      case "remove-task":
        return this._removeTask(trigger);

      case "toggle-complete":
        return this._toggleComplete(trigger);

      // ── Subtasks ────────────────────────────────────────────────
      case "toggle-subtasks":
        return this._toggleSubtasks(trigger);

      case "add-subtask":
        return this._openSubtaskDraft();

      // Gantt row ＋ : open that task's detail with the creator already showing.
      case "add-child-task": {
        const id = trigger.mget("taskId");
        if (!id) return;
        // _openDetail already renders the panel, and _openSubtaskDraft re-feeds
        // just the subtask block on top of it — so no _render() of our own. The
        // one this used to do rebuilt the entire panel a second time, for a
        // draft the section refresh had already drawn.
        this._openDetail(id);
        return this._openSubtaskDraft();
      }

      case "cancel-subtask":
        return this._closeSubtaskDraft();

      case "create-subtask":
        return this._commitSubtask();

      case "toggle-subtask-complete":
        return this._toggleSubtaskComplete(trigger);

      case "toggle-subtask-menu": {
        if (!this._subtaskDraft) return;
        const kind = trigger.mget("menuKind");
        this._subtaskDraft.menu = this._subtaskDraft.menu === kind ? null : kind;
        // A plain re-feed is safe here: the card's title Entry is seeded from
        // the draft and kept current by the `task-input-changed` watch, so
        // rebuilding the block cannot lose what has been typed.
        this._refreshSubtaskSection();
        return;
      }

      case "set-subtask-priority": {
        if (!this._subtaskDraft) return;
        this._subtaskDraft.priority = trigger.mget("taskPriority");
        this._subtaskDraft.menu = null;
        this._refreshSubtaskSection();
        return;
      }

      case "set-subtask-status": {
        if (!this._subtaskDraft) return;
        this._subtaskDraft.status = trigger.mget("taskStatus");
        this._subtaskDraft.menu = null;
        this._refreshSubtaskSection();
        return;
      }

      case "commit-description":
      case "commit-due-date":
        // Drafts stay in sync via the `task-input-changed` watch.
        return;

      case "set-status":
        if (this._detailDraft) {
          const next = trigger.mget("taskStatus");
          this._detailDraft.status = next;
          this._updateStatusPills(
            ".tasks-panel__detail-panel",
            ".tasks-panel__detail-status-pill",
            next,
          );
        }
        return;

      case "set-priority":
        if (this._detailDraft) {
          const next = trigger.mget("taskPriority");
          this._detailDraft.priority = next;
          this._updatePriorityPills(".tasks-panel__detail-panel", next);
        }
        return;

      case "set-assignee": {
        if (this._detailDraft) {
          const before = (this._detailDraft.assignees || []).length;
          this._detailDraft.assignees = this._toggleAssignee(
            this._detailDraft.assignees,
            trigger.mget("memberUid"),
          );
          this._applyAssigneeChange(
            "detail-assignee",
            this._detailDraft.assignees,
            this._detailDraft.assignees.length > before,
          );
        }
        return;
      }

      case "toggle-task-label":
        if (this._detailDraft) {
          const id = trigger.mget("labelId");
          const set = new Set(this._detailDraft.labels || []);
          if (set.has(id)) set.delete(id);
          else set.add(id);
          this._detailDraft.labels = Array.from(set);
          this._updateLabelOptions(
            ".tasks-panel__detail-panel",
            this._detailDraft.labels,
          );
        }
        return;

      case "toggle-duration": {
        // Duration switch (derive-from-start_date model). ON reveals the range
        // picker seeded from the due date; OFF clears start_date. Shared by the
        // create modal and detail panel (mutually exclusive) — pick the open one.
        const inCreate = this.el.querySelector(".tasks-panel__create-modal");
        const isCreate = !!(this._creating && inCreate);
        const draft = isCreate ? this._createDefaults : this._detailDraft;
        if (!draft) return;
        // Persist any in-flight date edits before the DOM is rebuilt.
        if (isCreate) this._captureCreateDraft();
        else this._captureDetailDraft();
        draft.duration_on = !draft.duration_on;
        if (draft.duration_on) {
          if (!draft.start_date) draft.start_date = draft.due_date || "";
        } else {
          draft.start_date = "";
        }
        // Re-feed ONLY the due-date sub-part (create modal or detail panel) —
        // a full _render() would flicker the whole panel, rebuild every picker,
        // and steal focus.
        return this._refreshDueSection(isCreate ? "create" : "detail");
      }

      case "commit-detail":
        if (this._submitting) return;
        // _commitDetail clears the mutex only on its happy path, and this case
        // refuses to run while the mutex is set — so an unhandled throw in
        // there would leave Update permanently dead. Catch at the call site
        // rather than wrapping its 160-line body, which would mean
        // re-indenting a file another branch is actively editing. The draft is
        // deliberately left intact so a retry keeps the user's edits.
        return this._commitDetail().catch((err) => {
          console.error("[tasks_panel] commit-detail failed:", err);
          this._setSubmitting(".tasks-panel__detail-submit", false);
          this._render();
          // Say so: a commit that fails silently is indistinguishable from a
          // dead button, which makes it needlessly hard to diagnose.
          Wm.alert(LOCALE.ERROR_NETWORK);
        });

      case "cancel-detail":
      case "close-detail": {
        // A child opened from its parent's own panel walks BACK to the parent
        // rather than dismissing everything — there is one detail panel, so
        // closing the child used to take the parent with it. Read the target
        // first: _closeDetailSilently clears it.
        const back = this._detailReturnTo;
        this._closeDetailSilently();
        // _openDetail renders on its own — a _renderDeferred() on top of it
        // would be a second full rebuild of the panel just painted.
        if (back && this._tasks.some((t) => t.id === back)) {
          return this._openDetail(back);
        }
        return this._renderDeferred();
      }

      case "open-detail":
        return this._openDetail(trigger.mget("taskId"));

      case "set-view": {
        const v = trigger.mget("viewMode");
        if (v && v !== this._view) {
          // Tier gate — THE enforcement point. The tab is deliberately still
          // clickable (see the skeleton's viewTabs), so this is the only thing
          // standing between a Free plan and the Gantt view. `_view` is never
          // assigned a gated value here, which is what keeps getView()'s own
          // guard a genuine defence-in-depth rather than the real check.
          if (!isTaskViewAllowed(v)) return this._showTaskViewUpsell();
          this._view = v;
          // Deferred: paint the loading veil THIS frame so the click gets
          // instant feedback (Project Health links / viewbar tabs felt dead
          // while the synchronous full re-feed built the new view).
          this._renderDeferred();
        }
        return;
      }

      // Compact viewbar carousel footer — page the view-tab strip.
      case "viewbar-page":
        return this._showViewbarPage(trigger);

      case "set-cal-mode": {
        const m = trigger.mget("calMode") === "week" ? "week" : "month";
        if (m !== this._calMode) {
          this._calMode = m;
          this._render();
        }
        return;
      }

      case "cal-prev":
        return this._calShift(-1);

      case "cal-next":
        return this._calShift(1);

      case "cal-today":
        if (this._calCursor !== null) {
          this._calCursor = null;
          this._render();
        }
        return;

      case "cal-day-more": {
        // "+N more" on a packed month cell → jump to that day's week view.
        const day = trigger.mget("calDay");
        if (day) {
          this._calCursor = day;
          this._calMode = "week";
          this._render();
        }
        return;
      }

      case "cal-add": {
        // "+" on a day cell → open the create modal pre-dated to that day.
        const day = trigger.mget("calDay") || "";
        this._creating = true;
        this._createDefaults = {
          status: this.getDefaultStatus(),
          reporter_uid: Visitor.id,
          title: "",
          description: "",
          priority: "medium",
          due_date: day,
          start_date: "",
          duration_on: false,
          assignees: [],
          labels: [],
          pending_files: [],
        };
        this._folderFilenames = null;
        this._resetFileSearch();
        return this._render();
      }

      case "set-gantt-mode": {
        const m = trigger.mget("ganttMode") === "months" ? "months" : "weeks";
        if (m !== this._ganttMode) {
          this._ganttMode = m;
          this._render();
        }
        return;
      }

      case "gantt-toggle-select": {
        const id = trigger.mget("taskId");
        if (!id) return;
        if (this._ganttSelected.has(id)) this._ganttSelected.delete(id);
        else this._ganttSelected.add(id);
        return this._render();
      }

      case "gantt-delete-selected":
        return this._deleteSelectedTasks();

      case "toggle-filter":
        return this.toggleFilter();

      case "add-board":
        this._boardModalOpen = true;
        this._boardTheme = "default";
        this._boardTitle = "";
        this._boardDefault = true;
        this._colMenuFor = null;
        this._colRenameDraft = null;
        return this._render();

      case "board-cancel":
        this._boardModalOpen = false;
        this._boardTitle = "";
        return this._render();

      case "board-title-changed":
        // Live-persist the typed name so a colour pick / toggle (which update
        // in place) or any re-render restores it instead of clearing the field.
        this._boardTitle =
          args && args.value != null ? String(args.value) : this._boardTitle;
        return;

      case "board-theme":
        // Flip the active swatch in place — a full re-render replays the
        // modal's pop-in animation and wipes the typed board title.
        this._boardTheme = trigger.mget("colTheme") || "default";
        this._captureBoardTitle();
        this._updateBoardColors(this._boardTheme);
        return;

      case "board-default": {
        // Same reason as board-theme: toggle the switch in place.
        this._captureBoardTitle();
        this._boardDefault = !this._boardDefault;
        const toggle =
          this.el && this.el.querySelector(".tasks-panel__board-toggle");
        if (toggle) toggle.dataset.on = this._boardDefault ? "1" : "0";
        return;
      }

      case "board-submit":
        return this._createColumn();

      case "col-menu": {
        const key = trigger.mget("taskColumn");
        const opening = this._colMenuFor !== key;
        this._colMenuFor = opening ? key : null;
        // Seed the draft with the current name on open; clear on close.
        this._colRenameDraft = opening
          ? (this._customColumns.find((c) => c.id === key) || {}).name || ""
          : null;
        return this._render();
      }

      case "col-watch-toggle":
        return this._toggleColumnWatch(trigger);

      case "col-rename-changed":
        // Live-persist the typed name so any re-render restores it instead of
        // clearing the field (same pattern as board-title-changed).
        this._colRenameDraft =
          args && args.value != null ? String(args.value) : this._colRenameDraft;
        return;

      case "col-rename-submit": {
        // The framework fires a widget's `service` on a plain click too, not
        // only on the Entry's Enter-commit (letc.js: el.onclick → triggerHandlers).
        // A bare click that just focuses the name-seeded input must not
        // submit-and-close the popover — only Enter or the Rename button should.
        const isEntryFocusClick =
          args &&
          args.type === "click" &&
          trigger &&
          trigger.mget &&
          trigger.mget("name") === "col_rename";
        if (isEntryFocusClick) return;
        return this._renameColumn(trigger);
      }

      case "col-theme-set":
        return this._themeColumn(trigger);

      case "col-delete":
        return this._deleteColumn(trigger);

      case "set-sort": {
        // Toggle direction when re-selecting the same column, else sort asc.
        const key = trigger.mget("sortKey");
        if (!key) return;
        if (this._sort && this._sort.key === key) {
          this._sort = { key, dir: this._sort.dir === 1 ? -1 : 1 };
        } else {
          this._sort = { key, dir: 1 };
        }
        return this._render();
      }

      case "comment-submit":
        return this._submitComment();

      case "comment-edit": {
        const cid = trigger.mget("commentId");
        const c = this._comments.find((x) => x.id === cid);
        // Switching the editor to another comment abandons whatever the
        // previous one had queued.
        this._discardCommentPending(this._commentEditDraft);
        this._editingCommentId = cid;
        // Seed the inline editor with the comment's current body + its tags.
        this._commentEditDraft = c
          ? { body: c.body || "", mention_uids: uidsFromText(c.body || "") }
          : null;
        return this._refreshCommentList();
      }

      case "comment-save":
        return this._saveCommentEdit();

      case "comment-cancel":
        // Files are mid-flight: aborting the XHR would leave a half-uploaded
        // orphan in the folder, so the editor holds until they settle. It is a
        // short window, and the strip says which files are the reason.
        if (this._commentSaving) return;
        this._discardCommentPending(this._commentEditDraft);
        this._editingCommentId = null;
        this._commentEditDraft = null;
        this._setDragAffordance(null);
        return this._refreshCommentList();

      case "comment-delete":
        return this._deleteComment(trigger);

      case "comment-reply": {
        // Toggle: clicking Reply on the comment already being answered closes the
        // composer (the redesigned reply pill has no separate Cancel button).
        const cid = trigger.mget("commentId");
        this._discardCommentPending(this._replyDraft);
        this._replyingTo =
          String(this._replyingTo) === String(cid) ? null : cid;
        this._replyDraft = null;
        this._reactPickerFor = null;
        this._emojiPickerFor = null;
        this._setDragAffordance(null);
        return this._refreshCommentList();
      }

      case "comment-reply-cancel":
        this._discardCommentPending(this._replyDraft);
        this._replyingTo = null;
        this._replyDraft = null;
        this._setDragAffordance(null);
        return this._refreshCommentList();

      case "comment-reply-submit":
        return this._submitReply();

      case "comment-mention-insert":
        return this._insertMentionTrigger(trigger.mget("mentionScope"));

      case "comment-react-add":
        return this._addReaction(
          trigger.mget("commentId"),
          trigger.mget("emoji"),
        );

      case "comment-react-remove":
        return this._removeReaction(
          trigger.mget("commentId"),
          trigger.mget("emoji"),
        );

      case "comment-react-toggle": {
        const cid = trigger.mget("commentId");
        this._reactPickerFor = this._reactPickerFor === cid ? null : cid;
        this._emojiPickerFor = null;
        return this._refreshCommentList();
      }

      case "comment-react-more":
        return this._toggleCommentReactionsPicker(trigger);

      case "comment-unlink-attachment":
        return this._unlinkCommentAttachment(trigger);

      case "file-search-input":
        return this._scheduleFileSearch(trigger);

      case "link-search-result":
        return this._linkSearchResult(trigger);

      case "activity-tab":
        return this._switchActivityTab(trigger.mget("activityTab"));

      case "remove-pending-file":
        return this._removePendingFile(trigger);

      case "discard-row-file":
        // The row chips' ✕. Its staged-strip counterpart is
        // "remove-pending-file", which only knows about the drafts.
        return this._discardRowUpload(trigger);

      case "retry-pending-file":
        // Every retry that can still be rendered belongs to a comment row:
        // the staged strips never retain an error entry (failures are handed
        // to the row), and a cross-hub placeholder with no file and no nid has
        // its button suppressed because a retry could not do anything.
        return this._retryRowUpload(trigger);

      case _e.upload:
      case "pick-attachment":
        return this._pickAttachment(trigger);

      case "unlink-attachment":
        return this._unlinkAttachment(trigger);

      case "open-attachment":
        // The trigger comes along so the clicked chip / card can show that it
        // is working — opening a node is a fetch plus a kind load.
        return this._openAttachment(trigger.mget("fileNid"), trigger);

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onPartReady(child, pn) {
    if (pn === "fileselector") {
      child.el.onchange = (e) => this._onAttachmentPicked(e);
      return;
    }
    if (pn === "viewbar-tabs") {
      this._wireViewbarCarousel(child);
      return;
    }
    if (pn === "viewbar-dots") {
      this._viewbarDots = child;
      // The strip may have mounted first, in which case its listener already
      // ran against no dots. Stamp the current page now so the footer is right
      // on first paint rather than only after the first scroll.
      this._syncViewbarPage();
      return;
    }
    // Mention editors register as "<scope>-desc-editor" (create / detail /
    // comment / comment-edit / comment-reply). Init each with its scope.
    if (typeof pn === "string" && pn.endsWith("-desc-editor")) {
      this._initDescEditor(child.el, pn.slice(0, -"-desc-editor".length));
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  // Assignee combobox (create modal + detail panel): focusing the field lists
  // every member, typing filters that list. Delegated on the persistent root
  // because the Entry is rebuilt on every _render(), so a per-input listener
  // would be lost.
  _installAssigneeSearch() {
    if (this._assigneeSearchInstalled || !this.el) return;
    this._assigneeSearchInstalled = true;

    // Entry renders an inner <input name="assignee-search-{scope}">.
    const isSearchInput = (t) =>
      t && t.matches && t.matches('input[name^="assignee-search-"]');
    const scopeOf = (t) => String(t.name || "").slice("assignee-search-".length);

    this.el.addEventListener("input", (e) => {
      if (!isSearchInput(e.target)) return;
      this._filterAssignees(scopeOf(e.target), e.target.value, { open: true });
    });

    // Focus opens the dropdown — an empty query now means "every member".
    this.el.addEventListener("focusin", (e) => {
      if (!isSearchInput(e.target)) return;
      if (this._assigneeBlurTimer) {
        clearTimeout(this._assigneeBlurTimer);
        this._assigneeBlurTimer = null;
      }
      this._filterAssignees(scopeOf(e.target), e.target.value, { open: true });
    });

    // Deferred close: clicking a suggestion row blurs the input first, so
    // tearing the list down synchronously would swallow the pick.
    this.el.addEventListener("focusout", (e) => {
      if (!isSearchInput(e.target)) return;
      const scope = scopeOf(e.target);
      if (this._assigneeBlurTimer) clearTimeout(this._assigneeBlurTimer);
      this._assigneeBlurTimer = setTimeout(() => {
        this._assigneeBlurTimer = null;
        const active =
          typeof document !== "undefined" ? document.activeElement : null;
        // A pick refocuses the field (multi-assign) — keep the list open then.
        if (isSearchInput(active)) return;
        this._closeAssigneeList(scope);
      }, 200);
    });
  }

  // The suggestions box of one scope. Resolved by the part name the framework
  // stamps on the element (registerPart writes data-partname), NOT by class
  // inside the owning card: the detail panel now mounts TWO pickers (assignee +
  // reporter) that render the same classes, so a class lookup would always
  // return the assignee one and the reporter dropdown would never open.
  _assigneeListEl(scope) {
    return (
      (this.el &&
        this.el.querySelector(
          `[data-partname="${scope}-assignee-suggestions"]`,
        )) ||
      null
    );
  }

  _closeAssigneeList(scope) {
    this._withPart(`${scope}-assignee-suggestions`)
      .then((part) => {
        if (!part || part.isDestroyed?.()) return;
        part.feed([]);
        if (part.el) part.el.dataset.open = "0";
      })
      .catch(() => {
        /* not mounted yet */
      });
  }

  // Caret click: same list as focus, but also usable to dismiss it.
  _toggleAssigneeList(scope) {
    const list = this._assigneeListEl(scope);
    const open = !!(list && list.dataset.open === "1");
    if (this._assigneeBlurTimer) {
      clearTimeout(this._assigneeBlurTimer);
      this._assigneeBlurTimer = null;
    }
    const input = this._assigneeSearchInput(scope);
    if (open) {
      if (input) input.blur();
      return this._closeAssigneeList(scope);
    }
    // focus() fires focusin, which opens the list; feed it directly too so a
    // detached/unfocusable input still gets a dropdown.
    if (input) input.focus();
    return this._filterAssignees(scope, input ? input.value : "", {
      open: true,
    });
  }

  /**
   * Which onUiEvent service a people-picker scope dispatches.
   *
   * Public (the skeleton calls it as ui.pickerService) so the picker markup and
   * the panel's surgical re-feeds can never disagree about it — adding a picker
   * means adding a scope here and nowhere else.
   *
   * Scopes: "create" | "detail" (assignee, multi-select) and "create-reporter" |
   * "detail-reporter" (reporter, single-select).
   */
  pickerService(scope) {
    switch (scope) {
      case "create":
        return "create-assignee";
      case "create-reporter":
        return "create-reporter";
      case "detail-reporter":
        return "set-reporter";
      default:
        return "set-assignee";
    }
  }

  // Back-compat alias — same mapping, kept because the surgical helpers below
  // read better as "the service for this scope".
  _assigneeScopeService(scope) {
    return this.pickerService(scope);
  }

  // Is this scope single-select (a reporter) rather than a set (assignees)?
  _isSinglePicker(scope) {
    return /-reporter$/.test(String(scope || ""));
  }

  // Which draft a picker scope edits.
  _pickerDraft(scope) {
    return /^create/.test(String(scope || ""))
      ? this._createDefaults
      : this._detailDraft;
  }

  // What is currently selected in a scope — the suggestion list filters these
  // out, so a single-select picker hides only the person already chosen.
  _assigneeSelection(scope) {
    const draft = this._pickerDraft(scope);
    if (!draft) return [];
    if (this._isSinglePicker(scope)) {
      return draft.reporter_uid ? [draft.reporter_uid] : [];
    }
    return draft.assignees || [];
  }

  _assigneeSearchInput(scope) {
    return (
      this.el &&
      this.el.querySelector(`input[name="assignee-search-${scope}"]`)
    );
  }

  // Feed the suggestion dropdown for one scope; an empty result set closes it.
  // `opt.open` forces the dropdown open (focus / typing / caret); omitted, the
  // current open state is preserved — a chip removal must re-feed the rows
  // without popping a list the user had closed.
  _filterAssignees(scope, query, opt = {}) {
    const rows = require("./skeleton").buildAssigneeSuggestions(
      this,
      query,
      this._assigneeSelection(scope),
      this._assigneeScopeService(scope),
    );
    const list = this._assigneeListEl(scope);
    const open =
      opt.open != null ? !!opt.open : !!(list && list.dataset.open === "1");
    this._withPart(`${scope}-assignee-suggestions`)
      .then((part) => {
        if (!part || part.isDestroyed?.()) return;
        part.feed(rows);
        // A press on a row must not blur the search field, or the 200 ms
        // focusout teardown below fires mid-click and the pick is lost.
        keepListThroughClick(part.el, `.${this.fig.family}__assignee-option`);
        if (part.el) part.el.dataset.open = open && rows.length ? "1" : "0";
      })
      .catch(() => {
        /* not mounted yet */
      });
  }

  // Delegated focusin/focusout on the persistent root: the search input is
  // rebuilt on every _render(), so per-input listeners would race the focus
  // restoration. The 200ms blur deferral lets a click on a result row fire
  // before the dropdown is hidden.
  /**
   * Due-date chip on the child-item creator card.
   *
   * The chip carries a native <input type="date"> laid invisibly over it, so
   * clicking it opens the platform picker. Delegated on the persistent panel
   * root, like the assignee and file-search fields: the card is rebuilt on
   * every re-feed of the block, so a per-node listener would not survive.
   */
  _installSubtaskDateWatch() {
    if (this._subtaskDateInstalled || !this.el) return;
    this._subtaskDateInstalled = true;
    this.el.addEventListener("change", (e) => {
      const t = e.target;
      if (!t || !t.matches || !t.matches(`.${this.fig.family}__subtask-date-input`)) {
        return;
      }
      if (!this._subtaskDraft) return;
      // "" when the user clears the field — a child with no due date is valid.
      this._subtaskDraft.due_date = t.value || "";
      this._refreshSubtaskSection();
    });
  }

  _installFileSearchFocus() {
    if (this._fileSearchFocusInstalled || !this.el) return;
    this._fileSearchFocusInstalled = true;

    const isSearchInput = (t) =>
      t && t.matches && t.matches('input[name^="file-search-"]');
    const fieldOf = (t) => t.closest(".tasks-panel__file-search-field");
    const scopeOf = (input) =>
      String(input.name || "").slice("file-search-".length);

    this.el.addEventListener("focusin", (e) => {
      if (!isSearchInput(e.target)) return;
      const field = fieldOf(e.target);
      if (!field) return;
      if (this._fileSearchBlurTimer) {
        clearTimeout(this._fileSearchBlurTimer);
        this._fileSearchBlurTimer = null;
      }
      field.dataset.searchFocused = "1";

      // Focusing the empty input lists all linkable files. Skip if we already
      // hold the all-files results for this scope (e.g. blur then re-focus).
      const query = String(e.target.value || "").trim();
      if (query) return;
      const scope = scopeOf(e.target);
      const fs = this._fileSearch;
      if (fs.scope === scope && fs.query === "" && fs.results.length) return;
      fs.query = "";
      fs.scope = scope;
      fs.page = 1;
      fs.hasMore = false;
      this._runFileSearch("", scope);
    });

    // Infinite scroll: `scroll` doesn't bubble, so capture it. Loads the next
    // page when the results list nears its bottom.
    this.el.addEventListener(
      "scroll",
      (e) => {
        const list = e.target;
        if (
          !list ||
          !list.classList ||
          !list.classList.contains("tasks-panel__file-search-results")
        ) {
          return;
        }
        const fs = this._fileSearch;
        if (fs.loading || !fs.hasMore) return;
        const nearBottom =
          list.scrollTop + list.clientHeight >= list.scrollHeight - 48;
        if (!nearBottom) return;
        this._runFileSearch(fs.query, fs.scope, { append: true });
      },
      true,
    );

    this.el.addEventListener("focusout", (e) => {
      if (!isSearchInput(e.target)) return;
      const field = fieldOf(e.target);
      if (!field) return;
      if (this._fileSearchBlurTimer) clearTimeout(this._fileSearchBlurTimer);
      this._fileSearchBlurTimer = setTimeout(() => {
        this._fileSearchBlurTimer = null;
        const active =
          typeof document !== "undefined" ? document.activeElement : null;
        if (isSearchInput(active)) return;
        if (field.isConnected) field.dataset.searchFocused = "0";
      }, 200);
    });
  }

  onWsMessage(svc, data, options = {}) {
    // Server-side pushes built with `payload(data, { service })` reach the
    // browser as a `live.update` envelope whose FIRST arg is that envelope name
    // — the real service travels in `options.service` (router/push/index.js sets
    // `payload.service = "live.update"` when the sender left it unset). Switching
    // on the first arg alone matched nothing, so no peer's change ever refreshed
    // this panel. Read options.service first and keep the first arg as the
    // fallback for senders that do label the frame themselves.
    const service = (options && options.service) || svc;
    // A user in several workspaces hears every workspace's pushes on the same
    // socket. Task rows carry no hub_id, so this only filters the payloads that
    // do name one (e.g. the workspace-wide unassign announcement) — it can't
    // silence a legitimate task event.
    if (data && data.hub_id && `${data.hub_id}` !== `${this._hubId}`) {
      if (super.onWsMessage) super.onWsMessage(svc, data, options);
      return;
    }
    switch (service) {
      case SERVICE.task.update_assignee:
        // Assignees changed — the workspace member list may have changed with
        // them (hub.delete_contributor unassigns the member it removes and
        // announces it on this service), so re-read it too or the pickers keep
        // offering somebody who is no longer here.
        Promise.all([
          this._loadTasks(),
          this._loadActivity(),
          this._loadMembers(),
        ]).then(() => {
          this._render();
          this._refreshOpenTaskHistory();
        });
        return;
      case SERVICE.task.delete:
        // Warn BEFORE the reload: once _loadTasks lands, the row this user is
        // editing is gone and there is nothing left to match the id against.
        this._onPeerTaskDeleted(data, options);
        Promise.all([this._loadTasks(), this._loadActivity()]).then(() =>
          this._render(),
        );
        return;
      case SERVICE.task.create:
      case SERVICE.task.update:
      case SERVICE.task.update_status:
      case SERVICE.task.link_label:
      case SERVICE.task.unlink_label:
        Promise.all([this._loadTasks(), this._loadActivity()]).then(() => {
          this._render();
          this._refreshOpenTaskHistory();
        });
        return;
      case SERVICE.task.link_file:
      case SERVICE.task.unlink_file:
        if (this._detailId) {
          this._refreshAttachments(this._detailId).then(() => {
            this._render();
            this._refreshOpenTaskHistory();
          });
        } else if (this.getView() === "summary") {
          // Health view's activity feed surfaces file links even with no detail open.
          this._loadActivity().then(() => this._render());
        }
        return;
      case SERVICE.task.column_create:
      case SERVICE.task.column_update:
        Promise.all([this._loadColumns(), this._loadTasks()]).then(() =>
          this._render(),
        );
        return;
      case SERVICE.task.column_delete:
        // A peer deleted a board. Its tasks are re-homed server-side, so reload
        // both lists first — the notice below needs the surviving columns to
        // tell the user where their open task went.
        Promise.all([this._loadColumns(), this._loadTasks()]).then(() => {
          this._onPeerColumnDeleted(data, options);
          this._render();
        });
        return;
      case SERVICE.task.comment_create:
      case SERVICE.task.comment_update:
      case SERVICE.task.comment_delete:
      case SERVICE.task.comment_react:
        // A peer changed a comment. Surgically refresh the open task's feed so
        // an in-progress composer/edit isn't disturbed.
        if (this._detailId) {
          this._loadComments(this._detailId).then(() => {
            if (this._detailId) this._refreshCommentList();
          });
        }
        // Comments also appear in the Health view's activity feed.
        if (this.getView() === "summary") {
          this._loadActivity().then(() => this._render());
        }
        return;
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  // Display name of the peer whose change arrived on the socket. Every
  // broadcast carries its sender (server-essentials `payload()` → options.sender);
  // an unnamed sender falls back to the impersonal wording rather than printing
  // a raw uid.
  _wsActorName(options) {
    const s = options && options.sender;
    if (!s) return "";
    return this._plainText(
      String(s.fullname || "").trim() ||
        [s.firstname, s.lastname].filter(Boolean).join(" ").trim(),
    );
  }

  // window_info renders its message through innerHTML (that is what lets the
  // locale strings carry <b>), so anything user-supplied spliced into one — a
  // display name, a board title — must not be able to open a tag.
  _plainText(s) {
    return String(s == null ? "" : s).replace(/[<>]/g, "");
  }

  // Branded self-dismissing notice. Reuses the window_info "notice" card every
  // other confirmation in the product uses, so colours, type and alignment come
  // from one place instead of a bespoke popup. Closes itself after
  // PEER_NOTICE_MS, or immediately on OK.
  _notifyPeerChange(message) {
    if (!message) return;
    if (typeof Wm === "undefined" || !Wm.info || typeof Kind === "undefined") {
      return;
    }
    const show = () =>
      Wm.info({
        message,
        variant: "notice",
        dismiss_after: PEER_NOTICE_MS,
        actions: [{ label: LOCALE.OK, priority: "primary", service: _e.close }],
      });
    // Wm.info appends straight into the windows pool without waiting for the
    // kind to load — unlike Wm.alert, which does wait. Nothing here guarantees
    // window_info has been imported yet (this panel can be the first thing to
    // ask for it in a session), and appending an unregistered kind renders the
    // "snippet not found" fallback instead of the notice. Wait like Wm.alert.
    Kind.waitFor("window_info").then(show).catch(show);
  }

  // Tear the detail down without the click path's re-render — callers that
  // close it in reaction to a peer's change are already re-rendering.
  _closeDetailSilently() {
    this._detailId = null;
    this._detailDraft = null;
    // A silent close is a real close (peer delete, task switch, commit) — the
    // breadcrumb must not survive it and re-open a panel the user just left.
    this._detailReturnTo = null;
    this._pickerOpen = null;
    this._comments = [];
    this._discardCommentPending(this._commentDraft);
    this._commentDraft = null;
    this._discardCommentPending(this._commentEditDraft);
    this._editingCommentId = null;
    this._commentEditDraft = null;
    this._discardCommentPending(this._replyDraft);
    this._replyingTo = null;
    this._replyDraft = null;
    this._reactPickerFor = null;
    this._setDragAffordance(null);
    this._closeCommentReactionsPicker();
    this._resetFileSearch();
    this._dismissOverlayNow("detail-backdrop");
  }

  // A peer deleted the task this user has open. Their edits can no longer be
  // saved — Update would post against a row that no longer exists — so close the
  // form and say who removed it. Previously the panel just reloaded underneath:
  // the user kept typing and their task silently disappeared on save.
  _onPeerTaskDeleted(data, options) {
    const id = data && (data.id || data.task_id);
    if (!id) return;
    // Match the cascaded subtasks too, not just the deleted task: removing a
    // parent now takes its children with it server-side, so a user with one of
    // those children open would otherwise watch the panel silently vanish on
    // the next reload (getDetailTask goes null and the panel renders as []),
    // with no word of who removed it.
    const removed = [id, ...((data && data.subtask_ids) || [])].map(String);
    if (!this._detailId || !removed.includes(String(this._detailId))) return;
    this._closeDetailSilently();
    const who = this._wsActorName(options);
    this._notifyPeerChange(
      who ? LOCALE.TASK_REMOVED_BY.format(who) : LOCALE.TASK_REMOVED,
    );
  }

  // A peer deleted a board (Kanban column) while this user was editing a task
  // that lived on it. The server re-homes those tasks onto a surviving column,
  // so the work is NOT lost — but the open draft still carries the dead column
  // as its status, and saving would post a column that no longer exists. Repoint
  // the draft, then say what happened. Only when no column survives is the task
  // genuinely unreachable, and then this behaves like a delete.
  _onPeerColumnDeleted(data, options) {
    const key = data && data.id;
    if (!key) return;
    const drafts = [];
    if (this._detailId && this._detailDraft) drafts.push(this._detailDraft);
    if (this._creating && this._createDefaults)
      drafts.push(this._createDefaults);
    const affected = drafts.filter((d) => String(d.status) === String(key));
    if (!affected.length) return;

    const who = this._wsActorName(options);
    const cols = this.getColumns() || [];
    // Where the task ACTUALLY ended up. This runs after _loadTasks(), so the
    // reloaded row already carries the server's decision — read it rather than
    // re-deriving one, or Update would post a status change the user never made.
    // moved_to and "first surviving column" are only fallbacks (the create
    // modal has no row to read, and an old server sends no moved_to).
    const moved = this._detailId
      ? (this._tasks.find((t) => String(t.id) === String(this._detailId)) || {})
          .status
      : null;
    const target =
      cols.find((c) => String(c.key) === String(moved)) ||
      cols.find((c) => String(c.key) === String(data.moved_to)) ||
      cols[0];
    if (!target) {
      this._closeDetailSilently();
      this._notifyPeerChange(
        who ? LOCALE.TASK_BOARD_REMOVED_BY.format(who) : LOCALE.TASK_BOARD_REMOVED,
      );
      return;
    }
    affected.forEach((d) => {
      d.status = target.key;
    });
    const where = this._plainText(target.name || target.key);
    this._notifyPeerChange(
      who
        ? LOCALE.TASK_BOARD_MOVED_BY.format(who, where)
        : LOCALE.TASK_BOARD_MOVED.format(where),
    );
  }

  async _loadTasks() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.list,
        hub_id: this._hubId,
        nid: this._scopeNid,
        include_unscoped: this._scopeIsRoot,
      });
      // fetchService never rejects (doRequest swallows every failure via
      // onServerComplain and resolves undefined / the raw error payload), so
      // a non-array IS the error path. Don't blank an already-loaded board
      // over a transient failure — keep the previous rows and flag the load
      // so the next tab visit retries instead of latching empty.
      if (Array.isArray(rows)) {
        this._tasks = rows.map(this._normalizeTask);
        this._loadFailed = 0;
      } else {
        this._loadFailed = 1;
        if (!Array.isArray(this._tasks)) this._tasks = [];
      }
    } catch (err) {
      this._loadFailed = 1;
      if (!Array.isArray(this._tasks)) this._tasks = [];
    }
  }

  // Custom Kanban columns for the current folder scope. Best-effort — a
  // failure (e.g. server without the task_column procs yet) just leaves the
  // four built-in columns.
  async _loadColumns() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.column_list,
        hub_id: this._hubId,
        nid: this._scopeNid,
      });
      this._customColumns = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._customColumns = [];
    }
  }

  // Load which columns the user has the bell on for, in this folder scope.
  async _loadColumnWatches() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.column_watch_list,
        hub_id: this._hubId,
        nid: this._scopeNid,
      });
      this._columnWatches = new Set((Array.isArray(rows) ? rows : []).map(String));
    } catch (err) {
      this._columnWatches = new Set();
    }
  }

  isColumnWatched(key) {
    return this._columnWatches.has(String(key));
  }

  // Bell toggle in a column header — subscribe/unsubscribe to change-notifications
  // for that column. Flips the bell in place (no re-render) then persists.
  async _toggleColumnWatch(trigger) {
    const key = trigger && trigger.mget("taskColumn");
    if (!key) return;
    const k = String(key);
    const on = !this._columnWatches.has(k);
    if (on) this._columnWatches.add(k);
    else this._columnWatches.delete(k);
    if (trigger.el) trigger.el.dataset.active = on ? "1" : "0";
    try {
      await this.postService({
        service: on
          ? SERVICE.task.column_watch_set
          : SERVICE.task.column_watch_unset,
        hub_id: this._hubId,
        nid: this._scopeNid,
        column_key: k,
      });
    } catch (err) {
      // Revert the optimistic flip on failure.
      if (on) this._columnWatches.delete(k);
      else this._columnWatches.add(k);
      if (trigger.el) trigger.el.dataset.active = on ? "0" : "1";
    }
  }

  // Recent activity for the current folder scope (Project Health feed). Mirrors
  // _loadTasks' scoping. Best-effort — a failure just yields an empty feed.
  async _loadActivity() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.activity,
        hub_id: this._hubId,
        nid: this._scopeNid,
        include_unscoped: this._scopeIsRoot,
        limit: 30,
      });
      this._activity = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._activity = [];
    }
  }

  // Only normalize fields actually present on `row` — partial responses
  // (task.update / update_status / update_assignee) omit linked_files;
  // defaulting to [] would blank the cached files when _mergeTask spreads.
  _normalizeTask(row) {
    const result = { ...row };
    const has = (k) => Object.prototype.hasOwnProperty.call(row, k);

    if (has("label_ids")) {
      result.label_ids =
        typeof row.label_ids === "string" && row.label_ids
          ? row.label_ids.split(",").filter(Boolean)
          : Array.isArray(row.label_ids)
            ? row.label_ids
            : [];
    }

    // Multi-assignee: server returns a comma-separated string of uids.
    if (has("assignee_uids")) {
      result.assignee_uids =
        typeof row.assignee_uids === "string" && row.assignee_uids
          ? row.assignee_uids.split(",").filter(Boolean)
          : Array.isArray(row.assignee_uids)
            ? row.assignee_uids
            : [];
    } else if (has("assignee_uid")) {
      // Legacy single-assignee row (e.g. older broadcast payloads).
      result.assignee_uids = row.assignee_uid ? [row.assignee_uid] : [];
    }

    if (has("linked_files")) {
      let files = row.linked_files;
      if (typeof files === "string") {
        try {
          files = JSON.parse(files);
        } catch (_) {
          files = [];
        }
      }
      result.linked_files = Array.isArray(files) ? files : [];
    }

    // Subtask link. The server sends null for a top-level task, but a legacy
    // row or a partial broadcast payload can carry "" — normalise both to null
    // so isSubtask() and the parent_task_id === id lookups stay strict.
    if (has("parent_task_id")) {
      result.parent_task_id = row.parent_task_id || null;
    }
    // Server-computed rollup counters (see task_list). Kept numeric so the
    // badge never renders "0/undefined".
    if (has("subtask_total")) result.subtask_total = Number(row.subtask_total) || 0;
    if (has("subtask_done")) result.subtask_done = Number(row.subtask_done) || 0;

    // Coerce due_date to YYYY-MM-DD so <input type="date"> renders it cleanly.
    if (has("due_date")) {
      let due = row.due_date;
      if (due) {
        if (due instanceof Date) due = due.toISOString().slice(0, 10);
        else if (typeof due === "string" && due.length >= 10)
          due = due.slice(0, 10);
      } else {
        due = null;
      }
      result.due_date = due;
    }

    // Same coercion for the optional range start (Duration toggle).
    if (has("start_date")) {
      let start = row.start_date;
      if (start) {
        if (start instanceof Date) start = start.toISOString().slice(0, 10);
        else if (typeof start === "string" && start.length >= 10)
          start = start.slice(0, 10);
      } else {
        start = null;
      }
      result.start_date = start;
    }

    return result;
  }

  async _loadMembers() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.hub.get_members_by_type,
        hub_id: this._hubId,
        type: "all",
      });
      // Never trade a good roster for a bad answer. This runs again mid-session
      // (a peer's assignee change re-reads it), and a transient failure used to
      // blank the list — which would now also strip every assignee off the
      // board, since getKnownAssignees resolves against it. A live workspace
      // always has at least the viewer in it, so an empty answer is either the
      // first load or a failure; in both cases keeping what we had is correct.
      if (Array.isArray(rows) && rows.length) {
        this._members = rows;
        this._membersLoaded = true;
      } else if (!this._membersLoaded) {
        this._members = Array.isArray(rows) ? rows : [];
      }
    } catch (err) {
      if (!this._membersLoaded) this._members = [];
    }
  }

  async _loadLabels() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.label.list,
        hub_id: this._hubId,
      });
      this._labels = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._labels = [];
    }
  }

  async _refreshAttachments(taskId) {
    try {
      const files = await this.fetchService({
        service: SERVICE.task.get_linked_files,
        hub_id: this._hubId,
        task_id: taskId,
      });
      const list = Array.isArray(files) ? files : [];
      // Linked files live in this hub (cross-hub files are copied in on attach),
      // so the preview is built from file_nid + this hub — no get_node_attr.
      this._attachments[taskId] = list.map((f) => {
        const { previewUrl, chartId } = this._attachmentPreview(f);
        return { ...f, previewUrl, iconChartId: chartId };
      });
    } catch (err) {
      this._attachments[taskId] = [];
    }
  }

  // Shared preview for dragged + committed files: mirrors media imgCapable()
  // (poster-aware) and builds the grid's thumbnail URL (file/<fmt>/<nid>/<hub>).
  _attachmentPreview(attr) {
    const ext = String(attr.ext || attr.extension || "").toLowerCase();
    const filetype = attr.filetype || attr.category || "";
    const mimetype = attr.mimetype || "";
    const cap = attr.capability || "";
    const nid = attr.nid || attr.file_nid;
    const hub = attr.hub_id || this._hubId;
    let meta = attr.metadata;
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch (_) {
        meta = null;
      }
    }

    let imgCapable;
    if (meta && meta.poster) imgCapable = true;
    else if (/^-/.test(cap)) imgCapable = false;
    else if (ext === "svg" || ext === "pdf") imgCapable = true;
    else if (/text/.test(mimetype)) imgCapable = false;
    else if (/shell|script|text/.test(filetype)) imgCapable = false;
    else if (/^r/.test(cap)) imgCapable = true;
    else
      imgCapable =
        /^(png|jpe?g|gif|webp|bmp|avif|heic)$/.test(ext) ||
        filetype === _a.image ||
        filetype === _a.video;

    let previewUrl = null;
    if (imgCapable && nid != null && hub != null) {
      const b = (typeof bootstrap === "function" && bootstrap()) || {};
      const endpoint = b.endpoint || "";
      const fmt =
        filetype === _a.vector || ext === "svg"
          ? "orig"
          : ext === "pdf"
            ? "thumb"
            : "vignette";
      let url = `${endpoint}file/${fmt}/${nid}/${hub}`;
      if (b.keysel && attr.area !== "public") url += `?keysel=${b.keysel}`;
      const changed = Math.abs((Number(attr.mtime) || 0) - (Number(attr.ctime) || 0));
      const kc = attr.md5Hash || changed || 0;
      if (kc) url += (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + kc;
      previewUrl = url;
    }

    let chartId = "attachment";
    try {
      const r = require("media/template/icon-name")({
        filetype,
        ext,
        mimetype,
        area: attr.area,
        dataType: attr.dataType,
      });
      if (r && r.chartId) chartId = r.chartId;
    } catch (_) {}
    return { previewUrl, chartId };
  }

  // Read text-field values straight from the live DOM. The Entry widget only
  // syncs on blur/commit/keyup; <input type="date"> change events are missed.
  _captureCreateDraft() {
    if (!this._createDefaults) return;
    const root = this.el && this.el.querySelector(".tasks-panel__create-modal");
    if (!root) return;
    const draft = this._createDefaults;
    const title = root.querySelector('[name="title"]');
    const due = root.querySelector('input[name="due_date"]');
    const start = root.querySelector('input[name="start_date"]');
    if (title) draft.title = title.value || "";
    if (due) draft.due_date = due.value || "";
    if (start) draft.start_date = start.value || "";
    // description syncs live from the contenteditable editor (_onDescInput).
  }

  _captureDetailDraft() {
    if (!this._detailDraft) return;
    const root = this.el && this.el.querySelector(".tasks-panel__detail-panel");
    if (!root) return;
    const draft = this._detailDraft;
    const title = root.querySelector('[name="title"]');
    const due = root.querySelector('input[name="due_date"]');
    const start = root.querySelector('input[name="start_date"]');
    if (title) draft.title = title.value || "";
    if (due) draft.due_date = due.value || "";
    if (start) draft.start_date = start.value || "";
    // description syncs live from the contenteditable editor (_onDescInput).
  }

  // Format a Date (or date-like value) to a local ISO "YYYY-MM-DD" string.
  // Empty string for null/invalid so callers can treat it like a cleared field.
  _isoDate(d) {
    if (!d) return "";
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
  }

  // Push every keystroke straight into the active draft. The Entry widget
  // sets _input.value asynchronously (~200ms), so a pre-feed DOM read after
  // a re-render would blank typed text before the value is rebound.
  // For widget-driven inputs (e.g. the datepicker) the firing element is not
  // focused, so fall back to reading name/value from the trigger model.
  _onTaskInputChanged(args, trigger) {
    let value = args && args.value != null ? String(args.value) : null;
    let name = null;
    let scopeEl = null;
    const active =
      typeof document !== "undefined" ? document.activeElement : null;
    // Require a `name` on the focused element — flatpickr's altInput is
    // nameless, so date pickers must resolve their name from the trigger model.
    if (
      active &&
      active.getAttribute &&
      active.getAttribute("name") &&
      this.el &&
      this.el.contains(active)
    ) {
      name = active.getAttribute("name");
      scopeEl = active;
    }
    if (!name && trigger && trigger.mget) {
      name = trigger.mget(_a.name) || trigger.mget("name");
      if (value == null) {
        const v = trigger.mget(_a.value);
        value = v != null ? String(v) : "";
      }
      scopeEl = trigger.el;
    }
    if (!name || !scopeEl) return;

    // Range picker (Duration ON): the widget carries both endpoints as Date
    // objects. Store them as ISO start_date/due_date on whichever draft owns
    // the field (create modal or detail panel).
    if (name === "due_range") {
      if (!trigger || !trigger.mget) return;
      const inCreate = this.el.querySelector(".tasks-panel__create-modal");
      const inDetail = this.el.querySelector(".tasks-panel__detail-panel");
      let draft = null;
      if (this._creating && inCreate && scopeEl && inCreate.contains(scopeEl)) {
        draft = this._createDefaults;
      } else if (
        this._detailDraft &&
        inDetail &&
        scopeEl &&
        inDetail.contains(scopeEl)
      ) {
        draft = this._detailDraft;
      }
      if (!draft) return;
      const start = this._isoDate(trigger.mget("startDate"));
      const end = this._isoDate(trigger.mget("endDate"));
      draft.start_date = start;
      draft.due_date = end || start;
      // Live-refresh the duration readout without a re-feed that would close /
      // rebuild the calendar mid-interaction.
      const summary = require("./skeleton").dueSummaryText(
        draft.start_date,
        draft.due_date,
      );
      const scopeSel =
        draft === this._createDefaults
          ? ".tasks-panel__create-modal"
          : ".tasks-panel__detail-panel";
      const root = this.el.querySelector(scopeSel);
      if (root) {
        const sumEl = root.querySelector(".tasks-panel__due-summary");
        if (sumEl) sumEl.textContent = summary;
      }
      return;
    }

    if (value == null) value = "";

    // The inline subtask creator keeps its own draft, so it needs its own
    // branch: the generic tail below would write subtask-title onto
    // _detailDraft (the open PARENT task) and the creator would still lose the
    // text on the next re-render. Any peer WS event triggers _render(), so
    // without this a colleague's edit wipes whatever is half-typed here.
    if (name === "subtask-title") {
      if (this._subtaskDraft) this._subtaskDraft.title = value;
      return;
    }

    const inCreate = this.el.querySelector(".tasks-panel__create-modal");
    const inDetail = this.el.querySelector(".tasks-panel__detail-panel");
    if (
      this._creating &&
      inCreate &&
      inCreate.contains(scopeEl) &&
      this._createDefaults
    ) {
      this._createDefaults[name] = value;
    } else if (this._detailDraft && inDetail && inDetail.contains(scopeEl)) {
      this._detailDraft[name] = value;
    }
  }

  async _commitTask() {
    this._captureCreateDraft();
    const draft = this._createDefaults || {};
    const title = String(draft.title || "").trim();
    const dueRaw = String(draft.due_date || "").trim();
    // start_date only when the Duration toggle is on; OFF sends null (single-date).
    const startRaw = draft.duration_on ? String(draft.start_date || "").trim() : "";
    // Already in marker form (chips serialize to "[@Name](user:uid)").
    const description = String(draft.description || "").trim();

    if (!title) return this._render();

    this._setSubmitting(".tasks-panel__create-submit", true);

    const labels = Array.isArray(draft.labels) ? draft.labels.slice() : [];
    const pendingFiles = Array.isArray(draft.pending_files)
      ? draft.pending_files.slice()
      : [];

    try {
      const raw = await this.postService({
        service: SERVICE.task.create,
        hub_id: this._hubId,
        nid: this._scopeNid,
        title,
        description: description || null,
        status: draft.status || this.getDefaultStatus(),
        priority: draft.priority || "medium",
        // Omitted server-side = the creator, which is also this draft's default.
        reporter_uid: draft.reporter_uid || null,
        due_date: dueRaw || null,
        start_date: startRaw || null,
        assignee_uids: Array.isArray(draft.assignees) ? draft.assignees : [],
        // Tagged members — server notifies them (excluding self).
        mention_uids: Array.isArray(draft.mention_uids)
          ? draft.mention_uids
          : [],
      });
      const row = Array.isArray(raw) ? raw[0] : raw;
      if (row && row.id) {
        // For each pending entry: search-picked files already have `nid`;
        // newly-picked uploads carry a File object and need to be sent to the
        // folder body now. Either way, the resolved nid is link_file'd to
        // the new task.
        const linkPending = async (pf) => {
          let nid = pf.nid;
          if (!nid && pf.file) {
            try {
              const result = await this._uploadPendingFile(pf, pendingFiles);
              nid = result.nid;
            } catch (err) {
              console.error("[tasks_panel] pending file upload failed:", err);
              return;
            }
          }
          if (!nid) return;
          await this.postService({
            service: SERVICE.task.link_file,
            hub_id: this._hubId,
            task_id: row.id,
            file_nid: nid,
          }).catch(() => null);
        };
        await Promise.all([
          ...labels.map((labelId) =>
            this.postService({
              service: SERVICE.task.link_label,
              hub_id: this._hubId,
              task_id: row.id,
              label_id: labelId,
            }).catch(() => null),
          ),
          ...pendingFiles.map(linkPending),
        ]);
        // Tear down the form only after a successful create — postService
        // resolves undefined (or an error payload with no id) on failure, so
        // the teardown must live INSIDE this success branch or a failed
        // create silently closes the modal and discards the user's draft.
        this._creating = false;
        this._createDefaults = null;
        this._pickerOpen = null;
        this._resetFileSearch();
        await this._loadTasks();
      } else {
        Wm.alert(LOCALE.ERROR_NETWORK);
      }
    } catch (err) {
      console.error("[tasks_panel] task.create failed:", err);
      Wm.alert(LOCALE.ERROR_NETWORK);
    } finally {
      // finally, not a trailing statement: a throw inside the catch above
      // (Wm.alert) would otherwise skip the reset and leave _submitting stuck
      // true, which permanently disables commit-task / commit-detail.
      this._setSubmitting(".tasks-panel__create-submit", false);
    }
    this._render();
  }

  async _removeTask(trigger) {
    const id = trigger.mget("taskId");
    if (!id) return;
    // Captured BEFORE the row is pruned: deleting a child changes the parent's
    // done/total, and the badge is rebuilt from the local rows.
    const doomed = this._tasks.find((t) => t.id === id);
    const parentOfDoomed = (doomed && doomed.parent_task_id) || null;
    try {
      const resp = await this.postService({
        service: SERVICE.task.delete,
        hub_id: this._hubId,
        id,
      });
      if (!resp || (resp.affected !== 1 && resp.id !== id)) {
        // postService resolves falsy/error-payload on failure (it never
        // rejects) — surface it instead of silently ignoring the delete.
        // NOTE `affected` now counts the task PLUS any cascaded subtasks, so it
        // is legitimately > 1; the `resp.id !== id` arm is what carries the
        // check for a parent with children.
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
      // Deleting a parent cascades to its subtasks server-side, so drop them
      // locally too — otherwise the children linger as orphans until the next
      // list reload, counted by Project Health and reachable from nowhere.
      const gone = new Set([id, ...(resp.subtask_ids || [])]);
      this._tasks = this._tasks.filter((t) => !gone.has(t.id));
      this._subtasksOpen.delete(id);
      // Deleting a child moves the parent's counter. Without this the parent
      // kept the server's pre-delete numbers and its badge read "0/1" against
      // an empty child list until the next full reload.
      if (parentOfDoomed) this._syncSubtaskBadges(parentOfDoomed);
      if (gone.has(this._detailId)) {
        this._detailId = null;
        this._detailDraft = null;
        this._subtaskDraft = null;
        // The panel it would return to may be one of the rows just pruned.
        this._detailReturnTo = null;
      }
    } catch (err) {
      console.error("[tasks_panel] task.delete failed:", err);
    }
    // Deleting a child from the OPEN parent's panel (the child row's ✕) refreshes
    // only the board behind the modal and the child list. A full _render() here
    // rebuilds the whole panel and, as feed() notes, drops it back to scroll 0 —
    // so removing one child from a long task threw the reader to the top. The
    // other callers (board card, gantt row, calendar chip) have no detail open
    // and keep the full rebuild.
    if (this._detailId && parentOfDoomed === this._detailId) {
      this._refreshViewBody();
      return this._refreshSubtaskSection();
    }
    this._render();
  }

  // List-view checkbox — toggle a task between a done and a not-done column.
  // Completion is column-driven (is_done), not the literal "complete" key, so
  // pick the target from the actual columns: checking moves to the first done
  // column, unchecking to the first not-done column. Optimistic: flip locally +
  // re-render, persist via update_status, reconcile/revert on the response.
  async _toggleComplete(trigger) {
    const id = trigger.mget("taskId");
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;
    const originalStatus = task.status;
    const cols = this.getColumns();
    const target = this.isDoneStatus(originalStatus)
      ? cols.find((c) => !c.is_done)
      : cols.find((c) => c.is_done);
    // No valid destination (e.g. no done column exists on this board) — nothing
    // sensible to toggle to.
    if (!target || target.key === originalStatus) return;
    const next = target.key;
    task.status = next;
    this._render();
    try {
      const updated = await this.postService({
        service: SERVICE.task.update_status,
        hub_id: this._hubId,
        id,
        status: next,
      });
      const row = Array.isArray(updated) ? updated[0] : updated;
      if (row && row.id) {
        this._mergeTask(row);
        // Parent auto-complete rides back on the same response when this was
        // the last outstanding subtask. Peers hear it on the broadcast; the
        // user who ticked the box only ever sees this payload.
        if (row.parent) {
          this._mergeTask(row.parent);
          this._syncSubtaskBadges(row.parent.id);
          this._render();
        }
      } else {
        // Failed silently (postService never rejects): revert the
        // optimistic flip instead of leaving unsaved state on screen.
        task.status = originalStatus;
        this._render();
      }
    } catch (err) {
      console.error("[tasks_panel] toggle-complete failed:", err);
      task.status = originalStatus;
      this._render();
    }
  }

  async _commitDetail() {
    if (!this._detailId || !this._detailDraft) return;
    this._captureDetailDraft();
    const id = this._detailId;
    const draft = this._detailDraft;
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;

    this._setSubmitting(".tasks-panel__detail-submit", true);

    const calls = [];

    // task.update — covers title, description, priority, due_date.
    const upd = {};
    const draftTitle = String(draft.title || "").trim();
    const taskTitle = String(task.title || "").trim();
    if (draftTitle && draftTitle !== taskTitle) upd.title = draftTitle;
    // Both are marker form (the editor serializes chips to markers).
    if ((draft.description || "") !== (task.description || "")) {
      upd.description = draft.description || "";
      // Notify only members tagged in this edit who weren't tagged before.
      const before = Array.isArray(draft._mentioned_before)
        ? draft._mentioned_before
        : [];
      const now = Array.isArray(draft.mention_uids) ? draft.mention_uids : [];
      upd.mention_uids = now.filter((u) => !before.includes(u));
    }
    if ((draft.priority || "medium") !== (task.priority || "medium"))
      upd.priority = draft.priority;
    // Reporter. Compared against the same created_by fallback the draft was
    // seeded with, so merely opening and saving a pre-reporter task does NOT
    // count as a reassignment (which would otherwise log a bogus 'reporter'
    // entry in the activity feed on every Update).
    const taskReporter = task.reporter_uid || task.created_by || "";
    if ((draft.reporter_uid || "") !== taskReporter && draft.reporter_uid) {
      upd.reporter_uid = draft.reporter_uid;
    }
    const draftDue = (draft.due_date || "").trim();
    const taskDue = task.due_date || "";
    const dueChanged = draftDue !== taskDue;
    // start_date only when the Duration toggle is on; OFF ("") clears it.
    const draftStart = draft.duration_on ? (draft.start_date || "").trim() : "";
    const taskStart = task.start_date || "";
    const startChanged = draftStart !== taskStart;
    if (Object.keys(upd).length || dueChanged || startChanged) {
      // task_update SP overwrites due_date / start_date unconditionally —
      // always send the current values or another-field update would null them.
      upd.due_date = draftDue || null;
      upd.start_date = draftStart || null;
      calls.push(
        this.postService({
          service: SERVICE.task.update,
          hub_id: this._hubId,
          id,
          ...upd,
        }).catch((err) =>
          console.error("[tasks_panel] task.update failed:", err),
        ),
      );
    }

    const noStatus = this.getDefaultStatus();
    if ((draft.status || noStatus) !== (task.status || noStatus)) {
      calls.push(
        this.postService({
          service: SERVICE.task.update_status,
          hub_id: this._hubId,
          id,
          status: draft.status,
        }).catch((err) =>
          console.error("[tasks_panel] task.update_status failed:", err),
        ),
      );
    }

    // Multi-assignee: send the full new set only when it differs (order-
    // independent) from the task's current assignees.
    const draftAssignees = Array.isArray(draft.assignees) ? draft.assignees : [];
    const taskAssignees = Array.isArray(task.assignee_uids)
      ? task.assignee_uids
      : task.assignee_uid
        ? [task.assignee_uid]
        : [];
    const sameAssignees =
      draftAssignees.length === taskAssignees.length &&
      [...draftAssignees].sort().join(",") === [...taskAssignees].sort().join(",");
    if (!sameAssignees) {
      calls.push(
        this.postService({
          service: SERVICE.task.update_assignee,
          hub_id: this._hubId,
          id,
          assignee_uids: draftAssignees,
        }).catch((err) =>
          console.error("[tasks_panel] task.update_assignee failed:", err),
        ),
      );
    }

    const original = new Set(task.label_ids || []);
    const next = new Set(draft.labels || []);
    for (const lid of next) {
      if (!original.has(lid)) {
        calls.push(
          this.postService({
            service: SERVICE.task.link_label,
            hub_id: this._hubId,
            task_id: id,
            label_id: lid,
          }).catch(() => null),
        );
      }
    }
    for (const lid of original) {
      if (!next.has(lid)) {
        calls.push(
          this.postService({
            service: SERVICE.task.unlink_label,
            hub_id: this._hubId,
            task_id: id,
            label_id: lid,
          }).catch(() => null),
        );
      }
    }

    // Pending attachments — same flow as _commitTask: search-picked entries
    // already have nid; uploaded entries carry the File and need to land in
    // the folder body first.
    const pendingFiles = Array.isArray(draft.pending_files)
      ? draft.pending_files.slice()
      : [];
    for (const pf of pendingFiles) {
      calls.push(
        (async () => {
          let nid = pf.nid;
          if (!nid && pf.file) {
            try {
              const result = await this._uploadPendingFile(pf, pendingFiles);
              nid = result.nid;
            } catch (err) {
              console.error("[tasks_panel] pending file upload failed:", err);
              return;
            }
          }
          if (!nid) return;
          await this.postService({
            service: SERVICE.task.link_file,
            hub_id: this._hubId,
            task_id: id,
            file_nid: nid,
          }).catch(() => null);
        })(),
      );
    }

    if (calls.length) await Promise.all(calls);

    await this._loadTasks();
    // Update on a child returns to the parent, exactly as its X does — leaving
    // Update to dump the user back on the board while Cancel walked up one
    // level would be the same "it closed everything" surprise, just on the
    // happier path. Read before the reset clears it.
    const back = this._detailReturnTo;
    this._detailId = null;
    this._detailDraft = null;
    this._detailReturnTo = null;
    this._pickerOpen = null;
    this._resetFileSearch();
    this._setSubmitting(".tasks-panel__detail-submit", false);
    if (back && this._tasks.some((t) => t.id === back)) {
      // _openDetail renders on its own.
      return this._openDetail(back);
    }
    this._render();
  }

  // Render the detail panel immediately on click; refresh attachments async
  // so the panel doesn't feel laggy waiting on get_linked_files.
  _openDetail(id) {
    if (!id) return;
    const task = this._tasks.find((t) => t.id === id);
    // Coming from the parent's panel (its child rows, or "add-child-task")?
    // Remember it so close-detail returns there. Computed BEFORE _detailId is
    // reassigned, and cleared on any other transition — a breadcrumb pointing
    // somewhere the user never was would send the X to a surprising place.
    this._detailReturnTo =
      task && task.parent_task_id && this._detailId === task.parent_task_id
        ? task.parent_task_id
        : null;
    this._detailId = id;
    // Description is stored/edited in marker form (`[@Name](user:uid)`); the
    // editor renders chips from it. Seed mention_uids from the existing markers
    // so the Update diff can tell which mentions are newly added.
    const seededMentions = task ? uidsFromText(task.description || "") : [];
    this._detailDraft = task
      ? {
          title: task.title || "",
          description: task.description || "",
          mention_uids: seededMentions.slice(),
          // Snapshot of who was already tagged, so Update only notifies new tags.
          _mentioned_before: seededMentions,
          due_date: task.due_date || "",
          start_date: task.start_date || "",
          // Toggle state is derived from the stored range start.
          duration_on: !!task.start_date,
          status: task.status || this.getDefaultStatus(),
          priority: task.priority || "medium",
          // Editable reporter. Falls back to created_by so a task from before
          // alter_task_add_reporter.sql (or a hub DB that has not been patched,
          // where the SP cannot answer with the column) still shows its creator
          // — the picker then simply re-asserts that same uid on Update.
          reporter_uid: task.reporter_uid || task.created_by || "",
          // Ex-members are dropped here too: the draft is what Update posts
          // back, so a stale uid would otherwise be re-asserted on save.
          assignees: this.getKnownAssignees(task).slice(),
          labels: Array.isArray(task.label_ids) ? task.label_ids.slice() : [],
          // Files picked but not yet uploaded/linked — _commitDetail processes
          // these (upload missing nids, then link_file) on Update.
          pending_files: [],
        }
      : null;
    // A half-typed subtask belongs to the task it was opened on — carrying it
    // across to another task would create a child under the wrong parent.
    this._subtaskDraft = null;
    // Reset comment state for the newly-opened task.
    // Row uploads deliberately SURVIVE a task switch — a terminal error must
    // still be there, with its retry, if the user comes back. But their image
    // previews are live blob URLs and nothing on screen is using them once the
    // task is gone, so release those while keeping the entry and its File;
    // retry only needs the File, and the card reappears with a dead thumbnail
    // rather than holding a blob for the rest of the session.
    for (const list of (this._rowUploads || new Map()).values()) {
      for (const f of list) {
        if (!f.previewUrl) continue;
        try {
          URL.revokeObjectURL(f.previewUrl);
        } catch (_) {}
        f.previewUrl = null;
      }
    }
    this._comments = [];
    this._discardCommentPending(this._commentDraft);
    this._commentDraft = null;
    this._editingCommentId = null;
    this._commentEditDraft = null;
    this._replyingTo = null;
    this._replyDraft = null;
    this._reactPickerFor = null;
    this._emojiPickerFor = null;
    this._activityTab = "comments";
    this._taskActivity = [];
    // Re-fetch folder filenames so collision preview (a → a(1)) reflects
    // the folder's current state.
    this._folderFilenames = null;
    this._render();
    this._refreshAttachments(id).then(() => {
      if (this._detailId !== id) return;
      // Initial fetch came back — refeed just the rows, don't touch the
      // form fields the user may have already started editing.
      this._refreshAttachmentsList();
      this._refreshFileSearchDropdown("detail");
    });
    // Surgically feed the comment list when it arrives — a full _render() here
    // rebuilds the panel and replays its open animation (visible glitch).
    this._loadComments(id).then(() => {
      if (this._detailId === id) this._refreshCommentList();
    });
    // "All" (the default tab) shows the change log below the comments, so it is
    // fetched on open rather than on first switch. Feeds its own part — the
    // comment list is untouched by this.
    this._loadTaskHistory(id).then(() => {
      if (this._detailId === id) this._refreshHistoryList();
    });
  }

  // Change-log rows for one task. task.activity is folder-scoped (there is no
  // per-task endpoint), so this pulls a deeper window and filters — in a very
  // busy folder a task whose entries fall outside those rows logs partially.
  async _loadTaskHistory(taskId) {
    const id = taskId || this._detailId;
    if (!id) return;
    const HISTORY_SCAN = 300;
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.activity,
        hub_id: this._hubId,
        nid: this._scopeNid,
        include_unscoped: this._scopeIsRoot,
        limit: HISTORY_SCAN,
      });
      const list = Array.isArray(rows) ? rows : [];
      this._taskActivity = list.filter(
        (r) => String(r.task_id) === String(id),
      );
    } catch (err) {
      this._taskActivity = [];
    }
  }

  // ── Custom Kanban columns ────────────────────────────────────
  async _createColumn() {
    const input =
      this.el &&
      this.el.querySelector('.tasks-panel__board-modal input[name="board_title"]');
    // Prefer the live DOM value; fall back to the state copy (a commit-mode
    // Entry can blank its DOM value on blur, so state is the reliable source).
    const domName = input ? String(input.value || "").trim() : "";
    const name = domName || String(this._boardTitle || "").trim();
    if (!name) return;
    try {
      const row = await this.postService({
        service: SERVICE.task.column_create,
        hub_id: this._hubId,
        nid: this._scopeNid,
        name,
        theme: this._boardTheme || "default",
        // "Set as default" — sent for forward-compat; the server ignores it
        // until a default-column field exists.
        is_default: this._boardDefault ? 1 : 0,
      });
      const rec = Array.isArray(row) ? row[0] : row;
      if (rec && rec.id) this._customColumns.push(rec);
    } catch (err) {
      console.error("[tasks_panel] column.create failed:", err);
    }
    this._boardModalOpen = false;
    this._boardTheme = "default";
    this._boardTitle = "";
    this._boardDefault = true;
    this._render();
  }

  async _renameColumn(trigger) {
    const id = trigger.mget("taskColumn") || this._colMenuFor;
    if (!id) return;
    const input =
      this.el &&
      this.el.querySelector('.tasks-panel__col-menu input[name="col_rename"]');
    // Live DOM value is authoritative; fall back to the draft if the input
    // was already torn down by a re-render.
    const name = String(
      input ? input.value || "" : this._colRenameDraft || "",
    ).trim();
    if (!name) return;
    try {
      await this.postService({
        service: SERVICE.task.column_update,
        hub_id: this._hubId,
        // Column ids are folder-scoped: the built-ins share their status keys
        // across boards, so without nid the server would rename this column on
        // every board in the workspace.
        nid: this._scopeNid,
        id,
        name,
      });
      const rec = this._customColumns.find((c) => c.id === id);
      if (rec) rec.name = name;
    } catch (err) {
      console.error("[tasks_panel] column.rename failed:", err);
    }
    this._colMenuFor = null;
    this._colRenameDraft = null;
    this._render();
  }

  async _themeColumn(trigger) {
    const id = trigger.mget("taskColumn") || this._colMenuFor;
    const theme = trigger.mget("colTheme");
    if (!id || !theme) return;
    try {
      await this.postService({
        service: SERVICE.task.column_update,
        hub_id: this._hubId,
        // Folder-scoped — see _renameColumn.
        nid: this._scopeNid,
        id,
        theme,
      });
      const rec = this._customColumns.find((c) => c.id === id);
      if (rec) rec.theme = theme;
    } catch (err) {
      console.error("[tasks_panel] column.theme failed:", err);
    }
    this._render();
  }

  async _deleteColumn(trigger) {
    const id = trigger.mget("taskColumn") || this._colMenuFor;
    if (!id) return;
    try {
      const resp = await this.postService({
        service: SERVICE.task.column_delete,
        hub_id: this._hubId,
        // Folder-scoped — without nid the server would delete this column from
        // every board in the workspace (see _renameColumn).
        nid: this._scopeNid,
        id,
      });
      const row = Array.isArray(resp) ? resp[0] : resp;
      this._customColumns = this._customColumns.filter((c) => c.id !== id);
      // The server re-homes the column's tasks onto the first surviving column
      // — refresh when any moved.
      if (row && Number(row.moved_tasks) > 0) await this._loadTasks();
    } catch (err) {
      console.error("[tasks_panel] column.delete failed:", err);
    }
    this._colMenuFor = null;
    this._colRenameDraft = null;
    this._render();
  }

  // Drag-reorder columns. dragId/targetKey are column keys; `before` says which
  // side of the target to drop on. All columns (built-in + custom) are stored
  // rows in _customColumns now, so any can move. Optimistic + persisted.
  _reorderColumn(dragId, targetKey, before) {
    const cc = this._customColumns || [];
    const from = cc.findIndex((c) => String(c.id) === String(dragId));
    if (from < 0) return; // unknown column — nothing to reorder
    if (String(dragId) === String(targetKey)) return;
    const [moved] = cc.splice(from, 1);
    let to = cc.findIndex((c) => String(c.id) === String(targetKey));
    if (to < 0) to = 0; // target not found → front (defensive; shouldn't happen)
    else if (!before) to += 1;
    cc.splice(to, 0, moved);
    cc.forEach((c, i) => (c.position = i));
    this._render();
    this._persistColumnOrder();
  }

  // Persist the custom-column order (best-effort; the in-session reorder holds
  // even if the server lacks task.column_reorder yet).
  async _persistColumnOrder() {
    try {
      await this.postService({
        service: SERVICE.task.column_reorder,
        hub_id: this._hubId,
        nid: this._scopeNid,
        order: (this._customColumns || []).map((c) => c.id).join(","),
      });
    } catch (err) {
      console.error("[tasks_panel] column.reorder failed:", err);
    }
  }

  // Gantt "Delete selected" — bulk-delete the checked tasks, then clear the
  // selection. Best-effort per task; one failure doesn't abort the rest.
  async _deleteSelectedTasks() {
    const ids = Array.from(this._ganttSelected || []);
    if (!ids.length) return;
    for (const id of ids) {
      try {
        // Same reason as _removeTask: read the parent before the row goes.
        const doomed = this._tasks.find((t) => t.id === id);
        const parentOfDoomed = (doomed && doomed.parent_task_id) || null;
        const resp = await this.postService({
          service: SERVICE.task.delete,
          hub_id: this._hubId,
          id,
        });
        if (resp && (resp.affected >= 1 || resp.id === id)) {
          // Prune the cascaded subtasks too, not just the task itself: a
          // deleted parent takes its children with it server-side, and any
          // left in this._tasks become invisible orphans that still inflate
          // the Project Health totals (which count subtasks as work items).
          const gone = new Set([id, ...(resp.subtask_ids || [])]);
          this._tasks = this._tasks.filter((t) => !gone.has(t.id));
          this._subtasksOpen.delete(id);
          if (parentOfDoomed) this._syncSubtaskBadges(parentOfDoomed);
        }
      } catch (err) {
        console.error("[tasks_panel] gantt bulk delete failed:", id, err);
      }
    }
    this._ganttSelected = new Set();
    this._render();
  }

  // Step the calendar cursor by ±1 month or ±1 week (per the active mode).
  _calShift(dir) {
    try {
      const base = this._calCursor ? Dayjs(this._calCursor) : Dayjs();
      const unit = this._calMode === "week" ? "week" : "month";
      this._calCursor = base.add(dir, unit).format("YYYY-MM-DD");
    } catch (_) {
      this._calCursor = null;
    }
    this._render();
  }

  async _loadComments(taskId) {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.comment_list,
        hub_id: this._hubId,
        task_id: taskId,
      });
      // reactions and attachments arrive as JSON arrays (sometimes as JSON
      // strings from the DB). A server older than task_comment_file sends no
      // attachments at all — an empty list, not a missing key, so the renderer
      // has one shape to handle.
      const jsonList = (v) => {
        let out = v;
        if (typeof out === "string") {
          try {
            out = JSON.parse(out);
          } catch (_) {
            out = [];
          }
        }
        return Array.isArray(out) ? out : [];
      };
      this._comments = (Array.isArray(rows) ? rows : []).map((r) => ({
        ...r,
        reactions: jsonList(r.reactions),
        attachments: jsonList(r.attachments),
      }));
    } catch (err) {
      // Don't silently blank an already-populated feed on a transient failure —
      // that reads to the user as "others' comments disappeared". Log so the
      // real cause (permission / hub scope / 5xx) is visible.
      console.error("[tasks_panel] comment.list failed:", err);
      if (!Array.isArray(this._comments)) this._comments = [];
    }
  }

  async _submitComment() {
    if (!this._detailId) return;
    const draft = this._commentDraft;
    const body = String((draft && draft.body) || "").trim();
    // Files queued on the composer count as content, exactly as in a reply — a
    // comment that is only an attachment is still worth posting.
    if (!body && !((draft && draft.pending_files) || []).length) return;
    const taskId = this._detailId;
    try {
      const created = await this.postService({
        service: SERVICE.task.comment_create,
        hub_id: this._hubId,
        task_id: taskId,
        body,
        mention_uids: Array.isArray(draft.mention_uids) ? draft.mention_uids : [],
      });
      // The row doesn't exist until now — its id comes back on the create, and
      // only then can the queued files be attached to it.
      const row = Array.isArray(created) ? created[0] : created;
      const newId = row && (row.id || row.comment_id);
      let res = null;
      if (newId) {
        res = await this._linkCommentFiles(newId, draft, taskId, "comment");
      } else {
        this._discardCommentPending(draft);
      }
      if (newId && res && res.failed) this._handoffFailedLinks(newId, draft);
      this._commentDraft = null;
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment.create failed:", err);
    }
    // Surgically slot in the new comment + clear the composer — no full
    // _render() (which rebuilds the whole panel and feels like a reload).
    if (this._detailId === taskId) {
      this._refreshCommentList();
      this._refreshPendingList("comment");
      const ed = this._descEditorEl("comment");
      if (ed) this._renderEditorContent(ed, "");
    }
  }

  async _saveCommentEdit() {
    const id = this._editingCommentId;
    if (!id || this._commentSaving) return;
    const draft = this._commentEditDraft;
    const body = String((draft && draft.body) || "").trim();
    const pending = (draft && draft.pending_files) || [];
    // An empty edit is still a no-op — but not when files were dropped on it:
    // those are the edit.
    if (!body && !pending.length) return; // use delete to remove a comment
    const taskId = this._detailId;
    // Save covers a comment_update plus every queued file's upload and link, so
    // it is the slowest thing in this panel and the one most likely to be
    // clicked twice.
    const saveBtn =
      this.el &&
      this.el.querySelector(`.${this.fig.family}__comment-action--primary`);
    this._setControlBusy(saveBtn, true, { swapLabel: true });
    try {
      await this.postService({
        service: SERVICE.task.comment_update,
        hub_id: this._hubId,
        id,
        body,
        mention_uids: Array.isArray(draft.mention_uids) ? draft.mention_uids : [],
      });
      // Files after the body: a rejected edit (not the author any more, comment
      // deleted under us) must not leave attachments behind on it.
      const res = await this._linkCommentFiles(id, draft, taskId, "comment");
      // Failures go to the comment's own row rather than holding the editor
      // open — the body is saved either way, and the row is where every other
      // failed attachment already appears.
      if (res && res.failed) this._handoffFailedLinks(id, draft);
      this._editingCommentId = null;
      this._commentEditDraft = null;
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment.update failed:", err);
    } finally {
      // finally, not a trailing statement: the partial-failure branch returns
      // early, and a save that throws must not leave the button spinning
      // forever. A re-fed row replaces the node anyway — clearing a detached
      // one is a no-op.
      this._setControlBusy(saveBtn, false, { swapLabel: true });
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  /**
   * Upload whatever the comment's pending list still holds, then attach each
   * resulting nid to the comment. Mirrors _commitDetail's file loop, but lands
   * on task_comment_file (the comment) instead of task_file (the task).
   *
   * Entries already carrying a nid — dragged workspace nodes, search picks, and
   * cross-hub copies that _queueCrossHubFiles has already re-uploaded — skip
   * straight to the link.
   */
  async _linkCommentFiles(commentId, draft, taskId, scopeKey = "comment-edit") {
    const pending = ((draft && draft.pending_files) || []).slice();
    if (!commentId || !pending.length) return { failed: 0, linked: 0 };
    // Nothing was cancellable before this point and nothing is now: the guard
    // exists so Save and Cancel can refuse while files are in flight, rather
    // than aborting an XHR halfway and leaving an orphan in the folder.
    this._commentSaving = true;
    const results = await Promise.all(
      pending.map(async (pf) => {
        this._setPendingStatus(scopeKey, pf, "uploading");
        let nid = pf.nid;
        if (!nid && pf.file) {
          try {
            nid = (await this._uploadPendingFile(pf, pending)).nid;
          } catch (err) {
            console.error("[tasks_panel] comment file upload failed:", err);
            this._setPendingStatus(scopeKey, pf, "error");
            return { pf, ok: false };
          }
        }
        if (!nid) {
          this._setPendingStatus(scopeKey, pf, "error");
          return { pf, ok: false };
        }
        let linked = false;
        try {
          const res = await this.postService({
            service: SERVICE.task.comment_link_file,
            hub_id: this._hubId,
            comment_id: commentId,
            task_id: taskId || this._detailId,
            file_nid: nid,
          });
          // Read the RESOLVED VALUE. postService never rejects — a server
          // refusal resolves with {error, reason} and a transport failure
          // resolves undefined — so the catch below is unreachable for it, and
          // this used to return ok:true for every refusal: the entry was
          // dropped from the strip and its blob revoked while the file sat in
          // the folder unattached, with no signal to the user at all.
          linked = this._linkSucceeded(res);
        } catch (err) {
          console.error("[tasks_panel] comment.link_file failed:", err);
        }
        if (!linked) {
          // The upload succeeded, so a retry only has to redo the link.
          pf.nid = nid;
          this._setPendingStatus(scopeKey, pf, "error");
          return { pf, ok: false };
        }
        return { pf, ok: true };
      }),
    );
    this._commentSaving = false;

    // Partial failure keeps the failures — and only the failures — on the
    // draft, so the user retries those instead of re-dropping everything. The
    // ones that landed are attachments on the comment now; leaving them in the
    // strip as well would show the same file twice.
    const failed = results.filter((r) => !r.ok).map((r) => r.pf);
    const done = results.filter((r) => r.ok).map((r) => r.pf);
    done.forEach((pf) => {
      if (!pf.previewUrl) return;
      try {
        URL.revokeObjectURL(pf.previewUrl);
      } catch (_) {}
    });
    draft.pending_files = (draft.pending_files || []).filter((f) =>
      failed.includes(f),
    );
    return { failed: failed.length, linked: done.length };
  }

  // Retry one failed entry (the ✕ beside it removes instead). The comment it
  // belongs to is whichever one is open in the editor — a reply that failed
  // part-way is switched into edit mode on the comment it created, so this one
  // path covers both.


  // Detach a file from a saved comment (the ✕ on its attachment card). The
  // media node stays in the folder — this only drops the link row, exactly as
  // unlinking a task attachment does.
  async _unlinkCommentAttachment(trigger) {
    const commentId = trigger.mget("commentId");
    const fileNid = trigger.mget("fileNid");
    if (!commentId || !fileNid || !this._detailId) return;
    // Same treatment as the trash icon: the ✕ spins in place, and a second
    // click while it does is ignored instead of unlinking twice.
    const btn = trigger && trigger.el;
    if (this._isControlBusy(btn)) return;
    this._setControlBusy(btn, true);
    // The whole chip goes inert with it, not just the button: while the unlink
    // is in flight the chip was still a live open-attachment target, so a click
    // beside the ✕ opened the very file being detached. A separate flag from the
    // data-loading of an OPENING chip — that one puts a spinner where the
    // file-type icon sits, and here the spinner belongs on the ✕, which is the
    // control doing the work.
    const chip =
      btn && btn.closest
        ? btn.closest(`.${this.fig.family}__comment-attachment`)
        : null;
    if (chip && chip.dataset) chip.dataset.removing = "1";
    const taskId = this._detailId;
    try {
      await this.postService({
        service: SERVICE.task.comment_unlink_file,
        hub_id: this._hubId,
        comment_id: commentId,
        task_id: taskId,
        file_nid: fileNid,
      });
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment.unlink_file failed:", err);
    } finally {
      this._setControlBusy(btn, false);
      // A successful unlink takes the chip away with the reload above; this is
      // for the refusal, which leaves it on screen and clickable again.
      if (chip && chip.dataset) delete chip.dataset.removing;
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  // Blob URLs minted by _stashPendingFiles for image previews. Dropped files
  // that never reach a comment (cancel) or that have been linked (save) leak
  // the object URL otherwise — same discipline as the destroy handler.
  _releasePendingPreviews(draft) {
    for (const f of (draft && draft.pending_files) || []) {
      if (!f.previewUrl) continue;
      try {
        URL.revokeObjectURL(f.previewUrl);
      } catch (_) {}
    }
  }

  // Drop a comment draft's queued files without attaching them (edit/reply
  // cancelled, or the comment they belonged to went away).
  _discardCommentPending(draft) {
    if (!draft || !draft.pending_files) return;
    this._releasePendingPreviews(draft);
    draft.pending_files = [];
  }

  async _deleteComment(trigger) {
    const id = trigger.mget("commentId");
    if (!id || !this._detailId) return;
    // The trash icon spins in place while the delete round-trips; a second
    // click on a spinning one is ignored rather than firing a second delete.
    const btn = trigger && trigger.el;
    if (this._isControlBusy(btn)) return;
    this._setControlBusy(btn, true);
    const taskId = this._detailId;
    try {
      await this.postService({
        service: SERVICE.task.comment_delete,
        hub_id: this._hubId,
        id,
        task_id: taskId,
      });
      // Deleting a comment takes its replies with it (the server cascades).
      // Mirror that here instead of only dropping the root — otherwise the
      // replies stay on screen as orphans, re-rendered as fresh top-level
      // comments, until the next full reload.
      const gone = new Set([String(id)]);
      this._comments.forEach((c) => {
        if (String(c.parent_id) === String(id)) gone.add(String(c.id));
      });
      this._comments = this._comments.filter((c) => !gone.has(String(c.id)));
      if (gone.has(String(this._editingCommentId))) {
        this._editingCommentId = null;
        this._commentEditDraft = null;
      }
      // A reply composer open on a comment that just went away has nothing left
      // to answer.
      if (gone.has(String(this._replyingTo))) {
        this._replyingTo = null;
        this._replyDraft = null;
      }
      if (gone.has(String(this._reactPickerFor))) this._reactPickerFor = null;
    } catch (err) {
      console.error("[tasks_panel] comment.delete failed:", err);
    } finally {
      // On success the row is gone and this is a no-op; on failure the icon has
      // to stop spinning and become clickable again.
      this._setControlBusy(btn, false);
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  async _submitReply() {
    const clickedId = this._replyingTo;
    if (!clickedId || !this._detailId) return;
    const draft = this._replyDraft;
    const body = String((draft && draft.body) || "").trim();
    // Files dropped on the reply composer count as content, same as in an edit.
    if (!body && !((draft && draft.pending_files) || []).length) return;
    // A reply may target a root or a child. Flatten it to a sibling under the
    // root (parent_id = root) so threads stay 1-level, mirroring the skeleton's
    // orphan fallback (a reply whose parent is gone counts as its own root).
    // When answering a child, that child's author is invisible to the backend
    // (it only sees parent_id = root), so name them via reply_to_uid — the new
    // server notifies them as a REPLY (not a mention) and pulls them back out of
    // mention_uids. They stay in mention_uids as well so an OLD server (deployed
    // before this) still notifies them exactly as it did before — the two
    // deploys are independent in either order.
    const ids = new Set((this._comments || []).map((c) => String(c.id)));
    const clicked = (this._comments || []).find(
      (c) => String(c.id) === String(clickedId),
    );
    const repliesToChild =
      !!clicked && !!clicked.parent_id && ids.has(String(clicked.parent_id));
    const rootId = repliesToChild ? clicked.parent_id : clickedId;
    const mentions = Array.isArray(draft.mention_uids)
      ? draft.mention_uids.slice()
      : [];
    const replyToUid = repliesToChild ? clicked.author_uid : null;
    if (replyToUid) mentions.push(replyToUid);
    const taskId = this._detailId;
    try {
      const created = await this.postService({
        service: SERVICE.task.comment_create,
        hub_id: this._hubId,
        task_id: taskId,
        parent_id: rootId,
        body,
        mention_uids: [...new Set(mentions)],
        ...(replyToUid ? { reply_to_uid: replyToUid } : {}),
      });
      // Unlike an edit, the row doesn't exist until now — the new comment's id
      // comes back on the create, and only then can its files be attached.
      const row = Array.isArray(created) ? created[0] : created;
      const newId = row && (row.id || row.comment_id);
      let res = null;
      if (newId) {
        res = await this._linkCommentFiles(newId, draft, taskId, "comment-reply");
      } else {
        this._discardCommentPending(draft);
      }
      if (newId && res && res.failed) this._handoffFailedLinks(newId, draft);
      this._replyingTo = null;
      this._replyDraft = null;
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment reply failed:", err);
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  // True when the current user already has this emoji on the comment.
  _userHasReaction(commentId, emoji) {
    const c = (this._comments || []).find(
      (x) => String(x.id) === String(commentId),
    );
    return !!(
      c &&
      (c.reactions || []).some(
        (r) => r && r.emoji === emoji && String(r.uid) === String(Visitor.id),
      )
    );
  }

  // Add-only (like button + reaction picker). If the user already has this
  // emoji, don't toggle it off — instead close the pickers and flash the
  // existing chip so it's clear the reaction is already there.
  _addReaction(commentId, emoji) {
    if (!commentId || !emoji) return;
    if (this._userHasReaction(commentId, emoji)) {
      this._reactPickerFor = null;
      this._closeCommentReactionsPicker();
      this._refreshCommentList().then(() =>
        this._flashReactionChip(commentId, emoji),
      );
      return;
    }
    return this._reactOnComment(commentId, emoji);
  }

  // Briefly highlight a comment's existing reaction chip (feedback when the
  // user re-picks an emoji they've already reacted with).
  _flashReactionChip(commentId, emoji) {
    if (!this.el) return;
    const pfx = this.fig.family;
    const sel = `.${pfx}__detail-panel .${pfx}__react-chip[data-comment-id="${commentId}"][data-emoji="${emoji}"]`;
    const chip = this.el.querySelector(sel);
    if (!chip) return;
    const cls = `${pfx}__react-chip--flash`;
    chip.classList.remove(cls);
    // reflow so re-adding the class restarts the animation
    void chip.offsetWidth;
    chip.classList.add(cls);
    setTimeout(() => chip.classList.remove(cls), 900);
  }

  // Remove-only (chip click): drop the user's own reaction. Non-own chips are
  // rendered non-clickable, so this only fires for the user's own reactions.
  _removeReaction(commentId, emoji) {
    if (!commentId || !emoji) return;
    if (!this._userHasReaction(commentId, emoji)) return;
    return this._reactOnComment(commentId, emoji);
  }

  // Send one comment-react toggle to the server, then reload + refresh. Callers
  // (_addReaction / _removeReaction) guard the direction so this only ever adds
  // or only ever removes.
  async _reactOnComment(commentId, emoji) {
    if (!commentId || !emoji || !this._detailId) return;
    const taskId = this._detailId;
    this._reactPickerFor = null;
    this._emojiPickerFor = null;
    try {
      await this.postService({
        service: SERVICE.task.comment_react,
        hub_id: this._hubId,
        comment_id: commentId,
        task_id: taskId,
        emoji,
      });
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment react failed:", err);
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  // ── Full emoji picker (comment "…" more button) ────────────────
  // Modeled on the meeting reactions picker (builtins/webrtc/reactions.js):
  // the shared assets/emojis picker is fed into the __wrapperReactions wrapper,
  // positioned below the open react bar, and dismissed via a capture-phase
  // click handler that also captures the emoji pick.
  _toggleCommentReactionsPicker(trigger) {
    const w = this.__wrapperReactions;
    if (!w) return;
    if (w.isEmpty()) {
      this._emojiPickerFor = trigger.mget("commentId");
      w.feed(require("assets/emojis")(this));
      this._positionCommentReactionsPicker();
      this._bindCommentReactionsPickerDismiss();
    } else {
      this._closeCommentReactionsPicker();
    }
  }

  // Anchor the picker directly above the "…" more button, left-aligned with it,
  // relative to the position:relative detail-panel (the wrapper's positioned
  // ancestor). Anchored by `bottom` so its height doesn't need measuring.
  _positionCommentReactionsPicker() {
    const w = this.__wrapperReactions;
    const pfx = this.fig.family;
    if (!w || !w.el || !this.el) return;
    const more = this.el.querySelector(`.${pfx}__react-more`);
    const host = this.el.querySelector(`.${pfx}__detail-panel`);
    if (!more || !host) return;
    const b = more.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    w.el.style.top = "auto";
    w.el.style.bottom = `${Math.round(h.bottom - b.top + 8)}px`;
    w.el.style.left = `${Math.round(b.left - h.left)}px`;
  }

  // Capture-phase: a glyph click reacts (and swallows the event so the picker
  // stays put); a click inside the picker or the react bar is kept; anything
  // else is a true outside click that dismisses. Bound on the next tick so the
  // "…" click that opened it doesn't immediately dismiss it.
  _bindCommentReactionsPickerDismiss() {
    if (this._commentPickerDismiss) return;
    this._commentPickerDismiss = (e) => {
      const w = this.__wrapperReactions;
      if (!w || w.isEmpty() || !w.el) {
        this._closeCommentReactionsPicker();
        return;
      }
      const t = e.target;
      if (w.el.contains(t)) {
        const span = t.closest && t.closest('[data-service="emoji"]');
        if (span) {
          e.stopImmediatePropagation();
          e.preventDefault();
          const cid = this._emojiPickerFor;
          const glyph = span.textContent && span.textContent.trim();
          this._closeCommentReactionsPicker();
          this._addReaction(cid, glyph);
        }
        return;
      }
      const bar =
        this.el && this.el.querySelector(`.${this.fig.family}__react-picker-wrap`);
      if (bar && bar.contains(t)) return;
      this._closeCommentReactionsPicker();
    };
    setTimeout(() => {
      if (this._commentPickerDismiss) {
        document.addEventListener("click", this._commentPickerDismiss, true);
      }
    }, 0);
  }

  _closeCommentReactionsPicker() {
    if (this._commentPickerDismiss) {
      document.removeEventListener("click", this._commentPickerDismiss, true);
      this._commentPickerDismiss = null;
    }
    this._emojiPickerFor = null;
    if (this.__wrapperReactions && !this.__wrapperReactions.isEmpty()) {
      this.__wrapperReactions.clear();
    }
  }

  // Read-only render of each comment body into its <div> (reuses the editor's
  // chip rendering). Bodies are populated post-feed, like the description.
  _renderCommentBodies() {
    if (!this.el) return;
    this.el
      .querySelectorAll(`.${this.fig.family}__comment-body[data-comment-id]`)
      .forEach((el) => {
        const c = this._comments.find(
          (x) => String(x.id) === String(el.dataset.commentId),
        );
        if (c) this._renderEditorContent(el, c.body || "");
      });
  }

  // Surgical comment-feed refresh (no full _render) so a peer's WS comment
  // doesn't disturb an in-progress composer. Mirrors _refreshAttachmentsList.
  // Touches only the comment part — the change log is fed by
  // _refreshHistoryList below, so neither reload rebuilds the other's rows.
  _refreshCommentList() {
    return this._withPart("comment-list")
      .then((p) => {
        if (!p || (p.isDestroyed && p.isDestroyed())) return;
        p.feed(require("./skeleton").buildCommentListContent(this));
        this._stampSectionEmpty("comments", !(this.getComments() || []).length);
        this._renderCommentBodies();
        // onPartReady doesn't reliably re-fire for surgically-fed parts, so wire
        // the active inline editors explicitly (mirrors _prepopulateInputs).
        const root = ".tasks-panel__detail-panel ";
        if (this._editingCommentId) {
          const ed = this.el.querySelector(
            root + ".tasks-panel__comment-edit-input",
          );
          if (ed) this._initDescEditor(ed, "comment-edit");
        }
        if (this._replyingTo) {
          const ed = this.el.querySelector(
            root + ".tasks-panel__comment-reply-input",
          );
          if (ed) this._initDescEditor(ed, "comment-reply");
        }
      })
      .catch(() => {});
  }

  // The section captions ("Comments" / "History") live outside the fed parts,
  // so an emptied list would leave its caption hanging over nothing. Mirror the
  // count onto the section as data-empty, which is what the skin keys on.
  _stampSectionEmpty(kind, isEmpty) {
    if (!this.el) return;
    const s = this.el.querySelector(
      `.${this.fig.family}__activity-section[data-kind="${kind}"]`,
    );
    if (s) s.dataset.empty = isEmpty ? "1" : "0";
  }

  // A peer's task change (status, assignee, labels, files…) writes a change-log
  // row for the task this user may have open. Re-read it and feed the history
  // part only — the board's own reload/re-render is the caller's business, and
  // the comment feed is never touched.
  _refreshOpenTaskHistory() {
    const id = this._detailId;
    if (!id) return Promise.resolve();
    return this._loadTaskHistory(id).then(() => {
      if (this._detailId === id) this._refreshHistoryList();
    });
  }

  // Sibling of _refreshCommentList for the change log. No body rendering and no
  // editors to rewire — history rows are plain text — so this is just a feed.
  _refreshHistoryList() {
    return this._withPart("history-list")
      .then((p) => {
        if (!p || (p.isDestroyed && p.isDestroyed())) return;
        p.feed(require("./skeleton").buildHistoryListContent(this));
        this._stampSectionEmpty("history", !this.getTaskHistory().length);
      })
      .catch(() => {});
  }

  _pickAttachment(trigger) {
    // Scope decides which draft the file is queued on, and therefore what it
    // ends up attached to:
    //   "create"        → _createDefaults    → task.link_file on Create
    //   "detail"        → _detailDraft       → task.link_file on Update
    //   "comment-edit"  → _commentEditDraft  → task.comment_link_file on Save
    //   "comment-reply" → _replyDraft        → task.comment_link_file on Send
    // Same resolution the drop path uses, so picking and dropping a file in the
    // same composer can no longer disagree about where it belongs.
    const raw = trigger?.mget?.("searchScope");
    this._pendingUploadScope =
      PICK_ATTACHMENT_SCOPES.includes(raw) || ROW_SCOPE.test(raw || "")
        ? raw
        : "detail";
    // FileSelector hardcodes sys_pn to "fileselector".
    return this._withPart("fileselector").then((sel) => {
      // sel.open() rebinds onchange every call (overrides the one set in
      // onPartReady), so use sel.el's input directly to preserve our handler.
      const input = sel.el.querySelector?.("input[type='file']") || sel.el;
      input.click?.();
    });
  }

  async _onAttachmentPicked(e) {
    const files = Array.from(e.target?.files || []);
    if (!files.length) return;
    e.target.value = "";
    const scope = this._pendingUploadScope || "detail";
    this._pendingUploadScope = null;

    // A comment row has no submit, so its paperclip commits immediately —
    // exactly as a drop on that row does.
    const row = ROW_SCOPE.exec(scope);
    if (row) return this._dropOnCommentRow(row[1], files);

    // Every other scope uses the deferred-pending flow: stash the File on the
    // active draft and let that draft's own submit do the upload + link
    // (_commitTask / _commitDetail → task.link_file; _saveCommentEdit /
    // _submitReply → _linkCommentFiles → task.comment_link_file).
    //
    // `create: true` because a comment can be answered — or its editor opened —
    // before a single character is typed, so the draft may not exist yet. Same
    // allocation the drop path relies on.
    const draft = this._draftForKey(scope, { create: true });
    if (!draft) return;

    await this._stashPendingFiles(draft, files);
    return this._refreshPendingList(scope);
  }

  // True when the drag carries OS files (vs. an internal card-reorder drag).
  _isFileDrag(e) {
    const types = e.dataTransfer && e.dataTransfer.types;
    if (!types) return false;
    return Array.from(types).includes("Files");
  }

  /**
   * Single owner of the drop affordance. Exactly one element carries
   * data-drop-active at a time, so two overlays can never light — the same
   * invariant the old pair of root flags held, generalised to N zones.
   *
   * Takes the descriptor's OWN element: no second lookup, so the lit overlay
   * and the resolved scope cannot disagree.
   */
  _setDragAffordance(zone) {
    if (!this.el) return;
    const next = (zone && zone.el) || null;
    if (this._activeZoneEl === next) return;
    if (this._activeZoneEl && this._activeZoneEl.dataset) {
      delete this._activeZoneEl.dataset.dropActive;
    }
    if (next) next.dataset.dropActive = "1";
    this._activeZoneEl = next;
    // Keep the pointer-driven sync's change-detection honest: a caller that
    // sets the affordance directly (dragover, drop, cancel) must not leave a
    // key behind that makes the next pointer tick a no-op.
    this._affordanceKey = zone ? zone.key : "";
  }

  /**
   * Remember the last COMMENT-family resolution for the positionless WM route.
   *
   * Deliberately NOT the task zones: those are recoverable from the pointer,
   * and remembering them would let a stale hover attach to the task with no
   * overlay ever shown — which "no overlay, no write" forbids.
   *
   * Stores no element. The descriptor outlives the render that produced it, so
   * a retained node would either leak or silently miss after a re-feed.
   */
  _rememberDropScope(zone) {
    this._lastDropScope =
      zone && zone.scope !== "detail" && zone.scope !== "create"
        ? { scope: zone.scope, key: zone.key, commentId: zone.commentId }
        : null;
  }

  /**
   * The element under a drag that belongs to THIS panel.
   *
   * A native file drag reports an accurate e.target, and taking it costs
   * nothing — which matters, because dragover fires at pointer rate.
   *
   * The in-app media drag does not. jQuery-UI builds a helper, appends it to
   * <body> (media/interact.js: appendTo: _a.body) and parks it under the
   * cursor (cursorAt), so the droppable's `over`/`drop` hand us a mouse event
   * whose target is that helper — an element outside the panel entirely. Both
   * e.target AND elementFromPoint report the helper, never the row beneath it,
   * so the pointer STACK is the only thing that can see through it.
   */
  _dropPointEl(e) {
    const root = this.el;
    const inRoot = (n) => !!(n && root && root.contains(n));
    const t = e && e.target;
    if (inRoot(t) && t.closest) return t;
    if (!e || e.clientX == null || typeof document === "undefined") return null;
    if (document.elementsFromPoint) {
      return (
        (document.elementsFromPoint(e.clientX, e.clientY) || []).find(inRoot) ||
        null
      );
    }
    const one =
      document.elementFromPoint &&
      document.elementFromPoint(e.clientX, e.clientY);
    return inRoot(one) ? one : null;
  }

  /**
   * Did a link call actually land? postService NEVER rejects — a server
   * refusal resolves with {error, reason} and a transport failure resolves
   * undefined (ui-essentials/socket/utils.js: both rethrow branches are
   * guarded by `isFunction(onServerComplain)`, which is always true on a
   * Backbone view). So success has to be read from the resolved VALUE; a
   * try/catch alone would mark every refusal as a successful attach.
   *
   * comment_link_file answers with output.list(...), which always emits an
   * array, holding the comment's full attachment list — verified against the
   * SP: a fresh link and a duplicate INSERT IGNORE both return a non-empty
   * set, so "non-empty array" separates success from both failure shapes.
   */
  _linkSucceeded(res) {
    return Array.isArray(res) && res.length > 0;
  }

  // In-flight files for a comment row, keyed by comment id. A row has no
  // submit button, so these upload immediately rather than staging.
  getRowUploads(commentId) {
    return (this._rowUploads && this._rowUploads.get(commentId)) || [];
  }

  /**
   * Does this comment have file work still in flight?
   *
   * Counts RUNS, not entries. Deriving this from the entries' statuses looked
   * equivalent and was not: _rowUploads is only pruned when a link succeeds, so
   * every entry a run skipped or abandoned stayed at "queued" for the life of
   * the panel — and the row stayed inert with it, its own ✕ and retry refused
   * by the guard that reads this. A counter cannot outlive the run that raised
   * it: _markRowBusy is called from a `finally` on every path out.
   *
   * A leftover entry is therefore a chip you can retry or throw away, which is
   * what it always should have been.
   */
  isCommentRowBusy(commentId) {
    return (this._rowBusy.get(commentId) || 0) > 0;
  }

  /**
   * Raise (+1) or release (-1) one unit of in-flight work for a comment.
   *
   * A count rather than a flag because two runs can overlap: dropping a second
   * file while the first is still uploading starts an independent
   * _dropOnCommentRow, and the row must stay busy until BOTH have released it.
   * The key is deleted at zero so the map cannot accumulate idle comments.
   */
  _markRowBusy(commentId, delta) {
    const n = (this._rowBusy.get(commentId) || 0) + delta;
    if (n > 0) this._rowBusy.set(commentId, n);
    else this._rowBusy.delete(commentId);
  }

  /**
   * Refuse a row-scoped action while that row is busy.
   *
   * The skin already makes the row inert, and this is the backstop behind it:
   * a click that reaches a render the strip has since moved past, or any path
   * that does not go through the pointer, still lands here. Silent by design —
   * the spinner beside the filename is the explanation, and inventing a toast
   * for a state the row is already showing would be noise.
   *
   * Only services that carry a `commentId` can be resolved to a row, so this
   * is the whole set: the composer's own Save / Cancel / Send belong to the
   * open editor rather than to any one row and are handled by _commentSaving.
   */
  _refuseWhileRowBusy(service, trigger) {
    if (!ROW_BUSY_SERVICES.includes(`${service}`)) return false;
    const cid = trigger && trigger.mget && trigger.mget("commentId");
    return !!(cid && this.isCommentRowBusy(cid));
  }

  /**
   * Queue dropped items onto a comment's in-flight list. Mirrors
   * _stashPendingFiles + attachExistingNodes, but the target is _rowUploads
   * rather than a draft. Returns only the entries actually added.
   */
  async _stageRowItems(commentId, items) {
    const list = this._rowUploads.get(commentId) || [];
    this._rowUploads.set(commentId, list);
    const seen = new Set(list.map((f) => f.nid || f.localKey));
    // A drop fires through both the droppable and the folder insertMedia, so
    // this runs twice — same dedupes as attachExistingNodes.
    this._attachingNids = this._attachingNids || new Map();
    const nowTs = Date.now();
    const added = [];
    const crossHub = [];
    // NOTHING may be awaited before the entries are pushed. The collision-safe
    // filename needs the folder listing (_ensureFolderFilenames), and waiting
    // on that round-trip here is what made the FIRST drop on a cold panel
    // invisible: the entry did not exist yet, so _refreshCommentList had
    // nothing to draw and _setPendingStatus had no card to write to. Every
    // later drop found the cache warm and painted instantly, which is why the
    // first file only appeared once a second one was dropped.
    //
    // The name is provisional until _uploadPendingFile resolves it, just
    // before it sends — see _finalizePendingName.
    for (const item of items) {
      if (typeof File !== "undefined" && item instanceof File) {
        const { filename, extension } = this._splitFilename(item.name);
        const entry = {
          localKey: `row:${commentId}:${nowTs}:${added.length}:${item.name}`,
          file: item,
          filename,
          extension,
          provisional: 1,
          status: "queued",
        };
        if (this._isImageExt(extension)) {
          try {
            entry.previewUrl = URL.createObjectURL(item);
          } catch (_) {}
        }
        list.push(entry);
        added.push(entry);
        continue;
      }
      const isWidget = item && typeof item.mget === "function";
      const attr = isWidget ? item.model.toJSON() : item || {};
      const nid = attr.nid || attr.file_nid || attr.id;
      if (!nid || seen.has(nid)) continue;
      if (nowTs - (this._attachingNids.get(nid) || 0) < 4000) continue;
      this._attachingNids.set(nid, nowTs);
      if (attr.filetype === _a.hub || attr.filetype === _a.folder) continue;
      seen.add(nid);
      const { previewUrl, chartId } = this._attachmentPreview(attr);
      if (attr.hub_id && attr.hub_id !== this._hubId) {
        // Foreign hub: this hub 403s on the nid, so the bytes are copied in.
        // Placeholder stands in immediately — the fetch is the only genuinely
        // slow step on any attach path.
        const ph = {
          localKey: `xhub:${commentId}:${nid}`,
          crossHubNid: nid,
          filename: attr.filename || attr.user_filename || "",
          extension: attr.extension || attr.ext || "",
          previewUrl,
          iconChartId: chartId,
          status: "downloading",
        };
        list.push(ph);
        added.push(ph);
        crossHub.push(attr);
        continue;
      }
      // Same hub: no upload, link by nid.
      list.push({
        nid,
        hub_id: attr.hub_id || this._hubId,
        filename: attr.filename || attr.user_filename || "",
        extension: attr.extension || attr.ext || "",
        previewUrl,
        iconChartId: chartId,
        status: "queued",
      });
      added.push(list[list.length - 1]);
    }
    if (crossHub.length) {
      // The placeholders are already in `list`; paint them before the
      // downloads, which are seconds of network each. Same rule as above: no
      // await stands between a staged entry and the chip that shows it. The
      // download is in-flight work like any other, so the row is busy for it.
      this._markRowBusy(commentId, 1);
      this._refreshCommentList();
      try {
        await this._queueCrossHubFiles(crossHub, {
          list,
          key: `comment-row:${commentId}`,
        });
      } finally {
        this._markRowBusy(commentId, -1);
      }
    }
    return added;
  }

  /**
   * Attach dropped items to a comment straight away. A row outside edit mode
   * has no submit, so there is no natural commit trigger — the drop IS the
   * commit, and status renders inside that row's attachments strip.
   */
  async _dropOnCommentRow(commentId, items) {
    const taskId = this._detailId;
    const staged = await this._stageRowItems(commentId, items);
    if (!staged.length) return;
    // Busy for the length of THIS run, not for as long as entries happen to sit
    // in the list — see _markRowBusy.
    this._markRowBusy(commentId, 1);
    this._refreshCommentList();
    const key = `comment-row:${commentId}`;
    let consecutiveFailures = 0;
    try {
      for (const item of staged) {
        // A cross-hub placeholder is NOT the entry that gets uploaded:
        // _queueCrossHubFiles fetches the bytes and splices a real entry into
        // its place, leaving the placeholder out of the list entirely. Follow
        // that pointer — skipping it, as this loop used to, meant the copied
        // file was never uploaded and never linked, and simply sat in the strip
        // looking attached.
        const pf = item.replacedBy || item;
        // Nothing to send: a cross-hub placeholder whose download failed, which
        // _queueCrossHubFiles has already marked.
        if (pf.crossHubNid && !pf.nid && !pf.file) continue;
        this._setPendingStatus(key, pf, "uploading");
        let ok = false;
        try {
          let nid = pf.nid;
          if (!nid && pf.file) {
            nid = (
              await this._uploadPendingFile(pf, this.getRowUploads(commentId))
            ).nid;
          }
          if (nid) {
            const res = await this.postService({
              service: SERVICE.task.comment_link_file,
              hub_id: this._hubId,
              comment_id: commentId,
              task_id: taskId,
              file_nid: nid,
            });
            ok = this._linkSucceeded(res);
            // Uploaded fine; only the link needs redoing on retry.
            if (!ok) pf.nid = nid;
          }
        } catch (err) {
          // Only _uploadPendingFile can land here — it is a hand-rolled Promise
          // that genuinely rejects. postService never does.
          console.error("[tasks_panel] comment row attach failed:", err);
        }
        if (ok) {
          this._dropRowUpload(commentId, pf);
          consecutiveFailures = 0;
          continue;
        }
        this._setPendingStatus(key, pf, "error");
        // Two in a row is a wall, not bad luck — stop rather than firing the
        // rest at it. No error taxonomy: the count is the whole rule.
        if (++consecutiveFailures >= 2) {
          this._abandonRowQueue(key, staged);
          break;
        }
      }
    } catch (err) {
      // The loop's own steps are individually guarded, so this is the
      // unexpected kind. Caught rather than propagated so the reload and
      // repaint below still run and the row cannot be left looking busy.
      console.error("[tasks_panel] comment row run failed:", err);
    } finally {
      this._markRowBusy(commentId, -1);
    }
    await this._loadComments(taskId);
    if (this._detailId === taskId) this._refreshCommentList();
  }

  /**
   * Mark what a broken-off run leaves behind.
   *
   * The break above stops a run mid-list, and everything past it was abandoned
   * rather than merely unlucky. Left at "queued" those entries showed a chip
   * with no spinner, no error and nothing to act on — indistinguishable from an
   * attached file. "error" is the state that owns them: it offers retry and ✕.
   */
  _abandonRowQueue(key, staged) {
    for (const item of staged) {
      const pf = item.replacedBy || item;
      if (pf.status === "queued") this._setPendingStatus(key, pf, "error");
    }
  }

  /**
   * Move failed links onto the comment they belong to.
   *
   * The composer is gone once posted, so the row is the only durable surface —
   * and it is the same one a row drop already uses, rather than a second error
   * surface competing with it. Called BEFORE _loadComments, so the reload
   * brings the new comment in and the first render after submit already has a
   * row to draw these into; after the reload they would not surface until some
   * later refresh, which from the user's side is not appearing at all.
   *
   * Normalises `status` here rather than trusting three callers to.
   */
  _handoffFailedLinks(commentId, draft) {
    const failed = (draft && draft.pending_files) || [];
    if (!commentId || !failed.length) return 0;
    failed.forEach((f) => {
      f.status = "error";
    });
    const list = this._rowUploads.get(commentId) || [];
    this._rowUploads.set(commentId, list.concat(failed));
    draft.pending_files = []; // ownership moved, not dropped
    // The card may be scrolled out of view, so say where to look.
    if (typeof Butler !== "undefined" && Butler.say) {
      Butler.say(LOCALE.TASK_FILES_NOT_ATTACHED);
    }
    return failed.length;
  }

  // Drop a landed entry and release its preview.
  _dropRowUpload(commentId, pf) {
    const list = this._rowUploads.get(commentId) || [];
    const at = list.indexOf(pf);
    if (at >= 0) list.splice(at, 1);
    if (!list.length) this._rowUploads.delete(commentId);
    if (pf.previewUrl) {
      try {
        URL.revokeObjectURL(pf.previewUrl);
      } catch (_) {}
      pf.previewUrl = null;
    }
  }

  /**
   * Throw away one row entry from its chip's ✕.
   *
   * The staged strips' ✕ goes through _removePendingFile, which filters the
   * four DRAFTS — it has never known about _rowUploads, so a row chip needed
   * its own service. The removal itself is _dropRowUpload, the same splice +
   * revokeObjectURL a successful link already performs; only the trigger is new.
   *
   * Nothing is sent to the server: a row entry is either not yet linked (queued
   * / failed) or already gone from this list, so there is nothing to unlink.
   */
  _discardRowUpload(trigger) {
    const commentId = trigger.mget("commentId");
    const pendingKey = String(trigger.mget("pendingKey") || "");
    if (!commentId || !pendingKey) return;
    const entry = this.getRowUploads(commentId).find(
      (f) => this._pendingKey(f) === pendingKey,
    );
    if (!entry) return;
    // An upload already on the wire cannot be recalled — _uploadPendingFile
    // keeps no handle to abort, and dropping the entry would only hide a
    // transfer that still lands in the folder. The row-level guard refuses this
    // service while ANY file is in flight; this is the narrower rule that holds
    // even if that one is ever relaxed.
    if (entry.status === "uploading" || entry.status === "downloading") return;
    this._dropRowUpload(commentId, entry);
    return this._refreshCommentList();
  }

  // Retry one failed row entry. The upload may already have succeeded, in
  // which case pf.nid is set and only the link is redone.
  async _retryRowUpload(trigger) {
    const commentId = trigger.mget("commentId");
    const pendingKey = String(trigger.mget("pendingKey") || "");
    if (!commentId || !pendingKey) return;
    const entry = this.getRowUploads(commentId).find(
      (f) => this._pendingKey(f) === pendingKey,
    );
    if (!entry) return;
    return this._retryOne(commentId, entry);
  }

  async _retryOne(commentId, entry) {
    const taskId = this._detailId;
    const key = `comment-row:${commentId}`;
    // Same contract as a drop's run: the row is busy while this is moving, and
    // released on every path out.
    this._markRowBusy(commentId, 1);
    this._setPendingStatus(key, entry, "uploading");
    this._refreshCommentList();
    let ok = false;
    try {
      let nid = entry.nid;
      if (!nid && entry.file) {
        nid = (
          await this._uploadPendingFile(entry, this.getRowUploads(commentId))
        ).nid;
      }
      if (nid) {
        const res = await this.postService({
          service: SERVICE.task.comment_link_file,
          hub_id: this._hubId,
          comment_id: commentId,
          task_id: taskId,
          file_nid: nid,
        });
        ok = this._linkSucceeded(res);
        if (!ok) entry.nid = nid;
      }
    } catch (err) {
      console.error("[tasks_panel] comment row retry failed:", err);
    } finally {
      this._markRowBusy(commentId, -1);
    }
    if (ok) {
      this._dropRowUpload(commentId, entry);
      await this._loadComments(taskId);
    } else {
      this._setPendingStatus(key, entry, "error");
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  _commentById(id) {
    return (this._comments || []).find((c) => String(c.id) === String(id));
  }

  /**
   * Which zone a drag is over, as {scope, key, el, commentId?} — or null to
   * refuse. Region-addressed: the pointer is matched against the ZONES table
   * rather than inferred from which form happens to be open, so all three
   * entry points resolve identically and a drop outside every zone refuses
   * instead of silently attaching to the task.
   */
  _zoneFor(e) {
    // No task write rights → no zone at all, so a view/chat member never sees
    // an overlay that would be refused server-side (acl/task.json `src: write`).
    if (!this._mayWriteTasks()) return null;
    const hit = this._dropPointEl(e);
    if (!hit) return null;
    const zone = resolveZone(this.fig.family, hit, {
      contains: (n) => !!(this.el && this.el.contains(n)),
      isOwnComment: (id) => {
        const c = this._commentById(id);
        return !!(c && String(c.author_uid) === String(Visitor.id));
      },
    });
    if (!zone) return null;
    // A zone only accepts while the surface that owns it is actually open.
    if (zone.scope === "detail" && !this._detailDraft) return null;
    if (zone.scope === "create" && !this._createDefaults) return null;
    if (
      (zone.scope === "comment" || zone.scope === "comment-reply") &&
      !this._detailId
    ) {
      return null;
    }
    return zone;
  }

  _activeUploadScope(e) {
    return this._zoneFor(e);
  }

  // Whichever task form is open. NOT a drop decision: it answers "is a task
  // surface open at all", never "where does this land". Its only real consumer
  // is canAttachExisting's claim breadth.
  _formUploadScope() {
    if (this._creating && this._createDefaults) return { scope: "create" };
    if (this._detailId && this._detailDraft) return { scope: "detail" };
    return null;
  }

  /**
   * Pointer of record for drops that never reach this panel's own handlers.
   *
   * The desk routes a window-manager drop straight at the window under it
   * (desk/wm/index.js: `this._target.insertMedia(files, 0)`), and the folder
   * window forwards that to attachExistingNodes with no event, no coordinates
   * and no idea where the pointer was. The jQuery-UI helper lives under
   * <body>, so its mousemove never bubbles through this panel either —
   * document is the only place both are visible. Two integers per move, no
   * layout, and nothing is read from it unless a positionless caller asks.
   */
  _trackPointer() {
    if (this._pointerTracker || typeof document === "undefined") return;
    this._pointerTracker = (e) => {
      this._lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() };
      this._syncDragAffordance();
    };
    // A jQuery-UI drop or abort ends with no event on this panel at all — the
    // droppable's `drop` only fires when the pointer is inside it — so the
    // affordance would stay lit after a drag that ended elsewhere.
    this._pointerRelease = () => this._setDragAffordance(null);
    document.addEventListener("mousemove", this._pointerTracker, true);
    document.addEventListener("mouseup", this._pointerRelease, true);
  }

  /**
   * Follow the pointer with the drop affordance during an in-app drag.
   *
   * jQuery-UI gives this panel no per-move callback. Droppable fires `over`
   * only on a TRANSITION (droppable.js: `if (!c) return`), i.e. exactly once,
   * as the pointer crosses INTO the panel — at its edge, nowhere near a
   * comment, where the scope correctly resolves to null while a comment is
   * being edited. Nothing fires again as the pointer travels to the row, so an
   * `over`-driven overlay can never light. The pointer itself is the only
   * continuous signal, for the media grid and the window-manager route alike.
   *
   * Guarded on an actual drag being in flight (jQuery-UI marks its helper
   * `ui-draggable-dragging`) — otherwise merely moving the mouse across an
   * edited comment would light the overlay with nothing to drop.
   */
  _syncDragAffordance() {
    if (this._affordanceRaf || typeof requestAnimationFrame !== "function") {
      return;
    }
    this._affordanceRaf = requestAnimationFrame(() => {
      this._affordanceRaf = 0;
      const s = this._jqDragActive() ? this._pointerScope() : null;
      // One DOM write per change, not per frame. The zone key already
      // distinguishes per-row targets (comment-row:<id>), so adjacent rows
      // register as distinct without any extra bookkeeping.
      const key = s ? s.key : "";
      if (key === this._affordanceKey) return;
      this._setDragAffordance(s);
      this._rememberDropScope(s);
    });
  }

  // True while a jQuery-UI drag is in flight anywhere on the page. Native HTML5
  // file drags fire no mousemove at all, so they never reach this and keep
  // being driven by dragover.
  _jqDragActive() {
    return !!(
      typeof document !== "undefined" &&
      document.querySelector(".ui-draggable-dragging")
    );
  }

  // Scope for where the pointer last was. A drop always follows a move within
  // a frame or two, so anything older than POINTER_TTL is somebody else's
  // mouse position and is refused rather than guessed from.
  _pointerScope() {
    const p = this._lastPointer;
    if (!p || Date.now() - p.t > POINTER_TTL) return null;
    const e = { clientX: p.x, clientY: p.y };
    // A dragover event is proof the pointer is over this panel — the browser
    // only fires it there, which is why _activeUploadScope's task branch can
    // answer on "is a form open" alone. A REMEMBERED pointer carries no such
    // proof: it comes from a document-wide mousemove, so it is just as true
    // while a folder window is being dragged on the far side of the desk.
    // Without this gate the task branch claimed every jQuery-UI drag on the
    // page and lit "Drop files to attach" over a panel nobody was near.
    if (!this._dropPointEl(e)) return null;
    return this._activeUploadScope(e);
  }

  /**
   * image/* files carried by a paste, in clipboard order.
   *
   * `items` is the authoritative list (a screenshot is an item with no entry in
   * some engines' `files`), with `files` as the fallback for engines that only
   * populate that. Everything non-image is left alone: the paste then falls
   * through to whatever the browser would have done with it.
   */
  _clipboardImages(e) {
    const dt =
      (e && e.clipboardData) ||
      (e && e.originalEvent && e.originalEvent.clipboardData);
    if (!dt) return [];
    const out = [];
    const items = dt.items || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || it.kind !== "file" || !/^image\//.test(it.type || "")) continue;
      const f = it.getAsFile && it.getAsFile();
      if (f) out.push(f);
    }
    if (!out.length) {
      for (const f of Array.from(dt.files || [])) {
        if (/^image\//.test((f && f.type) || "")) out.push(f);
      }
    }
    return out;
  }

  /**
   * A pasted image usually arrives named ("image.png"), a screenshot sometimes
   * not at all. Give the nameless ones something to be called, because the name
   * is what the folder stores and what the chip shows; the collision suffix is
   * added later, at upload (_finalizePendingName).
   */
  _namedPasteFile(file, i) {
    if (!file || file.name) return file;
    const ext = String(file.type || "").split("/")[1] || "png";
    const n = i ? `pasted-image-${i + 1}` : "pasted-image";
    try {
      return new File([file], `${n}.${ext}`, { type: file.type });
    } catch (_) {
      return file; // no File constructor: staging still copes, unnamed
    }
  }

  /**
   * Where a pasted image lands.
   *
   * The same ZONES walk a drop gets, from the pointer rather than from an
   * event — so ownership (a row must be yours), permissions and "is that
   * surface even open" all come from _zoneFor and need no rules of their own.
   *
   * Two deliberate differences from _pointerScope:
   *
   * - No POINTER_TTL. That window exists because a DROP follows a mousemove
   *   within a frame or two; a paste follows a keystroke, and a pointer that has
   *   not moved for a minute is not stale — it is simply where the mouse is.
   *   elementsFromPoint hit-tests live, so a wheel-scroll under a motionless
   *   cursor resolves to whatever is under it now, exactly as :hover would.
   * - The panel clears _lastPointer on mouseleave (_installPasteAttach), which
   *   is what stops a cursor that has left resolving to the row it exited over.
   */
  _pasteZone() {
    const p = this._lastPointer;
    if (!p) return null;
    const at = { clientX: p.x, clientY: p.y };
    // The listener is on document, so EVERY open task panel hears the paste.
    // Only the one under the cursor may claim it.
    if (!this._dropPointEl(at)) return null;
    const zone = this._activeUploadScope(at);
    if (zone) return zone;
    // Inside the panel but over no zone — including over another author's
    // comment, which resolveZone refuses rather than passing through. The
    // composer is where a paste belongs by default; its draft is allocated on
    // demand, exactly as a drop on the composer does.
    if (!this._detailId || !this._mayWriteTasks()) return null;
    return { scope: "comment", key: "comment" };
  }

  // Does this element take typed input? Such an element owns any paste that
  // reaches it — see _onPasteAttach.
  _isTextEntry(el) {
    if (!el || !el.closest) return false;
    return !!el.closest('[contenteditable="true"], input, textarea');
  }

  /**
   * Ctrl/Cmd+V with an image in the clipboard, with nothing editable focused →
   * attach it where the cursor is.
   *
   * Refusals come first and cheapest-first, and preventDefault is called ONLY
   * once we have committed to handling the event, so every paste we decline
   * behaves exactly as it does today. In particular a paste inside a comment
   * editor is already handled by _onEditorPaste (inline image at the caret),
   * which calls preventDefault for an image — focus beats hover, and this sees
   * nothing.
   */
  _onPasteAttach(e) {
    if (!this.el || !e || e.defaultPrevented) return;
    const focused =
      typeof document !== "undefined" ? document.activeElement : null;
    if (this._isTextEntry(e.target) || this._isTextEntry(focused)) return;
    if (!this._detailId) return;
    const files = this._clipboardImages(e);
    if (!files.length) return;
    const zone = this._pasteZone();
    if (!zone) return;
    e.preventDefault();
    return this._attachFilesToZone(
      zone,
      files.map((f, i) => this._namedPasteFile(f, i)),
    );
  }

  /**
   * Install the paste route.
   *
   * On document, because a paste with nothing focused has no target inside the
   * panel to bubble from. Non-capture, so an editor's own onpaste runs first
   * and can claim the event (see _onPasteAttach).
   */
  _installPasteAttach() {
    if (this._pasteHandler || typeof document === "undefined") return;
    this._pasteHandler = (e) => this._onPasteAttach(e);
    document.addEventListener("paste", this._pasteHandler);
    if (!this.el) return;
    // A cursor that has left the panel must not still resolve to a zone: the
    // remembered position is only "where the mouse is" while the mouse is here.
    this._pointerExit = () => {
      this._lastPointer = null;
    };
    this.el.addEventListener("mouseleave", this._pointerExit);
  }

  // Last resort: no event, no pointer. A comment being edited owns the drop
  // surface, and with no position there is nothing to say the drop landed on
  // it — so nothing attaches, rather than the file quietly becoming a task
  // attachment behind the open editor.
  _positionlessScope() {
    return this._formUploadScope();
  }

  // Part/scope key for a resolved zone. resolveZone already computes it —
  // "create" | "detail" | "comment" | "comment-reply" | "comment-row:<id>" —
  // so this is just the null-safe reader that names the pending-list part.
  _scopeKey(s) {
    return s ? s.key : null;
  }

  // The draft object behind a resolved scope, created on demand: a comment can
  // be answered (or its editor opened) before a single character is typed, and
  // the draft is only allocated on first input.
  _draftForScope(s) {
    return this._draftForKey(this._scopeKey(s), { create: true });
  }

  // `create` allocates an empty comment draft when there isn't one yet — only
  // the drop path wants that. Readers (the pending-list refresh, the remove
  // button) pass nothing and get null, so merely rendering can't conjure a
  // draft for a comment nobody is editing.
  _draftForKey(key, { create = false } = {}) {
    if (key === "create") return this._createDefaults;
    if (key === "detail") return this._detailDraft;
    if (key === "comment") {
      if (create && !this._commentDraft) {
        this._commentDraft = { body: "", mention_uids: [] };
      }
      return this._commentDraft;
    }
    if (key === "comment-reply") {
      if (create && !this._replyDraft) {
        this._replyDraft = { body: "", mention_uids: [] };
      }
      return this._replyDraft;
    }
    return null;
  }

  // `zone` is the descriptor the drop handler already resolved (it needs it to
  // decide whether the event may bubble to the desk). Re-resolving here would
  // ask the same question of the same event twice and could answer differently.
  async _onFilesDropped(e, zone) {
    const scope = zone || this._activeUploadScope(e);
    if (!scope) {
      if (typeof Butler !== "undefined" && Butler.say) {
        Butler.say(LOCALE.WRONG_DROP_AREA);
      }
      return;
    }
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    if (!files.length) return;
    return this._attachFilesToZone(scope, files);
  }

  /**
   * Send files to whatever a resolved zone means, and nothing else.
   *
   * The zone→destination rule, held in one place because there is now more than
   * one way to arrive with files and a zone: a drop, and a paste. Same reason
   * resolveZone was factored out for the three drag routes — two entry points
   * that agree by construction rather than by being written twice.
   */
  async _attachFilesToZone(zone, files) {
    if (!zone || !files || !files.length) return;
    // A comment row has no submit, so arriving IS the commit.
    if (zone.scope === "comment-row") {
      return this._dropOnCommentRow(zone.commentId, files);
    }
    const draft = this._draftForScope(zone);
    if (!draft) return;
    await this._stashPendingFiles(draft, files);
    this._refreshPendingList(this._scopeKey(zone));
  }

  // Queues File objects onto a draft's pending list (picker + drag-drop),
  // caching an object URL for image previews. Names are provisional here; the
  // collision-safe one is resolved at upload time (_finalizePendingName).
  async _stashPendingFiles(draft, files) {
    draft.pending_files = draft.pending_files || [];
    let i = 0;
    // Synchronous, exactly as in _stageRowItems: the collision-safe name costs
    // a folder listing, and blocking the push on it left the caller's
    // _refreshPendingList with an empty draft to render. The name here is
    // provisional; _uploadPendingFile finalizes it before sending.
    for (const file of files) {
      const { filename, extension } = this._splitFilename(file.name);
      const localKey = `local:${Date.now()}:${i++}:${file.name}`;
      // status drives the strip's appearance: queued until save, then
      // uploading, then either gone (linked) or error with a retry. Absent is
      // read as "queued" so older entries render unchanged.
      const entry = {
        localKey,
        file,
        filename,
        extension,
        provisional: 1,
        status: "queued",
      };
      if (this._isImageExt(extension)) {
        try {
          entry.previewUrl = URL.createObjectURL(file);
        } catch (_) {}
      }
      draft.pending_files.push(entry);
    }
  }

  _isImageExt(ext) {
    return /^(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i.test(ext || "");
  }

  _splitFilename(name) {
    const safe = String(name || "");
    const dot = safe.lastIndexOf(".");
    if (dot <= 0 || dot === safe.length - 1) {
      return { filename: safe, extension: "" };
    }
    return { filename: safe.slice(0, dot), extension: safe.slice(dot + 1) };
  }

  // Fetches the folder body's current filenames into a lowercase Set, used
  // by _resolveAvailableName. Cleared whenever the create modal reopens
  // (see "add-task" handler) so we re-fetch after each session. Resolves NULL
  // when the listing could not be read — "unknown", which callers must not
  // read as "the folder is empty".
  async _ensureFolderFilenames() {
    if (this._folderFilenames) return this._folderFilenames;
    // One fetch, shared by every concurrent caller. The cache used to be
    // assigned BEFORE the await, so a second caller arriving mid-flight got an
    // empty Set back instantly and de-duplicated against nothing — and a
    // failed fetch cached that emptiness for the life of the panel. "Not known
    // yet" and "the folder is empty" are different answers; only the second
    // one may be cached.
    if (this._folderFilenamesJob) return this._folderFilenamesJob;
    // The four `_folderFilenames = null` resets don't cancel a fetch already in
    // flight, so a job that outlives a scope change must not install names read
    // from the folder we have since left.
    const forNid = this._destNid;
    this._folderFilenamesJob = (async () => {
      try {
        const rows = await this.fetchService({
          service: SERVICE.media.show_node_by,
          hub_id: this._hubId,
          nid: this._destNid,
          type: "all",
          page: 1,
          order: _K.order.descending,
        });
        const names = new Set();
        const list = Array.isArray(rows) ? rows : (rows && rows.rows) || [];
        for (const r of list) {
          const base = r.filename || r.name || "";
          const ext = r.ext || r.extension || "";
          const full = ext ? `${base}.${ext}` : base;
          if (full) names.add(full.toLowerCase());
        }
        if (this._destNid === forNid) this._folderFilenames = names;
      } catch (err) {
        // Leave the cache UNSET so the next attach retries. Callers then see
        // null and de-duplicate against the in-flight entries alone, rather
        // than treating a transport failure as an empty folder forever.
        this.warn && this.warn("folder filename listing failed", err);
      } finally {
        this._folderFilenamesJob = null;
      }
      return this._folderFilenames || null;
    })();
    return this._folderFilenamesJob;
  }

  // Returns { filename, extension } for the next available name. "a.png" with
  // an existing "a.png" yields { filename: "a(1)", extension: "png" }.
  _resolveAvailableName(originalName, { siblings, skip } = {}) {
    const { filename: base, extension } = this._splitFilename(originalName);
    const ext = extension ? `.${extension}` : "";

    const taken = new Set();
    const addName = (raw, e) => {
      const dotExt = e ? `.${e}` : "";
      const n = `${raw || ""}${dotExt}`.toLowerCase();
      if (n) taken.add(n);
    };
    // `skip` is the entry BEING named. It now lives in the very list we scan
    // (the name is resolved at upload time, not before the push), so without
    // this every file would find its own provisional name taken and rename
    // itself to "(1)".
    const add = (f) => {
      if (f && f !== skip) addName(f.filename, f.extension);
    };

    // Folder body filenames. NULL means "not known yet / the listing failed",
    // not "empty" — de-duplication against the local lists below still holds.
    if (this._folderFilenames) {
      for (const n of this._folderFilenames) taken.add(n);
    }
    // The list this entry belongs to: a comment row's in-flight uploads, or a
    // comment / reply draft. Neither was covered by the two task drafts below,
    // so two same-named files dropped on one comment row both claimed the
    // original name and the second overwrote the first in the folder.
    for (const f of siblings || []) add(f);
    // Pending entries on whichever draft is active
    for (const f of this._createDefaults?.pending_files || []) add(f);
    for (const f of this._detailDraft?.pending_files || []) add(f);
    // Already-linked attachments on the open detail task
    if (this._detailId) {
      for (const f of this._attachments[this._detailId] || []) {
        addName(f.filename, f.extension || f.ext);
      }
    }

    if (!taken.has(`${base}${ext}`.toLowerCase())) {
      return { filename: base, extension };
    }
    let i = 1;
    while (taken.has(`${base}(${i})${ext}`.toLowerCase())) i++;
    return { filename: `${base}(${i})`, extension };
  }

  /**
   * Give a staged entry its final, collision-safe filename — once, and at
   * upload time rather than at staging time.
   *
   * This is where the folder listing is waited on. By now the chip is on
   * screen with its spinner, and the wait is hidden behind an upload the user
   * is already watching, instead of standing between the drop and any feedback
   * at all.
   *
   * `siblings` is the list the entry lives in (a row's uploads, a draft's
   * pending_files) so the name is resolved against the files it will actually
   * share a folder with.
   */
  async _finalizePendingName(pf, siblings) {
    if (!pf || !pf.file || !pf.provisional) return;
    await this._ensureFolderFilenames();
    // A retry of the same entry can run this twice; the first one owns it.
    if (!pf.provisional) return;
    const was = pf.extension ? `${pf.filename}.${pf.extension}` : pf.filename;
    const { filename, extension } = this._resolveAvailableName(pf.file.name, {
      siblings,
      skip: pf,
    });
    pf.filename = filename;
    pf.extension = extension;
    pf.provisional = 0;
    const now = extension ? `${filename}.${extension}` : filename;
    // Renamed by a collision: patch the card already on screen rather than
    // re-feeding the strip, which would rebuild every sibling mid-upload.
    if (now !== was) this._patchPendingName(pf, now);
  }

  /**
   * Rewrite one pending card's visible filename in place.
   *
   * Scope-agnostic on purpose: the same entry shape renders as an
   * __attachment-row in a staged strip and as a __comment-attachment chip in a
   * comment row, and _finalizePendingName does not know which. Iterating over
   * data-key rather than building a selector from it, for the same reason as
   * _setPendingStatus: the key carries a filename.
   */
  _patchPendingName(pf, fullName) {
    if (!this.el) return;
    const key = this._pendingKey(pf);
    if (!key) return;
    const pfx = this.fig.family;
    const cards = this.el.querySelectorAll(
      `.${pfx}__attachment-row, .${pfx}__comment-attachment`,
    );
    for (const card of cards) {
      if (card.dataset.key !== key) continue;
      const n = card.querySelector(
        `.${pfx}__attachment-name, .${pfx}__comment-attachment-name`,
      );
      if (n) n.textContent = fullName;
      return;
    }
  }

  // Promise-wrapped uploadFile used by _commitTask. Tags scope so the global
  // onUploadResponse skips this xhr (we resolve via the xhr readystate listener).
  // Accepts the full pending entry so the resolved name (e.g. "a(1).png") is
  // sent as the upload filename instead of the original `file.name` — and, now
  // that staging no longer waits on the folder listing, it is here that the
  // entry's provisional name becomes that resolved one.
  async _uploadPendingFile(pf, siblings) {
    await this._finalizePendingName(pf, siblings);
    return new Promise((resolve, reject) => {
      this._pendingUploadScope = "_commit";
      const params = { hub_id: this._hubId, nid: this._destNid };
      const fullName = pf.extension
        ? `${pf.filename}.${pf.extension}`
        : pf.filename;
      if (fullName && fullName !== pf.file?.name) {
        params.filename = encodeURI(fullName);
      }
      let xhr;
      try {
        xhr = this.uploadFile(pf.file, params);
      } catch (e) {
        this._pendingUploadScope = null;
        return reject(e);
      }
      if (!xhr) {
        this._pendingUploadScope = null;
        return reject(new Error("upload failed to start"));
      }
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState !== 4) return;
        this._pendingUploadScope = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { data } = JSON.parse(xhr.responseText);
            const nid = data?.nid || data?.id;
            if (!nid) return reject(new Error("no nid in upload response"));
            resolve({ nid, data });
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`upload http ${xhr.status}`));
        }
      });
    });
  }

  async onUploadResponse(data) {
    // _commit / _inline scopes are resolved directly via their xhr readystate
    // listeners — skip the global handler so we don't double-link.
    if (
      this._pendingUploadScope === "_commit" ||
      this._pendingUploadScope === "_inline"
    )
      return;
    this._pendingUploadScope = null;

    const taskId = this._pendingLinkTaskId;
    if (!taskId) return;
    this._pendingLinkTaskId = null;
    const fileNid = data?.nid || data?.id;
    if (!fileNid) return;

    const links = await this.postService({
      service: SERVICE.task.link_file,
      hub_id: this._hubId,
      task_id: taskId,
      file_nid: fileNid,
    });
    this._attachments[taskId] = Array.isArray(links) ? links : [];
    this._render();
  }

  // Find an attachment record by nid across committed + both pending drafts
  // (to read its origin hub_id — a dragged file may live in another hub).
  _findAttachmentRecord(fileNid) {
    const lists = [
      this._attachments[this._detailId],
      this._detailDraft && this._detailDraft.pending_files,
      this._createDefaults && this._createDefaults.pending_files,
    ];
    for (const l of lists) {
      if (!Array.isArray(l)) continue;
      const r = l.find((a) => (a.file_nid || a.nid) === fileNid);
      if (r) return r;
    }
    return null;
  }

  /**
   * Open an attachment, showing the click as busy until the viewer is up.
   *
   * node_info plus a Kind load is a visible wait on a cold kind, and until now
   * the chip gave no sign it had been clicked — so it read as a dead control and
   * invited a second click, which would open a second window.
   *
   * The busy flag is cleared in a `finally` because _openAttachmentNode has
   * five ways out: two early returns, a web link opened in a tab, an archive
   * downloaded, and the media window itself (plus its own catch).
   */
  async _openAttachment(fileNid, trigger) {
    const el = trigger && trigger.el;
    if (this._isControlBusy(el)) return;
    this._setControlBusy(el, true);
    try {
      return await this._openAttachmentNode(fileNid);
    } finally {
      this._setControlBusy(el, false);
    }
  }

  // Open an attachment in its player — mirrors the desk WM's open-by-nid path:
  // node_info → media widget from a Backbone.Model → append the app to the WM
  // pool. (Don't call media.initData() — that throws on an unrendered widget.)
  async _openAttachmentNode(fileNid) {
    if (!fileNid || typeof Wm === "undefined") return;
    const rec = this._findAttachmentRecord(fileNid);
    const hub = (rec && rec.hub_id) || this._hubId;
    let r;
    try {
      r = await this.fetchService(
        { service: SERVICE.media.node_info, nid: fileNid, hub_id: hub },
        { async: 1 },
      );
    } catch (_) {}
    if ((!r || !r.filetype) && rec) {
      r = {
        nid: rec.file_nid || rec.nid,
        hub_id: hub,
        filename: rec.filename,
        filetype: rec.filetype || rec.category,
        ext: rec.extension || rec.ext,
      };
    }
    if (!r || !r.filetype) return;
    try {
      const application = require("builtins/window/configs/application");
      const m = new Backbone.Model(r);
      const fType = r.filetype;
      const k = await Kind.waitFor(_a.media);
      const media = new k({ model: m });
      // Web-link / HTML attachments open in a new browser tab (mirrors the
      // media browser's Wm.openContent → window.open). Drumee stores URL
      // shortcuts as `.html` files (filetype "web"); `drumee.note` web files
      // are real notes and fall through to the note editor below.
      const ext = (r.ext || r.extension || "").toLowerCase();
      const isWebLink =
        (fType === _a.web || ext === "html" || ext === "htm") &&
        r.dataType !== "drumee.note";
      if (isWebLink && typeof window !== "undefined") {
        const link = media.srcUrl && media.srcUrl();
        if (link) {
          window.open(link, "_blank");
          return;
        }
      }
      // Archives (zip/rar/7z/tar/gz…) have no viewer — clicking one downloads
      // it straight away rather than opening the props viewer. Trigger a plain
      // browser download from the file's served URL with its real filename.
      const mime = (r.mimetype || "").toLowerCase();
      const isArchive =
        ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz"].includes(ext) ||
        mime.includes("zip") ||
        mime.includes("compressed") ||
        mime.includes("x-tar");
      if (isArchive && typeof document !== "undefined") {
        const href =
          (media.srcUrl && media.srcUrl()) ||
          (media.directUrl && media.directUrl());
        if (href) {
          const name =
            (media.fullname && media.fullname()) ||
            (ext ? `${r.filename}.${ext}` : r.filename || "");
          const a = document.createElement("a");
          a.href = href;
          a.download = name;
          a.rel = "noopener";
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }
      const preset = {
        nid: r.nid || fileNid,
        hub_id: r.hub_id || hub,
        filename: r.filename,
        filetype: fType,
        vhost: r.vhost,
        home_id: r.home_id,
        holder_id: r.holder_id,
        area: r.area,
        privilege: r.privilege,
        useKeyEvent: 1,
        service: "open-node",
        state: _a.on,
        uiHandler: [this],
        media,
        trigger: media,
        radio: _a.on,
      };
      let app = application(fType, preset);
      if (_.isEmpty(app) || !app.kind) app = { ...app, kind: "props_viewer", media };
      app.style = Wm.getWindowPosition(media);
      await Kind.waitFor(app.kind);
      Wm.getWindowsPool().append(app);
    } catch (e) {
      this.warn && this.warn("open attachment failed", e);
    }
  }

  // No-ops: a media node opened from here may resolve us as its parent.
  syncBounds() {}
  syncOrder() {}

  async _unlinkAttachment(trigger) {
    const taskId = trigger.mget("taskId");
    const fileNid = trigger.mget("fileNid");
    if (!taskId || !fileNid) return;
    await this.postService({
      service: SERVICE.task.unlink_file,
      hub_id: this._hubId,
      task_id: taskId,
      file_nid: fileNid,
    });
    this._attachments[taskId] = (this._attachments[taskId] || []).filter(
      (f) => f.file_nid !== fileNid,
    );
    // Surgical update — full _render() would blow away any unsaved
    // title/description/etc. the user is currently editing.
    this._refreshAttachmentsList();
    // Search dropdown's "Linked" badges depend on the attachments set.
    this._refreshFileSearchDropdown("detail");
  }

  // Marks the submit button as loading and blocks re-entry in onUiEvent.
  // Surgical DOM tweak — avoids a re-render that would steal input focus.
  /**
   * Mark one control busy while its own request is in flight.
   *
   * Same data-loading contract as _setSubmitting, and the same spinner in the
   * skin — but scoped to the element that was clicked, and WITHOUT the
   * panel-wide _submitting flag. That flag gates commit-task / commit-detail,
   * and deleting a comment or detaching one of its files has no business
   * disabling the task's own Update button.
   *
   * `swapLabel` is for text buttons (Save), where the label is the only place a
   * spinner can go; icon buttons hide their glyph and spin in its place, which
   * the skin handles.
   */
  _setControlBusy(el, busy, { swapLabel = false } = {}) {
    if (!el || !el.dataset) return;
    if (busy) {
      el.dataset.loading = "1";
      if (swapLabel) {
        el.dataset.label = el.textContent || "";
        el.textContent = LOCALE.LOADING || "Loading…";
      }
      return;
    }
    el.dataset.loading = "0";
    if (swapLabel && el.dataset.label) el.textContent = el.dataset.label;
  }

  _isControlBusy(el) {
    return !!(el && el.dataset && el.dataset.loading === "1");
  }

  _setSubmitting(selector, loading) {
    this._submitting = !!loading;

    // Watchdog against a busy state outliving its operation.
    //
    // The busy state sets data-loading="1" and the skin answers that with
    // `pointer-events: none`, so a commit whose promise never settles would
    // leave the button physically unclickable: no click event, no handler, and
    // nothing on the JS side in a position to recover it. The try/finally and
    // the call-site catches cover success and failure, so this covers only the
    // "never settles" case.
    //
    // 120s rather than something tighter: _commitTask awaits pending-file
    // uploads, which can legitimately run long, and clearing the mutex under a
    // live request would let a second click create a duplicate task. A
    // last-resort net has to fire well past any plausible real operation.
    if (this._submitWatchdog) {
      clearTimeout(this._submitWatchdog);
      this._submitWatchdog = null;
    }
    if (loading) {
      this._submitWatchdog = setTimeout(() => {
        this._submitWatchdog = null;
        if (!this._submitting) return;
        console.warn(
          "[tasks_panel] commit never settled; clearing busy state on",
          selector,
        );
        this._setSubmitting(selector, false);
      }, 120000);
    }

    const btn = this.el?.querySelector(selector);
    if (!btn) return;
    if (loading) {
      btn.dataset.loading = "1";
      btn.dataset.label = btn.textContent || "";
      btn.textContent = LOCALE.LOADING || "Loading…";
    } else {
      btn.dataset.loading = "0";
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
    }
  }

  // Re-feeds just the Due-date sub-part (Duration toggle) of the detail panel
  // or the create modal, so switching single <-> range picker doesn't trigger
  // a full-panel _render() that flickers, rebuilds every picker, steals focus.
  _refreshDueSection(scope = "detail") {
    const isCreate = scope === "create";
    if (isCreate ? !this._creating : !this._detailId) return;
    const partName = isCreate ? "create-due-section" : "due-section";
    this._withPart(partName)
      .then((part) => {
        if (!part || part.isDestroyed?.()) return;
        part.feed(require("./skeleton").buildDueSectionContent(this, scope));
      })
      .catch(() => {
        /* part not mounted yet */
      });
  }

  // Re-feeds just the attachment-rows part of the detail panel.
  _refreshAttachmentsList() {
    const taskId = this._detailId;
    if (!taskId) return;
    const attachments = this._attachments[taskId] || [];
    this._withPart("attachment-rows")
      .then((rows) => {
        if (!rows || rows.isDestroyed?.()) return;
        const skel = require("./skeleton");
        rows.feed(skel.buildAttachmentRowsContent(this, attachments, taskId));
        if (rows.el) rows.el.dataset.empty = attachments.length ? "0" : "1";
      })
      .catch(() => {
        /* part not mounted yet */
      });
  }

  // ── File picker (search-and-link) ─────────────────────────────
  _resetFileSearch() {
    if (this._fileSearchTimer) {
      clearTimeout(this._fileSearchTimer);
      this._fileSearchTimer = null;
    }
    if (this._fileSearchBlurTimer) {
      clearTimeout(this._fileSearchBlurTimer);
      this._fileSearchBlurTimer = null;
    }
    this._fileSearch = {
      query: "",
      results: [],
      scope: null,
      page: 1,
      hasMore: false,
      loading: false,
      loadingMore: false,
    };
  }

  _scheduleFileSearch(trigger) {
    const inputEl = trigger?.el?.querySelector("input");
    const query = String(inputEl?.value || "").trim();
    const scope =
      trigger.mget("searchScope") || (this._creating ? "create" : "detail");
    this._fileSearch.query = query;
    this._fileSearch.scope = scope;
    // Any new query starts a fresh pagination run.
    this._fileSearch.page = 1;
    this._fileSearch.hasMore = false;

    if (this._fileSearchTimer) clearTimeout(this._fileSearchTimer);
    // A single character is too short to be a useful search — clear until the
    // user types more or clears the field entirely (empty → list all below).
    if (query.length === 1) {
      const hadResults = (this._fileSearch.results || []).length > 0;
      this._fileSearch.results = [];
      if (hadResults) this._refreshFileSearchDropdown(scope);
      return;
    }
    // Empty query lists all files; >= 2 chars searches. Both hit the server
    // (debounced) and page 1 replaces whatever was shown.
    this._fileSearchTimer = setTimeout(() => {
      this._runFileSearch(query, scope);
    }, 250);
  }

  // Fetches one page of linkable files. `append` pulls the next page and
  // concatenates it (infinite scroll); otherwise page 1 replaces the results.
  // An empty query lists all files — the procedure returns everything the user
  // can link, most-recent first.
  async _runFileSearch(query, scope, { append = false } = {}) {
    if (append && (this._fileSearch.loading || !this._fileSearch.hasMore)) {
      return;
    }
    // Stale guard: bail if the active query/scope moved on before we started.
    if (this._fileSearch.query !== query || this._fileSearch.scope !== scope) {
      return;
    }
    const page = append ? this._fileSearch.page + 1 : 1;
    const taskId = scope === "detail" ? this._detailId : null;

    this._fileSearch.loading = true;
    if (append) {
      this._fileSearch.loadingMore = true;
      this._refreshFileSearchDropdown(scope, { preserveScroll: true });
    }
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.search_files,
        hub_id: this._hubId,
        pattern: query,
        task_id: taskId || undefined,
        page,
      });
      // The active query/scope may have changed while awaiting — drop late
      // responses so they don't clobber a newer search.
      if (this._fileSearch.query !== query || this._fileSearch.scope !== scope) {
        return;
      }
      const list = Array.isArray(rows) ? rows : [];
      if (append) {
        const seen = new Set(this._fileSearch.results.map((r) => r.nid));
        this._fileSearch.results = this._fileSearch.results.concat(
          list.filter((r) => !seen.has(r.nid)),
        );
        this._fileSearch.page = page;
      } else {
        this._fileSearch.results = list;
        this._fileSearch.page = 1;
      }
      // A full page (page_length rows) may have more behind it; a short or
      // empty page ends the run. Worst case is one trailing empty fetch.
      this._fileSearch.hasMore = list.length > 0;
    } catch (err) {
      if (!append) this._fileSearch.results = [];
      this._fileSearch.hasMore = false;
    } finally {
      this._fileSearch.loading = false;
      this._fileSearch.loadingMore = false;
    }
    this._refreshFileSearchDropdown(scope, { preserveScroll: append });
  }

  // Surgical update of the file-pending-list part — avoids a full _render()
  // that would steal focus from the title/description inputs.
  _refreshPendingList(scope = "create") {
    // Takes the scope KEY, not a resolved scope object: "create" | "detail" |
    // "comment-edit" | "comment-reply", each naming its own part.
    const draft = this._draftForKey(scope);
    const pendingFiles = (draft && draft.pending_files) || [];
    const partName = `file-pending-list-${scope}`;
    this._withPart(partName)
      .then((list) => {
        if (!list || list.isDestroyed?.()) return;
        const skel = require("./skeleton");
        list.feed(skel.buildPendingListContent(this, pendingFiles));
        if (list.el) {
          list.el.dataset.empty = pendingFiles.length ? "0" : "1";
          // Lets _setPendingStatus address one scope's cards without matching
          // the other scope's strip (both are mounted while replying to a
          // comment that is also being edited).
          list.el.dataset.scope = scope;
        }
      })
      .catch(() => {
        /* part not mounted yet */
      });
  }

  // Stable per-entry key: the local one for a file awaiting upload, the nid for
  // a node already in the workspace. Addresses an entry's card in the DOM.
  _pendingKey(f) {
    return String((f && (f.localKey || f.nid)) || "");
  }

  /**
   * Move one entry between statuses.
   *
   * A whole-strip re-feed would be correct but destructive: it rebuilds every
   * sibling card, so a mid-save run of eight files would discard and recreate
   * all eight nodes on every transition. The visuals are CSS-driven off
   * data-status, so one attribute write on that entry's own card is enough —
   * no descriptor rebuild, no sibling churn, nothing for the open editor to
   * notice.
   */
  _setPendingStatus(scopeKey, entry, status) {
    if (!entry) return;
    entry.status = status;
    if (!this.el) return;
    const pfx = this.fig.family;
    // _pendingKey is filename-derived, so a quote or bracket in a name would
    // break or escape a selector. Iterate instead — strips are short, and
    // scopeKey is a controlled value so it needs no escaping.
    const strip = this.el.querySelector(`[data-scope="${scopeKey}"]`);
    if (!strip) return;
    const want = this._pendingKey(entry);
    // Both card shapes: a staged strip renders __attachment-row, a comment row
    // renders the smaller __comment-attachment chip. Only the first was matched
    // here, so a row upload's queued → uploading → error transitions never
    // reached the DOM — the chip only ever showed the status it happened to be
    // built with. That was survivable while the chip was built AFTER the
    // status was set; now that it is painted on drop, the spinner depends on
    // this write.
    const cards = strip.querySelectorAll(
      `.${pfx}__attachment-row, .${pfx}__comment-attachment`,
    );
    for (const card of cards) {
      if (card.dataset.key === want) {
        card.dataset.status = status;
        return;
      }
    }
  }

  _refreshFileSearchDropdown(scope, { preserveScroll = false } = {}) {
    if (!scope) return;
    const partName = `file-search-dropdown-${scope}`;
    this._withPart(partName)
      .then((dropdown) => {
        if (!dropdown || dropdown.isDestroyed?.()) return;
        // feed() recreates the scrollable results element, resetting scrollTop
        // to 0. On an append we capture the current position and restore it on
        // the rebuilt element so the list doesn't jump back to the top.
        const scroller = () =>
          dropdown.el &&
          dropdown.el.querySelector(".tasks-panel__file-search-results");
        const prevScroll = preserveScroll ? scroller()?.scrollTop || 0 : 0;
        const ctx =
          scope === "create"
            ? {
                pendingFiles:
                  (this._createDefaults &&
                    this._createDefaults.pending_files) ||
                  [],
              }
            : {
                existingFiles:
                  (this._detailId && this._attachments[this._detailId]) || [],
                // Detail also has a pending list now — mark those linked too.
                pendingFiles:
                  (this._detailDraft && this._detailDraft.pending_files) || [],
              };
        const skel = require("./skeleton");
        const content = skel.buildFileSearchDropdownContent(this, scope, ctx);
        dropdown.feed(content);
        if (dropdown.el) dropdown.el.dataset.empty = content.length ? "0" : "1";
        if (preserveScroll) {
          const s = scroller();
          if (s) s.scrollTop = prevScroll;
        }
      })
      .catch(() => {
        /* part not mounted yet */
      });
  }

  async _linkSearchResult(trigger) {
    const nid = trigger.mget("fileNid");
    const filename = trigger.mget("fileName");
    const ext = trigger.mget("fileExt");
    const scope = trigger.mget("searchScope");
    if (!nid) return;

    // Both create and detail stash the pick on the active draft — the actual
    // link_file fires from _commitTask / _commitDetail on submit.
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    if (!draft) return;

    const set = new Map(
      (draft.pending_files || []).map((f) => [f.nid || f.localKey, f]),
    );
    if (!set.has(nid)) {
      set.set(nid, { nid, filename, extension: ext });
      draft.pending_files = Array.from(set.values());
    }
    // Close the suggestion dropdown after a pick. We no longer full-render,
    // so clear the search input value in the DOM directly.
    this._resetFileSearch();
    const inputEl = this.el?.querySelector(
      `input[name="file-search-${scope}"]`,
    );
    if (inputEl) inputEl.value = "";
    this._refreshPendingList(scope);
    this._refreshFileSearchDropdown(scope);
  }

  // Does this panel CLAIM a dropped workspace node? Claiming is what stops the
  // folder window from inserting the file into its own body (folder/index.js
  // insertMedia). It is deliberately not the same question as "where does it
  // land" — while a comment is being edited and the pointer is elsewhere the
  // panel still claims the drop, and attachExistingNodes then drops it on the
  // floor, so the drop is a genuine no-op instead of a surprise file in the
  // folder.
  canAttachExisting() {
    // Deliberately broader than "where does it land": claiming is what stops
    // the folder inserting the file into its own body. A claim that then
    // resolves nowhere is a clean no-op plus a Butler message.
    return !!(this._formUploadScope() || this._detailId);
  }

  // Attach dragged workspace node(s) to the open draft. Same-hub files link by
  // nid; cross-hub files are copied in. Returns true if any node was queued.
  // `resolved` comes from the drop that triggered this. Without one — the
  // desk's window-manager route reaches us through the folder's insertMedia,
  // carrying neither event nor coordinates — fall back to what the last drag
  // resolved, then to the pointer, and only then to the positionless rule.
  // Every one of those paths applies the same editing guard, so a drop can
  // never land on the task while a comment owns the surface.
  attachExistingNodes(files, resolved) {
    const scope =
      resolved ||
      this._lastDropScope ||
      this._pointerScope() ||
      this._positionlessScope();
    if (!scope) return false;
    // A comment row has no submit, so the drop IS the commit — _stageRowItems
    // applies the same dedupes and the same cross-hub placeholder path this
    // function does for the staged scopes.
    if (scope.scope === "comment-row") {
      const items = Array.isArray(files) ? files : [files];
      if (!items.length) return false;
      this._dropOnCommentRow(scope.commentId, items);
      return true;
    }
    const draft = this._draftForScope(scope);
    if (!draft) return false;

    const list = Array.isArray(files) ? files : [files];
    draft.pending_files = draft.pending_files || [];
    const seen = new Set(
      draft.pending_files.map((f) => f.nid || f.localKey),
    );
    // A drop fires through both the droppable and the folder insertMedia, so
    // this runs twice; the per-nid timestamp stops cross-hub double-copies.
    this._attachingNids = this._attachingNids || new Map();
    const nowTs = Date.now();
    let added = 0;
    const crossHub = [];
    for (const item of list) {
      const isWidget = item && typeof item.mget === "function";
      const attr = isWidget ? item.model.toJSON() : item || {};
      const nid = attr.nid || attr.file_nid || attr.id;
      if (!nid || seen.has(nid)) continue;
      if (nowTs - (this._attachingNids.get(nid) || 0) < 4000) continue;
      this._attachingNids.set(nid, nowTs);
      if (attr.filetype === _a.hub || attr.filetype === _a.folder) continue;
      seen.add(nid);

      // A foreign-hub file can't be linked by nid (this hub 403s on it) — copy
      // it in via the upload pipeline so it becomes a local attachment. That
      // copy is a fetch of the whole file, the only genuinely slow step on any
      // attach path, and until now it produced NOTHING on screen: the entry
      // was only created once the bytes had arrived. Stand a placeholder in for
      // it immediately, which _queueCrossHubFiles then resolves in place.
      const srcHub = attr.hub_id;
      if (srcHub && srcHub !== this._hubId) {
        const { previewUrl, chartId } = this._attachmentPreview(attr);
        draft.pending_files.push({
          localKey: `xhub:${nid}`,
          crossHubNid: nid,
          filename: attr.filename || attr.user_filename || "",
          extension: attr.extension || attr.ext || "",
          // The foreign hub still serves its own preview, so the placeholder
          // can show the real thumbnail while the bytes are on the way.
          previewUrl,
          iconChartId: chartId,
          status: "downloading",
        });
        crossHub.push(attr);
        added++;
        continue;
      }

      const { previewUrl, chartId } = this._attachmentPreview(attr);
      draft.pending_files.push({
        nid,
        hub_id: srcHub || this._hubId,
        filename: attr.filename || attr.user_filename || "",
        extension: attr.extension || attr.ext || "",
        filetype: attr.filetype || attr.category,
        previewUrl,
        iconChartId: chartId,
        // Already has a nid, so save only has to link it.
        status: "queued",
      });
      added++;
    }
    const key = this._scopeKey(scope);
    if (crossHub.length) this._queueCrossHubFiles(crossHub, scope);
    if (!added) return false;
    this._refreshPendingList(key);
    // Only the task forms carry a file-search dropdown to re-mark as linked.
    if (key === "create" || key === "detail") {
      this._refreshFileSearchDropdown(key);
    }
    return true;
  }

  // Download each foreign-hub file and queue it as an upload into this hub,
  // swapping the placeholder attachExistingNodes left in the strip for the real
  // entry as each one lands — so a run of files resolves one by one instead of
  // all appearing at the end, and a failure stays on screen as an error rather
  // than disappearing into a console warning.
  async _queueCrossHubFiles(attrs, target) {
    // `target` is either a resolved zone (staged scopes, which own a draft) or
    // {list, key} for the row path, which has no draft because a row has no
    // submit. Resolved once here so the splice-by-identity below is identical
    // for both — the staged behaviour must not drift now that it is shared.
    let list;
    if (target && target.list) {
      list = target.list;
    } else {
      const d = this._draftForScope(target);
      if (!d) return;
      d.pending_files = d.pending_files || [];
      list = d.pending_files;
    }
    const key = target && target.key ? target.key : this._scopeKey(target);
    // Shim: _stashPendingFiles and the splice below touch only .pending_files,
    // and this holds the SAME array, so both paths mutate the real list.
    const draft = { pending_files: list };
    const b = (typeof bootstrap === "function" && bootstrap()) || {};
    const endpoint = b.endpoint || "";
    for (const attr of attrs) {
      const placeholder = (draft.pending_files || []).find(
        (f) => f.crossHubNid && String(f.crossHubNid) === String(attr.nid),
      );
      try {
        const ext = String(attr.ext || attr.extension || "");
        let url = `${endpoint}file/orig/${attr.nid}/${attr.hub_id}`;
        if (b.keysel) url += `?keysel=${b.keysel}`;
        const resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) {
          this.warn && this.warn(`cross-hub fetch failed ${resp.status}`, url);
          this._setPendingStatus(key, placeholder, "error");
          continue;
        }
        const blob = await resp.blob();
        const name = `${attr.filename || attr.user_filename || "file"}${ext ? "." + ext : ""}`;
        const file = new File([blob], name, {
          type: blob.type || attr.mimetype || "",
        });
        // Stash first (the upload step resolves its final name), then move
        // the entry it appended to where the placeholder stood, so the strip
        // keeps its drop order. Located by identity, not by index: the user can
        // drop more files while this download is in flight.
        const before = draft.pending_files.length;
        await this._stashPendingFiles(draft, [file]);
        const real = draft.pending_files[before];
        if (real) {
          // The placeholder is about to leave the list, and a caller holding it
          // (the row run's `staged` snapshot) has no other way to find what took
          // its place — which is how a copied cross-hub file used to end up
          // uploaded but never linked, sitting in the strip at "queued".
          if (placeholder) placeholder.replacedBy = real;
          const realAt = draft.pending_files.indexOf(real);
          if (realAt >= 0) draft.pending_files.splice(realAt, 1);
          const at = placeholder ? draft.pending_files.indexOf(placeholder) : -1;
          if (at >= 0) draft.pending_files.splice(at, 1, real);
          else draft.pending_files.push(real); // placeholder was removed meanwhile
        }
        this._refreshPendingList(key);
      } catch (e) {
        this.warn && this.warn("cross-hub attach failed", e);
        this._setPendingStatus(key, placeholder, "error");
      }
    }
    this._refreshPendingList(key);
  }

  _removePendingFile(trigger) {
    // Same reason as comment-cancel: there is no clean way to un-upload.
    if (this._commentSaving) return;
    const nid = trigger.mget("fileNid");
    const localKey = trigger.mget("localKey");
    const keep = (f) => {
      const drop = localKey ? f.localKey === localKey : nid ? f.nid === nid : false;
      if (drop && f.previewUrl) {
        try {
          URL.revokeObjectURL(f.previewUrl);
        } catch (_) {}
      }
      return !drop;
    };
    // Same row template renders in every scope; filter all four drafts and let
    // the surgical refresh skip whichever isn't mounted.
    for (const key of PICK_ATTACHMENT_SCOPES) {
      const draft = this._draftForKey(key);
      if (draft?.pending_files) {
        draft.pending_files = draft.pending_files.filter(keep);
      }
      this._refreshPendingList(key);
    }
    // "Linked" badges in the search dropdown depend on the pending set —
    // refresh both. Only one scope's part can be mounted at a time, so the
    // other simply waits (see _withPart). It does NOT no-op: under ui-core's
    // ensurePart that pending waiter used to clear every OTHER in-flight one
    // when it eventually fired, which is why unrelated refreshes here would
    // occasionally just not happen.
    this._refreshFileSearchDropdown("create");
    this._refreshFileSearchDropdown("detail");
  }

  // Colors live in the skin (keyed on data-theme/data-priority + data-active);
  // these only flip the active flag so the selected pill restyles in place.
  _updateStatusPills(modalSel, pillSel, newStatus) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    root.querySelectorAll(pillSel).forEach((pill) => {
      pill.dataset.active = pill.dataset.status === newStatus ? "1" : "0";
    });
  }

  _updatePriorityPills(modalSel, newPriority) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    root.querySelectorAll(".tasks-panel__priority-pill").forEach((pill) => {
      pill.dataset.active = pill.dataset.priority === newPriority ? "1" : "0";
    });
  }

  // Snapshot the board-title input into state before any in-place update, so a
  // colour pick / toggle can't lose an un-watched final keystroke.
  _captureBoardTitle() {
    const input =
      this.el &&
      this.el.querySelector(
        '.tasks-panel__board-modal input[name="board_title"]',
      );
    if (input) this._boardTitle = String(input.value || "");
  }

  // New-board colour swatches — flip the active flag in place (keyed on the
  // data-theme rendered by the skeleton) so picking a colour never re-renders.
  _updateBoardColors(newTheme) {
    const root = this.el && this.el.querySelector(".tasks-panel__board-modal");
    if (!root) return;
    root.querySelectorAll(".tasks-panel__board-color").forEach((chip) => {
      chip.dataset.active = chip.dataset.theme === newTheme ? "1" : "0";
    });
  }

  _updateLabelOptions(modalSel, selectedLabelIds) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    const labels = this.getLabels();
    const colorById = {};
    labels.forEach((l) => {
      colorById[l.id] = l.color;
    });
    const selectedSet = new Set((selectedLabelIds || []).map(String));
    root.querySelectorAll(".tasks-panel__label-option").forEach((opt) => {
      const id = opt.dataset.labelId;
      const color = colorById[id] || "";
      const selected = selectedSet.has(String(id));
      opt.dataset.selected = selected ? "1" : "0";
      if (selected) {
        opt.style.background = color;
        opt.style.borderColor = color;
        opt.style.color = "";
      } else {
        opt.style.background = "";
        opt.style.borderColor = color;
        opt.style.color = color;
      }
    });
  }

  // Toggle a uid in/out of an assignee array (multi-select). An empty uid is
  // the "Unassigned" row → clears the whole set.
  _toggleAssignee(current, uid) {
    const list = Array.isArray(current) ? current.slice() : [];
    if (!uid) return [];
    const i = list.indexOf(uid);
    if (i >= 0) list.splice(i, 1);
    else list.push(uid);
    return list;
  }

  // Reflect the current assignee set in place: re-feed the chips row and the
  // suggestions (the picked member must leave them), and clear the query.
  // `kind` is "create-assignee" | "detail-assignee". `picked` = a member was
  // just added, so keep the field focused for the next pick; a chip removal
  // leaves focus (and the dropdown's open state) alone.
  _applyAssigneeChange(kind, assignees, picked = false) {
    if (!this.el) return;
    const scope = kind === "create-assignee" ? "create" : "detail";
    this._withPart(`${scope}-assignee-chips`)
      .then((chips) => {
        if (!chips || chips.isDestroyed?.()) return;
        chips.feed(
          require("./skeleton").buildAssigneeChips(
            this,
            assignees,
            this._assigneeScopeService(scope),
          ),
        );
      })
      .catch(() => {
        /* not mounted yet */
      });
    const input = this._assigneeSearchInput(scope);
    if (input) {
      input.value = "";
      // Keep the caret in the field so the next member can be picked or typed
      // straight away — and so the deferred blur close leaves the list open.
      if (picked) input.focus();
    }
    this._filterAssignees(scope, "", picked ? { open: true } : {});
  }

  /**
   * Repaint one reporter picker in place after a pick.
   *
   * Mirrors _applyAssigneeChange, with the two single-select differences: the
   * chip row holds exactly one chip, and the dropdown CLOSES (there is nothing
   * more to pick) instead of staying open for the next member.
   */
  _applyReporterChange(scope) {
    if (!this.el) return;
    const draft = this._pickerDraft(scope);
    const uid = draft && draft.reporter_uid;
    this._withPart(`${scope}-assignee-chips`)
      .then((chips) => {
        if (!chips || chips.isDestroyed?.()) return;
        chips.feed(require("./skeleton").buildReporterChip(this, uid));
      })
      .catch(() => {
        /* not mounted yet */
      });
    const input = this._assigneeSearchInput(scope);
    if (input) {
      input.value = "";
      // Drop focus so the deferred focusout close doesn't reopen the list.
      if (typeof input.blur === "function") input.blur();
    }
    this._closeAssigneeList(scope);
    // The detail panel prints "Created by X" only while the reporter differs
    // from the creator, so that line has to follow the pick.
    this._syncReporterOrigin();
  }

  /**
   * A member's display name, or LOCALE.FORMER_MEMBER once they have left.
   *
   * Same resolution order as the skeleton's fullName/authorName pair, including
   * the Visitor fallback for the window before _loadMembers resolves — so a
   * name written from JS never disagrees with the same name rendered from a
   * skeleton.
   */
  _memberName(uid) {
    if (!uid) return LOCALE.FORMER_MEMBER;
    const m =
      this.getMember(uid) ||
      (String(uid) === String(Visitor.id)
        ? {
            firstname: Visitor.get("firstname"),
            lastname: Visitor.get("lastname"),
          }
        : null);
    if (!m) return LOCALE.FORMER_MEMBER;
    return (
      m.fullname ||
      [m.firstname, m.lastname].filter(Boolean).join(" ").trim() ||
      m.email ||
      LOCALE.FORMER_MEMBER
    );
  }

  /**
   * Keep the detail panel's provenance line in step with the picked reporter.
   *
   * Text-only, in place: rebuilding the row would tear down the picker that was
   * just used (and, mid-edit, the unsaved title/description with it).
   */
  _syncReporterOrigin() {
    if (!this.el) return;
    const note = this.el.querySelector(
      ".tasks-panel__detail-panel .tasks-panel__detail-reporter-time",
    );
    if (!note) return;
    const task = this.getDetailTask();
    const draft = this._detailDraft;
    if (!task) return;
    const reporter =
      (draft && draft.reporter_uid) || task.reporter_uid || task.created_by || "";
    const parts = [];
    if (task.created_by && String(task.created_by) !== String(reporter)) {
      parts.push(`${LOCALE.CREATED_BY} ${this._memberName(task.created_by)}`);
    }
    if (task.ctime) {
      parts.push(Dayjs.unix(Number(task.ctime)).format("MMM D, YYYY HH:mm"));
    }
    note.textContent = parts.join(" · ");
  }

  // ── @-mention (contenteditable description editor) ─────────────
  // The description is a contenteditable div, so tagged members render as
  // styled inline chips and the dropdown anchors to the live caret. The chip
  // carries the uid, so serialization to "[@Name](user:uid)" markers is exact
  // (no fragile name-matching) and that marker form is what we store/send.

  // Per-scope adapter: which DOM element the editor binds to and where it
  // reads/writes its marker text. Decouples the mention editor from any one
  // model so the description (create/detail) and the comment composer can all
  // reuse the same editor logic.
  _mentionTarget(scope) {
    const pfx = this.fig.family;
    switch (scope) {
      case "create":
        return {
          editorSelector: `.${pfx}__create-modal .${pfx}__desc-editor`,
          placeholder: LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
          get: () =>
            (this._createDefaults && this._createDefaults.description) || "",
          set: (text, uids) => {
            if (!this._createDefaults) return;
            this._createDefaults.description = text;
            this._createDefaults.mention_uids = uids;
          },
        };
      case "detail":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__desc-editor`,
          placeholder: LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
          get: () => (this._detailDraft && this._detailDraft.description) || "",
          set: (text, uids) => {
            if (!this._detailDraft) return;
            this._detailDraft.description = text;
            this._detailDraft.mention_uids = uids;
          },
        };
      case "comment":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__comment-input`,
          placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
          get: () => (this._commentDraft && this._commentDraft.body) || "",
          // Spread, not replace: files queued on the composer live on this same
          // draft, and a keystroke must not throw them away (same reason as
          // comment-edit / comment-reply below).
          set: (text, uids) => {
            this._commentDraft = {
              ...(this._commentDraft || {}),
              body: text,
              mention_uids: uids,
            };
          },
        };
      case "comment-edit":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__comment-edit-input`,
          placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
          get: () => (this._commentEditDraft && this._commentEditDraft.body) || "",
          // Spread, not replace: files dropped on the comment live on this same
          // draft, and a keystroke must not throw them away.
          set: (text, uids) => {
            this._commentEditDraft = {
              ...(this._commentEditDraft || {}),
              body: text,
              mention_uids: uids,
            };
          },
        };
      case "comment-reply":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__comment-reply-input`,
          placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
          get: () => (this._replyDraft && this._replyDraft.body) || "",
          // Spread for the same reason as comment-edit above.
          set: (text, uids) => {
            this._replyDraft = {
              ...(this._replyDraft || {}),
              body: text,
              mention_uids: uids,
            };
          },
        };
      default:
        return null;
    }
  }

  _descEditorEl(scope) {
    const t = this._mentionTarget(scope);
    return t && this.el && this.el.querySelector(t.editorSelector);
  }

  // "@" toolbar button: focus the scope's editor, insert an "@" at the caret
  // (or at the end if the caret isn't inside it), then run the normal mention
  // flow so the popup opens — same path as typing "@".
  _insertMentionTrigger(scope) {
    const editorEl = this._descEditorEl(scope);
    if (!editorEl) return;
    // Clicking the button blurs the editor, which scheduled a _closeMention;
    // cancel it so the popup we open below stays open.
    if (this._mentionCloseTimer) {
      clearTimeout(this._mentionCloseTimer);
      this._mentionCloseTimer = null;
    }
    editorEl.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount || !editorEl.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editorEl);
      range.collapse(false); // caret at end
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand("insertText", false, "@");
    this._onDescInput(scope, editorEl);
  }

  // Build a contenteditable=false chip node for a mention.
  _makeMentionChip(uid, name) {
    const chip = document.createElement("span");
    chip.className = `${this.fig.family}__mention-chip`;
    chip.setAttribute("contenteditable", "false");
    chip.dataset.uid = String(uid);
    chip.dataset.name = name;
    chip.textContent = `@${name}`;
    return chip;
  }

  // Served URL for an inline image node (mirrors _attachmentPreview's endpoint
  // logic; "orig" so the pasted image renders full-resolution inline).
  _imageUrlForNid(nid, hub) {
    const h = hub || this._hubId;
    const b = (typeof bootstrap === "function" && bootstrap()) || {};
    const endpoint = b.endpoint || "";
    let url = `${endpoint}file/orig/${nid}/${h}`;
    if (b.keysel) url += `?keysel=${b.keysel}`;
    return url;
  }

  // Build an inline image node. In an editable editor it's a resizable wrapper
  // (contenteditable=false span with a native CSS resize handle); on read-only
  // surfaces (comment bodies) it's a plain, non-resizable <img>.
  _makeInlineImage(nid, hub, width, editable) {
    const img = document.createElement("img");
    img.src = this._imageUrlForNid(nid, hub);
    img.setAttribute("draggable", "false");
    img.alt = "";
    if (!editable) {
      img.className = `${this.fig.family}__inline-img-static`;
      if (width) img.style.width = `${width}px`;
      return img;
    }
    const wrap = document.createElement("span");
    wrap.className = `${this.fig.family}__inline-img`;
    wrap.setAttribute("contenteditable", "false");
    wrap.dataset.nid = String(nid);
    if (hub) wrap.dataset.hub = String(hub);
    if (width) wrap.style.width = `${width}px`;
    wrap.appendChild(img);
    return wrap;
  }

  // Anchor node for a hyperlink. In an editor it is contenteditable=false so it
  // behaves as one atomic chip, like a mention.
  _makeLinkNode(label, href, editable) {
    const a = document.createElement("a");
    a.className = `${this.fig.family}__link`;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.dataset.href = href; // serialize from this, not the browser-normalised href
    a.textContent = label;
    if (editable) {
      a.setAttribute("contenteditable", "false");
      // A single click opens the link, matching a posted comment's body. Opened
      // explicitly rather than by the anchor's own default: inside an editing
      // host the engine suppresses that navigation, which is why Ctrl/Cmd+click
      // used to be the only thing that worked (and on macOS, not even that).
      // A modified click is left to the browser so its background-tab /
      // new-window behaviour is unchanged. The caret is unaffected either way —
      // it is placed on pointerdown, and this anchor is contenteditable=false
      // so the caret never sat inside it.
      a.onclick = (ev) => {
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        // mailto: is handed to the mail client; window.open would additionally
        // leave a blank tab behind. safeUrl admits no other non-http scheme.
        if (/^mailto:/i.test(href)) window.location.href = href;
        else window.open(href, "_blank", "noopener");
      };
    }
    return a;
  }

  // Render stored marker text into the editor as text nodes, chip spans,
  // inline images, and links.
  _renderEditorContent(editorEl, markerText) {
    editorEl.textContent = "";
    const text = String(markerText || "");
    const editable = editorEl.getAttribute("contenteditable") === "true";
    const appendText = (str) => {
      str.split("\n").forEach((part, i) => {
        if (i > 0) editorEl.appendChild(document.createElement("br"));
        if (!part) return;
        // Read-only only: linkifying in an editor would turn every half-typed
        // address into an atomic chip under the caret. There, Ctrl+K does it.
        if (editable) {
          editorEl.appendChild(document.createTextNode(part));
          return;
        }
        linkifyTokens(part).forEach((tok) => {
          editorEl.appendChild(
            tok.url
              ? this._makeLinkNode(tok.label, tok.url, false)
              : document.createTextNode(tok.text),
          );
        });
      });
    };
    const re = contentTokenRe();
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) appendText(text.slice(last, m.index));
      if (m[2] != null) {
        editorEl.appendChild(this._makeMentionChip(m[2], m[1]));
      } else if (m[3] != null) {
        editorEl.appendChild(
          this._makeInlineImage(m[3], m[4], m[5], editable),
        );
      } else if (m[7] != null) {
        // A rejected scheme renders as its label, never as a live href.
        const href = safeUrl(m[7]);
        editorEl.appendChild(
          href
            ? this._makeLinkNode(m[6], href, editable)
            : document.createTextNode(m[6]),
        );
      }
      last = re.lastIndex;
    }
    if (last < text.length) appendText(text.slice(last));
  }

  // Editor DOM → marker text. Chips become "[@Name](user:uid)"; <br>/<div>
  // boundaries become newlines.
  _serializeEditor(editorEl) {
    const chipClass = `${this.fig.family}__mention-chip`;
    const imgClass = `${this.fig.family}__inline-img`;
    let out = "";
    const walk = (node) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          out += n.textContent;
        } else if (n.nodeType === 1) {
          if (n.classList && n.classList.contains(chipClass)) {
            const uid = n.dataset.uid;
            const name = n.dataset.name || n.textContent.replace(/^@/, "");
            out += `[@${name}](user:${uid})`;
          } else if (n.classList && n.classList.contains(imgClass)) {
            const w = parseInt(n.style.width, 10) || 0;
            out += imgMarker(n.dataset.nid, n.dataset.hub, w || undefined);
          } else if (n.tagName === "A") {
            const href = safeUrl(n.dataset.href || n.getAttribute("href"));
            const label = (n.textContent || "").trim();
            if (!href || !label) walk(n);
            // A link that reads as its own target needs no marker — read-only
            // rendering re-links the bare URL anyway.
            else if (label === href) out += label;
            else out += linkMarker(label, href);
          } else if (n.tagName === "BR") {
            out += "\n";
          } else if (n.tagName === "DIV") {
            if (out && !out.endsWith("\n")) out += "\n";
            walk(n);
          } else {
            walk(n);
          }
        }
      });
    };
    walk(editorEl);
    return out;
  }

  _collectMentionUids(editorEl) {
    const uids = [];
    editorEl
      .querySelectorAll(`.${this.fig.family}__mention-chip`)
      .forEach((c) => {
        const u = String(c.dataset.uid || "");
        if (u && !uids.includes(u)) uids.push(u);
      });
    return uids;
  }

  // Seed the editor from the draft and wire its events. Idempotent and called
  // from both onPartReady and _prepopulateInputs (onPartReady alone doesn't
  // reliably re-fire on reopen); only re-renders when the DOM differs from the
  // draft, so an active caret isn't disturbed.
  _initDescEditor(editorEl, scope) {
    if (!editorEl) return;
    const target = this._mentionTarget(scope);
    if (!target) return;
    // Guarantee the placeholder attr even if the framework dropped attrOpt.
    if (!editorEl.getAttribute("data-placeholder") && target.placeholder) {
      editorEl.setAttribute("data-placeholder", target.placeholder);
    }
    const want = target.get();
    if (this._serializeEditor(editorEl) !== want) {
      this._renderEditorContent(editorEl, want);
    }
    editorEl.oninput = () => this._onDescInput(scope, editorEl);
    editorEl.onkeydown = (e) => this._onDescKeydown(e, scope);
    // Store the timer so the "@" toolbar button can cancel it — clicking the
    // button blurs the editor, which would otherwise close the popup we're about
    // to open (see _insertMentionTrigger).
    editorEl.onblur = () => {
      this._mentionCloseTimer = setTimeout(() => this._closeMention(), 150);
    };
    editorEl.onpaste = (e) => this._onEditorPaste(e, scope, editorEl);
  }

  // Clipboard image (screenshot / copied external image): upload it, then
  // insert a resizable inline image at the caret. Rich text is rebuilt as text
  // + links rather than left to the browser, which would drop a document's
  // worth of foreign markup into the editor for the serializer to throw away.
  _onEditorPaste(e, scope, editorEl) {
    const dt = e.clipboardData;
    if (!dt) return;
    let file = null;
    const items = dt.items || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && /^image\//.test(it.type || "")) {
        file = it.getAsFile();
        break;
      }
    }
    if (file) {
      e.preventDefault();
      // A comment being EDITED attaches instead of inlining. That row is the
      // same surface a drop and the paperclip beside it already attach to
      // (comment-row:<id>), and it commits now for the same reason: a row has
      // no submit of its own for files. Deliberately this scope ONLY — the
      // composer, the reply box and the two description editors keep the inline
      // image at the caret.
      //
      // Takes every image in the clipboard, not just the first: the attachment
      // strip holds a list, where the caret could only ever take one.
      if (scope === "comment-edit" && this._editingCommentId) {
        const imgs = this._clipboardImages(e);
        return this._dropOnCommentRow(
          this._editingCommentId,
          (imgs.length ? imgs : [file]).map((f, i) => this._namedPasteFile(f, i)),
        );
      }
      // Capture the caret now — the async upload would otherwise lose it.
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount && editorEl.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0).cloneRange();
      }
      return this._insertPastedImage(file, scope, editorEl, range);
    }

    const html = dt.getData("text/html");
    const plain = (dt.getData("text/plain") || "").trim();
    if (!html && !plain) return;

    // Pasting a URL onto selected words hyperlinks them instead of replacing.
    const url = /\s/.test(plain) ? null : safeUrl(plain);
    const sel = window.getSelection();
    const selected =
      sel && sel.rangeCount && editorEl.contains(sel.anchorNode)
        ? sel.getRangeAt(0).toString().trim()
        : "";
    if (url && selected) {
      e.preventDefault();
      const frag = document.createDocumentFragment();
      frag.appendChild(this._makeLinkNode(selected, url, true));
      this._insertAtCaret(frag, editorEl);
      return this._onDescInput(scope, editorEl);
    }

    // Plain text carries no markup to sanitise, so leave it to the browser —
    // that keeps it on the native undo stack, which a scripted insert isn't.
    if (!html) return;

    e.preventDefault();
    this._insertAtCaret(this._pasteFragment(html, plain), editorEl);
    this._onDescInput(scope, editorEl);
  }

  // Clipboard payload → a fragment of what this editor can store: text, line
  // breaks and links. Everything else collapses to its text, which is all the
  // serializer would have kept anyway.
  _pasteFragment(html, plain) {
    const frag = document.createDocumentFragment();
    const addText = (str, collapse) => {
      // HTML source whitespace is collapsed by the renderer; plain text is not.
      const s = collapse ? String(str).replace(/[\t\r\n]+/g, " ") : String(str);
      if (!s) return;
      s.split("\n").forEach((part, i) => {
        if (i > 0) frag.appendChild(document.createElement("br"));
        if (part) frag.appendChild(document.createTextNode(part));
      });
    };
    if (!html) {
      addText(plain, false);
      return frag;
    }
    const BLOCK = /^(?:DIV|P|LI|TR|H[1-6]|BLOCKQUOTE|SECTION|ARTICLE|UL|OL)$/;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const walk = (node) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) return addText(n.textContent, true);
        if (n.nodeType !== 1) return;
        if (n.tagName === "A") {
          const href = safeUrl(n.getAttribute("href"));
          const label = (n.textContent || "").replace(/\s+/g, " ").trim();
          if (href && label) frag.appendChild(this._makeLinkNode(label, href, true));
          else addText(n.textContent, true);
          return;
        }
        if (n.tagName === "BR") return frag.appendChild(document.createElement("br"));
        if (n.tagName === "SCRIPT" || n.tagName === "STYLE") return;
        if (BLOCK.test(n.tagName) && frag.lastChild) {
          frag.appendChild(document.createElement("br"));
        }
        walk(n);
      });
    };
    walk(doc.body);
    // An HTML flavour that sanitises to nothing (wrapper-only markup) must not
    // swallow the paste — and _insertAtCaret would still drop the selection.
    if (!frag.firstChild) addText(plain, false);
    return frag;
  }

  // Drop a fragment where the caret is, then put the caret after it.
  _insertAtCaret(frag, editorEl) {
    const last = frag.lastChild;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorEl.contains(sel.anchorNode)) {
      editorEl.appendChild(frag);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(frag);
    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  async _insertPastedImage(file, scope, editorEl, range) {
    let res;
    try {
      res = await this._uploadInlineImage(file);
    } catch (err) {
      console.error("[tasks_panel] inline image upload failed:", err);
      return;
    }
    if (!editorEl.isConnected) return;
    const node = this._makeInlineImage(res.nid, res.hub, null, true);
    if (range && editorEl.contains(range.startContainer)) {
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorEl.appendChild(node);
    }
    // Pasted images default to a small size (still resizable up via the handle).
    // Cap at the image's natural width so a small image isn't upscaled, then
    // re-sync so the width is stored in the draft marker.
    const DEFAULT_W = 220;
    const img = node.querySelector && node.querySelector("img");
    const applySmall = () => {
      if (!node.isConnected) return;
      const nat = img && img.naturalWidth ? img.naturalWidth : DEFAULT_W;
      node.style.width = `${Math.min(DEFAULT_W, nat)}px`;
      this._onDescInput(scope, editorEl);
    };
    if (img && img.complete && img.naturalWidth) applySmall();
    else if (img) img.addEventListener("load", applySmall, { once: true });
    else node.style.width = `${DEFAULT_W}px`;
    // Sync the draft from the mutated editor (initial; width sync follows onload).
    this._onDescInput(scope, editorEl);
  }

  // Promise-wrapped upload for a raw clipboard image File. Tags scope so the
  // global onUploadResponse skips it (resolved here via the readystate listener).
  _uploadInlineImage(file) {
    return new Promise((resolve, reject) => {
      this._pendingUploadScope = "_inline";
      const params = { hub_id: this._hubId, nid: this._destNid };
      let xhr;
      try {
        xhr = this.uploadFile(file, params);
      } catch (e) {
        this._pendingUploadScope = null;
        return reject(e);
      }
      if (!xhr) {
        this._pendingUploadScope = null;
        return reject(new Error("upload failed to start"));
      }
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState !== 4) return;
        this._pendingUploadScope = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { data } = JSON.parse(xhr.responseText);
            const nid = data?.nid || data?.id;
            if (!nid) return reject(new Error("no nid in upload response"));
            resolve({ nid, hub: data?.hub_id || this._hubId });
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`upload http ${xhr.status}`));
        }
      });
    });
  }

  _onDescInput(scope, editorEl) {
    // Browsers leave a stray <br> when the field is cleared, which defeats the
    // :empty placeholder — strip it back to truly empty. But an image-only
    // editor has no text content, so guard on chips AND inline images too,
    // otherwise a freshly pasted (text-less) image would be wiped here.
    if (
      !editorEl.textContent.trim() &&
      !editorEl.querySelector(`.${this.fig.family}__mention-chip`) &&
      !editorEl.querySelector(`.${this.fig.family}__inline-img`)
    ) {
      editorEl.innerHTML = "";
    }
    const target = this._mentionTarget(scope);
    if (target) {
      target.set(
        this._serializeEditor(editorEl),
        this._collectMentionUids(editorEl),
      );
    }
    this._handleEditorMention(editorEl, scope);
  }

  // Escape hook, called by the desk (ESCAPE_MODAL_KINDS) BEFORE it closes the
  // host window. Returns true when this panel consumed the press. Closing goes
  // through the same services as the modals' own X / Cancel — onUiEvent reads
  // `args.service` first, so passing null for the trigger is safe.
  //
  // The create modal is checked first: it sits on top of the panel, so it is the
  // innermost layer. Each service discards its draft exactly as its own X does
  // (cancel-add clears _createDefaults, close-detail runs _closeDetailSilently)
  // — Escape adds no new discard path, it just reaches the existing one.
  onEscape() {
    if (this._creating) {
      this.onUiEvent(null, { service: "cancel-add" });
      return true;
    }
    if (this._detailId) {
      this.onUiEvent(null, { service: "close-detail" });
      return true;
    }
    return false;
  }

  _onDescKeydown(e, scope) {
    // Before the mention guard — Ctrl/Cmd+K works whether or not a mention
    // popup happens to be open.
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      this._closeMention();
      return this._openLinkPrompt(scope);
    }
    const ref = this._mention;
    const mentionOpen = !!ref && ref.scope === scope;
    // A bare Enter posts on the comment surfaces; Shift+Enter keeps its newline,
    // as does any other modifier. Two things must never post: the mention popup,
    // which owns Enter to pick the highlighted member (handled below), and an IME
    // composition — there Enter commits the candidate, so posting on it would
    // send a half-typed word. Matching e.key (not e.code) is deliberate: an IME
    // reports the commit keystroke as key="Process", which this test skips on its
    // own; isComposing covers the keydown that ends composition and keyCode 229
    // is the legacy sentinel for the same thing.
    if (
      !mentionOpen &&
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.isComposing &&
      e.keyCode !== 229 &&
      COMMENT_SUBMIT_BY_SCOPE[scope]
    ) {
      e.preventDefault();
      return this[COMMENT_SUBMIT_BY_SCOPE[scope]]();
    }
    // Cmd/Ctrl/Alt+Enter inserts a line break. ui-core's RichText already treats
    // any modified Enter as one (its flag is literally named _enterUsesLineBreak
    // and lists shift/meta/ctrl/alt) but it only ALLOWS the browser default, and
    // the browser inserts nothing for a modified Enter — confirmed on Windows/Edge
    // as well as Lexis's Mac, so this is not a macOS quirk. Alt is in the set
    // because Alt/Option+Enter is the in-cell line break in every spreadsheet
    // (Excel, Sheets, and the OnlyOffice editor Drumee embeds), so the habit
    // carries over.
    // PLAIN Shift+Enter is the one combination left alone: the browser does insert
    // a <br> for that, and acting here too would double the break. Shift WITH
    // another modifier still lands here, because the browser inserts nothing then.
    if (
      !mentionOpen &&
      e.key === "Enter" &&
      (e.ctrlKey || e.metaKey || e.altKey) &&
      !e.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault();
      // execCommand keeps the break on the native undo stack, unlike the manual
      // range surgery the paste / mention / link paths use. A <br> is what
      // _serializeEditor maps to "\n", so it round-trips through a save.
      // insertLineBreak is not in every engine; insertHTML is the fallback, and
      // if both refuse we are simply back to today's no-op.
      const el = this._descEditorEl(scope);
      if (!document.execCommand("insertLineBreak")) {
        document.execCommand("insertHTML", false, "<br>");
      }
      // execCommand fires `input`, which syncs the draft — but sync explicitly so
      // the break cannot be lost on save if an engine skips that event.
      if (el) this._onDescInput(scope, el);
      return;
    }
    if (!mentionOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      return this._closeMention();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = ref.members.length;
      ref.index = (ref.index + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      return this._highlightMention(ref);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      return this._insertMentionChip(scope, ref.members[ref.index]);
    }
  }

  // Detect an unterminated "@token" immediately before a collapsed caret and
  // open the filtered dropdown. "@" alone lists everyone.
  _handleEditorMention(editorEl, scope) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return this._closeMention();
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (!range.collapsed || node.nodeType !== 3 || !editorEl.contains(node))
      return this._closeMention();
    const m = node.textContent.slice(0, range.startOffset).match(/@([^\s@]*)$/);
    if (!m) return this._closeMention();
    const filter = m[1].toLowerCase();
    const members = (this._members || [])
      .filter((mm) => {
        if (!filter) return true;
        const name = [mm.firstname, mm.lastname]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          name.includes(filter) ||
          String(mm.email || "").toLowerCase().includes(filter)
        );
      })
      .slice(0, 8);
    if (!members.length) return this._closeMention();
    this._mention = {
      scope,
      node,
      start: range.startOffset - m[0].length,
      end: range.startOffset,
      members,
      index: 0,
      dropdownEl: null,
    };
    this._openMention(scope, members, editorEl);
  }

  _openMention(scope, members, editorEl) {
    const skel = require("./skeleton");
    this._withPart(`${scope}-mention`)
      .then((part) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        part.feed(skel.buildMentionItemsContent(this, members));
        const root = part.el;
        if (!root || !this._mention || this._mention.scope !== scope) return;
        this._mention.dropdownEl = root;
        root
          .querySelectorAll(`.${this.fig.family}__mention-item`)
          .forEach((el, i) => {
            el.dataset.active = i === 0 ? "1" : "0";
            // Keep caret/selection in the editor through the click.
            el.onmousedown = (ev) => ev.preventDefault();
            el.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              this._insertMentionChip(scope, members[i]);
            };
          });
        this._positionMentionAtCaret(root, editorEl);
        root.dataset.open = "1";
      })
      .catch(() => {
        /* not mounted yet */
      });
  }

  // Position the popup just under the "@" text, anchored relative to the
  // __desc-field (absolute, not fixed): windows are placed via CSS transform,
  // so fixed coords would resolve against the window box and land outside. The
  // caret rect comes from the @token range (a collapsed-caret rect is often
  // empty); coordinates are field-relative, so transforms cancel out.
  _positionMentionAtCaret(el, editorEl) {
    const ref = this._mention;
    let caret = null;
    if (ref && ref.node && ref.node.isConnected) {
      try {
        const r = document.createRange();
        r.setStart(ref.node, Math.max(0, ref.start));
        r.setEnd(ref.node, Math.min(ref.end, ref.node.length));
        caret = r.getBoundingClientRect();
      } catch (_) {
        /* offsets shifted — fall through */
      }
    }
    if (!caret || (!caret.width && !caret.height)) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) caret = sel.getRangeAt(0).getBoundingClientRect();
    }
    this._positionPopupAtCaret(el, editorEl, caret);
  }

  // Shared by the mention dropdown and the link prompt.
  _positionPopupAtCaret(el, editorEl, caret) {
    // The editor's wrapper is the positioning context (position: relative); the
    // popup is its sibling. Using the parent (not a fixed class) keeps this
    // generic across the description field and the comment composer.
    const field = editorEl.parentNode;
    if (!field) return;
    if (!caret || (!caret.width && !caret.height && !caret.left && !caret.top)) {
      caret = editorEl.getBoundingClientRect();
    }
    const fieldRect = field.getBoundingClientRect();
    const maxH = 220;
    el.style.left = `${Math.round(caret.left - fieldRect.left)}px`;
    // Flip above the caret line when there isn't room below in the viewport.
    if (window.innerHeight - caret.bottom < maxH) {
      el.style.top = "auto";
      el.style.bottom = `${Math.round(fieldRect.bottom - caret.top + 4)}px`;
    } else {
      el.style.bottom = "auto";
      el.style.top = `${Math.round(caret.bottom - fieldRect.top + 4)}px`;
    }
  }

  _highlightMention(ref) {
    if (!ref || !ref.dropdownEl) return;
    ref.dropdownEl
      .querySelectorAll(`.${this.fig.family}__mention-item`)
      .forEach((el, i) => {
        el.dataset.active = i === ref.index ? "1" : "0";
      });
  }

  _closeMention() {
    if (!this._mention) return;
    this._mention = null;
    if (!this.el) return;
    this.el
      .querySelectorAll(`.${this.fig.family}__mention-dropdown`)
      .forEach((d) => {
        d.dataset.open = "0";
      });
  }

  // The link node the caret sits in, if any (Ctrl+K then edits it in place).
  _closestLink(node, editorEl) {
    let n = node;
    while (n && n !== editorEl) {
      if (n.nodeType === 1 && n.tagName === "A") return n;
      n = n.parentNode;
    }
    return null;
  }

  // Ctrl+K. Remembers the caret range up front — focusing the prompt's input
  // blurs the editor and drops the live selection.
  _openLinkPrompt(scope) {
    const editorEl = this._descEditorEl(scope);
    if (!editorEl) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorEl.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0).cloneRange();
    const anchor = this._closestLink(sel.anchorNode, editorEl);
    const ref = {
      scope,
      range,
      anchor,
      label: range.toString().trim(),
      rect: range.getBoundingClientRect(),
    };
    this._linkPrompt = ref;
    const skel = require("./skeleton");
    this._withPart(`${scope}-link`)
      .then((part) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        if (this._linkPrompt !== ref) return;
        part.feed(
          skel.buildLinkPromptContent(this, {
            url: anchor ? anchor.dataset.href || anchor.href : "",
          }),
        );
        const root = part.el;
        if (!root) return;
        ref.rootEl = root;
        root.querySelectorAll(`.${this.fig.family}__link-prompt-btn`).forEach(
          (el) => {
            // Keep the editor's stored range intact through the click.
            el.onmousedown = (ev) => ev.preventDefault();
            el.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              const act = el.dataset.act;
              if (act === "apply") this._applyLinkPrompt();
              else if (act === "remove") this._removeLinkPrompt();
              else this._closeLinkPrompt();
            };
          },
        );
        const input = root.querySelector("input");
        if (input) {
          ref.inputEl = input;
          input.onkeydown = (ev) => {
            if (ev.key !== "Enter" && ev.key !== "Escape") return;
            ev.preventDefault();
            ev.stopPropagation(); // don't let the editor/panel also act on it
            if (ev.key === "Enter") this._applyLinkPrompt();
            else this._closeLinkPrompt();
          };
        }
        this._positionPopupAtCaret(root, editorEl, ref.rect);
        root.dataset.open = "1";
        if (input) {
          input.focus();
          input.select();
        }
      })
      .catch(() => {
        /* not mounted yet */
      });
  }

  _applyLinkPrompt() {
    const ref = this._linkPrompt;
    if (!ref) return;
    const href = safeUrl(ref.inputEl ? ref.inputEl.value : "");
    const editorEl = this._descEditorEl(ref.scope);
    // Empty or refused scheme: close rather than write a dead link.
    if (!href || !editorEl) return this._closeLinkPrompt();
    if (ref.anchor && ref.anchor.isConnected) {
      ref.anchor.href = href;
      ref.anchor.dataset.href = href;
    } else {
      const node = this._makeLinkNode(ref.label || href, href, true);
      const range = ref.range;
      // The remembered range dies if the panel re-rendered while the prompt was
      // open — append rather than write into a detached tree.
      if (range && editorEl.contains(range.startContainer)) {
        range.deleteContents();
        range.insertNode(node);
      } else {
        editorEl.appendChild(node);
      }
      // A trailing space so the next keystroke isn't typed into the link.
      const tail = document.createTextNode(" ");
      node.parentNode.insertBefore(tail, node.nextSibling);
      const sel = window.getSelection();
      const after = document.createRange();
      after.setStart(tail, 1);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
    const scope = ref.scope;
    this._closeLinkPrompt();
    editorEl.focus();
    this._onDescInput(scope, editorEl);
  }

  _removeLinkPrompt() {
    const ref = this._linkPrompt;
    if (!ref) return;
    const editorEl = this._descEditorEl(ref.scope);
    if (ref.anchor && ref.anchor.isConnected) {
      // Unwrap: the words survive, only the link goes.
      ref.anchor.replaceWith(document.createTextNode(ref.anchor.textContent));
    }
    const scope = ref.scope;
    this._closeLinkPrompt();
    if (editorEl) {
      editorEl.focus();
      this._onDescInput(scope, editorEl);
    }
  }

  _closeLinkPrompt() {
    if (!this._linkPrompt) return;
    this._linkPrompt = null;
    if (!this.el) return;
    this.el
      .querySelectorAll(`.${this.fig.family}__link-prompt`)
      .forEach((d) => {
        d.dataset.open = "0";
      });
  }

  // Replace the "@token" range in the caret's text node with a chip + space.
  _insertMentionChip(scope, member) {
    const ref = this._mention;
    this._closeMention();
    if (!ref || !member) return;
    const node = ref.node;
    if (!node || node.nodeType !== 3 || !node.isConnected) return;
    const editorEl = this._descEditorEl(scope);
    if (!editorEl) return;
    const uid = String(member.id || member.uid || "");
    const name =
      [member.firstname, member.lastname].filter(Boolean).join(" ").trim() ||
      member.email ||
      uid;
    if (!uid) return;

    const full = node.textContent;
    const parent = node.parentNode;
    const chip = this._makeMentionChip(uid, name);
    const space = document.createTextNode(" ");
    const afterNode = document.createTextNode(full.slice(ref.end));
    node.textContent = full.slice(0, ref.start);
    parent.insertBefore(afterNode, node.nextSibling);
    parent.insertBefore(space, afterNode);
    parent.insertBefore(chip, space);

    const range = document.createRange();
    range.setStart(afterNode, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    editorEl.focus();

    const target = this._mentionTarget(scope);
    if (target) {
      target.set(
        this._serializeEditor(editorEl),
        this._collectMentionUids(editorEl),
      );
    }
  }

  _prepopulateInputs() {
    if (!this.el) return;
    const setVal = (sel, val) => {
      const el = this.el.querySelector(sel);
      if (el && (val || "") !== el.value) el.value = val || "";
    };
    // The description editor is contenteditable; populate it here too (not just
    // in onPartReady, which doesn't reliably re-fire on reopen).
    const initEditor = (sel, scope) => {
      const ed = this.el.querySelector(sel);
      if (ed) this._initDescEditor(ed, scope);
    };
    // The filter popup's keyword box, for the paths that DO full-render (a
    // checkbox click, "Clear", a view switch). ui-core only seeds <input> values
    // 200ms after the feed, so without this the field sits visibly empty for a
    // fifth of a second every time. Live typing never gets here — it takes the
    // surgical _refreshViewBody path instead.
    if (this._pickerOpen === "filter") {
      setVal(
        '.tasks-panel__filter-picker [name="filter_keyword"]',
        (this._filters || {}).keyword,
      );
    }
    if (this._creating && this._createDefaults) {
      setVal(
        '.tasks-panel__create-modal [name="title"]',
        this._createDefaults.title,
      );
      initEditor(
        ".tasks-panel__create-modal .tasks-panel__desc-editor",
        "create",
      );
    }
    if (this._detailDraft) {
      setVal(
        '.tasks-panel__detail-panel [name="title"]',
        this._detailDraft.title,
      );
      initEditor(
        ".tasks-panel__detail-panel .tasks-panel__desc-editor",
        "detail",
      );
      initEditor(
        ".tasks-panel__detail-panel .tasks-panel__comment-input",
        "comment",
      );
      if (this._editingCommentId) {
        initEditor(
          ".tasks-panel__detail-panel .tasks-panel__comment-edit-input",
          "comment-edit",
        );
      }
      if (this._replyingTo) {
        initEditor(
          ".tasks-panel__detail-panel .tasks-panel__comment-reply-input",
          "comment-reply",
        );
      }
    }
  }

  _mergeTask(row) {
    if (!row || !row.id) return;
    const normalized = this._normalizeTask(row);
    const idx = this._tasks.findIndex((t) => t.id === row.id);
    if (idx === -1) this._tasks.push(normalized);
    else this._tasks[idx] = { ...this._tasks[idx], ...normalized };
    // Replacing a row in place changes neither the array's identity nor its
    // length, so _childIndex's guard cannot see it — and it would keep handing
    // out the superseded object. Drop the cache here.
    this._childIdx = null;
  }

  // Heavy view switches: _render() re-feeds the WHOLE panel synchronously, so
  // on a big task set the browser paints nothing between the click and the
  // finished new view — the link feels dead. Flag data-view-loading (the skin
  // shows a veil + spinner over the current view), let that frame PAINT (double
  // rAF), then run the full render and clear the flag. The attribute lives on
  // this.el, which feed() never replaces, so the veil survives until cleared.
  // Close an overlay (task detail / create modal) INSTANTLY: hide its DOM
  // this frame, then rebuild the board deferred. The overlay is only truly
  // removed by the full re-feed, which on a busy board takes long enough
  // that the X felt stuck (tester 2026-07-30: click close → delay → popup
  // finally disappears).
  _dismissOverlayNow(cls) {
    if (!this.el) return;
    const el = this.el.querySelector(`.${this.fig.family}__${cls}`);
    if (el) el.style.display = "none";
  }

  _renderDeferred() {
    if (this.isDestroyed && this.isDestroyed()) return;
    if (this.el) this.el.dataset.viewLoading = 1;
    const run = () => {
      if (this.isDestroyed && this.isDestroyed()) return;
      try {
        this._render();
      } finally {
        if (this.el) this.el.dataset.viewLoading = 0;
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      setTimeout(run, 16);
    }
  }

  _render() {
    // Drafts stay in sync via the `task-input-changed` watch — do NOT add
    // a pre-feed DOM read here; it would race the Entry's async setter.

    // Capture focused input + cursor BEFORE the DOM swap, restore after.
    let focusName = null;
    let cursorPos = null;
    let cursorEnd = null;
    let scopeSel = "";
    const active =
      typeof document !== "undefined" ? document.activeElement : null;
    if (active && this.el && this.el.contains(active) && active.getAttribute) {
      focusName = active.getAttribute("name");
      const inCreate = this.el.querySelector(".tasks-panel__create-modal");
      const inDetail = this.el.querySelector(".tasks-panel__detail-panel");
      if (inCreate && inCreate.contains(active))
        scopeSel = ".tasks-panel__create-modal ";
      else if (inDetail && inDetail.contains(active))
        scopeSel = ".tasks-panel__detail-panel ";
      try {
        cursorPos = active.selectionStart;
        cursorEnd = active.selectionEnd;
      } catch (_) {
        /* date / number inputs throw here */
      }
    }

    // Capture the underlying view's scroll BEFORE the DOM swap so opening the
    // detail/create overlay (or any background re-render) doesn't reset the
    // board/list back to the top — feed() rebuilds fresh nodes at scroll 0.
    const savedScroll = this._captureViewScroll();

    this.feed(require("./skeleton")(this));
    // ui-core sets <input> values through a 200ms `waitElement` poll, so
    // the title/description start empty after each feed; pre-populate them
    // (sync + next frame as a safety net for late-mount children).
    this._prepopulateInputs();
    this._renderCommentBodies();
    // Restore synchronously to avoid a visible jump, then again next frame in
    // case the rebuilt content only reaches full scrollHeight after layout.
    this._restoreViewScroll(savedScroll);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        this._prepopulateInputs();
        this._renderCommentBodies();
        this._restoreViewScroll(savedScroll);
      });
    }

    if (focusName && typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        if (!this.el) return;
        const next = this.el.querySelector(`${scopeSel}[name="${focusName}"]`);
        if (!next || typeof next.focus !== "function") return;
        next.focus();
        if (cursorPos != null && typeof next.setSelectionRange === "function") {
          try {
            next.setSelectionRange(
              cursorPos,
              cursorEnd != null ? cursorEnd : cursorPos,
            );
          } catch (_) {}
        }
      });
    }
  }

  /**
   * ensurePart(), minus the hazard that makes part refreshes intermittently
   * do nothing.
   *
   * ui-core's ensurePart resolves straight away when the branch is mounted, but
   * otherwise parks a `part.ready` listener that clears itself with
   * `this.off(_e.part.ready)` — no callback argument, so Backbone drops EVERY
   * listener on that event, including the ones other in-flight ensurePart calls
   * are waiting on. Those promises then never settle and their `.then` never
   * runs, so the refresh they were going to do is silently skipped.
   *
   * This panel fires several part refreshes in quick succession (subtask
   * section, view body, attachments, comment list, the scope-suffixed mention /
   * link / assignee parts) and routinely asks for a part belonging to a closed
   * overlay, which is exactly the case that parks a listener. Same contract,
   * but the listener removes only its own callback.
   */
  _withPart(name) {
    let branch = null;
    try {
      branch = this._branches ? this._branches[name] : null;
    } catch (_) {
      branch = null;
    }
    if (branch && (!branch.isDestroyed || !branch.isDestroyed())) {
      return Promise.resolve(branch);
    }
    return new Promise((resolve) => {
      const onReady = (child) => {
        if (!child || child.mget(_a.sys_pn) != name) return;
        this.off(_e.part.ready, onReady);
        const list = this._partWaiters;
        if (list) {
          const i = list.indexOf(onReady);
          if (i !== -1) list.splice(i, 1);
        }
        resolve(child);
      };
      this.on(_e.part.ready, onReady);
      (this._partWaiters = this._partWaiters || []).push(onReady);
    });
  }

  // ── Compact viewbar carousel ─────────────────────────────────────────
  // The view-tab strip pages two tabs at a time once the panel is narrow (the
  // skin's `@container tasks-panel-w` block owns the scroll-snap); this only
  // keeps the footer's `data-page` in step with where the strip actually is,
  // and the skin maps that one attribute to the active dot.
  //
  // Reads scrollLeft rather than tracking taps, so a swipe, a dot press and a
  // programmatic scroll all converge on the same source of truth.
  _wireViewbarCarousel(child) {
    this._viewbarStrip = child;
    if (!child || !child.el) return;
    // rAF-throttled: a touch scroll fires this continuously, and all it has to
    // produce is one attribute write per frame at most.
    let queued = 0;
    const onScroll = () => {
      if (queued) return;
      queued = 1;
      requestAnimationFrame(() => {
        queued = 0;
        this._syncViewbarPage();
      });
    };
    child.el.addEventListener("scroll", onScroll, { passive: true });
    // Unlike the folder window's tab bar — which only flips data-state on a tab
    // press — `set-view` runs a full _render(), so this strip is REBUILT every
    // time a view is chosen and comes back scrolled to 0. Picking Summary from
    // page 2 would land the user on a bar showing Board/Calendar with the tab
    // they just chose off-screen. Restore the page from the active tab instead.
    this._scrollActiveViewTabIntoView();
  }

  // Put the page holding the active tab under the viewport, without animating:
  // this runs on mount, where a smooth scroll from 0 would read as the bar
  // drifting on its own after every view switch.
  //
  // `behavior: "instant"` is load-bearing. The skin sets `scroll-behavior:
  // smooth` on the strip (so a dot press animates), and that applies to
  // PROGRAMMATIC scrolls too — both a bare `scrollLeft =` assignment and
  // `scrollTo({behavior: "auto"})`, since "auto" means "defer to the computed
  // scroll-behavior". Only "instant" overrides it.
  _scrollActiveViewTabIntoView() {
    const strip = this._viewbarStrip;
    if (!strip || !strip.el) return;
    const w = strip.el.clientWidth;
    const active = strip.el.querySelector(
      `.${this.fig.family}__viewbar-item[data-active="1"]`,
    );
    // Nothing to do on the wide layout: clientWidth is the whole strip, so
    // there is one page and the offset below floors to 0 anyway.
    if (!active || w <= 0) return this._syncViewbarPage();
    // Measured off the rects rather than offsetLeft. offsetLeft resolves
    // against the nearest positioned ancestor, which here is __root (it is
    // `position: relative`, and the container-type on it would make it the
    // containing block regardless) — NOT the strip. So it carries the viewbar's
    // own padding and left-hand chrome, and the page it produced was wrong:
    // Summary landed on page 0 with the active tab off-screen. Adding back the
    // live scrollLeft makes this the tab's true offset inside the scroll
    // content, whatever the offsetParent turns out to be.
    const x =
      active.getBoundingClientRect().left -
      strip.el.getBoundingClientRect().left +
      strip.el.scrollLeft;
    strip.el.scrollTo({
      left: Math.floor(Math.max(0, x) / w) * w,
      behavior: "instant",
    });
    this._syncViewbarPage();
  }

  _syncViewbarPage() {
    const strip = this._viewbarStrip;
    const dots = this._viewbarDots;
    if (!strip || !strip.el || !dots || !dots.el) return;
    const w = strip.el.clientWidth;
    // Wide / one-page: clientWidth is the whole strip and scrollLeft stays 0,
    // so this lands on page 0 and the skin has the footer hidden anyway.
    const page = w > 0 ? Math.round(strip.el.scrollLeft / w) : 0;
    if (`${page}` !== dots.el.dataset.page) dots.el.dataset.page = `${page}`;
  }

  // Dot press. Scrolls by whole pages; the scroll listener above then updates
  // data-page, so this deliberately does not write it itself.
  _showViewbarPage(cmd) {
    const strip = this._viewbarStrip;
    if (!strip || !strip.el || !cmd || !cmd.el) return;
    const page = Number(cmd.el.dataset.page) || 0;
    strip.el.scrollTo({ left: page * strip.el.clientWidth, behavior: "smooth" });
  }

  /**
   * Re-render ONLY the active view (board / list / calendar / gantt / summary).
   *
   * The skeleton mounts the view inside a named "view-host" part exactly so this
   * is possible. Used by the live keyword filter: a full _render() would rebuild
   * the focused filter input mid-typing (see the `filter-keyword` case).
   *
   * The whole skeleton tree is rebuilt to pick the host out of it — that is
   * cheap (plain objects, no DOM) and keeps ONE source of truth for how the view
   * is built, instead of a second copy of the view/board dispatch that would
   * drift. Only the host's subtree is actually mounted.
   */
  _refreshViewBody() {
    if (!this.el) return;
    const savedScroll = this._captureViewScroll();
    this._withPart("view-host").then((host) => {
      if (!host || !this.el) return;
      const root = require("./skeleton")(this);
      const node = (root.kids || []).find(
        (k) => k && k.sys_pn === "view-host",
      );
      // No host in the tree (skeleton restructured) — fall back to a full
      // render rather than silently leaving a stale view on screen.
      if (!node) return this._render();
      host.feed(node.kids);
      this._restoreViewScroll(savedScroll);
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => this._restoreViewScroll(savedScroll));
      }
    });
  }

  /**
   * Flip the "a filter is active" flags in place.
   *
   * Everything else in the filter popup is driven by the user's own clicks, so
   * these two are all that go stale when the view body is refreshed on its own:
   * the viewbar button's highlight and the popup's "Clear" link (mounted always,
   * hidden by `data-active="0"` in the skin), plus the keyword accordion head.
   */
  _syncFilterAffordances() {
    if (!this.el) return;
    const active = this.isFilterActive() ? "1" : "0";
    const btn = this.el.querySelector(".tasks-panel__viewbar-filter");
    if (btn) btn.dataset.active = active;
    const clear = this.el.querySelector(".tasks-panel__filter-clear");
    if (clear) clear.dataset.active = active;
    const head = this.el.querySelector(
      '.tasks-panel__filter-cat[data-dim="keyword"] .tasks-panel__filter-cat-head',
    );
    if (head) head.dataset.active = this.isFilterDimActive("keyword") ? "1" : "0";
  }

  // Snapshot the scroll offsets of the current view's scrollable containers,
  // keyed by a stable selector so they reattach to the right node after the
  // feed() rebuild. Each view has one unique-class scroll root; the board also
  // has per-column scrollers (__column-body), keyed by data-dropcol. Skips
  // containers still at 0.
  _captureViewScroll() {
    if (!this.el || typeof this.el.querySelectorAll !== "function") return [];
    const roots = [
      "tasks-panel__main", // board — horizontal column strip
      "tasks-panel__list",
      "tasks-panel__summary",
      "tasks-panel__calendar",
      "tasks-panel__gantt",
    ];
    const nodes = this.el.querySelectorAll(
      roots.map((c) => `.${c}`).join(", ") + ", .tasks-panel__column-body",
    );
    const saved = [];
    for (const node of Array.from(nodes)) {
      const top = node.scrollTop || 0;
      const left = node.scrollLeft || 0;
      if (!top && !left) continue;
      let selector;
      if (node.classList.contains("tasks-panel__column-body")) {
        const key = node.dataset && node.dataset.dropcol;
        if (!key) continue;
        selector = `.tasks-panel__column-body[data-dropcol="${key}"]`;
      } else {
        const cls = roots.find((c) => node.classList.contains(c));
        if (!cls) continue;
        selector = `.${cls}`;
      }
      saved.push({ selector, top, left });
    }
    return saved;
  }

  // Reapply offsets captured by _captureViewScroll. Best-effort: a container
  // that no longer exists (view switched, column deleted) is simply skipped.
  _restoreViewScroll(saved) {
    if (!this.el || !saved || !saved.length) return;
    for (const { selector, top, left } of saved) {
      const node = this.el.querySelector(selector);
      if (!node) continue;
      if (top) node.scrollTop = top;
      if (left) node.scrollLeft = left;
    }
  }

  // ── Skeleton accessors ─────────────────────────────────────────
  /**
   * Board columns = the four built-ins followed by this folder's custom
   * columns. Every entry is render-ready: `name` is the display string
   * (LOCALE for built-ins, user text for customs), `color` the accent hex,
   * `theme` the palette key driving pill tints, `custom` marks editability.
   *
   * MEMOISED — treat the result as read-only.
   *
   * isDoneStatus(), statusMeta() and getSubtasks() each call this, and they run
   * once per rendered task AND once per subtask, so an un-cached build ran a
   * `.some` + a `.map` allocating a fresh object (with a LOCALE lookup) per
   * column, several thousand times per render on a busy board. The rows are
   * mutated in place (rename, theme, reorder) as well as reassigned, so the
   * cache keys on a content signature rather than array identity; that is
   * O(columns) and columns are single digits.
   */
  getColumns() {
    const rows = this._customColumns || [];
    let sig = String(rows.length);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      sig += `\u0001${r.id}\u0002${r.name}\u0002${r.theme}\u0002${r.is_done}\u0002${r.position}`;
    }
    if (this._colsCache && this._colsSig === sig) return this._colsCache;
    this._colsSig = sig;
    this._colsCache = this._buildColumns(rows);
    return this._colsCache;
  }

  _buildColumns(rows) {
    // Has this scope been seeded? A single stored built-in row proves it has —
    // and once seeded, a MISSING built-in means the user DELETED it, so it must
    // stay deleted. Only when NO built-in row exists at all (column_list has
    // not resolved yet, or the scope was never seeded) do we fall back to the
    // defaults. Without that fallback a scope holding only custom columns
    // renders those alone and silently hides every task whose status is a
    // built-in key.
    const seeded = rows.some((r) => BUILTIN_META[r.id]);
    // Stored columns (built-in + custom) are uniformly editable. A built-in id
    // left at its seeded English name shows a localized title; a renamed one
    // shows the stored name.
    const customs = rows.map((r) => {
      const bi = BUILTIN_META[r.id];
      const name = bi && r.name === bi.seed ? LOCALE[bi.label] || r.name : r.name || "";
      return {
        key: r.id,
        name,
        theme: COLUMN_THEMES[r.theme] ? r.theme : "default",
        color: COLUMN_THEMES[r.theme] || COLUMN_THEMES.default,
        is_done: Number(r.is_done) ? 1 : 0,
        position: r.position,
        custom: 1,
      };
    });
    if (seeded) return customs;
    return COLUMNS.map((c, i) => ({
      key: c.key,
      name: LOCALE[c.label] || c.key,
      theme: c.theme,
      color: COLUMN_THEMES[c.theme] || COLUMN_THEMES.default,
      is_done: c.key === "complete" ? 1 : 0,
      position: i,
      custom: 0, // placeholder — no DB row to reorder/rename/delete yet
    })).concat(customs);
  }

  // The column a new task lands in when no other choice was made.
  //
  // NOT the literal "todo": the built-ins are ordinary task_column rows the user
  // may rename, reorder or DELETE (task_column_list seeds them once per folder
  // scope and records that, so a deleted built-in never comes back). On a board
  // whose "To do" column is gone, "todo" is a status no column owns — the server
  // refuses it (_isValidStatus) and the card would have no column to render in.
  // The left-most column is always real, and is where the user sees it appear.
  // The literal survives only as a pre-load fallback, for the window between
  // mount and task.column_list resolving.
  getDefaultStatus() {
    const cols = this.getColumns();
    return cols.length ? cols[0].key : "todo";
  }

  // Completion is column-driven: a task is "done" when its column has is_done.
  // Replaces scattered `status === "complete"` literals so renamed/custom done
  // columns are honored everywhere (list, gantt, project health).
  isDoneStatus(status) {
    if (status == null || status === "") return false;
    return this._doneKeys().has(String(status));
  }

  // The done-column keys, rebuilt only when getColumns() hands back a
  // different array — which the memo above does exactly when they change.
  _doneKeys() {
    const cols = this.getColumns();
    if (this._doneKeysSrc !== cols) {
      this._doneKeysSrc = cols;
      this._doneKeysSet = new Set(
        cols.filter((c) => c.is_done).map((c) => String(c.key)),
      );
    }
    return this._doneKeysSet;
  }

  // key → board position, for ordering subtasks the way the board reads.
  _columnOrder() {
    const cols = this.getColumns();
    if (this._colOrderSrc !== cols) {
      this._colOrderSrc = cols;
      const m = new Map();
      cols.forEach((c, i) => m.set(String(c.key), i));
      this._colOrderMap = m;
    }
    return this._colOrderMap;
  }
  getColumnThemes() {
    return COLUMN_THEMES;
  }
  getBoardModalState() {
    return {
      open: this._boardModalOpen,
      theme: this._boardTheme,
      title: this._boardTitle,
      isDefault: this._boardDefault,
    };
  }
  getColMenuFor() {
    return this._colMenuFor;
  }
  getColRenameDraft() {
    return this._colRenameDraft;
  }
  getPriorities() {
    return PRIORITIES;
  }
  getMembers() {
    return this._members;
  }
  getLabels() {
    return this._labels;
  }
  getLabel(id) {
    return this._labels.find((l) => l.id === id) || null;
  }
  getMember(uid) {
    return this._members.find((m) => m.id === uid || m.uid === uid) || null;
  }

  /**
   * A task's assignees, minus anybody who is no longer a member of this
   * workspace.
   *
   * Removing a member now clears their assignments server-side
   * (hub.delete_contributor), but rows written before that fix are still out
   * there, and a uid with no member behind it has no name, avatar or initials to
   * render — the chip fell back to printing the raw uid, which read as a
   * mangled name. Treat such a uid as gone so the task reads as unassigned.
   *
   * Passing the uids straight through while the member list is unknown (fetch
   * still in flight or failed) keeps a transient failure from blanking every
   * assignee on the board.
   *
   * @param {Object|Array} taskOrUids task row, or a uid array
   * @returns {Array} uids that still resolve to a member
   */
  getKnownAssignees(taskOrUids) {
    const uids = Array.isArray(taskOrUids)
      ? taskOrUids
      : Array.isArray(taskOrUids && taskOrUids.assignee_uids)
        ? taskOrUids.assignee_uids
        : taskOrUids && taskOrUids.assignee_uid
          ? [taskOrUids.assignee_uid]
          : [];
    if (!this._membersLoaded) return uids;
    return uids.filter((uid) => !!this.getMember(uid));
  }

  getFilterUids() {
    return this._filterUids;
  }

  // Filter predicate — the same multi-dimension filter on every view (board,
  // calendar, gantt, list, project health). Dimensions AND together; values
  // within a dimension OR together.
  _matchesFilter(t) {
    const uids = Array.isArray(t.assignee_uids)
      ? t.assignee_uids.map(String)
      : t.assignee_uid
        ? [String(t.assignee_uid)]
        : [];
    const members = this._filterUids || [];
    if (members.length && !uids.some((u) => members.includes(u))) return false;

    const f = this._filters || {};
    if (f.keyword) {
      const kw = f.keyword.toLowerCase();
      if (!String(t.title || "").toLowerCase().includes(kw)) return false;
    }
    if (f.priority && f.priority.length) {
      if (!f.priority.includes(t.priority || "medium")) return false;
    }
    if (f.status && f.status.length) {
      if (!f.status.includes(t.status)) return false;
    }
    if (f.files) {
      const has = Array.isArray(t.linked_files) && t.linked_files.length > 0;
      if (f.files === "has" && !has) return false;
      if (f.files === "none" && has) return false;
    }
    if (f.due && !this._matchesDue(t, f.due)) return false;
    return true;
  }

  // Due-date bucket match for the List filter.
  _matchesDue(t, due) {
    if (due === "none") return !t.due_date;
    if (!t.due_date) return false;
    let d, now;
    try {
      d = Dayjs(t.due_date);
      now = Dayjs();
      if (!d.isValid()) return false;
    } catch {
      return false;
    }
    switch (due) {
      case "overdue":
        return d.isBefore(now, "day") && !this.isDoneStatus(t.status);
      case "today":
        return d.isSame(now, "day");
      case "week":
        return d.isSame(now, "week");
      case "month":
        return d.isSame(now, "month");
      default:
        return true;
    }
  }

  getState() {
    const cols = this.getColumns();
    const keys = new Set(cols.map((c) => c.key));
    const firstKey = cols.length ? cols[0].key : null;
    const state = cols.reduce((acc, c) => ((acc[c.key] = []), acc), {});
    // Bucket by column; a task whose status matches no column (e.g. its column
    // was just deleted by a peer) falls into the first column so it's never
    // hidden until the next list refresh.
    // Subtasks are excluded: they belong to their parent's card, not to a card
    // of their own (isSubtask — see getTopLevelTasks).
    this._tasks.forEach((t) => {
      if (this.isSubtask(t)) return;
      if (!this._matchesFilter(t)) return;
      const k = keys.has(t.status) ? t.status : firstKey;
      if (k != null) state[k].push(t);
    });
    return state;
  }

  // Is this row a subtask? Single predicate so every view agrees, and so the
  // check survives the server sending "" / 0 instead of null.
  isSubtask(t) {
    return !!(t && t.parent_task_id);
  }

  /**
   * Flat member-filtered task list, SUBTASKS INCLUDED.
   *
   * Only Project Health may use this: the spec counts a subtask as its own work
   * item in every aggregate (total, status donut, priority split, workload), so
   * the health view deliberately reads the unsplit set. Every other view wants
   * getTopLevelTasks() — feeding this one to Board / List / Gantt / Calendar
   * renders each subtask a second time as a card, row, bar or calendar chip.
   */
  getFilteredTasks() {
    return this._tasks.filter((t) => this._matchesFilter(t));
  }

  /**
   * The dataset for every view that draws one entry per task: Board, List,
   * Gantt and Calendar. Subtasks are reached through their parent instead.
   */
  getTopLevelTasks() {
    return this._tasks.filter(
      (t) => !this.isSubtask(t) && this._matchesFilter(t),
    );
  }

  /**
   * Children of a task, in board order (column, then rank) so an expanded row
   * reads the same way the board would.
   *
   * Deliberately NOT filtered: the badge counts every child (it is a property
   * of the task, not of the current filter), so hiding some of them behind a
   * member filter would render "2/3" next to a single visible row and read as
   * a bug. Same reason the counts are computed server-side.
   */
  getSubtasks(parentId) {
    if (!parentId) return [];
    const kids = this._childIndex().get(parentId);
    if (!kids || !kids.length) return [];
    const order = this._columnOrder();
    // slice() — the bucket is shared and cached; sorting it in place would
    // reorder what every other caller sees.
    return kids.slice().sort(
      (a, b) =>
        (order.get(String(a.status)) ?? 99) -
          (order.get(String(b.status)) ?? 99) ||
        (a.rank || 0) - (b.rank || 0),
    );
  }

  /**
   * parent id → children. Built once, reused by getSubtasks and
   * getSubtaskCount.
   *
   * Both used to scan the whole task list, and getSubtaskCount runs once per
   * rendered card / row / bar / chip — so a board of N tasks made N full
   * passes, O(N^2) on every re-render. That is the subtask lag.
   *
   * Membership changes only when a task is added or removed, never when one is
   * edited in place, so the cache keys on the array's identity plus its length:
   * a reassignment (list reload, delete) and a push/splice are both caught
   * without every mutation site having to remember to invalidate. The one case
   * that changes neither is _mergeTask replacing a row in place — it drops the
   * cache explicitly.
   */
  _childIndex() {
    const tasks = this._tasks || [];
    if (
      this._childIdx &&
      this._childIdxSrc === tasks &&
      this._childIdxLen === tasks.length
    ) {
      return this._childIdx;
    }
    const idx = new Map();
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const p = t.parent_task_id;
      if (!p) continue;
      const bucket = idx.get(p);
      if (bucket) bucket.push(t);
      else idx.set(p, [t]);
    }
    this._childIdx = idx;
    this._childIdxSrc = tasks;
    this._childIdxLen = tasks.length;
    return idx;
  }

  // ── Subtask UI state ────────────────────────────────────────────
  getTaskById(id) {
    if (!id) return null;
    return this._tasks.find((t) => t.id === id) || null;
  }

  isSubtasksOpen(id) {
    return this._subtasksOpen.has(id);
  }

  getSubtaskDraft() {
    return this._subtaskDraft;
  }

  // List / Gantt chevron. Local-only toggle, but it changes how many rows the
  // view has, so it re-feeds rather than flipping an attribute.
  //
  // _refreshViewBody, not _render: _subtasksOpen is read ONLY by list.js and
  // gantt.js, both of which live inside the "view-host" part. A full render
  // would additionally rebuild the detail panel, the modals, re-seed every
  // <input> and re-render the comment bodies — none of which this changes, and
  // all of which made the chevron feel sticky on a busy board.
  _toggleSubtasks(trigger) {
    const id = trigger.mget("taskId");
    if (!id) return;
    if (this._subtasksOpen.has(id)) this._subtasksOpen.delete(id);
    else this._subtasksOpen.add(id);
    this._refreshViewBody();
  }

  // "+ Add subtask" in the detail panel. Due date pre-fills from the parent —
  // editable before Create, and independently afterwards.
  _openSubtaskDraft() {
    const parent = this.getDetailTask();
    if (!parent) return;
    const cols = this.getColumns();
    const firstOpen = cols.find((c) => !c.is_done) || cols[0];
    this._subtaskDraft = {
      title: "",
      // Pre-filled from the parent, and editable right here via the Due date
      // chip (the earlier build only inherited it read-only).
      due_date: parent.due_date || "",
      priority: "medium",
      status: firstOpen ? firstOpen.key : "todo",
      // Which chip's dropdown is open: null | "priority" | "status".
      menu: null,
    };
    this._refreshSubtaskSection();
  }

  _closeSubtaskDraft() {
    this._subtaskDraft = null;
    this._refreshSubtaskSection();
  }

  /**
   * Re-feed ONLY the subtasks block.
   *
   * A full _render() here would rebuild the whole detail panel: it steals focus
   * from the title/description editors and drops unsaved edits, which is why
   * attachments, comments and the due section are all their own sys_pn parts.
   */
  _refreshSubtaskSection() {
    if (!this._detailId) return;
    this._withPart("subtask-rows").then((part) => {
      if (!this._detailId || !part) return;
      part.feed(
        require("./skeleton").buildSubtaskRowsContent(this, this._detailId),
      );
    });
  }

  /**
   * Create a subtask under the currently open task.
   *
   * Reads the title from the live input rather than a draft-change watcher: the
   * creator is a transient row, so there is no committed draft to read back.
   */
  async _commitSubtask() {
    const parentId = this._detailId;
    const draft = this._subtaskDraft;
    if (!parentId || !draft) return;

    // The creator's title field is `__subtask-card-title` (a Skeletons.Entry,
    // so the value lives on its inner <input>). The old
    // `__subtask-create-input` selector no longer matched anything, which left
    // this reading the draft alone — fine while the watch keeps up, but the
    // empty-title branch below then focused nothing and the create looked dead.
    const input =
      this.el &&
      this.el.querySelector(`.${this.fig.family}__subtask-card-title input`);
    const title = String((input && input.value) || draft.title || "").trim();
    if (!title) {
      if (input && typeof input.focus === "function") input.focus();
      return;
    }

    // _setControlBusy, NOT _setSubmitting: the latter raises the panel-wide
    // _submitting flag that gates commit-task / commit-detail, and creating a
    // subtask has no business silently disabling the parent task's own Update
    // button (same reasoning as the comment actions above).
    const submitBtn =
      this.el &&
      this.el.querySelector(`.${this.fig.family}__subtask-create-submit`);
    this._setControlBusy(submitBtn, true, { swapLabel: true });
    try {
      const created = await this.postService({
        service: SERVICE.task.create,
        hub_id: this._hubId,
        // nid is sent for parity with a normal create, but the server ignores
        // it for a subtask and inherits the parent's folder instead.
        nid: this._scopeNid,
        parent_task_id: parentId,
        title,
        priority: draft.priority || "medium",
        status: draft.status || undefined,
        due_date: draft.due_date || null,
      });
      const row = Array.isArray(created) ? created[0] : created;
      if (!row || !row.id) {
        // postService resolves falsy on failure rather than rejecting.
        Wm.alert(LOCALE.ERROR_NETWORK);
        return;
      }
      this._mergeTask(row);
      // Keep the creator open so several subtasks can be added in a row — the
      // common case when breaking a task down. Only the title resets.
      this._subtaskDraft = { ...draft, title: "", menu: null };
      if (input) input.value = "";
      // Two targeted re-feeds rather than a full _render().
      //
      // The parent's count badge lives OUTSIDE this part — on the board card,
      // list row, gantt row and calendar chip behind the modal — so the view
      // does have to be rebuilt or those read as "the subtask was never
      // created". But the view sits in its own "view-host" part, a SIBLING of
      // the detail wrapper, so re-feeding it leaves this section (and the
      // creator's focused input) alone. Both calls are therefore safe together:
      // they touch disjoint subtrees, which was not true of the old
      // _render()-then-ensurePart pairing.
      //
      // Keeping the panel intact also keeps the caret in the title box, so the
      // next child can be typed straight away — the common case, and the whole
      // reason the creator stays open.
      this._syncSubtaskBadges(parentId);
      this._refreshViewBody();
      this._refreshSubtaskSection();
    } catch (err) {
      console.error("[tasks_panel] subtask create failed:", err);
    } finally {
      // _refreshSubtaskSection replaces this node asynchronously, so on the
      // happy path this usually clears a soon-to-be-detached button — harmless.
      // It matters on the throw path, which must not leave a live button
      // spinning forever.
      this._setControlBusy(submitBtn, false, { swapLabel: true });
    }
  }

  /**
   * Toggle a subtask between the board's done and not-done columns from the
   * detail panel's checkbox, and apply any parent rollup the server reports.
   *
   * Mirrors _toggleComplete's optimistic flip, but re-feeds only the subtask
   * rows so the open panel doesn't rebuild under the user.
   */
  async _toggleSubtaskComplete(trigger) {
    const id = trigger.mget("taskId");
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;
    const originalStatus = task.status;
    const cols = this.getColumns();
    const target = this.isDoneStatus(originalStatus)
      ? cols.find((c) => !c.is_done)
      : cols.find((c) => c.is_done);
    // No done column on this board (the user deleted it) — nothing to toggle
    // to, and the server rollup is inert there too.
    if (!target || target.key === originalStatus) return;

    task.status = target.key;
    this._refreshSubtaskSection();
    try {
      const updated = await this.postService({
        service: SERVICE.task.update_status,
        hub_id: this._hubId,
        id,
        status: target.key,
      });
      const row = Array.isArray(updated) ? updated[0] : updated;
      if (row && row.id) {
        this._mergeTask(row);
        // The rollup rides back on the same response — see task.update_status.
        // Without merging it the person who ticked the last subtask is the one
        // user who never sees the parent flip.
        if (row.parent) this._mergeTask(row.parent);
        this._refreshSubtaskSection();
        this._syncSubtaskBadges(task.parent_task_id);
        // A parent that just auto-completed changes its own card/row/pill, so
        // the underlying view does need rebuilding — but only the view: the
        // open detail panel was already refreshed above, and a full _render()
        // here would rebuild it a second time under the user's cursor.
        if (row.parent) this._refreshViewBody();
      } else {
        task.status = originalStatus;
        this._refreshSubtaskSection();
      }
    } catch (err) {
      console.error("[tasks_panel] subtask toggle failed:", err);
      task.status = originalStatus;
      this._refreshSubtaskSection();
    }
  }

  /**
   * Keep a parent's server-sent counters in step with the local rows after an
   * optimistic change, so the badge doesn't wait for the next list reload.
   * Every reader (getSubtaskCount, the card / row / bar badges) then agrees,
   * including the ones that go straight to the raw fields.
   */
  _syncSubtaskBadges(parentId) {
    if (!parentId) return;
    const parent = this._tasks.find((t) => t.id === parentId);
    if (!parent) return;
    // Straight off the index, NOT through getSubtaskCount: that falls back to
    // the server's counters when the bucket is empty, so removing the last
    // child would write the stale pre-delete total back onto the parent and
    // pin the badge at "0/1". This runs only where the local rows are the
    // truth (just created / just toggled / just deleted a child).
    const kids = this._childIndex().get(parentId) || [];
    const doneKeys = this._doneKeys();
    let done = 0;
    for (let i = 0; i < kids.length; i++) {
      const st = kids[i].status;
      if (st != null && st !== "" && doneKeys.has(String(st))) done++;
    }
    parent.subtask_done = done;
    parent.subtask_total = kids.length;
  }

  /**
   * done/total for a task's subtasks. Prefers the server-computed counters
   * (task_list / task_create / task_update_status all carry them) and falls
   * back to counting the local rows, which keeps the badge live between an
   * optimistic change and the response that confirms it.
   */
  getSubtaskCount(t) {
    if (!t) return { done: 0, total: 0 };
    const local = this._childIndex().get(t.id);
    if (local && local.length) {
      const doneKeys = this._doneKeys();
      let done = 0;
      for (let i = 0; i < local.length; i++) {
        const st = local[i].status;
        if (st != null && st !== "" && doneKeys.has(String(st))) done++;
      }
      return { done, total: local.length };
    }
    return {
      done: Number(t.subtask_done) || 0,
      total: Number(t.subtask_total) || 0,
    };
  }

  // Recent activity rows for the Project Health view (already folder-scoped by
  // the server). When a member filter is active, show the filtered members' OWN
  // actions (actor-based) — filtering by task assignee kept surfacing other
  // people's activity on the selected member's tasks.
  getActivity() {
    const rows = Array.isArray(this._activity) ? this._activity : [];
    const filter = this._filterUids || [];
    if (!filter.length) return rows;
    return rows.filter((r) => filter.includes(String(r.actor_uid)));
  }

  getActivityTab() {
    return this._activityTab || "comments";
  }

  getTaskHistory() {
    return Array.isArray(this._taskActivity) ? this._taskActivity : [];
  }

  // Pure visibility flip: data-active on the tabs, data-tab on the section (the
  // skin hides whichever list the tab excludes). Neither list is re-fed — both
  // already hold their full content — so switching costs no rebuild and can't
  // drop the caret mid-comment.
  _switchActivityTab(tab) {
    const next = ["comments", "history"].includes(tab) ? tab : "comments";
    if (next === this._activityTab) return;
    this._activityTab = next;
    if (this.el) {
      const pfx = this.fig.family;
      this.el.querySelectorAll(`.${pfx}__activity-tab`).forEach((el) => {
        el.dataset.active = el.dataset.tab === next ? "1" : "0";
      });
      const section = this.el.querySelector(`.${pfx}__comments`);
      if (section) section.dataset.tab = next;
    }
    // Nothing fetched yet (the open-time load failed or is still in flight) —
    // try again so History isn't permanently empty. Only a genuinely missing
    // change log costs a request; an already-loaded one is a pure toggle.
    if (next === "history" && !this.getTaskHistory().length) {
      const id = this._detailId;
      this._loadTaskHistory(id).then(() => {
        if (this._detailId === id && this.getTaskHistory().length) {
          this._refreshHistoryList();
        }
      });
    }
  }

  // "Organize → Link to task tracker" (folder window → linkFilesToTask): open
  // the create modal on a fresh To Do / Medium draft with these files queued.
  // They already live in the workspace, so attachExistingNodes stages them to
  // link by nid on Update — no re-upload.
  openTaskWithFiles(nodes) {
    this._creating = true;
    this._createDefaults = {
      status: this.getDefaultStatus(),
      reporter_uid: Visitor.id,
      title: "",
      description: "",
      priority: "medium",
      due_date: "",
      start_date: "",
      duration_on: false,
      assignees: [],
      labels: [],
      pending_files: [],
    };
    this._folderFilenames = null;
    this._resetFileSearch();
    // Clear the drag dedupe window — it swallows a drop's double event, but
    // here it would skip a file linked, cancelled and linked again in seconds.
    this._attachingNids = null;
    // Queue before the first render so the modal paints with the files listed.
    this.attachExistingNodes(nodes);
    this._render();
  }

  getView() {
    const v = this._view || "board";
    // Defence in depth. `set-view` refuses to assign a gated view, so the only
    // way one can be sitting in `_view` is a plan that changed while the panel
    // was open — payment.plan_state_changed is a live push, and a downgrade
    // must not leave someone parked on a view they no longer have. Board is
    // the floor: it is on every plan, and it is what a fresh panel opens on.
    if (!isTaskViewAllowed(v)) return "board";
    return v;
  }

  /**
   * Calendar / Gantt / Project Health are not on this plan.
   *
   * Same card the sidebar's Admin Console gate raises, via the shared
   * feature-lock modal — one upsell, one look, wherever the product says no.
   * Resolve = the reader took the CTA; the billing page is opened through the
   * `desk:open-billing-page` broadcast rather than reached for directly,
   * because this panel lives in a window and has no handle on the desk (the
   * same route quota-exceeded documents and takes).
   */
  _showTaskViewUpsell() {
    if (typeof Wm === "undefined" || !Wm || !Wm.openFeatureLock) return;
    return Wm.openFeatureLock({ feature: "task_views" })
      .then(() => {
        // Matches the desk's own guard on its `upgrade-plan` case: the card
        // only draws a CTA when this passes, so failing here means the plan
        // changed under an open card.
        if (!canUpgradePlan()) return;
        RADIO_BROADCAST.trigger("desk:open-billing-page");
      })
      // Dismissed (close X or Escape) — confirm REJECTS, and an unhandled
      // rejection on a modal the user simply closed is noise in the console.
      .catch(() => {});
  }
  getSort() {
    return this._sort || null;
  }
  getCalMode() {
    return this._calMode || "month";
  }
  getCalCursor() {
    return this._calCursor;
  }
  getGanttMode() {
    return this._ganttMode || "weeks";
  }
  getGanttSelected() {
    return this._ganttSelected;
  }

  isCreating() {
    return this._creating;
  }
  getCreateDraft() {
    return this._createDefaults || null;
  }
  getPickerOpen() {
    return this._pickerOpen;
  }
  getFileSearch() {
    return this._fileSearch;
  }

  getDetailTask() {
    if (!this._detailId) return null;
    return this._tasks.find((t) => t.id === this._detailId) || null;
  }
  getDetailDraft() {
    return this._detailDraft;
  }
  getDetailAttachments() {
    return (this._detailId && this._attachments[this._detailId]) || [];
  }
  getComments() {
    return this._comments;
  }
  getEditingCommentId() {
    return this._editingCommentId;
  }
  getReplyingTo() {
    return this._replyingTo;
  }
  // Read-only for the skeleton: the three comment drafts carry the files queued
  // on them, which the pending strip renders before they are attached.
  getCommentDraft() {
    return this._commentDraft;
  }
  getCommentEditDraft() {
    return this._commentEditDraft;
  }
  getReplyDraft() {
    return this._replyDraft;
  }
  getReactPickerFor() {
    return this._reactPickerFor;
  }
}

module.exports = __tasks_panel;
