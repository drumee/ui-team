const WS_EVENT = "ws:event";

// The pre-start heads-up ("Starting in 15 min") is delivered and handled, but
// held back from the screen for now. Set to 1 to switch it on — the server
// keeps sending it either way (REMINDER_LEAD_SEC), so nothing has to be
// redeployed server-side to enable it.
const SHOW_EARLY_MEETING_REMINDER = 0;

const { timestamp } = require("@drumee/ui-essentials")
const winman = require("window/manager");

class __push_manager extends winman {

  constructor(...args) {
    super(...args);
    this.dispatchInboundCall = this.dispatchInboundCall.bind(this);
    this.dispatchRoom = this.dispatchRoom.bind(this);
    this._showMeetingToast = this._showMeetingToast.bind(this);
  }

  initialize(opt) {
    super.initialize(opt);
    this.myContacts = new Map();
    this.myContactsStatus = new Map();
  }

  /**
   *
   */
  updatePeersState() {
    if (!Visitor.isOnline()) return;
    this.postService(
      SERVICE.contact.connection_status, { hub_id: Visitor.id },
    ).then((contacts) => {
      if (_.isEmpty(contacts)) return;
      if (!_.isArray(contacts)) {
        contacts = [contacts]
      }
      for (let c of contacts) {
        this.myContactsStatus.set(c.his_id, { status: c.his_state });
        RADIO_BROADCAST.trigger(_e.peerData, { id: c.his_id, status: c.his_state });
      }
    });
  }

  /**
   *
   * @param {*} client
   */
  getContactStatus(id) {
    return this.myContactsStatus.get(id);
  }

  /**
   *
   * @param {*} service
   * @param {*} data
   * @param {*} options
   * @returns
   */
  // `data` defaults to {}: a push carrying no `model` used to arrive here as
  // undefined and throw on `data.socket_id` before any case ran, so one
  // malformed sender killed the whole dispatch.
  onWsMessage(service, data = {}, options = {}) {
    let items = [];
    let sender = options.sender;
    this.verbose("[60]onWsMessage:", options.service, data.socket_id, data, options);
    if (sender && sender.socket_id == Visitor.get(_a.socket_id)) {
      if (!options.loopback) return;
    }
    switch (options.service) {

      case SERVICE.conference.invite:
        if (data.room_type == _a.meeting) {
          return this.dispatchRoom(data, options);
        }
        return this.dispatchInboundCall(data);

      case SERVICE.conference.join:
        Wm.alert();
        if (data.room_type == _a.meeting) {
          this.dispatchRoom(data, options);
        } else {
          let sender = options.sender || {};
          if (data.uid == Visitor.id && sender.uid == Visitor.id) return;
          this.dispatchInboundCall(data);
        }
        return;

      case SERVICE.conference.accept:
      case SERVICE.conference.revoke:
      case SERVICE.conference.decline:
        this.dispatchSignaling(options.service, data);
        return;

      case SERVICE.conference.cancel:
        Visitor.muteSound();
        for (let c of this.getItemsByAttr(_a.room_id, data.room_id)) {
          c.goodbye();
        }
        return;

      case SERVICE.conference.leave:
        // Other party left the call. Close P2P call windows only (window_connect).
        // Team meeting windows (window_folder) stay open — only the host ending
        // the meeting should close them. They do, however, have to drop the peer
        // who left: a socket that dies abruptly never reaches Jitsi's presence
        // timeout in any useful time, so the participant lingered as a ghost.
        Visitor.muteSound();
        for (let c of this.getItemsByAttr(_a.room_id, data.room_id)) {
          if (c && (typeof c.isDestroyed !== 'function' || !c.isDestroyed())) {
            if (c.mget && c.mget(_a.kind) === 'window_connect') {
              c.goodbye();
            } else if (typeof c.onPeerSocketDropped === 'function') {
              c.onPeerSocketDropped(data);
            }
          }
        }
        return;

      case SERVICE.conference.update:
      case SERVICE.conference.broadcast:
        return;

      case SERVICE.signaling.notify:
        return;

      // A workspace member scheduled/invited you to a meeting (room.js
      // _notify_invitees). Show a transient top-right toast — NOT a modal.
      // (The persistent notification-sidebar entry is a separate follow-up
      // that needs the notification_center_next aggregation extended.)
      case "room.scheduled":
        return this._showMeetingToast(data);

      // A scheduled meeting's start time has arrived (reminderWorker →
      // meeting_schedule_due). Show the same toast, flavoured as a reminder
      // with a Join button that opens the meeting.
      case "room.reminder":
        return this._showMeetingToast(data, { reminder: 1 });

      // Downgrade over-limit: the server re-evaluates the org after every
      // plan change and every resolution action (purge, member removal…) and
      // fans the fresh state out to all members. One setter — libs/over-limit
      // broadcasts over-limit:changed and the banner/popup/desk re-render
      // themselves. No reload, exactly like the prototype demands.
      case "payment.plan_state_changed":
        require("libs/over-limit").setCurrent(data);
        return;

      case SERVICE.signaling.message:
        if (/pickup|cancel|reject/.test(data.type)) Visitor.muteSound();
        return

      case SERVICE.adminpanel.member_delete:
        let { organization } = data
        return Wm.choice(LOCALE.YOU_HAVE_BEEN_KICK_OUT.format(organization), LOCALE.GOT_IT).then(() => {
          location.reload()
        })

      // An admin removed us from a workspace (hub.delete_contributor). The
      // server also sends media.remove, which only drops the sidebar row: any
      // window still open on that workspace stayed fully live, so the user kept
      // browsing and creating there until a request finally failed the ACL with
      // a 403 that the panels report as "a network error". Lock it out on the
      // spot instead, and say who did it.
      case "hub.member_removed":
        return this.onWorkspaceAccessRevoked(data);
      // case SERVICE.adminpanel.mimic_new:
      //   return this.loadMimicNew(data);

      // case SERVICE.adminpanel.mimic_reject:
      //   return this.loadMimicReject(data);

      // case SERVICE.adminpanel.mimic_active:
      // case SERVICE.adminpanel.mimic_end_bymimic:
      // case SERVICE.adminpanel.mimic_end_byuser:
      // case SERVICE.adminpanel.mimic_end_bytime:
      //   _.delay(() => location.reload());
      //   break;

      case SERVICE.drumate.logout:
        if (!sender || sender.socket_id == Visitor.get(_a.socket_id)) {
          return;
        }
        this.fetchService(SERVICE.yp.hello).then((data) => {
          if (data.connection == 'offline') {
            location.reload()
          }
        })
        return;

      case SERVICE.contact.connection_status:
      case "user.connection_status":
        // UserProfile.updateStatus guards on data.id; server push uses user_id.
        this.myContactsStatus.set(data.user_id, { status: data.status });
        this.trigger(options.service, data);
        RADIO_BROADCAST.trigger(_e.peerData, { id: data.user_id, status: data.status });
        break;

      default:
        this.trigger(WS_EVENT, { service, data, options })
    }
  }

  /**
   * We have just been removed from a workspace, while possibly still sitting in
   * it. Freeze and blur everything bound to that workspace immediately, tell the
   * user who removed them, and close those windows on acknowledgement.
   *
   * The blur is stamped straight onto the windows rather than left to the modal's
   * own glass backdrop: the notice modal is imported asynchronously and the
   * workspace must not stay usable for those frames.
   *
   * @param {Object} data { hub_id, name, removed_by }
   */
  onWorkspaceAccessRevoked(data = {}) {
    const hub_id = data.hub_id;
    if (!hub_id) return;
    // A workspace can hold several open windows, and each removal is announced
    // once per socket — never stack modals for the same workspace.
    if (!this._revokedHubs) this._revokedHubs = new Set();
    if (this._revokedHubs.has(hub_id)) return;
    this._revokedHubs.add(hub_id);

    const windows = this._windowsOnHub(hub_id);
    for (let w of windows) {
      if (w.el) w.el.dataset.revoked = 1;
    }

    // Both decided BEFORE anything closes: goodbye() is animated, so
    // isDestroyed() is still false right after the call and a post-hoc check
    // would count a pane we just closed as surviving.
    const closing = new Set(windows);
    const workspaces = this._openWorkspaces();
    const closingWorkspace = workspaces.some((w) => closing.has(w));
    const keepsWorkspace = workspaces.some((w) => !closing.has(w));

    if (!this._workspaceRevokedNotices) this._workspaceRevokedNotices = new Map();
    this._workspaceRevokedNotices.set(`${hub_id}`, {
      hub_id,
      windows,
      closingWorkspace,
      keepsWorkspace,
    });

    const by = data.removed_by || LOCALE.ADMINISTRATOR;
    const workspace = this._revokedWorkspaceName(hub_id, data);
    return Wm.info({
      kind: "window_info",
      mode: "bf",
      variant: "notice",
      revoked_hub_id: hub_id,
      body: (ui) => this._workspaceRevokedNoticeBody(ui, { by, workspace }),
      actions: [
        {
          label: LOCALE.GOT_IT,
          priority: "primary",
          service: "workspace-access-revoked-ack",
          uiHandler: this,
          dataset: { revokedhubid: hub_id },
        },
      ],
    });
  }

  /**
   * Display name of the workspace we have just been removed from.
   *
   * The push carries one, but the server falls back to the hub id when the hub
   * profile has no name, and an id in the notice reads as gibberish. Reject a
   * name that IS the id, and ask the windows we are about to close instead —
   * they were opened on that workspace and carry its real name. Answers "" when
   * nothing usable turns up, which the notice phrases around.
   *
   * @param {string} hub_id
   * @param {Object} data push payload
   * @returns {string}
   */
  _revokedWorkspaceName(hub_id, data = {}) {
    const pushed = data.name || data.hubname || "";
    if (pushed && `${pushed}` !== `${hub_id}`) return `${pushed}`;
    for (let w of this._windowsOnHub(hub_id)) {
      if (!w || typeof w.mget !== "function") continue;
      // `hub_name` only — the folder window keeps the WORKSPACE's name there
      // (the breadcrumb sync writes it on every path row), while `filename` is
      // whatever subfolder or file that window happens to be showing. Naming
      // the wrong thing is worse than not naming it.
      const n = w.mget("hub_name");
      if (n && `${n}` !== `${hub_id}`) return `${n}`;
    }
    return "";
  }

  _workspaceRevokedNoticeBody(ui, opt = {}) {
    const fig = ui.fig.family;
    const workspace = String(opt.workspace || "").trim();
    // No `||` fallback: LOCALE is a safe object that answers a MISSING key with
    // the key's own name, which is truthy — the fallback could never run and
    // the card would have shown the literal "WORKSPACE_ACCESS_REVOKED_TITLE".
    // The key is defined in every locale instead.
    const title = LOCALE.WORKSPACE_ACCESS_REVOKED_TITLE;
    const by = opt.by || LOCALE.ADMINISTRATOR;
    // The workspace belongs INSIDE the sentence — on its own line it read as a
    // stray label (and as a raw id whenever the name failed to resolve). When
    // no name is available the unnamed wording still reads correctly.
    const message = workspace
      ? LOCALE.WORKSPACE_ACCESS_REVOKED_NAMED.format(workspace, by)
      : LOCALE.WORKSPACE_ACCESS_REVOKED.format(by);

    return Skeletons.Box.Y({
      className: `${fig}__revoked`,
      kids: [
        Skeletons.Box.X({
          className: `${fig}__revoked-icon`,
          kids: [
            Skeletons.Image.Svg({
              className: `${fig}__revoked-icon-svg`,
              ico: "apps-lock-shield",
            }),
          ],
        }),
        Skeletons.Note({
          className: `${fig}__revoked-title`,
          content: title,
        }),
        Skeletons.Note({
          className: `${fig}__revoked-message`,
          content: message,
        }),
      ].filter(Boolean),
    });
  }

  acknowledgeWorkspaceAccessRevoked(trigger) {
    // Read the hub off the model first and the DOM second: the action's
    // `dataset` only reaches the element when the button also carries an
    // attrOpt, which toolkit's button() does not pass. Resolving to nothing
    // here would leave the desk blurred and every window of a workspace the
    // user can no longer reach still open — so when the id can't be read and
    // exactly one notice is pending, acknowledge that one.
    const pending = this._workspaceRevokedNotices;
    const ds = (trigger && trigger.mget && trigger.mget("dataset")) || {};
    let key =
      ds.revokedhubid ||
      (trigger && trigger.el && trigger.el.dataset && trigger.el.dataset.revokedhubid);
    key = key != null ? `${key}` : null;
    if ((!key || !(pending && pending.has(key))) && pending && pending.size === 1) {
      key = pending.keys().next().value;
    }
    const notice = key && pending ? pending.get(key) : null;
    if (!notice) return;
    const hub_id = notice.hub_id;
    const { windows, closingWorkspace, keepsWorkspace } = notice;
    this._workspaceRevokedNotices.delete(key);
    const modals =
      (typeof this.getItemsByKind === "function" &&
        this.getItemsByKind("window_info")) ||
      [];
    for (let modal of modals) {
      if (!modal || !modal.mget) continue;
      if (`${modal.mget("revoked_hub_id")}` !== `${hub_id}`) continue;
      if (typeof modal.goodbye === "function") modal.goodbye();
    }
    // Closing the top-level window destroys its children, so anything already
    // gone by the time we reach it is skipped.
    for (let w of windows || []) {
      if (typeof w.isDestroyed === "function" && w.isDestroyed()) continue;
      if (typeof w.goodbye !== "function") continue;
      w.goodbye();
    }
    if (this._revokedHubs) this._revokedHubs.delete(hub_id);
    // A sidebar-opened workspace also owns desk chrome (breadcrumb, sidebar
    // tree). Closing the last one has to hand the desk back to its
    // no-workspace state, exactly as the window's own close button does
    // (window/folder onUiEvent "close"). With another workspace tab still up,
    // that tab keeps the chrome — resetting would clear ITS sidebar highlight.
    if (
      closingWorkspace &&
      !keepsWorkspace &&
      typeof Desk !== "undefined" &&
      Desk
    ) {
      Desk.onWorkspaceClosed();
    }
  }

  /**
   * Sidebar-opened (headless) workspace panes currently on screen.
   *
   * @returns {Array}
   */
  _openWorkspaces() {
    const layer = this.headlessLayer;
    if (!layer || !layer.children) return [];
    return Array.from(layer.children.toArray()).filter(
      (c) =>
        c &&
        !c.isDestroyed() &&
        c.mget(_a.kind) === "window_folder" &&
        c.mget(_a.headless),
    );
  }

  /**
   * Top-level windows currently bound to a workspace. Only the window layers are
   * walked — a sidebar-opened workspace lives in headlessLayer, a floating one in
   * windowsLayer — so this can never reach desk chrome that happens to carry the
   * same hub_id.
   *
   * @param {string} hub_id
   * @returns {Array} live window instances
   */
  _windowsOnHub(hub_id) {
    const found = [];
    for (let layer of [this.headlessLayer, this.windowsLayer]) {
      if (!layer || !layer.children) continue;
      for (let w of Array.from(layer.children.toArray())) {
        if (!w || typeof w.mget !== "function") continue;
        if (typeof w.isDestroyed === "function" && w.isDestroyed()) continue;
        // Compared as strings, like _findWorkspaceWindow's loose match: a type
        // mismatch here would silently leave the workspace unlocked.
        if (`${w.mget(_a.hub_id)}` !== `${hub_id}`) continue;
        found.push(w);
      }
    }
    return found;
  }

  /**
   * Transient top-right toast for a meeting push. Three flavours:
   *
   *   invite — room.scheduled: someone put you on a meeting.
   *   soon   — room.reminder with lead_min > 0: heads-up N minutes ahead.
   *            Notify only, no Join: the room isn't open yet, so a Join button
   *            would drop the user into an empty call.
   *   now    — room.reminder with lead_min 0: it's starting, offers Join.
   *
   * Layout is icon | (title + status [+ actions]) | close, styled from
   * skin/meeting-toast.scss via data-variant.
   */
  _showMeetingToast(data = {}, opt = {}) {
    try {
      const layer = Wm && Wm.windowsLayer;
      if (!layer || !layer.append) return;
      // Minutes-ahead comes from the worker; anything > 0 is the heads-up.
      const leadMin = Number(data.lead_min) || 0;
      const variant = !opt.reminder ? "invite" : leadMin > 0 ? "soon" : "now";
      if (variant === "soon" && !SHOW_EARLY_MEETING_REMINDER) return;

      const heading = data.title || LOCALE.MEETING;
      const description = String(data.message || "").trim();
      const attendees = Array.isArray(data.attendees) ? data.attendees : [];
      const stime = Number(data.stime) || 0;

      // Meta line: avatar stack · N invited · start time. Each piece is dropped
      // when its data is absent rather than rendering an empty separator.
      const meta = [];
      if (attendees.length) {
        meta.push(
          Skeletons.Box.X({
            className: "desk-meeting-toast__avatars",
            // Cap the stack; the remainder is summarised by the count beside it.
            // The index stores attendees as bare uids (room.js _index_meeting
            // maps a.uid || a), so an entry is usually a STRING: reading .name
            // off it gave every swatch an empty name, and Avatar hashes the
            // name for its fallback colour — a row of blank circles. Fall back
            // to the uid so each one at least gets its own colour.
            kids: attendees.slice(0, 3).map((a) => {
              const uid = typeof a === "string" ? a : (a && a.uid) || "";
              const name = (a && a.name) || String(uid || "");
              return Skeletons.Avatar(
                (a && a.avatar) || "default",
                "desk-meeting-toast__avatar",
                name,
              );
            }),
          }),
        );
        if (attendees.length > 3) {
          meta.push(
            Skeletons.Note({
              className: "desk-meeting-toast__avatar-more",
              content: `+${attendees.length - 3}`,
            }),
          );
        }
        meta.push(
          Skeletons.Note({
            className: "desk-meeting-toast__count",
            content: LOCALE.X_INVITED_COUNT.format(attendees.length),
          }),
        );
      }
      if (stime) {
        if (meta.length) {
          meta.push(Skeletons.Note({ className: "desk-meeting-toast__dot", content: "•" }));
        }
        meta.push(
          Skeletons.Note({
            className: "desk-meeting-toast__when",
            content: LOCALE.MEETING_START_AT.format(Dayjs.unix(stime).format("h:mm A")),
          }),
        );
      }

      const body = [
        Skeletons.Box.X({
          className: "desk-meeting-toast__title-row",
          kids: [
            Skeletons.Note({ className: "desk-meeting-toast__title", content: heading }),
            Skeletons.Note({ className: "desk-meeting-toast__live" }),
          ],
        }),
      ];
      // An invitation has to say it is one, and by whom. Without this the card
      // is just a meeting title and a time — indistinguishable from the
      // "starting now" reminder, which is the one flavour that means "go now".
      if (variant === "invite" && data.from) {
        body.push(
          Skeletons.Note({
            className: "desk-meeting-toast__desc",
            content: LOCALE.X_INVITED_YOU_TO_MEETING.format(data.from),
          }),
        );
      }
      if (description) {
        body.push(
          Skeletons.Note({
            className: "desk-meeting-toast__desc",
            content: description,
          }),
        );
      }
      if (meta.length) {
        body.push(Skeletons.Box.X({ className: "desk-meeting-toast__meta", kids: meta }));
      }

      // The card is centred now, so a second one lands exactly on top of the
      // first: two meetings starting in the same minute used to be offset down
      // the right edge, and would otherwise hide each other completely — the
      // buried card's Join and ✕ unreachable. Never show the same meeting
      // twice, and step any other live card down so both stay usable.
      const key = `${data.nid || data.room_id || heading}:${variant}`;
      if (!this._meetingToasts) this._meetingToasts = new Map();
      for (const [k, t] of this._meetingToasts) {
        if (t && t.isDestroyed && t.isDestroyed()) this._meetingToasts.delete(k);
      }
      if (this._meetingToasts.has(key)) return;
      const offset = this._meetingToasts.size * 28;

      const toast = layer.append(
        Skeletons.Box.Y({
          className: "desk-meeting-toast",
          attrOpt: { "data-variant": variant },
          // Centring is `top:50%` + a -50% translate (see meeting-toast.scss),
          // so nudging `top` keeps the transform and the card centred.
          styleOpt: offset ? { top: `calc(50% + ${offset}px)` } : undefined,
          kids: [
            Skeletons.Button.Svg({
              className: "desk-meeting-toast__close",
              ico: _a.cross,
              tooltips: LOCALE.CLOSE,
            }),
            Skeletons.Box.Y({
              className: "desk-meeting-toast__icon",
              kids: [Skeletons.Image.Svg({ ico: "video-camera" })],
            }),
            Skeletons.Box.Y({ className: "desk-meeting-toast__body", kids: body }),
            Skeletons.Box.X({
              className: "desk-meeting-toast__actions",
              kids: [
                Skeletons.Note({
                  className: "desk-meeting-toast__dismiss",
                  content: LOCALE.DISMISS,
                }),
                // Join ONLY once the meeting has actually started. An invite
                // announces a meeting that may be days away and the heads-up
                // fires before the room opens, so offering Join on either drops
                // the user into an empty call.
                variant === "now"
                  ? Skeletons.Note({
                      className: "desk-meeting-toast__join",
                      content: LOCALE.JOIN_MEETING,
                    })
                  : null,
              ].filter(Boolean),
            }),
          ],
        }),
      );
      this._meetingToasts.set(key, toast);
      const kill = () => {
        try {
          // Release the slot first — a card dismissed out of order must not
          // leave a gap that keeps pushing later ones further down.
          if (this._meetingToasts) this._meetingToasts.delete(key);
          if (toast && (!toast.isDestroyed || !toast.isDestroyed())) {
            if (toast.goodbye) toast.goodbye();
            else if (toast.remove) toast.remove();
          }
        } catch (e) {}
      };
      if (toast && toast.el) {
        // Join joins and dismisses; the ✕ only dismisses. Clicking the card
        // body does nothing now — it used to dismiss on any click, which ate
        // the Join press often enough to be worth separating.
        //
        // Delegated from the card in the CAPTURE phase, deliberately. These
        // controls are rendered widgets, and ui-core gives every widget its own
        // `el.onclick` at render time (letc/addons/letc.js onRender); that
        // handler ends in `e.stopImmediatePropagation()`, which drops any
        // listener added to the SAME element afterwards. Bound straight to the
        // button, ours was therefore eaten on the first click and only ran on a
        // second one inside that handler's 300 ms debounce — the buttons needed
        // a double click. A capture listener on an ancestor runs before the
        // target's own handler, so a single click always lands.
        let joining = 0;
        toast.el.addEventListener(
          "click",
          (e) => {
            const t = e.target;
            if (!t || !t.closest) return;
            const joinEl = t.closest(".desk-meeting-toast__join");
            if (joinEl) {
              // The window being opened takes a moment to build, and a second
              // click in that gap used to open a second one.
              if (joining) return;
              joining = 1;
              e.stopPropagation();
              joinEl.dataset.busy = "1";
              this._joinMeetingFromData(data);
              kill();
              return;
            }
            // ✕ and Dismiss both just close the card.
            if (
              t.closest(".desk-meeting-toast__close, .desk-meeting-toast__dismiss")
            ) {
              e.stopPropagation();
              kill();
            }
          },
          true,
        );
      }
      // Auto-dismiss: the actionable "now" toast lingers, the informational
      // ones clear quickly.
      setTimeout(kill, variant === "now" ? 20000 : 8000);
    } catch (e) {
      this.warn && this.warn("meeting toast failed", e);
    }
  }

  /**
   * Open (or reuse) the folder window for a meeting's hub and join the live room
   * on its meeting tab. Mirrors the activity-panel "join-meeting" handler so a
   * reminder toast's Join button behaves identically.
   */
  // Reserve the right to build the one switchcall popup.
  //
  // The `getItemByKind` check alone is not enough: it runs inside
  // Kind.waitFor's `then`, so two pushes landing together — conference.invite
  // followed by conference.join for the same meeting — both looked and both
  // found nothing, and the user got two identical popups. Two popups means two
  // Join buttons, and accepting each one opened its own call window. The claim
  // is taken synchronously, before yielding, so the second caller loses.
  //
  // @returns {boolean} true if the caller owns the creation
  _claimSwitchcall() {
    const live = Wm.getItemByKind && Wm.getItemByKind("window_switchcall");
    if (live && !live.isDestroyed()) return false;
    if (this._switchcallPending) return false;
    this._switchcallPending = 1;
    // Never strand the flag if the kind fails to load.
    setTimeout(() => { this._switchcallPending = 0; }, 10000);
    return true;
  }

  _joinMeetingFromData(data = {}) {
    try {
      const hub_id = data.hub_id;
      if (!hub_id || typeof Wm === "undefined") return;
      // Opening the folder window and joining the room is not instant, and
      // Wm.addWindow does not dedup — so a repeat call while the first is still
      // in flight would open a second call window. One join per room at a time.
      const busyKey = String(data.room_id || data.nid || hub_id);
      if (!this._joiningRooms) this._joiningRooms = new Set();
      if (this._joiningRooms.has(busyKey)) return;
      this._joiningRooms.add(busyKey);
      setTimeout(() => this._joiningRooms.delete(busyKey), 5000);
      const room_id = data.room_id || data.nid;
      const folderNid = data.nid || room_id;
      const open = ((Wm.getItemsByKind && Wm.getItemsByKind("window_folder")) || [])
        .find((w) => !w.isDestroyed() && w.mget(_a.hub_id) == hub_id);
      if (open && typeof open._launchMeetingInPanel === "function") {
        if (open.raise) open.raise();
        open._launchMeetingInPanel();
      } else if (Wm.addWindow) {
        Wm.addWindow({
          kind: "window_folder",
          hub_id,
          nid: folderNid,
          filename: data.title || "",
          activeTab: "meeting",
          room_id,
          room_type: "meeting",
        });
      }
    } catch (e) {
      this.warn && this.warn("_joinMeetingFromData failed", e);
    }
  }

  /**
   *
   */
  dispatchInboundCall(data) {
    let o;
    const currentRoom =
      Wm.getItemsByKind("window_connect")[0] || Wm.getItemsByKind("window_meeting")[0];
    data.nid = data.nid || data.room_id;
    const respawn = {
      kind: "window_connect",
      caller: data,
    };

    if (currentRoom && !currentRoom.isDestroyed()) {
      let room_id = currentRoom.mget(_a.room_id);
      if (room_id && room_id == data.room_id) {
        if (data.type == "conference.join") {
          switch (currentRoom.state) {
            case "dial":
              currentRoom.stateMachine("connect");
              break;
            case _a.invie:
              return;
          }
        }
        return;
      }
      if (
        currentRoom.callee &&
        currentRoom.callee.drumate_id == data.drumate_id
      ) {
        return;
      } // Handled by existing widgetææ
      if (
        data.type == "conference.join" &&
        data.socket_id == Visitor.get(_a.socket_id)
      ) {
        return;
      }

      if (!this._claimSwitchcall()) return;
      Kind.waitFor("window_switchcall").then(() => {
        this._switchcallPending = 0;
        const s = Wm.getItemByKind("window_switchcall");
        if (s && !s.isDestroyed()) return;
        const o = {
          kind: "window_switchcall",
          type: _e.connect,
          currentRoom,
          peerData: data,
          respawn,
        };

        this.addWindow(o);
      });
    } else {
      o = respawn;
      Visitor.playSound();
      if (data.origin && data.origin.uid) {
        const title = LOCALE.X_IS_CALLING_YOU.format(data.origin.firstname);
        const notif = {
          body: LOCALE.INCOMING_CALL || "",
          icon: Visitor.avatar(data.origin.uid),
        };
        if (!window.Notification) return;
        new Notification(title, notif);
      }
      this.addWindow(o);
    }
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  dispatchRoom(data) {
    const currentRoom =
      Wm.getItemsByKind("window_connect")[0] || Wm.getItemsByKind("window_meeting")[0];
    if (!data || !data.room_id) return;
    if (currentRoom && !currentRoom.isDestroyed()) {
      if (currentRoom.mget(_a.hub_id) == data.hub_id) {
        currentRoom.onRemoteDrumateJoined(data);
        return;
      }
      let details = data.details;
      if (details && details.ctime < timestamp() / 1000 - 10) return;
    }

    // Open the folder window on the meeting tab so the callee lands in the
    // same shell the caller sees, rather than a detached window_meeting.
    const { details, uid, username } = data;
    const folderNid = data.nid || (details && (details.nid || details.actual_home_id)) || data.room_id;
    // details is empty for a meeting (mfs_node_attr(room_id) runs against the
    // hub's own db, but a hub node lives in its owner's db), so hub_name is the
    // reliable source for the workspace name here.
    const folderName = (details && details.filename) || data.filename || data.hub_name || "";
    const folderArea = (details && details.area) || data.area;
    const respawn = {
      kind: "window_folder",
      hub_id: data.hub_id,
      nid: folderNid,
      filename: folderName,
      area: folderArea,
      activeTab: "meeting",
      room_id: data.room_id,
      room_type: data.room_type,
    };
    let message = LOCALE.FIRST_PARTICIPANTS_ARRIVED;
    let title = `${LOCALE.MEETING}`;
    // Guarded on folderName, not on `details`: details is an empty object here
    // for a meeting, which is truthy, so this used to interpolate "undefined"
    // into both the toast and the browser notification title. With no name to
    // show it keeps the generic default rather than naming the wrong thing.
    if (username && folderName) {
      message = LOCALE.X_HAS_JOINED_MEETING.format(username, folderName);
      title = `${LOCALE.MEETING} ${folderName}`;
    }
    let peerData = {
      ...data,
      title,
      message,
    };

    try {
      if (window.Notification) {
        const notif = {
          body: message,
          icon: Visitor.avatar(uid)
        };
        new Notification(title, notif);
      }
    } catch (e) {
      this.warn("Failed to notify", e)
    }
    if (!this._claimSwitchcall()) return;
    Kind.waitFor("window_switchcall").then(() => {
      this._switchcallPending = 0;
      const s = Wm.getItemByKind("window_switchcall");
      if (s && !s.isDestroyed()) return;
      const o = {
        kind: "window_switchcall",
        currentRoom,
        peerData,
        respawn,
      };

      this.addWindow(o);
    });
  }

  /**
   *
   */
  dispatchSignaling(service, data) {
    const currentRoom = Wm.getItemByKind("window_connect");
    if (!currentRoom || currentRoom.isDestroyed()) {
      return;
    }
    let state;
    switch (service) {
      case SERVICE.conference.decline:
        state = "declined";
        break;
      case SERVICE.conference.accept:
        this.verbose("AAA:364", currentRoom, currentRoom.state, _a.invite, data)
        state = "connect";
        if (currentRoom.state == _a.invite || currentRoom.state == 'connect') {
          return;
        }
        break;
      case SERVICE.conference.revoke:
        currentRoom.goodbye();
        return;
    }
    if (currentRoom.stateMachine) {
      currentRoom.stateMachine(state, data);
    }
    return;
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  loadMimicNew(data) {
    if (data.mimicker === Visitor.id) {
      return;
    }
    const success = () => {
      this.postService({
        service: SERVICE.adminpanel.mimic_active,
        orgid: Visitor.get("org_id"),
        mimic_id: data.mimic_id,
        hub_id: Visitor.id,
      });
      return Wm.closeAlert();
    };
    const reject = () => {
      // @todo Need to remove the hard coded org id
      this.postService({
        service: SERVICE.adminpanel.mimic_reject,
        orgid: Visitor.get("org_id"),
        mimic_id: data.mimic_id,
        hub_id: Visitor.id,
      });
      this.warn("ERROR:523 -- loadMimicNew -- Rejected");
      return Wm.closeAlert();
    };
    return Wm.confirm(require("./skeleton/mimic/request")(this, data))
      .then(success)
      .catch(reject);
  }

  /**
   * 
   * @param {*} data 
   * @returns 
   */
  loadMimicReject(data) {
    if (data.mimicker !== Visitor.id) {
      return;
    }
    Wm.alert(require("./skeleton/mimic/decline")(this, data));
  }
}

module.exports = __push_manager;
