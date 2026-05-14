
const { today } = require("@drumee/ui-essentials");

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
    super.initialize(opt);
    this.model.atLeast({
      aspect: _a.grid,
      justify: _a.left,
      innerClass: "",
      name: "daterange",
      value: today(),
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
    this.el.appendChild(this._input);

    const isRange = !!this.mget("ranges");
    const placement = this.mget("placement") === "up" ? "above" : "below";

    const opt = {
      appendTo: this.el,
      dateFormat: "d/m/Y",
      position: placement,
      onChange: this._on_change,
      ...(isRange
        ? {
            mode: "range",
            defaultDate: [
              Dayjs().subtract(29, "days").toDate(),
              Dayjs().toDate(),
            ],
          }
        : {
            defaultDate: this.mget(_a.value) || today(),
          }),
      ...this.mget(_a.vendorOpt),
    };

    this._picker = flatpickr(this._input, opt);
  }

  _on_change(selectedDates, dateStr) {
    const [start, end] = selectedDates;
    this.mset({
      startDate: start,
      endDate: end || start,
      selectedLabel: dateStr,
      value: dateStr,
    });
    // for range mode, only fire when both ends are picked
    if (!this.mget("ranges") || end) {
      this.triggerHandlers();
    }
  }

  onBeforeDestroy() {
    if (this._picker) this._picker.destroy();
  }
}
__datepicker.initClass();

module.exports = __datepicker;
