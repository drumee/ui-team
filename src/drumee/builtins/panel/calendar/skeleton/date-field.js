// Due-date / meeting-date picker shared by the task and meeting modals.
//
// The calendar card is appended to <body> (it would be clipped by the modal's
// own overflow otherwise), so flatpickr's built-in placement is wrong here
// twice over: it positions `absolute` against the document while the modal is
// `position: fixed` — and the desk never scrolls the document, the modal
// scrolls itself — and the shared dp-skin pulls an "above" card up by 18px to
// make up for flatpickr measuring without its padding. placeCalendar replaces
// both: `fixed`, in viewport coordinates, under the field (above it when the
// viewport has no room below), clamped to the viewport.
const GAP = 6;
const EDGE = 8;

function placeCalendar(instance) {
  const cal = instance && instance.calendarContainer;
  const anchor =
    instance && (instance.altInput || instance._input || instance.input);
  if (!cal || !anchor) return;
  // No pointer in this design, and the arrow classes are what the dp-skin's
  // -18px "opened above" correction keys on.
  cal.classList.remove("arrowTop", "arrowBottom", "arrowLeft", "arrowRight");
  cal.classList.add("calendar-main__flatpickr");

  const rect = anchor.getBoundingClientRect();
  const w = cal.offsetWidth;
  const h = cal.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const below = rect.bottom + GAP;
  const fitsBelow = below + h <= vh - EDGE;
  const fitsAbove = rect.top - GAP - h >= EDGE;
  let top = fitsBelow || !fitsAbove ? below : rect.top - GAP - h;
  top = Math.max(EDGE, Math.min(top, vh - h - EDGE));
  const left = Math.max(EDGE, Math.min(rect.left, vw - w - EDGE));

  cal.style.position = "fixed";
  cal.style.right = "auto";
  cal.style.top = `${top}px`;
  cal.style.left = `${left}px`;
}

// The modal scrolls itself, and flatpickr only re-places on window resize, so
// an open card would stay put while its field scrolled away. Follow it for as
// long as the card is open.
function follow(instance) {
  const modal =
    instance.altInput && instance.altInput.closest(".calendar-main__modal");
  if (!modal) return;
  instance.__calFollow = () => placeCalendar(instance);
  modal.addEventListener("scroll", instance.__calFollow, { passive: true });
  instance.__calModal = modal;
}

function unfollow(instance) {
  if (instance.__calModal && instance.__calFollow) {
    instance.__calModal.removeEventListener("scroll", instance.__calFollow);
  }
  instance.__calModal = null;
  instance.__calFollow = null;
}

module.exports = function (ui, opt) {
  const pfx = ui.fig.family;
  return {
    kind: "date_picker",
    className: `${pfx}__date-input`,
    innerClass: `${pfx}__date-input-inner`,
    name: opt.name,
    placeholder: LOCALE.SELECT_DATE,
    value: opt.value || "",
    service: "cal-form-date",
    uiHandler: [ui],
    vendorOpt: {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      // Spelled out so an unset date stays unset — a picker that seeded
      // itself with today would stamp every task with its creation date
      // (the same trap the board documents).
      defaultDate: opt.value || null,
      appendTo: document.body,
      position: placeCalendar,
      onOpen: [(_d, _s, instance) => follow(instance)],
      onClose: [(_d, _s, instance) => unfollow(instance)],
    },
  };
};
