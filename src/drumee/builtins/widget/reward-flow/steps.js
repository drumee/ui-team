/**
 * Reward-flow step-name helpers.
 *
 * Split out of index.js purely so this logic is testable: index.js extends the
 * `LetcBox` global and cannot be required under bare Node. Everything here is a
 * pure function of a step name — no DOM, no globals, no framework.
 */

/** The three card steps, in order. Transient states (`*_waiting`, `*_guide`)
 *  are NOT listed: they are decorations on one of these. */
const STEPS = ["step1", "step2", "step3"];

/** Trailing state suffixes. `_waiting` = handed off to a real surface,
 *  `_guide` = a live-desk walkthrough is running. */
const SUFFIX = /_(waiting|guide)$/;

/**
 * The card step underlying `step`.
 *
 * Both suffixes must be stripped. Stripping only `_waiting` (as this did
 * before step 3 gained a walkthrough) leaves "step3_guide" unmatched by
 * STEPS.includes(), so the resume in index.js fell back to "step1" and threw a
 * reloading user back to the beginning of the flow.
 *
 * @param {string} step
 * @returns {string} the base step, or "" when there is nothing to read
 */
function baseStep(step) {
  return String(step == null ? "" : step).replace(SUFFIX, "");
}

/** @returns {boolean} the user has been handed off to a real surface. */
function isWaiting(step) {
  return /_waiting$/.test(String(step == null ? "" : step));
}

/** @returns {boolean} a live-desk walkthrough owns the screen. */
function isGuiding(step) {
  return /_guide$/.test(String(step == null ? "" : step));
}

module.exports = { STEPS, baseStep, isWaiting, isGuiding };
