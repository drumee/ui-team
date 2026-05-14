
const { today } = require("core/utils")
/**
 * @param {*} view 
 * @returns 
*/
const _template = function (view) {
  let html;
  return html = `<input id=\"${view._id}-input\" \
    class=\"${view.mget(_a.innerClass)}\" \
    name=\"${view.mget(_a.name)}\" \
    type=\"text\" value=\"${view.mget(_a.value)}\" />\
    `;
};

/**
 * 
*/
class __datepicker extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this._update = this._update.bind(this);
    this._on_select = this._on_select.bind(this);
    this._on_apply = this._on_apply.bind(this);
    this._start = this._start.bind(this);
  }

  static initClass() {
    this.prototype.className = "datepicker";
  }

  /**
   * @param {*} opt
  */
  initialize(opt) {
    super.initialize();
    this.model.atLeast({
      aspect: _a.grid,
      justify: _a.left,
      innerClass: "",
      name: "daterange",
      value: today()
    });
    this.declareHandlers(); //s()
    this._id = _.uniqueId('dp-');
    this.model.set({
      widgetId: this._id,
      sys_pn: 'date-range-picker'
    });

    this._countdown = _.after(3, this._start);
    return require.ensure(['application'], () => {
      require('daterangepicker');
      require('daterangepicker/daterangepicker.css');
      return this._countdown();
    });
  }


  // ===========================================================
  //
  // ===========================================================
  onDomRefresh() {
    this.declareHandlers(); //s()
    this.debug("AAAA 22222222", this, this.el);
    this.el.setAttribute(_a.id, this._id);
    this.$el.append(_template(this));
    this._input = $(`#${this._id}-input`);
    this._countdown();
    const f = () => {
      this._countdown();
      this._input.on('outsideClick.daterangepicker', this._outsideClick)
      this._input.on('apply.daterangepicker', this._on_apply);
      return
    };
    return this.waitElement(this._input[0], f);
  }

  // ===========================================================
  //
  // ===========================================================
  _update(start, end, label) {
    this.debug('_update datepicker', start, end, label, this);
    const f = Visitor.dateformat();
    this.mset({
      startDate: start,
      endDate: end,
      selectedLabel: label
    });
    return this._input[0].dataset.state = _a.open;
  }

  // ===========================================================
  //
  // ===========================================================
  _on_select(instance, date) {
    return this.debug('aaa 90: ', instance, date);
  }

  // ===========================================================
  //
  // ===========================================================
  _on_apply(instance, date) {
    // Something is setting state to closed?
    this._input[0].dataset.state = _a.open;
    return this.triggerHandlers();
  }

  /**
   * 
  */
  _outsideClick() {
    // to override the default behavior of hide by the library
    return this.show();
  }
  // ===========================================================
  //
  // ===========================================================
  _start() {
    this.debug("AAAA 3333333", this, this.el);

    let opt = {
      parentEl: this.$el,
      singleDatePicker: true,
      showDropdowns: true,
      drops: this.mget('placement') || 'up',
      autoApply: true,
      onSelect: this.on_select,
      locale: {
        format: "DD/MM/YYYY"
      },
      opens: this.mget('openPosition') || 'center'
    };

    if (this.mget('ranges')) {
      delete opt.singleDatePicker;
      opt.startDate = Dayjs().subtract(29, 'days').format('DD/MM/YYYY');
      opt.endDate = Dayjs().format('DD/MM/YYYY');
      opt.alwaysShowCalendars = true;
      opt.locale.separator = ' to ';
      opt.ranges = {
        'Yesterday': [Dayjs().subtract(1, 'days'), Dayjs().subtract(1, 'days')],
        'Last Week': [Dayjs().subtract(6, 'days'), Dayjs()],
        'Last 30 Days': [Dayjs().subtract(29, 'days'), Dayjs()],
        'This Month': [Dayjs().startOf('month'), Dayjs().endOf('month')],
        'Last Month': [Dayjs().subtract(1, 'month').startOf('month'), Dayjs().subtract(1, 'month').endOf('month')],
        'Last Year': [Dayjs().subtract(11, 'month').startOf('month'), Dayjs().endOf('month')]
      }
    }

    opt = _.merge(opt, this.model.get(_a.vendorOpt));
    this._input.daterangepicker(opt, this._update);

    // to over-ride and fix a css bug - do not remove
    this.el.firstChild.remove();
    this.el.lastChild.style.display = _a.none;

    return
  }
}
__datepicker.initClass();

module.exports = __datepicker;
