// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : ../src/drumee/libs/reader/chart/line
//   TYPE : 
// ==================================================================== *

// chart = require('reader/chart')

class __chart_line extends LetcBox {
  // ===========================================================
  //
  // ===========================================================
  onDomRefresh() {
    require.ensure(['application'], () => {
      window.d3 = require("d3");
      if (this.mget('colors')) {
        this.colors = d3.scaleLinear().domain([1, 10]).range(this.mget('colors'));
      } else {
        this.colors = d3.scaleSequential().domain([1, 10]).interpolator(d3.interpolatePuRd);
      }
      this.waitElement(this.el, () => {
        this.el.setAttribute(_a.id, `chart-line-${this._id}`);
        this.draw();
      });
    });
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
      const s = d3.least(data.series, d => Math.abs(d.values[i] - ym));
      path.attr("stroke", d => d === s ? null : "#ddd").filter(d => d === s).raise();
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
    if ("ontouchstart" in document) svg
      .style("-webkit-tap-highlight-color", "transparent")
      .on("touchmove", moved)
      .on("touchstart", entered)
      .on("touchend", left)
    else svg
      .on("mousemove", moved)
      .on("mouseenter", entered)
      .on("mouseleave", left);

    const dot = svg.append("g")
      .attr("display", "none");

    dot.append("circle")
      .attr("r", 2.5);

    dot.append("text")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("y", -8);

  }

  /**
   * 
   * @returns 
   */
  async draw(restart=0) {
    if(restart) d3.select(`#chart-line-${this._id} svg`).remove();
    let dataset = this.mget('data');
    this.viewport = {
      width: this.$el.width(),
      height: this.$el.height(),
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        ...this.mget('margin')
      }
    }
    let d = this.viewport;
    this.viewport.innerWidth = d.width - d.margin.left - d.margin.right;
    this.viewport.innerHeight = d.height - d.margin.top - d.margin.bottom;
    //let axis = this.mget('rules');
    // let header = dataset.shift()
    let rules = this.mget('rules');
    // for(var a in axis){
    //   for(var i in header){
    //     if(header[i] == axis[a]) rules[a]  = parseInt(i);
    //   }
    // }
    //this.debug("AAA:47", rules);
    let x_axis = rules.x;
    let y_axis = rules.y;
    if(!x_axis || !y_axis){
      this.warn(`Invalid rules`, rules);
      return;
    }

    let yMax = 0;
    dataset = dataset.map((d) => { d[y_axis] = parseInt(d[y_axis]); if(yMax < d[y_axis]){ yMax = d[y_axis]} return d});
    const yDivider = Math.ceil(yMax/5);
    const yTickInterval = Math.ceil(yMax/yDivider);

    const yMapper = (d) => {
      //this.debug("AAA:yMapper", d, y_axis, d[y_axis]);
      //this.debug("AAA:yMapper", d, y_axis, d[y_axis]);
      return d[y_axis];
    }

    this.tickFormat = this.mget('tick_format') || "%b.%d";
    let time_format = this.mget('time_format');
    const dateParser = d3.timeParse(time_format);
    //this.debug("AAA:28 -- dataset", rules, time_format, x_axis, dateParser);
    const xMapper = (d) => {
      let r = dateParser(d[x_axis]);
      //this.debug("AAA:xMapper", d, x_axis, d[x_axis], r);
      return r;
    };


    const wrapper = d3.select(`#chart-line-${this._id}`).append("svg")
      .attr(_a.width, this.viewport.width)
      .attr(_a.height, this.viewport.height);

    this.debug("AAA:54", dataset, wrapper);

    const bbox = wrapper
      .append("g")
      .style(
        "transform",
        `translate(${this.viewport.margin.left}px,${this.viewport.margin.top}px)`
      );

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(dataset, yMapper) + 20])
      .range([this.viewport.innerHeight, 0])
      .nice();

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dataset, xMapper))
      .range([0, this.viewport.innerWidth]);

    const lineGenerator = d3
      .line()
      .x((d) => xScale(xMapper(d)))
      .y((d) => yScale(yMapper(d)))
      .curve(d3.curveBasis);


    // Generate Y Axis
    const yAxisGenerator = d3.axisLeft(yScale)
      // .scale(yScale)
      .ticks(yTickInterval);
    
    bbox.append("g").call(yAxisGenerator);

    // Generate X Axis
    const xAxisGenerator = d3.axisBottom().scale(xScale);
    bbox
      .append("g")
      .call(xAxisGenerator.tickFormat(d3.timeFormat(this.tickFormat)))
      .style("transform", `translateY(${this.viewport.innerHeight}px)`);

    if (this.mget('title')) {
      let t = {
        text: '',
        x: 20,
        y: 20,
        textAnchor: "middle",
        fontSize: "16px",
        textDecoration: "underline",
        fontFamily : "Roboto-Regular,sans-serif",
        ...this.mget('title')
      };
      wrapper
        .append("g")
        .style("transform", `translate(${t.x}px,${t.y}px)`)
        .attr("text-anchor", t.textAnchor)
        .style("font-size", t.fontSize)
        .style("font-family", t.fontFamily)
        .style("text-decoration", t.textDecoration)
        .append("text")
        .attr("class", "title")
        .text(t.text)
    }

    // line
    //this.debug("AAA:190", dataset)
    bbox
      .append("path")
      .attr("d", lineGenerator(dataset))
      .attr("fill", "none")
      .attr("stroke", this.mget(_a.color) || this.colors(10))
      .attr("stroke-width", 2);

  }
}
module.exports = __chart_line;
