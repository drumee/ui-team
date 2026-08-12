/**
 * App-level keyboard shortcuts.
 *
 * WHY CAPTURE PHASE. ui-core already has a key bus — `letc/addons/dom/
 * events-handler.js` binds document keydown/keyup and re-emits on RADIO_KBD /
 * RADIO_BROADCAST — but it binds them in the BUBBLE phase, and the text widgets
 * stop propagation at the target: RichText's `keydown`/`keyup` both open with
 * `e.stopPropagation()`, and Entry's `_onKeyup` does the same. Measured on
 * drumee.in with a document-level probe: a keystroke in a chat box produces a
 * capture record and NO bubble record, while the same keystroke in the task
 * panel's raw contenteditable produces both. So a bubble-phase shortcut is blind
 * exactly where a shortcut has to work — while the user is typing. Capture runs
 * before the target, so nothing downstream can hide a key from it.
 *
 * RULES for anything registered here — a global key handler is the one thing that
 * can break typing everywhere, so they are not optional:
 *
 *  1. Only claim combos the browser and the OS leave free. NEVER Ctrl/Cmd + C /
 *     V / X / Z / A, and never a bare printable key.
 *  2. Match modified combos on `e.key`, not `e.code`. An IME leaves modified keys
 *     alone (measured: Ctrl+k arrives as key="k", while an unmodified letter
 *     arrives as key="Process"), and `e.key` follows the keyboard LAYOUT whereas
 *     `e.code` is physical-position based and would fire on the wrong letter for
 *     a Dvorak user. `e.code` is only correct for unmodified keys.
 *  3. `preventDefault()` happens here, and ONLY when a binding reports that it
 *     actually did something. An unhandled press must behave exactly as it does
 *     today.
 *  4. Never `stopPropagation()`. This listener sees every key in the app before
 *     any element does; swallowing one would silently break unrelated widgets.
 *  5. A throwing binding must not take the keyboard down with it, so `run` is
 *     wrapped and a failure is treated as "not handled".
 */

// Bindings are { name?, phase?, match(e) -> bool, run(e) -> bool }. `run`
// returning false (or throwing) means "I could not act", and the key keeps its
// default behaviour.
//
// PHASE. `capture` (the default) is right for a shortcut that must win over
// everything, because the text widgets stop propagation at the target. `bubble`
// is right for the opposite job — a key that must yield to whatever is nearest
// the user. Escape is the case in point: six widgets already handle it on
// keydown and preventDefault (the share popup, file rename, and four mention
// dropdowns), so a bubble listener runs after them and can read
// `e.defaultPrevented` to know it was already claimed. That signal is only
// readable within one event, which is why Escape is matched on keydown even
// though `window/confirm` answers it on keyup.
const _bindings = [];
const _listeners = { capture: null, bubble: null };
const CAPTURE = "capture";
const BUBBLE = "bubble";

/**
 * An IME owns the keystroke while it is composing — `key` arrives as "Process"
 * and, on older stacks, keyCode 229. Never act on those.
 */
function isComposing(e) {
  return !!e.isComposing || e.keyCode === 229 || e.key === "Process";
}

/**
 * True when the focused element takes free text, so a binding can opt out of
 * firing mid-typing. Exposed because that judgement belongs to each binding:
 * a search shortcut SHOULD work while typing, a single-letter one must not.
 */
function inTextEntry(node) {
  const el = node && node.nodeType ? node : document.activeElement;
  if (!el || !el.tagName) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
  return typeof el.closest === "function" && !!el.closest('[contenteditable="true"]');
}

function _dispatch(phase, e) {
  if (!e || isComposing(e)) return;
  for (const b of _bindings) {
    if ((b.phase === BUBBLE ? BUBBLE : CAPTURE) !== phase) continue;
    let matched = false;
    try {
      matched = !!b.match(e);
    } catch (err) {
      console.error("[hotkeys] match threw:", err);
      continue;
    }
    if (!matched) continue;
    let handled = false;
    try {
      handled = b.run(e) !== false;
    } catch (err) {
      console.error("[hotkeys] handler threw:", err);
      handled = false;
    }
    // Only a binding that acted may consume the key. No stopPropagation: see
    // rule 4 — other widgets must still see it.
    if (handled) e.preventDefault();
    return;
  }
}

/** One listener per phase, each seeing only its own bindings. */
function _install(phase) {
  if (_listeners[phase]) return;
  const fn = (e) => _dispatch(phase, e);
  _listeners[phase] = fn;
  document.addEventListener("keydown", fn, phase === CAPTURE);
}

function _uninstallIfIdle(phase) {
  if (!_listeners[phase]) return;
  const stillUsed = _bindings.some(
    (b) => (b.phase === BUBBLE ? BUBBLE : CAPTURE) === phase,
  );
  if (stillUsed) return;
  document.removeEventListener("keydown", _listeners[phase], phase === CAPTURE);
  _listeners[phase] = null;
}

/**
 * Add a binding. The document listener is installed lazily on the first one.
 *
 * Pass a `name` to make registration idempotent: re-registering that name
 * REPLACES the previous binding instead of stacking a second one. A module whose
 * lifecycle re-runs (a desk rebuilt on a route change) would otherwise leave a
 * binding closed over a destroyed widget wired to the global listener — a stale
 * global key handler is the failure mode most worth designing out.
 */
function register(binding) {
  if (!binding || typeof binding.match !== "function" || typeof binding.run !== "function") {
    console.error("[hotkeys] register() needs { match, run }");
    return null;
  }
  if (binding.name) {
    const prev = _bindings.findIndex((b) => b.name === binding.name);
    if (prev >= 0) _bindings.splice(prev, 1);
  }
  _bindings.push(binding);
  _install(binding.phase === BUBBLE ? BUBBLE : CAPTURE);
  return binding;
}

/** Remove a binding; a phase's listener is dropped once its last one goes. */
function unregister(binding) {
  const i = _bindings.indexOf(binding);
  if (i >= 0) _bindings.splice(i, 1);
  _uninstallIfIdle(CAPTURE);
  _uninstallIfIdle(BUBBLE);
}

/** Ctrl (Windows/Linux) or Cmd (macOS) + Shift + <letter>, and nothing else. */
function isCmdShift(e, letter) {
  return (
    (e.ctrlKey || e.metaKey) &&
    e.shiftKey &&
    !e.altKey &&
    String(e.key || "").toLowerCase() === letter
  );
}

module.exports = { register, unregister, isCmdShift, isComposing, inTextEntry };
