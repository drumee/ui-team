/**
 * Tour registry — the ONE place a tour is defined.
 *
 * `desk_tutorial` is a single kind (seeds.js) parameterised by a `tour` model
 * attribute, so adding or retiring a tour is an edit to this file rather than
 * a new widget, a new seeds entry and a new webpack chunk.
 *
 * Each step names the widget kind that renders it and how many internal
 * screens that widget walks. The host (tutorial/index.js) turns that into the
 * feed payload; the step widgets themselves know nothing about which tour they
 * are in.
 *
 * WIRE CONTRACT: the keys of the flagged tours are posted to the server and
 * validated there. Nothing in this stack shares a constant across the two
 * repos — getServices() ships service NAMES to the client and drops params —
 * so adding a tour means editing all four sites:
 *   - here
 *   - libs/tutorial-tours.js                      (TOUR_IDS)
 *   - server-team acl/drumate.json                (the tour_id doc string)
 *   - server-team service/private/drumate.js      (__TUTORIAL_TOURS)
 */

// Progress counts SCREENS, cumulatively across a tour's steps — the step's
// `screen_offset` is what carries the count over a step boundary.
//
// There used to be a second mode that counted STEPS instead, used by `full`
// on the grounds that 23 dashes would be a ruler rather than a progress bar.
// That was true of dashes and false of the pill, and it had a cost that only
// showed up in use: every screen of a multi-step step carried the SAME number,
// so `full`'s four chat screens all read "STEP 2/6" and none of them could be
// named. A tour you cannot point at is a tour you cannot report bugs against.
// One mode now, and every screen has its own number.

// `chrome` — the shell around a step, which is NOT constant across a tour.
//
//   rail   the workspace tab the rail lights, or null for the org-home rail,
//          which has no workspace tabs at all (nothing is open yet).
//   crumb  whether the topbar names a workspace.
//
// Declared per step rather than per tour because `full` crosses the boundary:
// it opens on the create-workspace dialog with no workspace, then spends every
// later step inside one.
const DEFAULT_CHROME = { rail: "files", crumb: true };

const TOURS = {
  // Post-signup. In 2.0 this is no longer three workspace tiles on the desk —
  // it is the home canvas and then the Create-new-workspace dialog itself,
  // walked field by field (Figma 140:22684, then 176:40762 → 176:41391).
  workspace: {
    id: "workspace",
    flag: "workspace",
    // No workspace exists yet on these screens, so the rail has no tabs and
    // the topbar names nothing — which is what the org-home frames show.
    //
    // `live_screens` is the tail of this step that stops being a mock: a real
    // create-workspace form and the invite screen after it. They run ONLY on
    // the post-signup run of this tour — see _liveScreens in tutorial/index.js
    // for the gate and why it is there rather than here. Declared as a COUNT
    // off the end so the registry still says what the whole step is, and the
    // host subtracts rather than the step guessing.
    steps: [{
      kind: "tutorial_workspace",
      screens: 8,
      live_screens: 2,
      chrome: { rail: null, crumb: false },
    }],
  },

  // The tracker inside a workspace, reached by opening one.
  //
  // `tutorial_folder` is NOT here any more. Its three screens were chat in a
  // folder, threads, and downloading a thread — which 2.0 promotes to the
  // `chat` tour below. The widget is left in place rather than deleted: the
  // design has a Files flow ("1. Files -> Migrate", frames 176:42043 /
  // 142:35805) whose callout-bearing frames were not captured in this pass, and
  // that is where a Files step would come back.
  //
  // The tracker walks its own carousel: five cards, one per view, then the
  // New task dialog (146:40534, 162:20161).
  folder_task: {
    id: "folder_task",
    flag: "folder_task",
    // The scheduler is no longer a step of its own: 2.0 puts it at the end of
    // the MEET flow (156:19597), which is where anyone would reach it.
    // `tutorial_schedule` stays on disk but is out of every tour.
    steps: [{ kind: "tutorial_task", screens: 6, chrome: { rail: "task", crumb: true } }],
  },

  // Chat was three screens INSIDE the folder step. 2.0 pulls it out: four
  // screens of its own about threads (Figma 142:39178, 169:39799, 142:39530,
  // 169:40101), fired the first time someone opens a workspace's Chat.
  //
  // A new id, so it is also a new entry in the three other wire-contract
  // sites listed above.
  chat: {
    id: "chat",
    flag: "chat",
    steps: [{ kind: "tutorial_chat", screens: 5, chrome: { rail: "chat", crumb: true } }],
  },

  share: {
    id: "share",
    flag: "share",
    // Six, and the frames number them "STEP 1/6" … "STEP 6/6" in a pill.
    steps: [{ kind: "tutorial_share", screens: 6, chrome: { rail: "access", crumb: true } }],
  },

  // Importing from Google Drive — the import dialog itself.
  //
  // It opened on two Files-pane screens before this (the Migrate CTA and the
  // + New menu, 142:34981 / 142:35805) so the tour showed how the dialog was
  // reached. Those were dropped; the tour starts on the dialog.
  migrate: {
    id: "migrate",
    flag: "migrate",
    // Three: the import dialog at three points in the form. The step still
    // draws the Files pane, but only as the ground the dialog sits on.
    steps: [{ kind: "tutorial_migrate", screens: 3, chrome: { rail: "files", crumb: true } }],
  },

  // Reachable only from the `full` tour: no contextual trigger, no flag, and
  // therefore never suppressed and never recorded.
  meeting: {
    id: "meeting",
    flag: null,
    steps: [{ kind: "tutorial_meeting", screens: 3, chrome: { rail: "meet", crumb: true } }],
  },

  // Everything, in product order. Run by ?tutorial=1 and by Get help ->
  // Product Tour, both of which are explicit requests and are never gated on
  // the seen-set.
  full: {
    id: "full",
    flag: null,
    steps: [
      // Six, not eight: no `live_screens`, so the create form is not part of
      // the full tour. Someone re-watching the tour from Get help already has
      // workspaces and asked to see the product, not to make another one.
      { kind: "tutorial_workspace", screens: 6, chrome: { rail: null, crumb: false } },
      { kind: "tutorial_chat", screens: 5, chrome: { rail: "chat", crumb: true } },
      { kind: "tutorial_meeting", screens: 3, chrome: { rail: "meet", crumb: true } },
      { kind: "tutorial_task", screens: 6, chrome: { rail: "task", crumb: true } },
      { kind: "tutorial_share", screens: 6, chrome: { rail: "access", crumb: true } },
      { kind: "tutorial_migrate", screens: 3, chrome: { rail: "files", crumb: true } },
    ],
  },
};

const DEFAULT_TOUR = "full";

/**
 * The shell a step wants around it.
 *
 * @param {Object} step a TOURS step
 * @returns {{rail: String|null, crumb: Boolean}}
 */
function stepChrome(step) {
  return { ...DEFAULT_CHROME, ...((step && step.chrome) || {}) };
}

/** @returns {Object} the tour definition, falling back to the full tour */
function tour(id) {
  return TOURS[id] || TOURS[DEFAULT_TOUR];
}

/** Tours that are suppressed once seen — i.e. every one with a flag. */
function flaggedIds() {
  return Object.keys(TOURS).filter((k) => TOURS[k].flag);
}

/**
 * The progress a step should show for the screen it is on.
 *
 * Returns the two numbers rather than a formatted string — the callout decides
 * whether to draw them as a pill or a dash bar.
 *
 * Called by the step from its own _showScreen, because the step is the only
 * object that knows its screen index — the host knows the step index and hands
 * everything else down as model attributes.
 *
 * Steps OPT IN by spreading the result into the tooltip. The design does not
 * put dashes on every callout (the workspace and migrate screens have none),
 * and a callout that wants them says so rather than having them imposed.
 *
 * @param {Object} ui          the step widget
 * @param {Number} screenIndex 0-based
 * @returns {{step: Number, steps: Number}} both 0-based / total
 */
function stepProgress(ui, screenIndex) {
  // screen_offset is how many screens the earlier steps of this tour ran, so
  // the count continues across a step boundary instead of restarting. Both are
  // stamped by the host, which is the only object that can see the whole tour.
  const offset = ~~ui.mget("screen_offset");
  const total = ~~ui.mget("tour_screens") || ~~ui.mget("screen_count") || 1;
  return { step: offset + ~~screenIndex, steps: total };
}

/**
 * Does this screen end the whole tour? Drives the forward button's "Done"
 * wording. A step is only in a position to end a tour if it is the last one,
 * which the host stamps as `is_last`.
 */
function isLastScreen(ui, screenIndex, screenCount) {
  return !!ui.mget("is_last") && ~~screenIndex >= ~~screenCount - 1;
}

/**
 * Which screen a step should open on.
 *
 * Two callers, one rule:
 *   enter_at_last    Back from a later step — resume where the user left off.
 *   enter_at_screen  `?tutorial=<id>&screen=<n>` — land straight on a screen so
 *                    a callout's geometry can be checked without clicking
 *                    through the ones before it. 1-based in the URL, clamped,
 *                    so a nonsense value lands somewhere real instead of
 *                    rendering nothing.
 *
 * @param {Object} ui    the step widget
 * @param {Number} count how many screens it has
 * @returns {Number} 0-based screen index
 */
function entryScreen(ui, count) {
  const n = ~~count || 1;
  const forced = ui.mget("enter_at_screen");
  if (forced != null && forced !== "") {
    const i = ~~forced - 1;
    return Math.max(0, Math.min(n - 1, i));
  }
  if (ui.mget("enter_at_last")) return n - 1;
  return 0;
}

module.exports = {
  entryScreen,
  stepChrome,
  TOURS,
  DEFAULT_TOUR,
  tour,
  flaggedIds,
  stepProgress,
  isLastScreen,
};
