class __chat_p2p_widget_notification extends LetcBox {

  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._onCounts = this.updateCount.bind(this);
    RADIO_BROADCAST.on('notification:counts', this._onCounts);
    this.model.set({
      flow: _a.none,
      notificationCount: 0
    });
  }

  onDestroy() {
    RADIO_BROADCAST.off('notification:counts', this._onCounts);
  }

  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  onUiEvent() {
    return this.triggerHandlers();
  }

  updateCount(nc) {
    const count = (nc.teamChatCount || 0) + (nc.contactChatCount || 0);
    this.mset('notificationCount', count);
    this.update();
  }

  update() {
    this.ensurePart('counter').then((p) => {
      const c = this.mget('notificationCount');
      const count = c ? `${c}` : '';
      p.set({ content: count });
      if (_.isEmpty(count)) {
        p.el.hide();
      } else {
        p.render();
        p.el.show();
      }
      this.trigger(_e.update);
    });
  }
}

module.exports = __chat_p2p_widget_notification;
