// ============================================================= *
//   Copyright Xialia.com  2011-2021
//   FILE : ../src/drumee/libs/reader/chart/line
//   TYPE :
// ============================================================= *

require("./skin");
const { xhRequest } = require("core/socket/request");

class __chart_mutiline extends LetcBox {

  /**
   * 
   */
  onDomRefresh() {
    require.ensure(["application"], () => {
      window.d3 = require("d3");
      this.id = `chart-line-${this._id}`;
      if (this.mget("colors")) {
        this.colors = d3
          .scaleLinear()
          .domain([1, 10])
          .range(this.mget("colors"));
      } else {
        this.colors = d3
          .scaleSequential()
          .domain([1, 10])
          .interpolator(d3.interpolatePuRd);
      }
      this.time_format = this.mget("time_format") || "%Y-%m-%d";
      this.waitElement(this.el, () => {
        this.el.setAttribute(_a.id, this.id);
        this.viewport = {
          width: this.$el.width(),
          height: this.$el.height(),
          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            ...this.mget("margin"),
          },
        };
        let d = this.viewport;
        this.viewport.innerWidth = d.width - d.margin.left - d.margin.right;
        this.viewport.innerHeight = d.height - d.margin.top - d.margin.bottom;
        this.viewport.top = d.margin.top;
        this.viewport.right = d.margin.left + this.viewport.innerWidth;
        this.viewport.bottom = d.margin.top + this.viewport.innerHeight;
        this.viewport.left = d.margin.left;
        this.timeSeries(d.width, d.height, this.dataSample());
      });
    });
  }

  dataSample() {
    const data = [];
    let d = Dayjs("15-Mar-20");
    for (let i = 0, v = 2; i < 60; ++i) {
      v += Math.random() - 0.5;
      v = Math.max(Math.min(v, 4), 0);
      data.push({
        date: d.toDate(),
        size: v,
      });

      //next date
      d = d.add(1, "day");
    }
    return data;
  }

  timeSeries(width, height, data) {
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const viewportHeight = height;
    const viewportWidth = width;
    const xMapper = d3
      .scaleUtc()
      .domain(d3.extent(data, (d) => d.date))
      .range([margin.left, viewportWidth - margin.right]);

    const yMapper = d3
      .scaleLinear()
      .domain([0, 4])
      .range([viewportHeight - margin.bottom, margin.top]);

    const line = d3
      .line()
      .x((d) => xMapper(d.date))
      .y((d) => yMapper(d.value));

    const xAxis = function (g) {
      return g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xMapper).ticks(10).tickSizeOuter(0));
    };

    const yAxis = function (g) {
      return g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yMapper).ticks(5).tickSizeOuter(0));
      // to remove the axis line, add the following
      // .call(g => g.select(".domain").remove());
    };

    const svg = d3
      .create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("style", "border:1px solid black");

    svg
      .append("path")
      .datum(data)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("stroke-miterlimit", 1)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    svg.append("g").call(xAxis);

    svg.append("g").call(yAxis);

    return svg.node();
  }


  /**
   *
   * @returns
   */
  chart(data) {
    this.data = data;
    const svg = d3
      .create("svg")
      .attr("viewBox", [
        0,
        0,
        this.viewport.innerWidth,
        this.viewport.innerHeight,
      ])
      .style("overflow", "visible");

    svg.append("g").call(this.xAxis.bind(this));

    svg.append("g").call(this.yAxis.bind(this));

    const path = svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "steelblue") // this.colors.bind(this)
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .selectAll("path")
      .data(this.data.series)
      .join("path")
      .style("mix-blend-mode", "multiply")
      .attr("d", (d) => () => {
        this.line(d.values);
      });

    svg.call(hover, path);

    return svg.node();
  }

  /**
   *
   * @param {*} svg
   * @param {*} path
   */
  hover(svg, path) {
    let data = this.data;
    function moved(event) {
      event.preventDefault();
      const pointer = d3.pointer(event, this);
      const xm = x.invert(pointer[0]);
      const ym = y.invert(pointer[1]);
      const i = d3.bisectCenter(data.dates, xm);
      const s = d3.least(data.series, (d) => Math.abs(d.values[i] - ym));
      path
        .attr("stroke", (d) => (d === s ? null : "#ddd"))
        .filter((d) => d === s)
        .raise();
      dot.attr("transform", `translate(${x(data.dates[i])},${y(s.values[i])})`);
      dot.select("text").text(s.name);
    }

    function entered() {
      path.style("mix-blend-mode", null).attr("stroke", "#ddd");
      dot.attr("display", null);
    }

    function left() {
      path.style("mix-blend-mode", "multiply").attr("stroke", null);
      dot.attr("display", "none");
    }
    if ("ontouchstart" in document)
      svg
        .style("-webkit-tap-highlight-color", "transparent")
        .on("touchmove", moved)
        .on("touchstart", entered)
        .on("touchend", left);
    else
      svg
        .on("mousemove", moved)
        .on("mouseenter", entered)
        .on("mouseleave", left);

    const dot = svg.append("g").attr("display", "none");

    dot.append("circle").attr("r", 2.5);

    dot
      .append("text")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("y", -8);
  }

  /**
   *
   */
  x() {
    d3.scaleUtc()
      .domain(d3.extent(this.data.dates))
      .range([this.viewport.left, this.viewport.right]);
  }

  /**
   *
   * @param {*} g
   */
  y() {
    d3.scaleLinear()
      .domain([0, d3.max(this.data.series, (d) => d3.max(d.values))])
      .nice()
      .range([this.viewport.bottom, this.viewport.top]);
  }

  /**
   *
   * @param {*} g
   */
  xAxis(g) {
    g.attr("transform", `translate(0,${this.viewport.bottom})`).call(
      d3
        .axisBottom(this.x.bind(this))
        .ticks(this.viewport.innerWidth / 80)
        .tickSizeOuter(0)
    );
  }

  /**
   *
   * @param {*} g
   */
  yAxis(g) {
    g.attr("transform", `translate(${this.viewport.left},0)`)
      .call(d3.axisLeft(this.y.bind(this)))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .select(".tick:last-of-type text")
          .clone()
          .attr("x", 3)
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
          .text(this.data.title)
      );
  }

  /**
   *
   */
  line() {
    d3.line()
      .defined((d) => !isNaN(d))
      .x((d, i) => this.x(this.data.dates[i]))
      .y((d) => this.y(d));
  }

  /**
   *
   * @returns
   */
  async readData() {
    let data = null;
    let raw = null;
    let src = this.mget(_a.src);
    let columns = null;
    if (this.mget(_a.api)) {
      data = await this.fetchService(this.mget(_a.api), { async: 1 });
      columns = data.columns.slice(1);
    } else if (/\.csv/.test(src)) {
      raw = await xhRequest(src, { responseType: _a.text });
      data = d3.csvParse(raw);
      columns = data.columns.slice(1);
    } else if (/\.tsv/.test(src)) {
      raw = await xhRequest(src, { responseType: _a.text });
      data = d3.tsvParse(raw);
      columns = data.columns.slice(1);
    }
    let res = {
      title: this.mget(_a.title) || "",
      series: data.map((d) => ({
        name: d.name.replace(/, ([\w-]+).*/, " $1"),
        values: columns.map((k) => +d[k]),
      })),
      dates: columns.map(d3.utcParse(this.time_format)),
    };
    return res;
  }

  async reload() {
    let dataset = this.mget("data");
    let axis = this.mget("rules");
    let header = dataset.shift();
    let rules = {};
    for (var a in axis) {
      for (var i in header) {
        if (header[i] == axis[a]) rules[a] = parseInt(i);
      }
    }
    const yAccessor = (d) => {
      return d[rules.y];
    };

    const dateParser = d3.timeParse(this.mget("time_format"));
    const xAccessor = (d) => {
      return dateParser(d[rules.x]);
    };

    const wrapper = d3
      .select(`#chart-line-${this._id}`)
      .append("svg")
      .attr(_a.width, this.viewport.width)
      .attr(_a.height, this.viewport.height);

    const bbox = wrapper
      .append("g")
      .style(
        "transform",
        `translate(${this.viewport.margin.left}px,${this.viewport.margin.top}px)`
      );

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(dataset, yAccessor))
      .range([this.viewport.boundedHeight, 0]);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dataset, xAccessor))
      .range([0, this.viewport.boundedWidth]);

    const lineGenerator = d3
      .line()
      .x((d) => xScale(xAccessor(d)))
      .y((d) => yScale(yAccessor(d)))
      .curve(d3.curveBasis);

    // Generate Y Axis
    const yAxisGenerator = d3.axisLeft().scale(yScale);
    bbox.append("g").call(yAxisGenerator);

    // Generate X Axis
    const xAxisGenerator = d3.axisBottom().scale(xScale);
    bbox
      .append("g")
      .call(xAxisGenerator.tickFormat(d3.timeFormat("%b,%y")))
      .style("transform", `translateY(${this.viewport.boundedHeight}px)`);

    wrapper
      .append("g")
      .style("transform", `translate(${50}px,${15}px)`)
      .attr("x", this.viewport.width / 2)
      .attr("y", this.viewport.margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "36px")
      .style("text-decoration", "underline");
    if (this.mget("title")) {
      wrapper.append("text").attr("class", "title").text(this.mget("title"));
    }

    // line
    bbox
      .append("path")
      .attr("d", lineGenerator(dataset))
      .attr("fill", "none")
      .attr("stroke", "Blue")
      .attr("stroke-width", 2);
  }

  // /**
  //  *
  //  * @returns
  //  */
  async draw() {
    let d = this.viewport;
    let svg = d3
      .select(`#${this.id}`)
      .append("svg")
      .attr(_a.width, d.width + d.margin.left + d.margin.right)
      .attr(_a.height, d.height + d.margin.top + d.margin.bottom)
      .append("g")
      .attr("transform", `translate(${d.margin.left},${d.margin.top})`);

    const allGroup = ["size", "count"];
    const myColor = d3.scaleOrdinal().domain(allGroup).range(d3.schemeSet2);

    // Add X axis --> it is a date format
    // d3.extent(dataset, yAccessor)
    const x = d3.scaleLinear().domain([0, 10]).range([0, d.width]);
    svg
      .append("g")
      .attr("transform", `translate(0, ${d.height})`)
      .call(d3.axisBottom(x));

    const line = svg
      .append("g")
      .append("path")
      .datum(data)
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return x(+d.date);
          })
          .y(function (d) {
            return y(+d.size);
          })
      )
      .attr("stroke", function (d) {
        return myColor("valueA");
      })
      .style("stroke-width", 4)
      .style("fill", "none");

    // Add Y axis
    const y = d3.scaleLinear().domain([0, 20]).range([d.height, 0]);
    this.svg.append("g").call(d3.axisLeft(y));

    let dataset = this.mget("data");
    let axis = this.mget("rules");
    let header = dataset.shift();
    let rules = {};
    for (var a in axis) {
      for (var i in header) {
        if (header[i] == axis[a]) rules[a] = parseInt(i);
      }
    }
    const yAccessor = (d) => {
      return d.size;
    };

    const dateParser = d3.timeParse(this.mget("time_format"));
    const xAccessor = (d) => {
      return dateParser(d.date);
    };

    const wrapper = d3
      .select(`#chart-line-${this._id}`)
      .append("svg")
      .attr(_a.width, d.width)
      .attr(_a.height, d.height);

    const bbox = wrapper
      .append("g")
      .style("transform", `translate(${d.margin.left}px,${d.margin.top}px)`);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(dataset, yAccessor))
      .range([d.innerHeight, 0]);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dataset, xAccessor))
      .range([0, d.innerWidth]);

    const lineGenerator = d3
      .line()
      .x((d) => xScale(xAccessor(d)))
      .y((d) => yScale(yAccessor(d)))
      .curve(d3.curveBasis);

    // Generate Y Axis
    const yAxisGenerator = d3.axisLeft().scale(yScale);
    const yAxis = bbox.append("g").call(yAxisGenerator);

    // Generate X Axis
    const xAxisGenerator = d3.axisBottom().scale(xScale);
    const xAxis = bbox
      .append("g")
      .call(xAxisGenerator.tickFormat(d3.timeFormat("%b,%y")))
      .style("transform", `translateY(${d.innerHeight}px)`);

    wrapper
      .append("g")
      .style("transform", `translate(${50}px,${15}px)`)
      .attr("x", d.width / 2)
      .attr("y", d.margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "36px")
      .style("text-decoration", "underline");
    if (this.mget("title")) {
      wrapper.append("text").attr("class", "title").text(this.mget("title"));
    }
  }
}
module.exports = __chart_mutiline;
