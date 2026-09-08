// Stub for the `libs/billing` webpack alias. canUpgradePlan() decides whether
// the footer renders its "Upgrade plan" row.
const { state } = require("./render-desk-sidebar");
module.exports = {
  canUpgradePlan: () => state.canUpgrade,
  planLabel: () => "Free",
};
