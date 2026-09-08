/**
 * The desk with no workspace in it.
 *
 * STEP 2 of the no-workspace flow. Step 1 is desk._openDefaultWorkspace(),
 * which looks for any surviving workspace in the same list the topbar switcher
 * (`.desk-module-topbar__ws-menu`) is fed from and opens it; only when that
 * finds nothing does this screen go up.
 *
 * Reachable two ways, and they are why this is a real screen rather than a
 * message bolted onto the delete path:
 *
 *   - the last workspace was just deleted (with 1, 2 and 3, deleting 1 falls
 *     back to 2 and deleting 3 falls back to 2 — but delete 2 as well and
 *     there is nothing left to fall back to);
 *   - a brand-new account, before its first workspace.
 *
 * The shell cannot draw itself without one: the rail's Files / Chat / Task /
 * Meet / Access all act on an OPEN workspace, and the all-workspaces grid this
 * used to fall back to is retired.
 *
 * Logo, title, and the one button that resolves the state — nothing else.
 */

class __desk_home_empty extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      // Opens the create-workspace dialog (`.form-folder__main`).
      //
      // Raised as `new-workspace-form` and handled by the DESK, not here:
      // Wm's `new-workspace` case owns the wrapper-modal plumbing — the
      // data-state / data-overlay stamps and the _closeWhenEmpty hook that
      // waits for the whole media_form -> permission_* chain to empty — and a
      // second copy of that is what drifts. `new-workspace-form` rather than
      // the bare `new-workspace` because that one is the FORCED variant: it
      // means "a workspace, whatever is open", which is exactly right here and
      // stays right if the context rule ever changes.
      //
      // Opening the new workspace afterwards is not this widget's job either.
      // libs/create-workspace broadcasts `workspace:refresh`, the desk hears it
      // (_onWorkspaceCreated) and takes the user in — so it happens however the
      // workspace was made, not only from this button.
      case "create-first-workspace":
        return this.triggerHandlers({
          service: "new-workspace-form",
          source: this,
        });

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __desk_home_empty;
