
// Feeds DOM pointer events into @embedpdf/plugin-interaction-manager.
//
// The plugin ships this glue as `createPointerProvider`, but only in its react/
// and preact/ entry points, which import their framework. This is the same
// contract against the framework-agnostic capability, so a Backbone app doesn't
// have to take on a UI framework for it.
//
// Two things it must get right: handlers are looked up per event (the manager
// swaps them on mode change), and positions are in PAGE coordinates, not CSS
// pixels — the plugin hit-tests glyphs in page space.

import { restorePosition, transformSize } from '@embedpdf/models';

// DOM event name → the handler key the interaction manager exposes.
const EVENT_MAP = {
  pointerdown: 'onPointerDown',
  pointerup: 'onPointerUp',
  pointermove: 'onPointerMove',
  pointerenter: 'onPointerEnter',
  pointerleave: 'onPointerLeave',
  pointercancel: 'onPointerCancel',
  mousedown: 'onMouseDown',
  mouseup: 'onMouseUp',
  mousemove: 'onMouseMove',
  mouseenter: 'onMouseEnter',
  mouseleave: 'onMouseLeave',
  click: 'onClick',
  dblclick: 'onDoubleClick',
};

const TOUCH_MAP = {
  touchstart: 'onPointerDown',
  touchend: 'onPointerUp',
  touchmove: 'onPointerMove',
  touchcancel: 'onPointerCancel',
};

const HAS_POINTER_EVENTS = typeof PointerEvent !== 'undefined';

/**
 * Bind `element` as the pointer surface for one page.
 *
 * @param {object} capability  interaction-manager capability
 * @param {object} scope       `{ type:'page', documentId, pageIndex }`
 * @param {Element} element    must cover the rendered page box exactly — page
 *                             coordinates are derived from its bounding rect
 * @param {Function} geometry  `() => ({ pageSize, rotation, scale })` read at
 *                             event time, so a zoom or rotate needs no rebind
 * @returns {Function} unbind
 */
export function bindPagePointer(capability, scope, element, geometry) {
  const types = Object.keys(EVENT_MAP)
    .concat(HAS_POINTER_EVENTS ? [] : Object.keys(TOUCH_MAP));

  // Document-scoped view of the capability: the active mode is per document, and
  // every handler call has to carry it (see the dispatch below).
  const scoped = capability.forDocument(scope.documentId);

  let handlers = capability.getHandlersForScope(scope);
  const refresh = () => { handlers = capability.getHandlersForScope(scope); };

  const onEvent = (event) => {
    if (capability.isPaused()) return;
    const key = EVENT_MAP[event.type] || TOUCH_MAP[event.type];
    if (!key || !handlers || !handlers[key]) return;

    // Never hand a secondary-button press to the plugin. Its pointer-down handler
    // clears the current selection before deciding what was hit, and `pointerdown`
    // fires BEFORE `contextmenu` — so forwarding a right-click wipes the very
    // selection the context menu is about to offer to copy. Right-click has no
    // role in making a selection anyway.
    if (isSecondaryButton(event)) return;

    // The manager lets consumers mark subtrees off-limits; honour that first.
    const rules = capability.getExclusionRules();
    if (rules && isExcluded(event.target, rules)) return;

    const touch = isTouch(event);
    const source = touch
      ? (event.type === 'touchend' || event.type === 'touchcancel'
        ? event.changedTouches[0]
        : event.touches[0])
      : event;
    if (!source) return;

    const position = toPagePoint(source, element, geometry());
    if (!position) return;

    let stopped = false;
    // THIRD ARGUMENT IS REQUIRED. Every handler gates itself on
    // `isEnabled(modeId)`, and the interaction manager does not inject the mode
    // when it merges handlers — so calling with (point, event) alone makes every
    // handler return immediately and nothing is ever selectable.
    handlers[key](position, {
      clientX: source.clientX,
      clientY: source.clientY,
      ctrlKey: !!event.ctrlKey,
      shiftKey: !!event.shiftKey,
      altKey: !!event.altKey,
      metaKey: !!event.metaKey,
      target: event.target,
      currentTarget: event.currentTarget,
      // Keeps a drag alive past the page edge.
      setPointerCapture: () => {
        if (!touch && event.target && event.target.setPointerCapture) {
          try { event.target.setPointerCapture(event.pointerId); } catch (e) { /* not capturable */ }
        }
      },
      releasePointerCapture: () => {
        if (!touch && event.target && event.target.releasePointerCapture) {
          try { event.target.releasePointerCapture(event.pointerId); } catch (e) { /* already released */ }
        }
      },
      stopImmediatePropagation: () => { stopped = true; },
      isImmediatePropagationStopped: () => stopped,
    }, scoped.getActiveMode());
  };

  for (const type of types) {
    // Not passive: a drag-selection must be able to suppress touch scrolling.
    element.addEventListener(type, onEvent, { passive: false });
  }
  const stopHandlerWatch = capability.onHandlerChange(refresh);
  const stopModeWatch = scoped.onModeChange ? scoped.onModeChange(refresh) : null;

  return () => {
    for (const type of types) element.removeEventListener(type, onEvent);
    if (stopHandlerWatch) stopHandlerWatch();
    if (stopModeWatch) stopModeWatch();
  };
}

/**
 * Client coordinates → PDF page coordinates.
 *
 * `element` is the displayed page box, so its bounding rect is the page after
 * scaling and rotation; restorePosition undoes both. `scale` must be derived from
 * the same displayed size, or the hit test lands on the wrong glyph.
 */
function toPagePoint(source, element, geo) {
  if (!geo || !geo.pageSize || !geo.scale) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const point = { x: source.clientX - rect.left, y: source.clientY - rect.top };
  const scaled = transformSize(geo.pageSize, 0, geo.scale);
  // A quarter turn swaps which axis the displayed box measures.
  const rotated = transformSize(scaled, geo.rotation, 1);
  return restorePosition(rotated, point, geo.rotation, geo.scale);
}

function isTouch(event) {
  return typeof TouchEvent !== 'undefined' && event instanceof TouchEvent;
}

/**
 * True for a right/middle button press, release, or a drag carrying one.
 *
 * `button` identifies the button that changed on down/up but is 0 (meaning "no
 * change", not "left") on move, so movement has to be judged from the `buttons`
 * bitmask instead — bit 0 is left, bit 1 right, bit 2 middle.
 */
function isSecondaryButton(event) {
  if (isTouch(event)) return false;
  if (event.type === 'pointermove' || event.type === 'mousemove') {
    return typeof event.buttons === 'number' && event.buttons > 0 && !(event.buttons & 1);
  }
  return typeof event.button === 'number' && event.button > 0;
}

function isExcluded(target, rules) {
  let node = target;
  while (node) {
    if (rules.classes && rules.classes.length && node.classList) {
      for (const name of rules.classes) {
        if (node.classList.contains(name)) return true;
      }
    }
    if (rules.dataAttributes && rules.dataAttributes.length && node.hasAttribute) {
      for (const attr of rules.dataAttributes) {
        if (node.hasAttribute(attr)) return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}
