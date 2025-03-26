// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/mfs/interact
//   TYPE :
// ==================================================================== *


const __hubInteract = require('window/interact');

class __hub_interact extends __hubInteract {

	/**
	 * 
	 */
  onDomRefresh(){
    this.isMfs = 1;
    this._data = {}
		this.feed(this._skeleton(this));
		//this.debug("AAA:18");
    this.setupInteract();
	}

  /**
   * 
   */
  setupInteract() {
    this.captured = {};
    const containment = [-window.innerWidth * .3, 0, window.innerWidth * .9, window.innerHeight * .9];

		this.$el.draggable({
			distance: 5,
			containment, // Desk.$el #Wm.$el
			start: this._dragStart,
			stop: this._dragStop,
			// handle: `.${this.fig.group}__header`
		});
    this.raise()

  }

  /**
   * 
   */
  _dragStart (){
    this._width = this.el.style.width;
    this._height = this.el.style.height;
  }

  /**
   * 
   */
  _dragStop (){
    this.$el.css({
      width  : this._width,
      height : this._height
    })

  }

  /**
   * 
  */
  onAfterHubCreation (data) {
    const f = () => {
      Wm.onNewHub(data, true);
    }
    return _.delay(f, 1500);
  }

  /**
   * 
   */
  onServerError(xhr){
    const { responseJSON, error } = xhr;
    if ((responseJSON && responseJSON.error)) {
      Butler.say(responseJSON.error);
    } else { 
      Butler.say(LOCALE.ERROR_SERVER);
    }
    return this.phase = null;
  }

}

module.exports = __hub_interact;

