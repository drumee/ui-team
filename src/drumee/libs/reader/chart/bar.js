// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/libs/reader/chart/bar.js
//   TYPE : Component
// ==================================================================== *

// chart = require('reader/chart')

class __chart_bar extends LetcBox {
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
        this.el.setAttribute(_a.id, `chart-bar-${this._id}`);
        this.draw();
      });
    });
  }

  // /**
  // * 
  // * @param {*} svg 
  // * @param {*} path 
  // */
  // hover(svg, path) {
  //   let data = this.data;
  //   function moved(event) {
  //     event.preventDefault();
  //     const pointer = d3.pointer(event, this);
  //     const xm = x.invert(pointer[0]);
  //     const ym = y.invert(pointer[1]);
  //     const i = d3.bisectCenter(data.dates, xm);
  //     const s = d3.least(data.series, d => Math.abs(d.values[i] - ym));
  //     path.attr("stroke", d => d === s ? null : "#ddd").filter(d => d === s).raise();
  //     dot.attr("transform", `translate(${x(data.dates[i])},${y(s.values[i])})`);
  //     dot.select("text").text(s.name);
  //   }

  //   function entered() {
  //     path.style("mix-blend-mode", null).attr("stroke", "#ddd");
  //     dot.attr("display", null);
  //   }

  //   function left() {
  //     path.style("mix-blend-mode", "multiply").attr("stroke", null);
  //     dot.attr("display", "none");
  //   }
  //   if ("ontouchstart" in document) svg
  //     .style("-webkit-tap-highlight-color", "transparent")
  //     .on("touchmove", moved)
  //     .on("touchstart", entered)
  //     .on("touchend", left)
  //   else svg
  //     .on("mousemove", moved)
  //     .on("mouseenter", entered)
  //     .on("mouseleave", left);

  //   const dot = svg.append("g")
  //     .attr("display", "none");

  //   dot.append("circle")
  //     .attr("r", 2.5);

  //   dot.append("text")
  //     .attr("font-family", "sans-serif")
  //     .attr("font-size", 10)
  //     .attr("text-anchor", "middle")
  //     .attr("y", -8);

  // }

  /**
   * 
   * @returns 
   */
  async draw(restart=0) {
    if(restart) d3.select(`#chart-bar-${this._id} svg`).remove();

    let dataset = this.mget('data');
    this.parent = this.mget(_a.uiHandler);
    this.viewport = {
      width: this.$el.width(),
      height: this.$el.height(),
      pWidth: this.parent.$el.width(),
      pHeight: this.parent.$el.height(),
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        ...this.mget('margin')
      },
    }
    if (this.viewport.width == 0) {
      this.viewport.width = 500;
    }
    if (this.viewport.height == 0) {
      this.viewport.height = 500;
    }

    let d = this.viewport;
    this.viewport.innerWidth = d.pWidth - d.margin.left - d.margin.right;
    this.viewport.innerHeight = d.height - d.margin.top - d.margin.bottom;
    
    let rules = this.mget('rules');
    
    let x_axis = rules.x;
    let y_axis = rules.y;
    if(!x_axis || !y_axis){
      this.warn(`Invalid rules`, rules);
      return;
    }

    const yMapper = (d) => {
      return d[y_axis];
    }

    let time_format = this.mget('time_format');
    this.tickFormat = this.mget('tick_format') || "%d-%m-y" || "%b.%d";
    this.xTickInterval = this.mget('xTickInterval') || 2;
    this.yTickInterval = this.mget('yTickInterval') || 10;
    const dateParser = d3.timeParse(time_format);

    const xMapper = (d) => {
      let r = dateParser(d[x_axis]);
      return r;
    };

    const wrapper = d3.select(`#chart-bar-${this._id}`)
      .append("svg")
      .attr(_a.width, this.viewport.pWidth)
      .attr(_a.height, this.viewport.height);

    const bbox = wrapper
      .append("g")
      .attr('width', this.viewport.innerWidth)
      .attr('height', this.viewport.innerHeight)
      .attr('transform', `translate(${this.viewport.margin.left}, ${this.viewport.margin.top})`);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(dataset, yMapper) + 10])
      .range([this.viewport.innerHeight, 0])
      .nice();

    const xScale = d3.scaleTime()
      .domain(d3.extent(dataset, xMapper))
      .range([0, this.viewport.innerWidth])
      .nice();

    // bars
    bbox.append('g')
        .attr("fill", "#69b3a2")
      .selectAll('mybar')
      .data(dataset)
      .enter()
      .append('rect')
        .attr("x", d => xScale(xMapper(d)))
        .attr("width", 12)//xScale.bandwidth);
        .text(d=> yScale(yMapper(d)))
        // no bar at the beginning for animation effect
        .attr("y", d => yScale(0)) //always 0 for animation effect
        .attr("height", d => this.viewport.innerHeight - yScale(0));

    // Generate X Axis
    const xAxisGenerator = d3.axisBottom(xScale)
      .ticks(d3.timeDay.every(this.xTickInterval))
      .tickFormat(d3.timeFormat(this.tickFormat));

    // Generate Y Axis
    const yAxisGenerator = d3.axisLeft(yScale)
      .ticks(this.yTickInterval);

    bbox.append('g')
      .attr('transform', `translate(0, ${this.viewport.innerHeight})`)
      .call(xAxisGenerator)
      .selectAll('text')
        .attr("transform", "translate(-10,0)rotate(-50)")
        .style("text-anchor", "end")
      .style('font-size', 14);
    
    bbox.append('g').call(yAxisGenerator)
      .selectAll('text')
      .style('font-size', 14);

    // Title for the chart
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

    // Animation
    wrapper.selectAll('rect')
      .transition()
      .duration(500)
      .attr("y", d => yScale(yMapper(d)))
      .attr("height", d => this.viewport.innerHeight - yScale(yMapper(d)))
      .delay((d, i) => {return i*30});
    
    return bbox.node();
  }
}
module.exports = __chart_bar;
