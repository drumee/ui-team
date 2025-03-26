class ___drumee_background extends DrumeeMFS {

  /**
   * 
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    let { nid, hub_id } = opt;
    const { endpoint } = bootstrap();
    if (nid && hub_id) {
      let base = `${endpoint}/file`;
      let url = `${base}/slide/${nid}/${hub_id}`;
      let preview = `${base}/preview/${nid}/${hub_id}`;
      this.mset({ url, preview, base });
    }
  }

  /**
   * 
   */
  getUrl() {
    let nid = this.mget(_a.nid);
    let hub_id = this.mget(_a.hub_id);
    if (!nid || !hub_id) return this.mget(_a.url);
    const { endpoint } = bootstrap();
    let base = `${endpoint}/file`;
    if (this.$el.width() < 600) {
      return `${base}/card/${nid}/${hub_id}`;
    }
    if (this.$el.width() < 1000) {
      return `${base}/slide/${nid}/${hub_id}`;
    }
    return `${base}/orig/${nid}/${hub_id}`;
  }

  /**
   * 
   * @param {*} url 
   * @param {*} child 
   */
  async setImage(url, child) {
    child.el.dataset.loading = "1";
    let src;
    await this.fetchFile({ url }).then((blob) => {
      src = URL.createObjectURL(blob);
      child.el.style.backgroundImage = `url('${src}')`;
      child.el.dataset.loading = "0";
    }).catch(() => {
      const { static: base } = bootstrap();
      src = base + "images/background/welcome-wallpaper.png";
      this.ensurePart('main').then((p) => {
        p.el.dataset.noimage = 1;
      })
      child.el.style.backgroundImage = `url('${src}')`;
      child.el.dataset.loading = "0";
    })
  }


  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case 'preview':
        let preview = this.mget('preview');
        if (preview) {
          this.setImage(preview, child)
        }
        break;
      case 'overlay':
        let url = this.getUrl();
        if (!_.isString(url)) return;
        if (url) {
          this.setImage(url, child)
        }
        break;
    }
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }


}

module.exports = ___drumee_background
