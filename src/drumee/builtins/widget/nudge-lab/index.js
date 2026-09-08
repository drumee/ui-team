/**
 * Nudge Lab — tester control panel for the upgrade-nudge popups
 * (#/devel/nudge, gated by the server's nudge_lab flag).
 *
 * Redesigned around the two rules that kept confusing testers (once per
 * threshold, one popup per person per UTC day):
 *
 *   1. a PREDICTION banner recomputes, after every click, exactly what the
 *      next desk load will do — which popup, or which rule blocks it;
 *   2. scenario buttons AUTO-RESET the popup history by default (toggle),
 *      so the happy path is always click → open desk → popup;
 *   3. the Gate group stays for testing the rules themselves (turn the
 *      toggle off, use New day / Reset by hand).
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
    this._autoReset = true;
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
    this._render();
  }

  _render() {
    if (this.isDestroyed && this.isDestroyed()) return;
    this.feed(require("./skeleton")(this));
  }

  state() {
    return this._state || {};
  }

  busy() {
    return this._busy;
  }

  autoReset() {
    return this._autoReset;
  }

  /**
   * Mirror of the server's decision, run on the numbers the panel already
   * shows, so the banner can promise what the NEXT desk load does.
   * Returns { show, trigger, family, reason } — reason only when show=false.
   */
  predict() {
    const s = this.state();
    if (!s || !s.plan) return { show: false, reason: "no-state" };
    const seen = (s.block && s.block.seen) || {};
    const mySeen = (t) => !!(seen[t] && seen[t][s.uid]);
    const today = new Date().toISOString().slice(0, 10);
    const capUsed = !!(s.block && s.block.last_shown && s.block.last_shown[s.uid] === today);

    const fams = [];
    const pct = Number(s.disk_pct) || 0;
    if (pct >= 90) fams.push(["storage_90", "storage"]);
    else if (pct >= 80) fams.push(["storage_80", "storage"]);
    else if (pct >= 70) fams.push(["storage_70", "storage"]);
    const cap = ~~s.seat_limit;
    if (cap > 0) {
      const sp = (100 * ~~s.seats_used) / cap;
      if (sp >= 90) fams.push(["seats_90", "seats"]);
      else if (sp >= 70) fams.push(["seats_70", "seats"]);
    }
    const age = ~~s.age_days;
    if (age >= 30) fams.push(["age_30d", "age"]);
    else if (age >= 14) fams.push(["age_14d", "age"]);

    if (!fams.length) return { show: false, reason: "no-trigger" };

    const fresh = fams.filter(([t]) => !mySeen(t));
    if (!fresh.length) return { show: false, reason: "all-seen", trigger: fams[0][0] };
    if (capUsed) return { show: false, reason: "daily-cap", trigger: fresh[0][0] };
    return { show: true, trigger: fresh[0][0], family: fresh[0][1] };
  }

  async _run(name, withReset) {
    if (this._busy) return;
    this._busy = true;
    this._render();
    try {
      const res = await this.postService(SERVICE.nudgelab.scenario, {
        hub_id: Visitor.id,
        name,
      });
      this._state = (res && res.data) || res || this._state;
      if (withReset && !["reset", "cleanup", "new_day"].includes(name)) {
        const r2 = await this.postService(SERVICE.nudgelab.scenario, {
          hub_id: Visitor.id,
          name: "reset",
        });
        this._state = (r2 && r2.data) || r2 || this._state;
      }
    } catch (e) {
      this._state = Object.assign({}, this._state, { error: String((e && e.message) || e) });
    }
    this._busy = false;
    this._render();
  }

  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "nudge-lab-refresh":
        return this._refresh();

      case "nudge-lab-toggle-autoreset":
        this._autoReset = !this._autoReset;
        return this._render();

      case "nudge-lab-open-desk":
        window.open(location.origin + location.pathname, "_blank");
        return;

      case "nudge-lab-scenario":
        return this._run(cmd.mget("scenario"), this._autoReset);

      case "nudge-lab-gate":
        // Gate buttons never auto-reset — they ARE the gate controls.
        return this._run(cmd.mget("scenario"), false);

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__nudge_lab.initClass();
module.exports = __nudge_lab;
