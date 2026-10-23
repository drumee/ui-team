/**
 * Where the export dialog's flatpickr calendar opens (flatpickr `position`
 * option, set in skeleton/index.js _dateInput).
 *
 * flatpickr's own placement works in PAGE coordinates against
 * body.offsetWidth; in the desk that put the calendar right of the start
 * field, past the dialog from the end field, and — with the datepicker
 * widget's forced "below" — off the bottom of the screen. Here the calendar is
 * position:fixed and placed in VIEWPORT coordinates, anchored to the field's
 * visible box (the date-input-wrap, not the bare input text):
 *   - below the field, 4px gap; above when there is no room below;
 *     otherwise kept inside the viewport bottom;
 *   - left edges aligned; right edges aligned when that would pass the
 *     dialog card's right edge (so the END field's calendar stays inside the
 *     dialog) or the viewport's; never closer than 8px to a viewport edge.
 */
const WRAP = ".widget-chat-export__date-input-wrap";
const CARD = ".widget-chat-export__card";

function placeCalendar(anchor, cal, viewport, { gap = 4, margin = 8, bounds } = {}) {
  let top;
  if (anchor.bottom + gap + cal.height <= viewport.height - margin) {
    top = anchor.bottom + gap;
  } else if (anchor.top - gap - cal.height >= margin) {
    top = anchor.top - gap - cal.height;
  } else {
    top = Math.max(margin, viewport.height - margin - cal.height);
  }

  const rightLimit = Math.min(
    viewport.width - margin,
    bounds && Number.isFinite(bounds.right) ? bounds.right : Infinity,
  );
  let left = anchor.left;
  if (left + cal.width > rightLimit) left = anchor.right - cal.width;
  left = Math.min(left, viewport.width - margin - cal.width);
  left = Math.max(margin, left);
  return { top, left };
}

// flatpickr calls this as config.position(instance, customPositionElement).
function positionCalendar(fp, customEl) {
  const cal = fp && fp.calendarContainer;
  const el = customEl || (fp && fp._positionElement);
  if (!cal || !el) return;
  const anchorEl = (el.closest && el.closest(WRAP)) || el;
  const card = el.closest && el.closest(CARD);
  // Same height measure flatpickr uses: the children, since the container's
  // own box may not be laid out yet on the first open.
  const height = Array.prototype.reduce.call(
    cal.children || [],
    (acc, child) => acc + (child.offsetHeight || 0),
    0,
  );
  const { top, left } = placeCalendar(
    anchorEl.getBoundingClientRect(),
    { width: cal.offsetWidth, height },
    { width: window.innerWidth, height: window.innerHeight },
    { bounds: card ? card.getBoundingClientRect() : undefined },
  );
  cal.style.position = "fixed";
  cal.style.top = `${top}px`;
  cal.style.left = `${left}px`;
  cal.style.right = "auto";
}

module.exports = { placeCalendar, positionCalendar };
