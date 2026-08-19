/**
 * Tour registry — the ONE place a tour is defined.
 *
 * `desk_tutorial` is a single kind (seeds.js) parameterised by a `tour` model
 * attribute, so adding or retiring a tour is an edit to this file rather than a
 * new widget, a new seeds entry and a new webpack chunk.
 *
 * Each step names the widget kind that renders it, how many internal screens
 * that widget walks, and which backdrop composers sit inert behind it. The host
 * (tutorial/index.js) turns that into the feed payload; the step widgets
 * themselves know nothing about which tour they are in.
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

// `badge` — how "STEP n/m" is counted. Declared per tour, never inferred.
//
//   'screens'  m is the step's own screen count. Every single-step contextual
//              tour uses this: deriving from steps.length would make all three
//              screens of `migrate` read "STEP 1/1", which is worse than the
//              hardcoded strings this replaced.
//   'steps'    m is the number of steps. Used by `full`, which is the only
//              multi-step tour, and by `meeting`.
//
// A multi-step tour must use 'steps'. 'screens' on one would number screen 4 of
// step 2 as "4/5" with no error, so the host refuses it out loud instead.
const BADGE_BY_SCREENS = "screens";
const BADGE_BY_STEPS = "steps";

const TOURS = {
  workspace: {
    id: "workspace",
    flag: "workspace",
    badge: BADGE_BY_SCREENS,
    steps: [{ kind: "tutorial_workspace", screens: 3 }],
  },

  // Folders and the tracker inside them are one tour, reached by opening a
  // workspace or a folder. They were split for one revision — the tracker
  // hung off the Tasks tab — because eight screens behind the desk's primary
  // navigation gesture is a lot to put in front of someone who just wanted to
  // open a folder. Merged back on request: the two steps teach one thing, and
  // the Tasks tab is not where a first-time user goes looking for it.
  //
  // The only multi-step FLAGGED tour, so it badges by step: all three folder
  // screens read "STEP 1/2" and all five tracker screens "STEP 2/2", the same
  // way every step of `full` carries its own number. Screen-level numbering is
  // refused for a multi-step tour (see _buildWidgets) because it would label
  // tracker view 4 as "4/5" while claiming to count the whole tour.
  folder_task: {
    id: "folder_task",
    flag: "folder_task",
    badge: BADGE_BY_STEPS,
    steps: [
      { kind: "tutorial_folder", screens: 3, backdrop: ["workspaceFaded"] },
      { kind: "tutorial_task", screens: 5, backdrop: ["workspaceFaded"] },
    ],
  },

  share: {
    id: "share",
    flag: "share",
    badge: BADGE_BY_SCREENS,
    steps: [
      { kind: "tutorial_share", screens: 3, backdrop: ["workspaceFaded"] },
    ],
  },

  migrate: {
    id: "migrate",
    flag: "migrate",
    badge: BADGE_BY_SCREENS,
    // The step's own menu and dialog sit OVER the desk, so the workspace grid
    // behind them is this step's subject matter and is not faded.
    steps: [
      { kind: "tutorial_migrate", screens: 3, backdrop: ["workspaceGrid"] },
    ],
  },

  // Reachable only from the `full` tour: no contextual trigger, no flag, and
  // therefore never suppressed and never recorded. `full` is permanent for the
  // same reason — retiring it would make tutorial_meeting dead code.
  meeting: {
    id: "meeting",
    flag: null,
    badge: BADGE_BY_STEPS,
    steps: [
      { kind: "tutorial_meeting", screens: 1, backdrop: ["workspaceFaded"] },
    ],
  },

  // The original six-step tour, unchanged in order and in badge numbering
  // (1/6 … 6/6). Run by ?tutorial=1 and by Get help -> Product Tour, both of
  // which are explicit requests and are never gated on the seen-set.
  full: {
    id: "full",
    flag: null,
    badge: BADGE_BY_STEPS,
    steps: [
      { kind: "tutorial_workspace", screens: 3 },
      { kind: "tutorial_folder", screens: 3, backdrop: ["workspaceFaded"] },
      { kind: "tutorial_meeting", screens: 1, backdrop: ["workspaceFaded"] },
      { kind: "tutorial_task", screens: 5, backdrop: ["workspaceFaded"] },
      { kind: "tutorial_share", screens: 3, backdrop: ["workspaceFaded"] },
      { kind: "tutorial_migrate", screens: 3, backdrop: ["workspaceGrid"] },
    ],
  },
};

const DEFAULT_TOUR = "full";

/** @returns {Object} the tour definition, falling back to the full tour */
function tour(id) {
  return TOURS[id] || TOURS[DEFAULT_TOUR];
}

/** Tours that are suppressed once seen — i.e. every one with a flag. */
function flaggedIds() {
  return Object.keys(TOURS).filter((k) => TOURS[k].flag);
}

/**
 * The badge a step widget should show for the screen it is on.
 *
 * Called by the step from its own _showScreen, because the step is the only
 * object that knows its screen index — the host knows the step index and hands
 * down everything else as model attributes.
 *
 * @param {Object} ui          the step widget
 * @param {Number} screenIndex 0-based
 * @returns {String}
 */
function stepBadge(ui, screenIndex) {
  const fmt = LOCALE.TUTORIAL_STEP || "STEP {0}/{1}";
  if (ui.mget("badge_mode") === BADGE_BY_SCREENS) {
    return fmt.format(~~screenIndex + 1, ~~ui.mget("screen_count") || 1);
  }
  // 'steps' mode: every screen of a step carries that step's number, which is
  // what the six-step tour has always shown.
  return ui.mget("badge_text");
}

/**
 * Does this screen end the whole tour? Drives the forward button's "Done"
 * wording. A step is only in a position to end a tour if it is the last one,
 * which the host stamps as `is_last`.
 */
function isLastScreen(ui, screenIndex, screenCount) {
  return !!ui.mget("is_last") && ~~screenIndex >= ~~screenCount - 1;
}

module.exports = {
  TOURS,
  DEFAULT_TOUR,
  BADGE_BY_SCREENS,
  BADGE_BY_STEPS,
  tour,
  flaggedIds,
  stepBadge,
  isLastScreen,
};
