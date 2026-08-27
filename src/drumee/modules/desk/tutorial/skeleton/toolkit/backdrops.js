/**
 * Named backdrop composers.
 *
 * A step that is not the whole screen sits over inert scenery — the faded
 * workspace grid, most often. Those entries were composed inline for one
 * six-step sequence; naming them lets the registry (tutorial/tours.js) say
 * which backdrop a step wants, per tour, as data rather than as position in an
 * array. A step standing alone in its own tour then gets the same backdrop it
 * had as step four of six.
 *
 * Each composer returns ONE feed entry. The host spreads them ahead of the
 * interactive widget, which stays last — _widgetAt merges `enter_at_last` onto
 * the last entry, so the ordering is load-bearing.
 */

const { workspaceContent } = require("./folder");

/** The workspace grid, dimmed. Scenery for a step whose subject is elsewhere. */
export function workspaceFaded(ui) {
  return workspaceContent(ui, { aspect: "faded" });
}

/**
 * The workspace grid at full strength. For a step whose own UI sits OVER the
 * desk — the migration menu and dialog — where the grid behind is part of what
 * the step is showing rather than scenery behind it.
 */
export function workspaceGrid(ui) {
  return workspaceContent(ui);
}
