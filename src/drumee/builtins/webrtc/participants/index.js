// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   
//   
// ==================================================================== *


const PARTICIPANT_ID = 'participant_id';

class __participants_manager extends LetcBox {

  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this._queue = [];
    this.logicalParent = opt.logicalParent;
    this.declareHandlers();
    //this.debug("XAAA:AAA:17", this, opt);
    this.collection.on(_e.add, () => {
      if (this.collection.length < 2) {
        this.logicalParent.stateMachine('waiting');
      } else {
        this.logicalParent.stateMachine('online');
      }
    });
    this.collection.on(_e.remove, () => {
      if (this.collection.length < 2) {
        this.logicalParent.stateMachine('waiting');
      }
    });
  }

  /**
   * 
   */
  checkQuota() {
    let max = 0;
    let muted = {};
    let c = this.collection.filter(function (e) {
      let firstname = e.get(_a.firstname);
      let participant_id = e.get(PARTICIPANT_ID);
      //console.debug("AAA:172 29", e.get(_a.quota), firstname, e.get('muted'), participant_id);
      let q = parseInt(e.get(_a.quota));
      if (e.get('muted')) {
        if (participant_id) muted[participant_id] = e;
      }
      if (q > max) max = q;
      return (q > 7200);
    });
    return { limited: !c.length, quota: max, muted };
  }

  /**
 * 
 */
  onDomRefresh() {
    this.el.dataset.mode = "normal";
    this.on(_e.removeChild, this.responsive.bind(this));
    let { firstname, lastname, id } = Visitor.profile();
    let opt = {
      kind: 'webrtc_local_user',
      label: LOCALE.ME,
      audio: this.mget(_a.audio),
      video: this.mget(_a.video),
      hub_id: this.mget(_a.hub_id),
      room_id: this.mget(_a.room_id),
      sys_pn: "local-user",
      firstname,
      lastname,
      uid: id,
      ...this.mget('localUser'),
      uiHandler: [this],
      logicalParent: this,
    };
    this.feed(opt);
  }


  /**
   * 
   */
  setMode(mode = "normal") {
    this.el.dataset.mode = mode;
  }

  /**
   * 
   * @param {*} width 
   * @param {*} height 
   * @param {*} items 
   * @returns 
   */
  getGridSize(width, height, items) {
    let A = width * height;
    let a = A / items;
    let s = Math.sqrt(a);
    let column = 0;
    let row = 0;
    while (column * s < width) {
      column++;
    }
    while (row * s < height) {
      row++;
    }
    if ((column * row) > items) {
      if (column > row) {
        while ((column > row) && ((column * row) > items)) {
          column--;
        }
      } else if (row > column) {
        while ((row > column) && ((column * row) > items)) {
          row--;
        }
      } else {
        while ((row > 1) && (column > 1) && ((column * row) > items)) {
          row--;
          column--;
        }
      }
    }
    if ((column * row) < items) {
      if((width / height) >= 1){
        column++;
        if ((column * row) < items){
          row++;
        }
      }else{
        row++;
        if ((column * row) < items){
          column++;
        }
      }

    }
    return { column, row }
  }

  /**
   * 
   */
  responsive(mode = "presenter", ui) {
    if (!/^(normal|presenter)$/i.test(mode)) {
      mode = this.el.dataset.mode;
    }
    this.el.dataset.mode = mode;
    if (mode == 'presenter') {
      this.el.style.gridTemplateColumns = `200px`;
      this.el.style.gridTemplateRows = `170px`;
      this.el.style.gridAutoRows = `170px`;
      return;
    }
    let items = this.collection.length;
    //this.verbose("AAA:106", items, this);
    this.el.dataset.remote = items;
    if (items <= 2) {
      this.el.dataset.p2p = "yes";
      this.el.style.gridTemplateColumns = '';
      this.el.style.gridTemplateRows = '';
      this.el.style.gridAutoRows = '';
      return;
    }
    this.el.dataset.p2p = "no";
    let height = this.el.innerHeight();
    let width = this.el.innerWidth();
    if (ui && ui.size) {
      width = ui.size.width;
      height = ui.size.height;
    }
    let { column, row } = this.getGridSize(width, height, items);
    this.el.style.gridTemplateColumns = `repeat(${column}, 1fr)`;
    this.el.style.gridTemplateRows = `repeat(${row}, 1fr)`;
  }

  __responsive(mode = "presenter", ui) {
    if (!/^(normal|presenter)$/i.test(mode)) {
      mode = this.el.dataset.mode;
    }
    this.el.dataset.mode = mode;
    //this.verbose("AAA:106 98", mode, this.el.dataset.mode, this);
    //console.trace();
    if (mode == 'presenter') {
      this.el.style.gridTemplateColumns = `200px`;
      this.el.style.gridTemplateRows = `170px`;
      this.el.style.gridAutoRows = `170px`;
      return;
    }
    let items = this.collection.length;
    //this.verbose("AAA:106", items, this);
    this.el.dataset.remote = items;
    if (items <= 2) {
      this.el.dataset.p2p = "yes";
      this.el.style.gridTemplateColumns = '';
      this.el.style.gridTemplateRows = '';
      this.el.style.gridAutoRows = '';
      return;
    }
    this.el.dataset.p2p = "no";
    let height = this.el.innerHeight();
    let width = this.el.innerWidth();
    if (ui && ui.size) {
      width = ui.size.width;
      height = ui.size.height;
    }
    //this.verbose("AAA:106 119", width, height, ui);
    let min = 200;
    let max = 200;
    if (items < 4) {
      min = Math.round(Math.min(width, height) / items) - 42;
      max = Math.round(Math.max(width, height) / items) - 42;
    } else if (items < 10) {
      min = Math.round(Math.min(width, height) / 3) - 14;
      max = Math.round(Math.max(width, height) / 3) - 14;
      // side = Math.round(Math.min(width, height) / 3) - 14;
    } else {
      min = Math.round(Math.min(width, height) / 4) - 11;
      max = Math.round(Math.max(width, height) / 4) - 11;
      // side = Math.round(Math.min(width, height) / 4) - 12;
    }
    if (min < 200) min = 200;
    this.el.style.gridTemplateColumns = `repeat(auto-fill, minmax(${min}px, ${max}px))`;
    // this.el.style.gridTemplateRows = `${min}px`;
    // this.el.style.gridAutoRows = `${min}px`;
    this.el.style.gridTemplateRows = `repeat(auto-fill, minmax(${min}px, ${max}px))`;
  }


  /**
   * 
   * @param {*} listEl 
   */
  defaultEndpointSize() {
    if (!this.el) return;
    let listEl = this.el;
    // listEl.style.height = "100%";
    // listEl.dataset.mode = 1;
    let childrens = listEl.children;
    for (let c of childrens) {
      if (c && c.dataset) {
        if (c.dataset.kind === "webrtc_remote_user") {
          c.style.height = "100%";
          c.style.width = "100%"
        } else if (c.dataset.kind === "webrtc_local_user") {
          //let width = this.logicalParent.el.innerWidth();
          // if (width < 500) {
          //   c.style.top = "10px";
          //   c.style.bottom = "auto";
          // } else {
          //   c.style.top = "auto";
          //   c.style.bottom = "10px";
          // }
          c.style.width = "120px";
          c.style.height = "80px";
        }
      }
    }
  }




  /**
* 
* @param {*} listEl 
* @param {*} size 
*/
  calculateEndpointSize(ui) {
    if (!this.el) return;

    if (this.el.dataset.mode == _a.screen) {
      this.changeIfPresenterAvailItemsSize()
      return;
    }

    let listEl = this.el;
    let childrens = listEl.children;
    listEl.dataset.mode = "x";
    let listHeight;
    let listWidth;
    if (ui && ui.size) {
      listHeight = ui.size.height - this.logicalParent.topbarHeight;
      listWidth = ui.size.width;
    } else {
      listHeight = this.logicalParent.el.innerHeight() - this.logicalParent.topbarHeight;
      listWidth = this.logicalParent.el.innerWidth();
    }
    console.log(listHeight, listWidth, "HEIGHT WIDTH");
    //          <----- N ----->
    //  ________ ______ ______ ________    
    // |        :      :      :        |   *
    // |        :      :      :        |   ^ 
    // |        :______:______:        |   * b 
    // |        :      :      :        |   *
    // |        :<size>:      :        |   *
    // |________:______:______:________|   v
    //  
    // < ------------- a -------------->    

    let a = Math.max(listWidth, listHeight - 8); // Longest side of the container
    let b = Math.min(listWidth, listHeight - 8); // Shortest side of the container
    let n = childrens.length;
    let N = Math.ceil(Math.sqrt(n)); // number of boxes on the big square side
    if (N < 2) return;
    listEl.style.height = "auto";
    listEl.style.width = "%100";

    let size = b / N;
    if ((N * N - n) >= N) {
      size = a / N;
    }
    let max_square = Math.floor(a / size);
    let min_square = Math.floor(b / size);
    let done = 0;
    // Too small
    while (max_square * min_square >= (n + N)) {
      size = Math.max(a / (max_square - 1), b / min_square);
      max_square = Math.floor(a / size);
      min_square = Math.floor(b / size);
      done = 1;
    }
    /** Too big */
    while (max_square * min_square < n) {
      size = Math.min(a / (max_square + 1), b / min_square);
      max_square = Math.floor(a / size);
      min_square = Math.floor(b / size);
      done = 1;
    }

    max_square = Math.floor(a / size);
    min_square = Math.floor(b / size);
    let r = a / b;
    if (done) {
      if (max_square * size < a && size * min_square < b) {
        let da = a - max_square * size;
        let db = b - min_square * size;
        size = size + Math.min(da, db);
      }
    } else if ((a / (b + r * size) > 1) && (N - r) > 0) {
      size = Math.max(Math.min(a / (N + r), b / (N - r)), b / min_square);
    }

    if (min_square === 1) {
      size = a / n;
    } else if (min_square === N) {
      size = b / N;
    }

    this.changeItemsSize(size);

  }

  /**
   * 
   */
  changeIfPresenterAvailItemsSize() {
    let childrens = this.el.children;
    // this.el.style.flexDirection = "column";
    this.el.style.justifyContent = "start";
    this.el.style.alignContent = "start";
    this.el.dataset.mode = "2";
    for (let c of childrens) {
      if (c && c.style) {

        c.dataset.partname == "local"
        c.style.height = `150px`;
        c.style.width = `100%`;
        c.style.top = 0;
        // c.style.bottom = _a.auto;
      }
    }
  }

  /**
   * 
   * @param {*} size 
   */
  changeItemsSize(size) {
    let childrens = this.el.children;
    this.el.style.flexDirection = "row";
    this.el.style.justifyContent = "center";
    this.el.style.alignContent = "center";
    for (let c of childrens) {
      if (c && c.style) {
        c.style.height = `${size}px`;
        c.style.width = `${size}px`;
        c.style.top = _a.auto;
        c.style.bottom = _a.auto;
      }
    }
  }
}


module.exports = __participants_manager;
