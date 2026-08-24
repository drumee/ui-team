/**
 * Nudge Lab — tester control panel for the upgrade-nudge popups.
 *
 * Reached at #/devel/nudge (devel module tab). One click puts the SIGNED-IN
 * tester's own org/account into any popup scenario — fake storage
 * percentage, seat squeeze, workspace age, plan flip, fresh daily-cap day,
 * reset, cleanup — through the server's nudgelab service (hard-gated by the
 * nudge_lab flag, writes limited to the caller's own rows). The panel shows
 * the live numbers and the raw $.upgrade_nudge block after every action, so
 * a tester can predict what the next desk load will decide.
 */
class __nudge_lab extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._state = null;
    this._busy = false;
  }

  async onDomRefresh() {
    await this._refresh();
  }

  async _refresh() {
    try {
      const res = await this.fetchService(SERVICE.nudgelab.state, { hub_id: Visitor.id });
      this._state = (res && res.data) || res || {};
    } catch (e) {
      this._state = { error: String((e && e.message) || e) };
    }
    if (this.isDestroyed && this.isDestroyed()) return;
    this.feed(require("./skeleton")(this));
  }

  state() {
    return this._state || {};
  }

  busy() {
    return this._busy;
  }

  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "nudge-lab-refresh":
        return this._refresh();

      case "nudge-lab-open-desk":
        // New tab on the same endpoint — the popup decision happens on desk
        // boot, so every scenario ends with "open a fresh desk tab".
        window.open(location.origin + location.pathname, "_blank");
        return;

      case "nudge-lab-scenario": {
        if (this._busy) return;
        const name = cmd.mget("scenario");
        if (!name) return;
        this._busy = true;
        this.feed(require("./skeleton")(this));
        try {
          const res = await this.postService(SERVICE.nudgelab.scenario, {
            hub_id: Visitor.id,
            name,
          });
          this._state = (res && res.data) || res || this._state;
        } catch (e) {
          this._state = Object.assign({}, this._state, { error: String((e && e.message) || e) });
        }
        this._busy = false;
        if (this.isDestroyed && this.isDestroyed()) return;
        this.feed(require("./skeleton")(this));
        return;
      }

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__nudge_lab.initClass();
module.exports = __nudge_lab;
