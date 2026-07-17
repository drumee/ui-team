// ===========================================================
// Background-blur video effect for the meeting camera picker.
//
// Implements the lib-jitsi-meet stream-effect contract so it can be attached
// with `localVideoTrack.setEffect(effect)`:
//   - isEnabled(track)   -> whether this effect may run on the track
//   - startEffect(stream) -> a NEW MediaStream (the processed frames)
//   - stopEffect()       -> tear down; lib restores the original stream
//
// Pipeline: MediaPipe Selfie Segmentation produces a per-frame person mask; we
// composite the sharp person over a Gaussian-blurred copy of the frame on a
// canvas and expose canvas.captureStream() as the outgoing track.
//
// Robustness (the fixes for "blur doesn't work / video goes blank"):
//   * The render loop ALWAYS draws the raw camera frame first, so the outgoing
//     stream is never blank — worst case is un-blurred live video, never a
//     frozen/blank tile while the model loads or if it fails.
//   * MediaPipe assets are loaded from the locally-bundled `mediapipe/` folder
//     (copied by CopyPlugin, see webpack/plugins.js). If that fails to load
//     (e.g. the folder wasn't deployed/served at the public path) we retry from
//     the jsDelivr CDN, then give up gracefully to raw video.
//   * The blurred background is drawn slightly oversized so the Gaussian kernel
//     doesn't sample transparent pixels past the edge (avoids a dark vignette).
// ===========================================================
const { SelfieSegmentation } = require("@mediapipe/selfie_segmentation");

const PKG_VERSION = "0.1.1675465747";
const CDN_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${PKG_VERSION}/`;
const DEFAULT_BLUR = 10; // background blur radius in px

class BackgroundBlurEffect {
  constructor(options = {}) {
    this._blurValue = options.blurValue || DEFAULT_BLUR;
    // Status callback: "loading" (model downloading) → "ready" (first blurred
    // frame drawn) | "failed" (model unavailable, passing raw video). Drives
    // the loading indicator on the Blur Background row.
    this._onStatus = options.onStatus || function () {};
    this._running = false;
    this._initialized = false; // model ready
    this._ready = false;       // at least one segmentation result drawn
    this._failed = false;      // model could not be loaded — pass raw video
    this._onResults = this._onResults.bind(this);
    this._loop = this._loop.bind(this);
  }

  /** Only run on a local CAMERA video track (never screen-share / audio). */
  isEnabled(track) {
    return track.isVideoTrack() && track.videoType === "camera";
  }

  /**
   * @param {MediaStream} stream - the original camera stream.
   * @returns {MediaStream} the processed (blurred-background) stream.
   */
  startEffect(stream) {
    const track = stream.getVideoTracks()[0];
    const settings = (track && track.getSettings && track.getSettings()) || {};
    this._width = settings.width || 640;
    this._height = settings.height || 480;
    const fps = settings.frameRate || 30;

    this._inputVideo = document.createElement("video");
    this._inputVideo.autoplay = true;
    this._inputVideo.muted = true;
    this._inputVideo.playsInline = true;
    this._inputVideo.srcObject = stream;

    this._canvas = document.createElement("canvas");
    this._canvas.width = this._width;
    this._canvas.height = this._height;
    this._ctx = this._canvas.getContext("2d");

    this._outputStream = this._canvas.captureStream(fps);
    this._running = true;

    // Kick off the (async) model load; the render loop runs immediately and
    // draws raw frames until the model is ready, so the tile is never blank.
    this._onStatus("loading");
    this._initSegmenter();
    this._inputVideo
      .play()
      .then(() => this._loop())
      .catch((e) => console.warn("background-blur: input video play failed", e));

    return this._outputStream;
  }

  async _initSegmenter() {
    for (const base of [`${__webpack_public_path__}mediapipe/`, CDN_BASE]) {
      if (!this._running) return;
      try {
        const seg = new SelfieSegmentation({ locateFile: (f) => `${base}${f}` });
        seg.setOptions({ modelSelection: 1, selfieMode: false });
        seg.onResults(this._onResults);
        await seg.initialize();
        this._segmenter = seg;
        this._initialized = true;
        return;
      } catch (e) {
        console.warn(`background-blur: MediaPipe failed to load from ${base}`, e);
        // try the next base (CDN) — falls through
      }
    }
    // Both sources failed: keep passing raw video through (no blur), don't blank.
    this._failed = true;
    this._onStatus("failed");
    console.error(
      "background-blur: could not load the segmentation model from the bundled " +
      "assets or the CDN — passing the camera through un-blurred. Ensure the " +
      "`mediapipe/` folder is deployed and served at the app public path."
    );
  }

  async _loop() {
    if (!this._running) return;
    const v = this._inputVideo;
    const ready = v && v.readyState >= 2; // HAVE_CURRENT_DATA
    try {
      // Draw the raw frame as the base until the first segmented frame lands
      // (or permanently if the model failed) so the stream is never blank.
      if (ready && (!this._ready || this._failed)) {
        this._ctx.drawImage(v, 0, 0, this._canvas.width, this._canvas.height);
      }
      if (ready && this._initialized && !this._failed) {
        await this._segmenter.send({ image: v }); // -> _onResults draws
      }
    } catch (e) {
      console.warn("background-blur: segmentation frame failed", e);
    }
    if (this._running) this._raf = requestAnimationFrame(this._loop);
  }

  _onResults(results) {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._canvas.width;
    const h = this._canvas.height;
    const b = this._blurValue;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1) Person mask, then keep only the frame pixels under it (source-in).
    ctx.drawImage(results.segmentationMask, 0, 0, w, h);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(results.image, 0, 0, w, h);

    // 2) Blurred copy of the frame BEHIND the sharp person. Drawn oversized by
    //    the blur radius on every side so the Gaussian kernel never samples the
    //    transparent area past the edge (which would darken the border).
    ctx.globalCompositeOperation = "destination-over";
    ctx.filter = `blur(${b}px)`;
    ctx.drawImage(results.image, -b, -b, w + b * 2, h + b * 2);

    ctx.restore(); // resets filter + compositing for the next frame
    if (!this._ready) {
      this._ready = true;
      this._onStatus("ready"); // first blurred frame is live
    }
  }

  stopEffect() {
    this._running = false;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    if (this._inputVideo) {
      this._inputVideo.srcObject = null;
      this._inputVideo = null;
    }
    if (this._outputStream) {
      this._outputStream.getTracks().forEach((t) => t.stop());
      this._outputStream = null;
    }
    if (this._segmenter && this._segmenter.close) {
      try { this._segmenter.close(); } catch (e) { /* already closed */ }
    }
    this._segmenter = null;
    this._initialized = false;
    this._ready = false;
  }
}

module.exports = BackgroundBlurEffect;
