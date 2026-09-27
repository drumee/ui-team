/**
 * Light one topbar utility icon without a click.
 *
 * The icons share the ui-core radio channel `topbar-utility-radio`
 * (modules/desk/skeleton/topbar.js). The radio behavior lights a view only
 * from a real click, so a screen opened any other way — the reload restore's
 * synthetic onUiEvent — came back with its icon dark. Broadcasting the view
 * on its channel is what a click does: it lights that one and puts the
 * others out. setState(1) would light it and leave a sibling lit too.
 *
 * getPart, never ensurePart: the cluster mounts only in the desktop topbar,
 * and ensurePart never resolves for a part that will not mount.
 *
 * Pure: tests/utility-light.test.js drives it with a fake host.
 */
const UTILITY_CHANNEL = "topbar-utility-radio";

const UTILITY_BUTTONS = Object.freeze({
  "toggle-activity": "utility-activity",
  "toggle-calendar": "utility-calendar",
  "toggle-inbox": "utility-inbox",
  "toggle-contacts": "utility-contacts",
  "toggle-trash": "utility-trash",
  "toggle-apps": "utility-apps",
});

/**
 * @param {String} service  e.g. "toggle-trash"
 * @param {Object} host
 * @param {Function} host.getPart   (pn) => View|null
 * @param {Function} host.broadcast (channel, view) => void
 * @returns {Boolean} true when it broadcast
 */
function lightUtilityButton(service, { getPart, broadcast }) {
  const pn = UTILITY_BUTTONS[service];
  if (!pn) return false;
  try {
    const b = getPart(pn);
    if (!b || !b.el || (b.isDestroyed && b.isDestroyed())) return false;
    broadcast(UTILITY_CHANNEL, b);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { UTILITY_BUTTONS, UTILITY_CHANNEL, lightUtilityButton };
