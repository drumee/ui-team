/**
 * Centralized display-mode (theme) management.
 *
 * Preference is one of: "light" | "dark" | "system".
 *   - "light" / "dark" — fixed.
 *   - "system"         — follows the OS via `prefers-color-scheme`, and
 *                        live-updates while the app is open when the OS
 *                        setting changes.
 *
 * The preference is persisted in localStorage('drumee.theme'). The RESOLVED
 * value ("light" | "dark") is reflected onto `<html data-theme=...>`, which
 * the theme stylesheets (router/skin/themes/{light,dark}.scss) key off.
 *
 * This replaces the old binary light/dark toggle that lived on the desk
 * sidebar footer — boot (router), the Settings → Appearance control, and any
 * other caller now share this single source of truth. Storage semantics are
 * backwards compatible: legacy stored values were "light"/"dark", which stay
 * valid; an unknown/absent value falls back to "light" (previous default).
 */

const STORAGE_KEY = "drumee.theme";
const VALID = ["light", "dark", "system"];

// Dark mode is disabled product-wide — the app is light-only. This single
// switch forces every path below to "light": boot (initTheme), the Settings
// → Appearance control (which also hides the Dark/System options), and any
// legacy stored "dark"/"system" preference. It guarantees nobody is stranded
// in dark with no visible toggle to escape. Flip to true to restore the full
// light/dark/system behavior (and un-hide the options in
// settings/main/skeleton themeControl).
const DARK_MODE_ENABLED = false;

let _mql = null; // cached MediaQueryList for prefers-color-scheme
let _mqlListener = null; // active OS-change listener (only while pref === "system")

function _readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function _writeStored(pref) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* private mode / storage disabled — non-fatal, theme still applies */
  }
}

function _systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function _applyResolved(resolved) {
  document.documentElement.dataset.theme =
    resolved === "dark" ? "dark" : "light";
}

/**
 * Keep `data-theme` in sync with live OS changes while the preference is
 * "system"; detached for any fixed preference.
 */
function _bindSystemListener(active) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return;
  if (active) {
    if (!_mql) _mql = window.matchMedia("(prefers-color-scheme: dark)");
    if (_mqlListener) return;
    _mqlListener = (e) => _applyResolved(e.matches ? "dark" : "light");
    // addEventListener is the modern API; addListener is the Safari < 14 path.
    if (_mql.addEventListener) _mql.addEventListener("change", _mqlListener);
    else if (_mql.addListener) _mql.addListener(_mqlListener);
  } else if (_mql && _mqlListener) {
    if (_mql.removeEventListener)
      _mql.removeEventListener("change", _mqlListener);
    else if (_mql.removeListener) _mql.removeListener(_mqlListener);
    _mqlListener = null;
  }
}

/**
 * The user's stored preference, normalized. Anything unrecognized (or
 * absent) → "light" so existing users keep their current appearance.
 * @returns {"light"|"dark"|"system"}
 */
function getThemePreference() {
  if (!DARK_MODE_ENABLED) return "light";
  const stored = _readStored();
  return VALID.includes(stored) ? stored : "light";
}

/**
 * Resolve a preference to the concrete applied theme.
 * @param {"light"|"dark"|"system"} [pref]
 * @returns {"light"|"dark"}
 */
function resolveTheme(pref = getThemePreference()) {
  if (!DARK_MODE_ENABLED) return "light";
  if (pref === "system") return _systemPrefersDark() ? "dark" : "light";
  return pref === "dark" ? "dark" : "light";
}

/**
 * Persist + apply a new preference immediately.
 * @param {"light"|"dark"|"system"} pref
 * @returns {"light"|"dark"} the resolved theme now in effect
 */
function setThemePreference(pref) {
  if (!DARK_MODE_ENABLED) pref = "light";
  else if (!VALID.includes(pref)) pref = "light";
  _writeStored(pref);
  _bindSystemListener(pref === "system");
  const resolved = resolveTheme(pref);
  _applyResolved(resolved);
  return resolved;
}

/**
 * Boot entry — apply the stored preference (default "light") and wire the
 * OS listener when needed. Idempotent; safe to call more than once.
 * @returns {"light"|"dark"|"system"} the active preference
 */
function initTheme() {
  const pref = getThemePreference();
  _bindSystemListener(pref === "system");
  _applyResolved(resolveTheme(pref));
  return pref;
}

module.exports = {
  getThemePreference,
  setThemePreference,
  resolveTheme,
  initTheme,
};
