/* Kanban board UI for the folder window's "Tasks" tab. UI-only;
 * state persists to localStorage keyed by hub_id+nid until a backend
 * is wired up. */

const COLUMNS = [
  { key: "todo", label: "To Do", color: "#AEAEB2" },
  { key: "in_progress", label: "In Progress", color: "#65D0EA" },
  { key: "to_review", label: "To review", color: "#E8A13B" },
  { key: "complete", label: "Complete", color: "#54B684" },
];

class __tasks_panel extends LetcBox {

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._stateKey =
      `drumee_tasks_${this.mget(_a.hub_id) || "home"}_${this.mget(_a.nid) || "root"}`;
    this._state = this._load();
    this._addingColumn = null;
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * @param {View} trigger
   * @param {Object} args
   */
  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case "add-task":
        this._addingColumn = trigger.mget("taskColumn") || null;
        this._render();
        return;

      case "commit-task":
        return this._commitTask(trigger);

      case "cancel-add":
        this._addingColumn = null;
        this._render();
        return;

      case "remove-task":
        return this._removeTask(trigger);

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  _render() {
    this.feed(require("./skeleton")(this));
  }

  _load() {
    try {
      const raw = localStorage.getItem(this._stateKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return this._withDefaults(parsed);
      }
    } catch (e) { /* swallow JSON parse errors */ }
    return this._withDefaults();
  }

  _withDefaults(state = {}) {
    return COLUMNS.reduce((acc, c) => {
      acc[c.key] = Array.isArray(state[c.key]) ? state[c.key] : [];
      return acc;
    }, {});
  }

  _save() {
    try {
      localStorage.setItem(this._stateKey, JSON.stringify(this._state));
    } catch (e) { /* quota / private mode — ignore */ }
  }

  _commitTask(trigger) {
    const column = this._addingColumn;
    const input = trigger && trigger.el && trigger.el.querySelector("input");
    const value = (input && input.value ? input.value : "").trim();

    this._addingColumn = null;
    if (column && value) {
      if (!Array.isArray(this._state[column])) this._state[column] = [];
      this._state[column].push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: value,
      });
      this._save();
    }
    this._render();
  }

  _removeTask(trigger) {
    const column = trigger.mget("taskColumn");
    const id = trigger.mget("taskId");
    if (!column || !id) return;
    if (!Array.isArray(this._state[column])) return;
    this._state[column] = this._state[column].filter((t) => t.id !== id);
    this._save();
    this._render();
  }

  /** @returns {{key:string,label:string,color:string}[]} */
  getColumns() {
    return COLUMNS;
  }

  /** @returns {{[key:string]: {id:string,title:string}[]}} */
  getState() {
    return this._state;
  }

  /** @returns {string|null} */
  getAddingColumn() {
    return this._addingColumn;
  }
}

module.exports = __tasks_panel;
