/* "You don't have permission" desk modal — secure-share v2 (Figma 1961:115796).
 *
 * Shown when a SIGNED-IN user opens a secure-shared file/workspace/folder they
 * lack permission on. The desk window-manager (modules/desk/wm) detects the 403
 * on media.node_info and — only when a secure-share token is in scope — feeds
 * this widget into its centred `wrapper-modal` slot. With no token it falls back
 * to the plain WEAK_PRIVILEGE alert, so ordinary member 403s are unaffected.
 *
 * Three steps, all in this one widget:
 *   denied → the "You don't have permission" card + Request access button
 *   form   → choose access level (Download / Chat / Edit) + optional message
 *   sent   → request-sent confirmation
 *
 * "Request access" posts the EXISTING Sprint-3 flow: SERVICE.dmz.request_access
 * → secure_share_create_access_request, using the signed-in user's own email. */

class __request_access_modal extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this._step              = 'denied';
    this._level             = null;
    this._requestMessageBox = null;
    this.declareHandlers();
  }

  onDomRefresh() {
    this._render();
  }

  _render() {
    this.feed(require('./skeleton')(this));
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'ref-request-message':
        this._requestMessageBox = child;
        return;
      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  // Resolve the secure-share token that brought the user here. Visitor.token is
  // set while routing the DMZ share link; localStorage('token') persists across
  // the post-signup reload into the desk.
  _token() {
    return this.mget(_a.token) || Visitor.get(_a.token) || localStorage.getItem('token') || '';
  }

  _close() {
    const p = this.parent;
    if (p && _.isFunction(p.clear)) {
      if (p.el) {
        p.el.dataset.state = 'closed';
        delete p.el.dataset.overlay;
      }
      return p.clear();
    }
    return this.goodbye();
  }

  async _submit() {
    if (!this._level || this._submitting) return;
    const token = this._token();
    if (!token) return this._close();

    const profile = Visitor.profile && Visitor.profile();
    const email   = (profile && profile.email) || '';
    const msgEl   = this._requestMessageBox
      ? this._requestMessageBox.el.querySelector('textarea')
      : null;
    const message = msgEl ? (msgEl.value || '').trim() : '';

    const payload = {
      token,
      hub_id          : this.mget(_a.hub_id) || '',
      email,
      requested_level : this._level,
    };
    if (message) payload.message = message;

    this._submitting = 1;
    const data = await this.postService(SERVICE.dmz.request_access, payload);
    this._submitting = 0;

    if (data && data.status === 'REQUEST_SENT') {
      this._requestEmail = email;
      this._step = 'sent';
      return this._render();
    }
    // Stay on the form; surface the failure (invalid/expired token, etc).
    if (_.isFunction(this.warn)) this.warn('[request_access] failed:', data && data.status);
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case 'open-request-form':
        this._step  = 'form';
        this._level = null;
        return this._render();

      case 'select-request-level': {
        this._level = trigger.mget('level');
        this.el.querySelectorAll('[data-level]').forEach((btn) => {
          btn.dataset.selected = (btn.dataset.level === this._level) ? 'yes' : '';
        });
        return;
      }

      case 'submit-access-request':
        return this._submit();

      case 'close-request-access':
      case _e.close:
        return this._close();

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }
}

module.exports = __request_access_modal;
