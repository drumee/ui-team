class __chart_pie extends LetcBox {

  // ===========================================================
  //
  // ===========================================================
  onDomRefresh() {
    require.ensure(['application'], () => {
      window.d3 = require("d3");
      d3.version = '7.6.1';
      this._d3pie = require("d3pie");
      this.waitElement(this.el, () => {
        this.reload();
      });
    });
  }

  /**
   * 
  */
  _header() {
    const h = {
      title: {
        text: "",
        fontSize: 24,
        font: "courier"
      },
      subtitle: {
        text: "",
        color: "#999999",
        fontSize: 10,
        font: "courier"
      },
      location: "pie-center",
      titleSubtitlePadding: 0
    };
    return { ...h, ...this.mget(_a.header) };
  }

  /**
   * 
  */
  _size() {
    const h = {
      canvasWidth: this.$el.width() || 500,
      pieOuterRadius: "80%",
      pieInnerRadius: "45%"
    }
    return { ...h, ...this.mget(_a.size) };
  }

  /**
   * 
  */
  _labels() {
    const l = {
      outer: {
        pieDistance: 32
      },
      inner: {
        hideWhenLessThanPercentage: 3
      },
      mainLabel: {
        fontSize: 11
      },
      percentage: {
        color: "#ffffff",
        decimalPlaces: 0
      },
      value: {
        color: "#adadad",
        fontSize: 11
      },
      lines: {
        enabled: true
      },
      truncation: {
        enabled: true
      }
    };
    return { ...l, ...this.mget(_a.labels) };
  }

  /**
   * 
  */
  _footer() {
    let h = {};
    return { ...h, ...this.mget(_a.footer) };
  }

  /**
   * 
  */
  _effects() {
    let h = {
      pullOutSegmentOnClick: {
        effect: "linear",
        speed: 400,
        size: 8
      }
    }
    return { ...h, ...this.mget("effects") };
  }

  /**
   * 
  */
  _misc() {
    let h = {
      gradient: {
        enabled: true,
        percentage: 100
      }
    }
    return { ...h, ...this.mget("misc") };
  }


  // ===========================================================
  //
  // ===========================================================
  reload() {
    const opt = {
      header: this._header(),
      footer: this._footer(),
      size: this._size(),
      data: {
        sortOrder: this.mget("sortOrder"),
        content: this.mget(_a.content)
      },
      labels: this._labels(),
      effects: this._effects(),
      misc: this._misc()
    };

    return new this._d3pie(this.el, opt);
  }
}


module.exports = __chart_pie;
