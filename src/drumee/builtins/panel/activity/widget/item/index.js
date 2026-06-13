
function parseJson(value, fallback) {
  if (!value) return fallback;
  if (_.isObject(value)) return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}


// Canonical category keys returned by activity.list. activity.get_feed
// rows (from mfs_changelog) only carry `event` like "media.remove" — fall
// back to inferring the category from that prefix so the switch matches.
function getCategory(data) {
  const direct = data.category || data.event_type || data.type;
  if (direct) return direct;
  const ev = String(data.event || '');
  if (ev === 'hub.invite_received') return 'hub_invite';
  const dot = ev.indexOf('.');
  return dot > 0 ? ev.slice(0, dot) : '';
}

/**
 * 
 * @param {*} data 
 * @returns 
 */
function getSender(data) {
  // Prefer the per-event author (latest uploader/poster), then the rollup peer
  // (chat/contact), then any other identity field. "Someone" is the last resort
  // when the row truly carries no actor info.
  const authorName = [data.author_firstname, data.author_lastname].filter(Boolean).join(" ");
  if (authorName) return authorName;
  if (data.fullname) return data.fullname;
  const peerName = [data.firstname, data.lastname].filter(Boolean).join(" ");
  if (peerName) return peerName;
  return data.email || data.uid || "Someone";
}


/**
 * Author name fields drive the avatar initials when the image fails to load.
 * Prefer the per-event author; fall back to the rollup peer (chat/contact).
 * @param {*} data 
 * @returns 
 */
function getAuthorId(data) {
  // Resolve avatar id per category. Falling through to undefined makes
  // Visitor.avatar default to the current user's id — that's the bug behind
  // "all rows show my own face." Each category exposes a different "actor"
  // field; pick the right one.
  if (data.author_id) return data.author_id;
  switch (data.category) {
    case 'chat':
    case 'contact':
      return data.drumate_id;
    case 'media':
    case 'teamchat':
      return data.hub_id;
    case 'hub_invite':
      return data.author_id || data.hub_id;
    default:
      return data.drumate_id || data.hub_id;
  }
}

class __activity_item extends LetcBox {


  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    if (opt.dest?.nid) {
      this.mset(opt.dest)
    } else if (opt.src?.nid) {
      this.mset(opt.src)
    }
    let category = getCategory(opt);
    let sender = getSender(opt);
    let autho_id = getAuthorId(opt)
    if (category === _a.media && opt.id) {
      this.mset({ changelog_id: opt.id, item_type: 'mfs' })
    }

    // item_type routes the dismiss handler — DO NOT use the inferred
    // getCategory() here. Rollup rows from activity.list carry an explicit
    // `data.category` and dismiss via activity.dismiss_rollup. Raw
    // mfs_changelog rows from activity.get_feed have no category, only
    // `event`, and must dismiss via activity.dismiss with changelog_id —
    // they MUST stay tagged as 'mfs' so the dismiss handler takes the
    // per-changelog branch.
    const item_type = opt.category
      || (opt.event === 'hub.invite_received' ? 'hub_invite' : 'mfs');
    const item_key = `${item_type}:${opt.id || opt.hub_id || opt.drumate_id || opt.key_id || ''}`;
    this.mset({ category, sender, autho_id, item_type, item_key })
  }


  /**
   * 
   * @returns 
   */
  isFolder() {
    return this.mget(_a.filetype) === _a.folder || this.mget(_a.ftype) === _a.folder || this.mget(_a.category) === _a.folder;
  }

  getItemName() {
    return this.mget(_a.filename) || this.mget(_a.name) || this.mget(_a.user_filename) || this.mget(_a.link_label) || this.mget(_a.surname) || this.mget(_a.hub_name) || this.mget(_a.message) || "item";
  }

  hasAttachment() {
    const attachment = parseJson(this.mget(_a.attachment), this.mget(_a.attachment));
    if (_.isArray(attachment)) return attachment.length > 0;
    if (_.isObject(attachment)) return !_.isEmpty(attachment);
    return !!attachment && String(attachment).trim() !== "" && attachment !== "null";
  }

  /**
   * 
   */
  onDomRefresh() {
    // NOTE: previously this registered `once(destroy → close-activity-panel)`
    // to dismiss the panel after opening a notification. But items are also
    // destroyed by list.restart() (e.g. switching the All/Mentions/Shares
    // filter) and by dismiss/trash — so any of those would wrongly close the
    // whole panel (repro: Shares → All activity closed it). The panel now
    // closes only via the explicit close button / sidebar toggle.
    this.feed(require('./skeleton')(this));
  }

  /**
   * 
   */
  _dispatchService(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    const parent = this.mget('logicalParent');
    const cmdClass = cmd && cmd.el && cmd.el.classList ? cmd.el.classList[0] : null;
    const hub_id = this.mget(_a.hub_id);
    const parent_id = this.mget(_a.parent_id) || "0";
    const filetype = this.mget(_a.filetype) || 'other';
    const nid = this.mget(_a.nid) || "0";
    let changelog_id = this.mget('changelog_id');
    let ts = new Date().getTime()
    let category = this.mget(_a.category);
    let item_type = this.mget('item_type')
    let item_key = this.mget('item_key');
    let drumate_id = this.mget(_a.drumate_id) || this.mget(_a.author_id);
    let message_id = this.mget('message_id');

    switch (service) {
      case 'toggle-favorite':
        if (!cmd || !cmd.el) return;
        const next = cmd.el.dataset.state === '1' ? '0' : '1';
        cmd.el.dataset.state = next;
        if (cmd.mset) cmd.mset(_a.state, parseInt(next));
        /** Calling onUiEvent is not a recommended way, because the parent may change. 
         * Prefer triggerHandlers, always hit the uiHandler 
         */
        if (parent && parent.onUiEvent) {
          parent.onUiEvent(this, {
            service: 'toggle-favorite',
            favorited: next === '1' ? 1 : 0,
            item_key: this.mget('item_key'),
            message_id: this.mget('message_id')
              || this.mget('key_id')
              || this.mget(_a.id)
              || this.mget('id')
              || this.mget(_a.drumate_id),
            hub_id: this.mget(_a.hub_id),
          });
        }
        return;

      case 'dismiss-activity':
        switch (category) {
          case _a.media:
            this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, changelog_id })
            return

          case _a.hub_invite:
            this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, changelog_id })
            return

          case _a.teamchat:
            this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, item_key, changelog_id })
            return;
          case _a.chat:
            this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, item_key, changelog_id })
            return;
          case _a.contact:
            this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, item_key, changelog_id })
            return

          case 'contact_refused':
            this.triggerHandlers({ service: 'dismiss-activity', item_type, item_key })
            return
        }
    }

  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || this.get(_a.service) || cmd.get(_a.service);
    const parent = this.mget('logicalParent');
    const cmdClass = cmd && cmd.el && cmd.el.classList ? cmd.el.classList[0] : null;
    const hub_id = this.mget(_a.hub_id);
    const parent_id = this.mget(_a.parent_id) || "0";
    const filetype = this.mget(_a.filetype) || 'other';
    const nid = this.mget(_a.nid) || "0";
    let changelog_id = this.mget('changelog_id');
    let ts = new Date().getTime()
    let category = this.mget(_a.category);
    let item_type = this.mget('item_type')
    let item_key = this.mget('item_key');
    let drumate_id = this.mget(_a.drumate_id) || this.mget(_a.author_id);
    let message_id = this.mget('message_id');
    let hash;
    this.verbose('[activity_item]:25 ', this, category, {
      service,
      cmd_class: cmdClass,
      item_type,
      item_key,
      id: this.mget('id'),
      category,
      hub_id,
      nid,
    });
    // return;
    if (service === 'open-access-request') {
      // Forward to the activity panel (logicalParent) to show the approve popup.
      // _dispatchService only knows toggle-favorite / dismiss-activity, so an
      // open-* service would otherwise be swallowed. Pass the request fields in
      // the args so the panel never has to re-find this item (the list factory
      // consumes `kind`, so a kind-based lookup of a forwarded item can miss).
      if (parent && parent.onUiEvent) {
        parent.onUiEvent(this, {
          service,
          request_id     : this.mget('request_id'),
          requested_level: this.mget('requested_level'),
          requester_email: this.mget('requester_email'),
          message        : this.mget('message'),
          hub_id         : this.mget('hub_id'),
          workspace_name : this.mget('workspace_name'),
        });
      }
      return;
    }
    if (service) {
      this._dispatchService(cmd, args)
      return;
    }
    switch (category) {
      case _a.media:
        location.hash = `#/desk/wm/open/?hub_id=${hub_id}&nid=${nid}&filetype=${filetype}&pid=${parent_id}&ts=${ts}`;
        this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, changelog_id })
        return

      case _a.hub_invite:
        location.hash = `#/desk/wm/open/?hub_id=${hub_id}&nid=0&filetype=folder&pid=0&ts=${ts}`;
        this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, changelog_id })
        return

      case _a.teamchat:
        hash = `#/desk/wm/${category}/?hub_id=${hub_id}&nid=0&pid=0`;
        if (message_id) hash = hash + `&message_id=${message_id}`;
        location.hash = hash + `&ts=${ts}`;
        this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, changelog_id })
        break;
      case _a.chat:
        hash = `#/desk/wm/${category}/?drumate_id=${drumate_id}`;
        if (message_id) hash = hash + `&message_id=${message_id}`;
        location.hash = hash + `&ts=${ts}`;
        this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, item_key, changelog_id })
        break;

      case _a.contact:
        hash = `#/desk/wm/${category}`;
        location.hash = hash + `&ts=${ts}`;
        this.triggerHandlers({ service: 'dismiss-activity', hub_id, nid, item_type, item_key, changelog_id })
        break;

      case 'contact_refused':
        this.triggerHandlers({ service: 'dismiss-activity', item_type, item_key })
        break;

      case 'access_request':
        // The click lands on a serviceless inner Note, so `service` is undefined and
        // we route by category here — same as every other row above. Forward to the
        // activity panel (logicalParent) to open the approve popup; mirrors the
        // `if (service === 'open-access-request')` block (used when the service IS
        // set explicitly). NOT set on the model — that would shadow the row's
        // bookmark/trash buttons.
        if (parent && parent.onUiEvent) {
          parent.onUiEvent(this, {
            service        : 'open-access-request',
            request_id     : this.mget('request_id'),
            requested_level: this.mget('requested_level'),
            requester_email: this.mget('requester_email'),
            message        : this.mget('message'),
            hub_id         : this.mget('hub_id'),
            workspace_name : this.mget('workspace_name'),
          });
        }
        break;
    }
  }

}

module.exports = __activity_item;
