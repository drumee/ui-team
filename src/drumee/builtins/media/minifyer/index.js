// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/minifyer/index.js
//   TYPE : Component
// ==================================================================== *
/// <reference path="../../../../../@types/index.d.ts" />

const media_interact = require('../interact');
/**
 * @class __media_minifyer
 * @extends __media_minifyer
 */
class __media_minifyer extends media_interact {

  /**
   * @param {any} args
  */
  constructor(...args) {
    super(...args);
  }

  static initClass() {
    this.prototype.fig = 1;
  }

  /**
 * @param {Object} opt
 */
  initialize (opt) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);

    this.type = opt.type || _a.media;
    this.isGrid   = 1;
    this.model.atLeast({
      aspect   : _a.grid,
    });

    this.innerContent = require('./skeleton');
    this.cursorPosition = { left: 30, top: 30 };
  }

  // /**
  //  * 
  // */
  // loadVector () {
  //   const t = `${this._id}-preview`;
  //   if (this._vector != null) {
  //     this.waitElement(`${this._id}-preview`, ()=> {
  //       this.renderVector(this._vector, false, t);
  //     });
  //     return; 
  //   }

  //   const f = data => {
  //     this._vector = data;
  //     this.renderVector(data, false, t);
  //     this.trigger('media:loaded');
  //   };
  //   Utils.fetch(this.url(_a.orig), f);
  // }

  /**
   * 
   * @param {*} toggle 
  */
  enablePreview(toggle) {
    this.$preview = this.$el.find(`#${this._id}-preview`);
    switch (this.model.get(_a.filetype)) {
      // case _a.vector:
      //   this.loadVector();
      //   break;

      case _a.hub:
        if (this.mget(_a.area) === _a.private) {
          this.iconType = _a.vector;
        } else if (this.mget(_a.area) === _a.public) {
          this.iconType = _a.vignette;
        } else if (toggle) {
          this.iconType = _a.vignette;
        }
        break;

      case _a.image: 
      case _a.video: 
      case _a.vector:
        this.iconType = _a.vignette;
        break;

      default:
        this.iconType = _a.vector;
    }

    this.trigger('media:loaded');
    this.content.el.dataset.icontype = this.iconType; 
  }

  /**
   * 
   * @param {*} delay 
   */
  initBounds (delay) {
    return
  }
}

__media_minifyer.initClass();

module.exports = __media_minifyer;    
