// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /home/somanos/devel/ui/letc/template/index.coffee
//   TYPE : Component
// ==================================================================== *

//########################################

class __sound_analyzer extends LetcBox {

  // ===========================================================
  //
  // ===========================================================
  constructor(...args) {
    super(...args);
    this.onBeforeDestroy = this.onBeforeDestroy.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    if (opt == null) { opt = {}; }
    require('./skin');
    const Color = require('color');
    super.initialize();
    this.declareHandlers();
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // @model.atLeast 
    //   mode : 'wave'
    this.vendor = {
      fillStyle: _a.white,
      strokeStyle: 'rgb(171, 71, 188)',
      lineWidth: 2,
      alpha: 0
    };
    this.vendor = _.merge(this.vendor, this.mget(_a.vendorOpt));
    this.color = Color(this.vendor.strokeStyle);
    // Cap the canvas redraw rate. The visualizer runs one RAF loop PER
    // participant; at 60fps × N tiles it dominates the main thread during a
    // call. ~20fps is visually fine for an audio meter and ~3× cheaper.
    this._minFrameMs = 1000 / 20;
    this._lastFrameAt = 0;
  }

  // ===========================================================
  // 
  // ===========================================================
  onBeforeDestroy() {
    cancelAnimationFrame(this.drawRequest);
    this.audioCtx.close();
    this.analyzer = null;
    this.canvasCtx = null;
    this.model.clear();
  }

  // ===========================================================
  // 
  // ===========================================================
  onPartReady(child, pn) {
    switch (pn) {
      case 'canvas':
        return this.plug(this.mget(_a.stream));
    }
  }
  // ===========================================================
  // 
  // ===========================================================
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  // ===========================================================
  // 
  // ===========================================================
  onUiEvent(cmd) { }

  // ===========================================================
  // 
  // ===========================================================
  plug(stream) {
    if (!stream) {
      return;
    }
    this.waitElement(`${this._id}-canvas`, async () => {
      const c = await this.ensurePart('canvas');
      this.width = this.$el.width();
      this.height = this.$el.height();
      c.el.width = this.width;
      c.el.height = this.height;
      this.canvasCtx = c.el.getContext("2d");
      this.analyzer = this.audioCtx.createAnalyser();
      const source = this.audioCtx.createMediaStreamSource(stream);
      source.connect(this.analyzer);

      if (this.mget(_a.mode) === 'wave') {
        this.sinewave();
      } else {
        this.bargraph();
      }
    });
  }

  // ===========================================================
  //
  // ===========================================================
  sinewave() {
    this.analyzer.fftSize = 1024;
    const bufferLength = this.analyzer.fftSize;
    //@debug("sinewave bufferLength= #{bufferLength}", @)
    const dataArray = new Float32Array(bufferLength);

    this.canvasCtx.globalAlpha = this.vendor.alpha;
    this.canvasCtx.clearRect(0, 0, this.width, this.height);
    this.canvasCtx.fillRect(0, 0, this.width, this.height);
    var draw = () => {
      if (this.isDestroyed()) {
        cancelAnimationFrame(this.drawRequest);
        return;
      }
      this.drawRequest = requestAnimationFrame(draw);
      const now = performance.now();
      if (now - this._lastFrameAt < this._minFrameMs) return;
      this._lastFrameAt = now;
      this.analyzer.getFloatTimeDomainData(dataArray);
      this.canvasCtx.clearRect(0, 0, this.width, this.height);
      this.canvasCtx.fillStyle = this.vendor.fillStyle;
      this.canvasCtx.fillRect(0, 0, this.width, this.height);
      this.canvasCtx.lineWidth = this.vendor.lineWidth;
      this.canvasCtx.strokeStyle = this.vendor.strokeStyle;

      this.canvasCtx.beginPath();

      const sliceWidth = (this.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0, end = bufferLength - 1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        const v = dataArray[i] * 200.0;
        const y = (this.height / 2) + v;

        if (i === 0) {
          this.canvasCtx.moveTo(x, y);
        } else {
          this.canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.canvasCtx.lineTo(this.width, this.height / 2);
      return this.canvasCtx.stroke();
    };
    return draw();
  }

  // ===========================================================
  //
  // ===========================================================
  bargraph() {
    let g;
    const asr = this.analyzer;
    const ctx = this.canvasCtx;
    this.analyzer.fftSize = 256;
    const bufferLength = asr.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const {
      alpha
    } = this.vendor;
    const minDb = asr.minDecibels;
    const maxDb = asr.maxDecibels;
    const range = Math.abs(this.analyzer.maxDecibels - this.analyzer.minDecibels);
    const ratio = this.height / range;
    let barHeight = 0;
    const w = this.width;
    const h = this.height;
    ctx.globalAlpha = alpha;
    ctx.clearRect(0, 0, w, h);
    // Precompute lightened bar colors once instead of building a Color object
    // + rgb string per bar, per frame (huge GC churn × bins × fps × tiles).
    const STEPS = 24;
    const barColors =
      this._barColors ||
      (this._barColors = Array.from({ length: STEPS }, (_v, i) =>
        this.color.lighten(i / STEPS).rgb().string(),
      ));
    let length = 0;
    const service = this.mget(_a.service);
    this.status = _a.idle;
    if (service) {
      const f = () => {
        //this.debug("bargraph EZEZEZEZE", length)
        return this.triggerHandlers({ service });
      };
      g = _.throttle(f, 3000);
    }

    var draw = () => {
      if (this.isDestroyed()) {
        cancelAnimationFrame(this.drawRequest);
        return;
      }
      this.drawRequest = requestAnimationFrame(draw);
      const now = performance.now();
      if (now - this._lastFrameAt < this._minFrameMs) return;
      this._lastFrameAt = now;
      asr.getFloatFrequencyData(dataArray);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.vendor.fillStyle;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      const barWidth = (w / bufferLength) * 2.5;
      let x = 0;
      let count = 0;
      for (let i = 0, end = bufferLength - 1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        barHeight = dataArray[i] - minDb;
        const ci = (barHeight / range) * STEPS;
        ctx.fillStyle =
          barColors[ci < 0 ? 0 : ci >= STEPS ? STEPS - 1 : ci | 0];
        ctx.fillRect(x, h - (ratio * barHeight), barWidth, ratio * barHeight);
        x += barWidth + 1;
        if (barHeight > 20) {
          count++;
        }
      }
      if (count > 5) {
        length++;
        //console.log(length, this.drawRequest);
      } else {
        length = 0;
      }

      // if (g && (length > 20)) {
      //   this.status = _e.data; // Prevent auto raise by Wm on child buble
      //   return g();
      // }
    };
    draw();
  }

  // ===========================================================
  //
  // ===========================================================
  noGraph() {
    this.canvasCtx.clearRect(0, 0, this.width, this.height);
    this.canvasCtx.fillStyle = "red";
    return this.canvasCtx.fillRect(0, 0, this.width, this.height);
  }

}


module.exports = __sound_analyzer;
