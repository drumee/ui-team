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
 * Never over a press. The restore lights its icon only once the screen has
 * mounted, and a user can press another cluster icon in that window before
 * the desk sees the new screen (a slide-out reports only once it is "in").
 * The press lit its own icon (and set the cluster busy); broadcasting now
 * would put it out and light the screen the user just left. So: nothing
 * while the cluster is busy, nothing while ANOTHER icon is lit — on a fresh
 * reload only the user can have lit one.
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
 * @param {Function} [host.isLit]   (view) => Boolean — is that icon on?
 * @param {Function} [host.isBusy]  () => Boolean — a pressed icon is loading
 * @returns {Boolean} true when it broadcast
 */
function lightUtilityButton(service, { getPart, broadcast, isLit, isBusy }) {
  const pn = UTILITY_BUTTONS[service];
  if (!pn) return false;
  const live = (v) => v && v.el && !(v.isDestroyed && v.isDestroyed());
  try {
    const b = getPart(pn);
    if (!live(b)) return false;
    if (isBusy && isBusy()) return false;
    if (isLit) {
      for (const other of Object.values(UTILITY_BUTTONS)) {
        if (other === pn) continue;
        const o = getPart(other);
        if (live(o) && isLit(o)) return false;
      }
    }
    broadcast(UTILITY_CHANNEL, b);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { UTILITY_BUTTONS, UTILITY_CHANNEL, lightUtilityButton };
