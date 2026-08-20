// Stub for the `libs/over-limit` webpack alias. Only isLocked() changes the
// sidebar's markup; the guards are runtime-only and never run at render time.
const { state } = require("./render-desk-sidebar");
module.exports = {
  CHANGED: "over-limit:changed",
  isLocked: () => state.locked,
  guardWrite: () => false,
};
