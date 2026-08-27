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
// 'flow'  — count every SCREEN in the tour, cumulatively across its steps.
//           folder_task runs 3 folder screens then 5 tracker views and reads
//           "STEP 1/8 … 8/8" straight through, because to the person being
//           shown it that is one continuous thing. For a single-step tour this
//           is just its own screen count (migrate 1/3 … 3/3).
// 'steps' — count STEPS, so every screen of a step carries that step's number.
//           `full` reads 1/6 … 6/6 with all three folder screens on 2/6, which
//           is what the six-step tour has always shown.
const BADGE_BY_FLOW = "flow";
const BADGE_BY_STEPS = "steps";

const TOURS = {
  workspace: {
    id: "workspace",
    flag: "workspace",
    badge: BADGE_BY_FLOW,
    steps: [{ kind: "tutorial_workspace", screens: 3 }],
  },

  // Folders and the tracker inside them are one tour, reached by opening a
  // workspace or a folder. They were split for one revision — the tracker
  // hung off the Tasks tab — because eight screens behind the desk's primary
  // navigation gesture is a lot to put in front of someone who just wanted to
  // open a folder. Merged back on request: the two steps teach one thing, and
  // the Tasks tab is not where a first-time user goes looking for it.
  //
  // Badged as one continuous flow: 3 folder screens, then 5 tracker views, then
  // the scheduler, reading "STEP 1/9 … 9/9" straight through. Step numbering
  // ("1/3", "2/3", "3/3") is what `full` does, and it is wrong here — to someone
  // opening a folder this is one thing, not three, and a counter that sits on
  // "1/3" for three screens tells them nothing about how much is left.
  folder_task: {
    id: "folder_task",
    flag: "folder_task",
    badge: BADGE_BY_FLOW,
    steps: [
      { kind: "tutorial_folder", screens: 3, backdrop: ["workspaceFaded"] },
      { kind: "tutorial_task", screens: 5, backdrop: ["workspaceFaded"] },
      // Closes the tour where a folder's work ends up: the Meeting tab, with
      // the week ahead on it. Figma 5:75093 badges this screen "STEP 9/9",
      // which is what 3 folder screens + 5 tracker views + this one comes to —
      // the design and the registry agree on the count, so a change to either
      // shows up as a mismatch here.
      { kind: "tutorial_schedule", screens: 1, backdrop: ["workspaceFaded"] },
    ],
  },

  share: {
    id: "share",
    flag: "share",
    badge: BADGE_BY_FLOW,
    steps: [
      { kind: "tutorial_share", screens: 3, backdrop: ["workspaceFaded"] },
    ],
  },

  migrate: {
    id: "migrate",
    flag: "migrate",
    badge: BADGE_BY_FLOW,
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
  if (ui.mget("badge_mode") === BADGE_BY_FLOW) {
    // screen_offset is how many screens the earlier steps of this tour ran, so
    // the counter continues across a step boundary instead of restarting. Both
    // are stamped by the host, which is the only object that can see the whole
    // tour — a step widget knows its own screens and nothing else.
    const offset = ~~ui.mget("screen_offset");
    const total = ~~ui.mget("tour_screens") || ~~ui.mget("screen_count") || 1;
    return fmt.format(offset + ~~screenIndex + 1, total);
  }
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

/**
 * Which screen a step should open on.
 *
 * Two callers, one rule:
 *   enter_at_last    Back from a later step — resume where the user left off.
 *   enter_at_screen  `?tutorial=<id>&screen=<n>` — land straight on a screen so
 *                    a callout's geometry can be checked without clicking
 *                    through the ones before it. 1-based in the URL because
 *                    that is what the badge shows; clamped, so a nonsense value
 *                    lands somewhere real instead of rendering nothing.
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
  TOURS,
  DEFAULT_TOUR,
  BADGE_BY_FLOW,
  BADGE_BY_STEPS,
  tour,
  flaggedIds,
  stepBadge,
  isLastScreen,
};
