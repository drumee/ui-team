/**
 * Reward-flow step names.
 *
 * The suffix helpers are shared with every other guided flow (see
 * libs/guided-flow/steps) and re-exported here so this module stays the one
 * place reward-flow imports step logic from. What is genuinely reward-flow's
 * own is the LIST: three card steps. activate-workspace has two, which is why
 * the list could not move with the helpers.
 */
const { baseStep, isWaiting, isGuiding } = require("../../../libs/guided-flow/steps");

/** The three card steps, in order. Transient states (`*_waiting`, `*_guide`)
 *  are NOT listed: they are decorations on one of these. */
const STEPS = ["step1", "step2", "step3"];

module.exports = { STEPS, baseStep, isWaiting, isGuiding };
