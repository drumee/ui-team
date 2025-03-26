const { fitBoxes } = require("core/utils")

require('../skin');
require('./skin');

const { TweenMax, Cubic, Expo } = require("gsap/all");
const __core = require('player/interact');
class __player_image extends __core {


  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    super.initialize(opt);
    this.style.set(_K.imagePlayer);
    this.contentKind = "image_smart";
    const { url } = this.actualNode();
    this._play = this._play.bind(this);
    this.mset({ url: url })
    this.info = null
    this.information = require('../skeleton/file-info');
    this._interval = Visitor.timeout(4000);
    this._duration = 0.5;
    this._currentSlide = 0;
    this._keyup_bind = this._keyUp.bind(this);
    RADIO_KBD.on(_e.keyup, this._keyup_bind);
    this.el.dataset.fullscreen = _a.off;
    this.siblingsData = [];
  }


  /**
 * 
 * @param {*} child 
 * @param {*} pn 
 */
  onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case "slider-content":
        if (child._loaded) {
          this.display(child)
        }
        child.on(_e.loaded, (image) => {
          this.display(image)
        });
        break;
      case _a.content:
        /** DO NOT REMOVE */
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
   * @returns 
   */
  loadSiblings() {
    return this.fetchService(SERVICE.media.get_by_type, {
      page: 1,
      type: _a.image,
      nid: this.mget(_a.parentId),
      hub_id: this.mget(_a.hub_id)
    })
  }


  /**
   * 
   */
  onDomRefresh() {
    this.restart();
  }

  /**
   * 
   */
  restart() {
    this.feed(require('./skeleton')(this));
    this.loadSiblings().then((r) => {
      this.siblingsData = r;
      if (this.siblingsData.length > 1) {
        this.ensurePart("slider-buttons").then((p) => {
          p.el.dataset.state = 1;
        })
      }
    })
  }

  /**
   * 
  */
  onDestroy() {
    RADIO_KBD.off(_e.keyup, this._keyup_bind);
  }

  /**
   * 
   * @param {*} cmd 
   */
  onUiEvent(cmd) {
    const service = cmd.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _e.play:
        this._loop = 1;
        return this.play();

      case _a.prev: return this.prev();
      case "pause": return this.pause();
      case _a.next: return this.next();

      case _a.fullscreen:
        return this.__sliderWrapper.el.requestFullscreen();

      case _e.rotate:
        return this._rotate()

      case 'info':
        return this._showInfo();

      case 'close-player':
        return this.goodbye();

      default:
        return super.onUiEvent(cmd);
    }
  }

  /**
   * 
  */
  _keyUp(e) {
    if (Wm.getActivePlayer() != this) return;

    switch (e.key) {
      case 'ArrowRight':
        return this.next();

      case 'ArrowLeft':
        return this.prev();
    }
  }

  /**
   * 
  */
  _rotate() {
    const { nid, hub_id } = this.actualNode();
    this.showSpinner()
    this.postService({
      service: SERVICE.media.rotate,
      nid,
      hub_id,
    }).then((data) => {
      this.mset(data);
      this.mset({ service: _e.raise });
      let urls = this.getImageUrls();
      if (this.siblingsData[this._currentSlide]) {
        this.siblingsData[this._currentSlide] = data;
        urls = this.getImageUrls(data);
      }
      this.__sliderContent.reload(urls);
      this.hideSpinner();
      let items = Wm.selectItems(data, _a.nid);
      for (let item of items) {
        item.mset(data);
        if (item.isRegularFile()) {
          item.restart();
        }
      }
    });
  }

  /**
   * 
  */
  _showInfo() {
    const wrapperInfo = this.__wrapperInfo;
    if (wrapperInfo.el.dataset.state === _a.closed) {
      wrapperInfo.feed(this.information(this));
    } else {
      wrapperInfo.clear();
    }
  }


  /**
   * 
   */
  prev() {
    if (this.timer) {
      clearTimeout(this.timer);
      if (this._isPlaying) {
        this.timer = setTimeout(this.play.bind(this), this._interval);
      }
    }
    this._currentSlide--;
    this._loop = 1;
    this._play();
  }

  /**
   * 
   */
  pause() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this._loop = 0;
    this.__ctrlPlay.setIcon('desktop_musicplay');
    this.__ctrlPlay.mset({ service: _e.play });
    this._isPlaying = 0;
  }

  /**
   * 
   */
  next() {
    if (this.timer) {
      clearTimeout(this.timer);
      if (this._isPlaying) {
        this.timer = setTimeout(this.play.bind(this), this._interval);
      }
    }

    this._currentSlide++;
    this._loop = 1;
    this._play();
  }

  /**
   * 
   * @param {*} cmd 
   */
  onExitFullscreen(cmd) {
    clearTimeout(this.timer);
    document.removeEventListener('fullscreenchange',
      this.onExitFullscreen.bind(this), false
    );

    if (document.fullscreenElement) {
      this.__actionButtons.el.dataset.mode = _a.open;
      this.el.dataset.fullscreen = _a.on;
    } else {
      this.__actionButtons.el.dataset.mode = _a.closed;
      this.el.dataset.fullscreen = _a.off;
    }

  }

  /**
   * 
   * @param {*} cmd 
   */
  max_size() {
    let size;
    if (this.ratio > 1) {
      size = fitBoxes(
        { width: window.innerWidth, height: window.innerHeight },
        { width: this.$el.width(), height: this.$el.height() }
      );
      size.height = size.height - this.topbarHeight;
    } else {
      size = fitBoxes(
        { width: window.innerWidth - 20, height: window.innerHeight },
        { width: this.$el.width(), height: this.$el.height() }
      );
      if (size.height > window.innerHeight) {
        size.width = size.width * window.innerHeight / size.height;
        size.height = window.innerHeight;
      }
    }
    return {
      top: (((window.innerHeight - size.height) / 2) - Wm.$el.offset().top),
      left: (((window.innerWidth - size.width) / 2) - Wm.$el.offset().left),
      ...size
    }
  }

  /**
   * 
   *  
   */
  _play(init) {
    if (this._isPlaying == null) {
      this._currentSlide++;
    }
    if (this._currentSlide >= this.siblingsData.length) this._currentSlide = 0;
    if (this._currentSlide < 0) this._currentSlide = this.siblingsData.length - 1;
    let data = this.siblingsData[this._currentSlide]
    let { filename } = data;
    this.model.set(data);
    this.__playerTitle.set({ content: filename })
    let urls = this.getImageUrls(data);
    this._isPlaying = 1;
    this.__sliderContent.reload(urls);
  }

  /**
   * 
   *  
   */
  play() {
    if (!this._loop) return;
    this._currentSlide++;
    this._play();
    this.__ctrlPlay.setIcon('desktop_musicpause');
    this.__ctrlPlay.mset({ service: "pause" });

    this.timer = setTimeout(this.play.bind(this), this._interval);

    if (!this._isPlaying) {
      document.addEventListener('fullscreenchange',
        this.onExitFullscreen.bind(this), false
      );
      this._isPlaying = 1;

      setTimeout(() => {
        this.__ctrlPrev.el.dataset.state = 0;
        this.__ctrlNext.el.dataset.state = 0;
      }, this._interval);
    }
  }

  /**
   * 
   * @param {*} e 
   */
  gotoSlide(e) {
    return this._currentSlide = e.index;
  }

  /**
   * 
   * @param {*} service 
   */
  slider(img, url) {
    this.__slider.$el.css({
      'background-image': `url(${url})`,
      opacity: 0
    });
    let f = () => {
      this.__prevSlider.$el.css({
        'background-image': `url(${url})`,
        opacity: 1
      });
      this._hasPrev = 1;
    }
    if (this._hasPrev) {
      this.__prevSlider.$el.css({
        opacity: 1
      });
      TweenMax.to(this.__prevSlider.$el, this._duration, { opacity: 0, onComplete: f, ease: Cubic.easeIn });
    } else {
      f();
    }
    TweenMax.to(this.__slider.$el, this._duration, { opacity: 1, ease: Cubic.easeIn });
  }


  /**
   * 
   * @param {*} data 
   */
  getImageUrls(data) {
    if (!data) {
      data = this.siblingsData[this._currentSlide];
    }
    let { keysel, mfsRootUrl } = bootstrap();
    let { nid, hub_id, ptime, changed } = data;
    let v = ptime || changed;
    let high = `${mfsRootUrl}/file/slide/${nid}/${hub_id}?v=${v}&keysel=${keysel}`;
    let low = `${mfsRootUrl}/file/preview/${nid}/${hub_id}?v=${v}&keysel=${keysel}`;
    return { low, high }
  }

  /**
   * 
   */
  // async preLoad() {
  //   this.siblingsUrls = [];
  //   for (let item of this.siblingsData) {
  //     this.siblingsUrls.push(this.getImageUrls(item));
  //   }
  //   this.siblingsData
  //   this.siblingsUrls.unshift(this.getImageUrls());
  // }


  /**
   * 
   * @param {*} list 
   */
  load(list) {
    // ===============
    //  DO NOT DELETE
    // ===============
  }

  /**
   * 
   */
  display(image) {
    let el = image.el;
    let width = el.naturalWidth;
    let height = el.naturalHeight;
    const slide_size = 1024;
    setTimeout(() => {
    }, 1000)
    let r = 1;
    if (width > height) {
      r = width / slide_size;
    } else if (height == width) {
      r = 1;
    } else {
      r = height / slide_size;
    }
    width = width * r;
    height = height * r;
    let left = 0;
    let top = 0;
    let max_w = window.innerWidth - 100;
    let max_h = window.innerHeight - 100;

    if (Visitor.isMobile()) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      left = 50 + (max_w - width) / 2;
      top = 50 + (max_h - height) / 2;
      if (top < 20) {
        top = 20;
      }
      if (left < 20) {
        left = 20;
      }
    }

    if (width > max_w || height > max_h) {
      this.size = fitBoxes(
        { width: max_w, height: max_h },
        { width, height },
      );
      width = this.size.width;
      height = this.size.height;
    } else {
      this.size = { width, height };
    }
    this._pos = { top, left };
    this.anti_overlap(this._pos);
    if (this._isPlaying) {
      TweenMax.to(this.$el, 1.5, { width, height })
    } else {
      this.$el.css({ width, height, ...this._pos });
      TweenMax.to(this.$el, 0.5, { alpha: 1 })
    }

  }

  /**
 * 
 * @param {*} data 
 */
  async parseInfo(data) {
    super.parseInfo(data);
    if (data.Image) {
      let geometry = data.Image["Page geometry"];
      if (geometry) {
        geometry = geometry.replace(/\+.+$/, "");
        let [w, h] = geometry.split(/x/i);
        this.width = w;
        this.height = h;
      }
    }
    this.width = this.width || this.$el.width();
    this.height = this.height || this.$el.height();

    let max_w = window.innerWidth - 120;
    let max_h = window.innerHeight - 120;
    if (this.width > max_w || this.height > max_h) {
      this.size = fitBoxes(
        { width: window.innerWidth, height: window.innerHeight },
        { width: this.width, height: this.height },
      );
      this.width = this.size.width;
      this.height = this.size.height;
    } else {
      this.size = {
        width: this.width,
        height: this.height
      };
    }
    let left = 0;
    let top = 0;
    if (!Visitor.isMobile()) {
      left = (window.innerWidth - this.width) / 2;
      top = (window.innerHeight - this.height) / 2;
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    }

    return true;
  }

}

module.exports = __player_image;
