/**
 * Step-name helpers shared by the guided flows.
 *
 * Every flow here names its states the same way: a handful of CARD steps, plus
 * transient decorations on one of them — `<step>_waiting` when the user has
 * been handed off to a real surface, `<step>_guide` while a live-desk
 * walkthrough owns the screen. These helpers read that naming.
 *
 * The list of card steps is deliberately NOT here: it differs per flow
 * (reward-flow has three, activate-workspace two), and a shared list would be
 * one of them imposed on the other. Each flow declares its own STEPS and
 * imports these.
 *
 * Pure functions of a step name — no DOM, no globals, no framework — so they
 * are testable under bare Node, which the orchestrators are not: they extend
 * the LetcBox global.
 */

/** Trailing state suffixes. `_waiting` = handed off to a real surface,
 *  `_guide` = a live-desk walkthrough is running. */
const WAITING = "_waiting";
const GUIDE = "_guide";
const SUFFIX = new RegExp(`(${WAITING}|${GUIDE})$`);

/**
 * The card step underlying `step`.
 *
 * Both suffixes must be stripped. Stripping only `_waiting` (as this did
 * before reward-flow's step 3 gained a walkthrough) leaves "step3_guide"
 * unmatched by STEPS.includes(), so a resume fell back to "step1" and threw a
 * reloading user back to the beginning of the flow.
 *
 * @param {string} step
 * @returns {string} the base step, or "" when there is nothing to read
 */
function baseStep(step) {
  return String(step ?? "").replace(SUFFIX, "");
}

/** @returns {boolean} the user has been handed off to a real surface. */
function isWaiting(step) {
  return String(step ?? "").endsWith(WAITING);
}

/** @returns {boolean} a live-desk walkthrough owns the screen. */
function isGuiding(step) {
  return String(step ?? "").endsWith(GUIDE);
}

module.exports = { WAITING, GUIDE, baseStep, isWaiting, isGuiding };
