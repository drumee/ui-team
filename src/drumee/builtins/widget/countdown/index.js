/* ==================================================================== *
 *   Copyright Xialia.com  2011-2020
 *   FILE : /home/somanos/devel/ui/letc/template/index.coffee
 *   TYPE : Component
 * ==================================================================== */

/// <reference path="../../../../../@types/index.d.ts" />



/**
 * To show the counter
 * @class ___countdown_timer
 * @extends LetcBox
 */
class ___countdown_timer extends LetcBox {

  /**
   * @param {object} opt
   */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   * 
   */
  onDestroy() {
    clearInterval(this.timer);
  }

  /**
   * @param {any} child
   * @param {any} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'counter':
        this.updateCounter();
        break;
    }
  }

  /**
   * 
   * @returns 
   */
  updateCounter() {
    if (this.timer) {
      return;
    }
    let fromTime = Dayjs();
    let toTime = Dayjs();
    if (this.mget('from')) {
      fromTime = this.mget('from');
    }
    if (this.mget('to')) {
      toTime = this.mget('to');
    }
    if (this.mget('in')) {
      toTime = Dayjs(1000 * this.mget('in') + new Date().getTime());
    }
    let remainSec = toTime.diff(fromTime, 'seconds');
    let duration = Dayjs.duration(remainSec, "seconds");
    const interval = 1000;
    this.timer = setInterval(() => {
      remainSec--;
      if (remainSec < 0) {
        clearInterval(this.timer);
        this.trigger(_e.done);
        this.triggerHandlers()
        return;
      }
      if(remainSec < 60){
        this.__counter.el.dataset.blink = `${remainSec%2}`;
      }
      let format = "mm:ss";
      duration = Dayjs.duration(remainSec, "seconds");
      if (duration.asHours() > 1) {
        format = "HH:mm:ss";
      }
      let content = duration.format(format)
      this.getPart('counter').set({ content });
    }, interval);
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

}
module.exports = ___countdown_timer
