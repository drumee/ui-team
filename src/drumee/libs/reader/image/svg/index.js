// ============================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : ../src/drumee/libs/reader/image/svg
//   TYPE :
// ============================================================== *
const { toggleState } = require("core/utils")

const { xhRequest } = require("core/socket/request");

class __drumee_svg extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.loadVector = this.loadVector.bind(this);
    this.getData = this.getData.bind(this);
  }

  static initClass() {
    this.prototype.nativeClassName = "svg-wrapper drumee-widget";
    this.prototype.template = null;
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    super.initialize(opt);
    this.model.atLeast({
      chartId: this._chartId,
      url: _K.char.empty,
      innerClass: "svg-inner",
      value: _K.char.empty,
      content: _K.char.empty,
      labelClass: _a.label,
    });

    if (this.model.get(_a.icons) != null) {
      this._chartId =
        this.model.get(_a.icons)[this.model.get(_a.state)] || "bars";
      this.model.set(_a.chartId, this._chartId);
    }
    if (this.model.get(_a.labels) != null) {
      this._label = this.model.get(_a.labels)[this.model.get(_a.state)] || "";
      this.model.set(_a.label, this._label);
    }
    this.declareHandlers();
    this.changeState = this.setState;
  }

  /**
   * 
   * @returns 
   */
  onDomRefresh() {
    this.$el.attr(_a.data.state, this.model.get(_a.state));
    this.el.innerHTML = "";
    this.$el.append(require("./template")(this));
    const id = `icon-${this._id}`;
    this.waitElement(id, () => {
      this.__icon = document.getElementById(id);
      if (this.mget('svgSource')) {
        this.loadVector(this.mget('svgSource'));
        return;
      }
      if (this.mget(_a.chartId)) return;
      if (this.mget(_a.src)) {
        this.loadSrc();
      } else {
        this.loadVector();
      }
    });
  }

  /**
   * 
   * @param {*} text 
   * @param {*} autohide 
   * @returns 
   */
  setLabel(text, autohide) {
    if (autohide == null) {
      autohide = false;
    }
    this.model.set({
      label: text,
    });
    this.render();
    const $el = $("#label-" + this._id);
    if (autohide && _.isEmpty(text)) {
      return $el.css({ display: _a.none });
    } else {
      return $el.css({ display: "" });
    }
  }

  /**
   * 
   * @param {*} chartId 
   * @returns 
   */
  setIcon(chartId) {
    if (this.__icon && this.__icon.innerHTML) {
      return (this.__icon.innerHTML = `<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-${chartId}\"></use>`);
    }
  }

  /**
   * 
   * @returns 
   */
  mould() {
    const state = this.model.get(_a.state);
    if (state != null) {
      const icons = this.model.get(_a.icons);
      if (_.isArray(icons)) {
        if (icons[state] != null) {
          this.setIcon(icons[state]);
        }
      }
      const labels = this.model.get(_a.labels);
      if (_.isArray(labels)) {
        if (labels[state] != null) {
          return this.setLabel(labels[state]);
        }
      }
    }
  }

  /**
   *
   * @returns
   */
  loadSrc() {
    return (this.el.innerHTML = require("./template/img")(this));
  }

  /**
   * 
   * @param {*} url 
   * @returns 
   */
  loadVector(url) {
    if (_.isEmpty(url)) {
      let nid;
      ({ url, nid } = this.actualNode());
      if (!nid) return;
    }

    const t = this.__icon;
    if (this._vector != null) {
      if (_.isString(this._vector)) {
        t.__icon.innerHTML = this._vector;
        return;
      }
      this.waitElement(`icon-${this._id}`, () => {
        this.renderVector(this._vector, false, t);
        if (this.mget(_a.styleIcon)) {
          return this.$icon.css(this.mget(_a.styleIcon));
        }
      });
    } else {
      xhRequest(url, { responseType: _a.text })
        .then((data) => {
          this._vector = data;
          t.innerHTML = data;
        })
        .catch((e) => {
          this.warn("Failed to load", url, e);
        });
    }
  }

  /**
   * 
   * @param {*} e 
   * @returns 
   */
  toggle(e) {
    return this.triggerMethod(_e.also.click, e);
  }

  /**
   * 
   * @param {*} s 
   * @returns 
   */
  setState(s) {
    s = toggleState(s);
    if (s === this.mget(_a.state)) {
      return;
    }
    this.model.set({
      state: s,
    });
    setTimeout(() => {
      this.el.dataset.state = s;
    }, 200)
    this.mould();
  }

  /**
   * 
   * @param {*} nocheck 
   * @returns 
   */
  getData(nocheck) {
    if (nocheck == null) {
      nocheck = 0;
    }
    const name = this.mget(_a.name) || _a.name;
    let value = this.mget(_a.value) || this.mget(_a.state);
    if (!this.mget(_a.state)) {
      value = this.mget(_a.state);
    }

    return { name, value };
  }
}
__drumee_svg.initClass();

module.exports = __drumee_svg;
