
class __datepicker extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._on_change = this._on_change.bind(this);
  }

  static initClass() {
    this.prototype.className = "datepicker";
  }

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.model.atLeast({
      aspect: _a.grid,
      justify: _a.left,
      innerClass: "",
      name: "daterange",
    });
    this.declareHandlers();
    this._id = _.uniqueId("dp-");
    this.model.set({ widgetId: this._id, sys_pn: "date-range-picker" });
  }

  async onDomRefresh() {
    const flatpickr = (await import("flatpickr")).default;
    await import("flatpickr/dist/flatpickr.min.css");

    this._input = document.createElement("input");
    this._input.id = `${this._id}-input`;
    this._input.className = this.mget(_a.innerClass) || "";
    this._input.name = this.mget(_a.name);
    this._input.type = "text";
    // flatpickr copies this onto its altInput, so an unset picker reads as
    // "Select date" instead of an unexplained blank field.
    this._input.placeholder = this.mget(_a.placeholder) || "";
    this.el.appendChild(this._input);

    const isRange = !!this.mget("ranges");
    // `multiple: true` → pick any number of discrete dates (flatpickr
    // "multiple" mode). Mutually exclusive with `ranges`; `ranges` wins.
    const isMultiple = !isRange && !!this.mget("multiple");
    const placement = this.mget("placement") === "up" ? "above" : "below";

    const opt = {
      appendTo: this.el,
      dateFormat: "d/m/Y",
      position: placement,
      // Figma "set date": month shown as plain label (e.g. "July"), 2-letter
      // weekday headers, Sunday-first. Set before vendorOpt so consumers can override.
      monthSelectorType: "static",
      locale: {
        firstDayOfWeek: 0,
        weekdays: {
          shorthand: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
          longhand: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
      },
      onChange: this._on_change,
      ...(isRange
        ? {
            mode: "range",
            // An explicit array `value` seeds the range; otherwise default to
            // the last 29 days (analytics). Pass `value: []` to start empty.
            defaultDate: Array.isArray(this.mget(_a.value))
              ? this.mget(_a.value)
              : [Dayjs().subtract(29, "days").toDate(), Dayjs().toDate()],
          }
        : isMultiple
        ? {
            mode: "multiple",
            // `value` may be a single date or an array of dates
            defaultDate: this.mget(_a.value) || [],
          }
        : {
            // A `value` that is present but empty means "start with nothing
            // selected" — an unset field (a task with no due date, a
            // recurrence with no end) must not silently adopt today the moment
            // the picker mounts, because consumers read the input back as the
            // user's choice. Only a caller that passes no `value` at all still
            // gets today.
            // When a value IS given it must NOT be a preformatted string in a
            // foreign format: consumers override `dateFormat` via vendorOpt
            // (e.g. "Y-m-d") and flatpickr parses `defaultDate` with that
            // format — a mismatch matches no token and silently falls back to
            // Jan 1 of the current year.
            defaultDate: this.model.has(_a.value)
              ? this.mget(_a.value) || null
              : new Date(),
          }),
      ...this.mget(_a.vendorOpt),
    };

    this._picker = flatpickr(this._input, opt);
    // Scope our skin to this instance only, then add the Cancel/Done footer
    // (flatpickr ships no footer of its own).
    this._picker.calendarContainer.classList.add("dp-skin");
    this._lastCommitted = this._picker.selectedDates.slice();
    // Last *complete* range [start, end], for the rangeEdit interaction below.
    this._committedRange =
      this._picker.selectedDates.length === 2
        ? this._picker.selectedDates.slice()
        : null;
    this._buildFooter(this._picker);
  }

  // Footer matching the Figma design: Cancel reverts to the last committed
  // selection and dismisses; Done commits the current pick and dismisses.
  // onChange still fires live on each pick, so existing consumers are unaffected.
  _buildFooter(picker) {
    const footer = document.createElement("div");
    footer.className = "dp-footer";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "dp-btn dp-btn--cancel";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => {
      picker.setDate(this._lastCommitted || [], false);
      this._committedRange =
        this._lastCommitted && this._lastCommitted.length === 2
          ? this._lastCommitted.slice()
          : null;
      // Re-publish the reverted selection tagged "cancel" so the host can
      // dismiss without committing the in-progress pick.
      this._publish(
        picker.selectedDates,
        picker.input ? picker.input.value : "",
        "cancel"
      );
      this.triggerHandlers();
      picker.close();
    });

    const done = document.createElement("button");
    done.type = "button";
    done.className = "dp-btn dp-btn--done";
    done.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg><span>Done</span>';
    done.addEventListener("click", () => {
      this._lastCommitted = picker.selectedDates.slice();
      this._publish(
        picker.selectedDates,
        picker.input ? picker.input.value : "",
        "done"
      );
      this.triggerHandlers();
      picker.close();
    });

    footer.appendChild(cancel);
    footer.appendChild(done);
    picker.calendarContainer.appendChild(footer);
  }

  _on_change(selectedDates, dateStr) {
    // Enhanced range editing (opt-in via `rangeEdit`): clicking an endpoint
    // deselects it; clicking elsewhere while a range exists moves the nearest
    // endpoint instead of starting over. Plain range/single/multiple use the
    // default below.
    if (this.mget("ranges") && this.mget("rangeEdit")) {
      this._handleRangeEdit();
      return;
    }
    this._publish(selectedDates, dateStr, "change");
    const end = selectedDates[1];
    // Range only commits once both ends are picked; single and multiple
    // commit on every change (each click toggles a date in multiple mode).
    if (!this.mget("ranges") || end) {
      this.triggerHandlers();
    }
  }

  _sameDay(a, b) {
    return (
      a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // Range editing on top of flatpickr's range mode. flatpickr resets a complete
  // range to a single date on the next click; we reinterpret that click as an
  // edit of the existing range so start/end stay editable and chronological.
  _handleRangeEdit() {
    const picker = this._picker;
    const sel = picker.selectedDates.slice().sort((a, b) => a - b);

    // A single date arriving while a complete range already exists = an edit.
    if (sel.length === 1 && this._committedRange && this._committedRange.length === 2) {
      const c = sel[0];
      const [s, e] = this._committedRange;
      let next;
      if (this._sameDay(c, s)) {
        next = [e]; // clicked the start → deselect it, keep the end
      } else if (this._sameDay(c, e)) {
        next = [s]; // clicked the end → deselect it, keep the start
      } else {
        // Move whichever endpoint is nearer; keep chronological order.
        next =
          Math.abs(c - s) <= Math.abs(c - e) ? [c, e] : [s, c];
        next.sort((a, b) => a - b);
      }
      picker.setDate(next, false); // re-render; no recursive onChange
    }

    const dates = picker.selectedDates.slice().sort((a, b) => a - b);
    this._committedRange = dates.length === 2 ? dates : null;
    this._publish(dates, picker.input ? picker.input.value : "", "change");
    // Commit (fire handlers) only once a full range exists.
    if (dates.length === 2) this.triggerHandlers();
  }

  // Write the current selection (plus derived first/last/duration) onto the
  // model. `action` lets consumers distinguish a live pick ("change") from an
  // explicit footer action ("done" / "cancel").
  _publish(selectedDates, dateStr, action) {
    const dates = selectedDates.slice();
    const sorted = dates.slice().sort((a, b) => a - b);
    const firstDate = sorted[0] || null;
    const lastDate = sorted[sorted.length - 1] || null;
    // Whole days spanned by the selection (lastDate - firstDate); 0 for a
    // single date or empty selection.
    const durationDays =
      firstDate && lastDate
        ? Math.round((lastDate - firstDate) / 86400000)
        : 0;
    this.mset({
      startDate: dates[0] || null,
      endDate: dates[1] || dates[0] || null,
      firstDate,
      lastDate,
      durationDays,
      // Full selection — source of truth for multiple mode. A copy, so
      // consumers can't mutate flatpickr's internal array.
      selectedDates: dates,
      selectedLabel: dateStr,
      value: dateStr,
      dpAction: action,
    });
  }

  // --- Public API for multi/programmatic selection -------------------------

  // Array of currently selected Date objects (empty until the picker mounts).
  getSelectedDates() {
    return this._picker ? this._picker.selectedDates.slice() : [];
  }

  // Whole days between the first and last selected date (0 if < 2 dates).
  getDurationDays() {
    const sorted = this.getSelectedDates().sort((a, b) => a - b);
    if (sorted.length < 2) return 0;
    return Math.round((sorted[sorted.length - 1] - sorted[0]) / 86400000);
  }

  // Replace the selection. `dates` may be a Date, a date string, or an array
  // of them. Pass trigger=true to fire onChange/handlers (default: silent).
  setSelectedDates(dates, trigger = false) {
    if (this._picker) this._picker.setDate(dates, trigger);
  }

  // Clear all selected dates. trigger=true fires onChange/handlers.
  clearDates(trigger = false) {
    if (this._picker) this._picker.clear(trigger);
  }

  onBeforeDestroy() {
    if (this._picker) this._picker.destroy();
  }
}
__datepicker.initClass();

module.exports = __datepicker;
