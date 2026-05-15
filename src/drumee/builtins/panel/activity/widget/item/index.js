class __activity_item extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    const parent = this.mget('logicalParent');
    const cmdClass = cmd && cmd.el && cmd.el.classList ? cmd.el.classList[0] : null;
    console.log('[activity_item] click', {
      service,
      cmd_class: cmdClass,
      item_type: this.mget('item_type'),
      item_key: this.mget('item_key'),
      id: this.mget('id'),
    });
    switch (service) {
      case 'toggle-favorite': {
        if (!cmd || !cmd.el) return;
        const next = cmd.el.dataset.state === '1' ? '0' : '1';
        cmd.el.dataset.state = next;
        if (cmd.mset) cmd.mset(_a.state, parseInt(next));
        console.log('[activity_item] favorite toggled →', next, 'item_key=' + this.mget('item_key'));
        if (parent && parent.onUiEvent) {
          parent.onUiEvent(this, {
            service: 'toggle-favorite',
            favorited: next === '1' ? 1 : 0,
            item_key: this.mget('item_key'),
            message_id: this.mget('message_id')
              || this.mget('key_id')
              || this.mget(_a.id)
              || this.mget('id')
              || this.mget('drumate_id'),
            hub_id: this.mget('hub_id'),
          });
        }
        return;
      }
      case 'dismiss-activity': {
        console.log('[activity_item] trash dismiss', {
          item_type: this.mget('item_type'),
          item_key: this.mget('item_key'),
          id: this.mget('id'),
        });
        if (parent && parent.onUiEvent) {
          parent.onUiEvent(this, {
            service,
            item_type: this.mget('item_type'),
            item_key: this.mget('item_key'),
            changelog_id: this.mget('changelog_id') || this.mget(_a.id) || this.mget('id'),
          });
        }
        if (this.goodbye) this.goodbye({ duration: 0.3, timeout: 50, now: 1 });
        return;
      }
      case 'open-chat':
      case 'open-contact':
      case 'open-activity':
      case 'open-workspace-invitation':
      case 'open-folder':
      case 'open-channel':
      case 'open-ticket': {
        if (parent && parent.onUiEvent) {
          parent.onUiEvent(this, {
            service,
            item_type: this.mget('item_type'),
            item_key: this.mget('item_key'),
            hub_id: this.mget('hub_id'),
            drumate_id: this.mget('drumate_id'),
            message_id: this.mget('message_id'),
          });
        }
        return;
      }
      default: {
        const fallback = service || this.mget(_a.service);
        if (!fallback) return;
        if (parent && parent.onUiEvent) {
          parent.onUiEvent(this, {
            service: fallback,
            item_type: this.mget('item_type'),
            item_key: this.mget('item_key'),
            hub_id: this.mget('hub_id'),
            drumate_id: this.mget('drumate_id'),
          });
        } else if (super.onUiEvent) {
          super.onUiEvent(cmd, args);
        }
      }
    }
  }
}

module.exports = __activity_item;
