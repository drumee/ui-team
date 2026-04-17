class __admin_main extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._activeSection = 'show-members';
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'content':
        this._content = child;
        this._loadSection(this._activeSection);
        break;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  _loadSection(service) {
    if (!this._content) return;
    const sections = {
      'show-members':     { kind: 'admin_members'    },
      'show-roles':       { kind: 'admin_permissions' },
      'show-workspaces':  { kind: 'admin_rules'       },
      'show-status':      { kind: 'admin_security'   },
      'show-last-active': { kind: 'admin_log'         },
      'show-actions':     { kind: 'admin_storage'    },
    };
    const section = sections[service];
    if (section) this._content.feed([section]);
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'show-members':
      case 'show-roles':
      case 'show-workspaces':
      case 'show-status':
      case 'show-last-active':
      case 'show-actions':
        this._activeSection = service;
        this._loadSection(service);
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __admin_main;
