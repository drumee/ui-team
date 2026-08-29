const WS_EVENT = "ws:event";

// The pre-start heads-up ("Starting in 15 min") is delivered and handled, but
// held back from the screen for now. Set to 1 to switch it on — the server
// keeps sending it either way (REMINDER_LEAD_SEC), so nothing has to be
// redeployed server-side to enable it.
const SHOW_EARLY_MEETING_REMINDER = 0;

// How long a meeting card stays on screen. 30 s, on Duy's call 2026-08-26, and
// deliberately the SAME number the chat toast uses (CHAT_TOAST_MS) — two cards
// that look alike and sit in the same layer should not disappear on different
// clocks.
//
// 🔑 THIS REPLACES A SPLIT that used to read `variant === "now" ? 20000 : 8000`
// — the actionable "now" card lingered while the informational `invite` and
// `soon` ones cleared quickly. That distinction is GONE on purpose: an
// invitation names an organiser, a folder and an attendee count, which is more
// to read than 8 s allows, and the reason for lengthening the chat toast (time
// to notice, read, and decide) applies to it just as much.
//
// ⚠️ Cards stack at 28px offsets while several are live (see `_meetingToasts`),
// so a longer life means more of them can overlap. That was already true at
// 20 s; it is simply likelier now.
const MEETING_TOAST_MS = 30000;

/**
 * Detach a dismissed card once its fade-out has actually run.
 *
 * 🚨 WHY THIS EXISTS. `goodbye()` fades the card but leaves the NODE ATTACHED.
 * Measured on the endpoint 2026-08-26: half a minute after a meeting card was
 * shown it was still `isConnected`, at `opacity: 0`, with `pointer-events:
 * auto` — and `elementFromPoint` at its centre returned the card. An invisible
 * 520x277 rectangle that still swallows clicks is a dead zone sitting over the
 * desk, and EVERY meeting card left one behind. (The chat toast had the same
 * class of leak, with the worse symptom that its goodbye() did not even fade.)
 *
 * The fade is kept — this waits for it rather than cutting it short, so the
 * card still leaves the way Duy signed off on.
 */
function detachWhenFaded(node) {
  if (!node || typeof node.remove !== "function") return;
  const drop = () => { try { if (node.isConnected) node.remove(); } catch (e) {} };
  let anims = [];
  try { anims = node.getAnimations ? node.getAnimations() : []; } catch (e) { anims = []; }
  if (anims.length) {
    Promise.all(anims.map((a) => (a && a.finished ? a.finished.catch(() => {}) : null)))
      .then(drop, drop);
  }
  // Belt and braces, and each half is needed: a browser reporting no animation
  // at all, one whose animation never settles, and a BACKGROUND TAB — where the
  // animation clock is frozen and `finished` therefore never resolves — must
  // all still end with the node gone. 1200 ms is comfortably past the fade.
  setTimeout(drop, 1200);
}

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
      // The persistent notification-sidebar entry is handled separately by
      // panel/activity (meeting_notice rows + the conference.start branch).
      case "room.scheduled":
        return this._showMeetingToast(data);

      // A scheduled meeting's start time has arrived (reminderWorker →
      // meeting_schedule_due). Show the same toast, flavoured as a reminder
      // with a Join button that opens the meeting.
      case "room.reminder":
        return this._showMeetingToast(data, { reminder: 1 });

      // Someone STARTED a meeting in a workspace we belong to. conference.js
      // sendRoomInfo fans this to every hub member socket, and until now the
      // desk did nothing with it: the only reaction anywhere was the panel's
      // persistent row, so a member with the panel closed never learned a
      // meeting had begun. Show the "now" flavour — the room is open, so Join
      // lands in a live call rather than an empty one.
      //
      // NOT a plain literal by accident: SERVICE.conference has no `start`
      // key (it is a push, not an ACL method — verified against the live
      // get_env), so `case SERVICE.conference.start:` would be
      // `case undefined:` and would swallow every push with no service.
      case "conference.start":
        return this._showMeetingStartToast(data);

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

      // Figma's invite card (call-pop-up type=directly) leads with a fixed
      // line and names the organiser and the location underneath, rather than
      // using the meeting's own name as the heading. The other two flavours
      // still head with the meeting title.
      // Skeletons.Note renders its content as MARKUP, so every user-controlled
      // value has to be escaped on the way in — a meeting titled
      // "<img onerror=…>" would otherwise execute. `bold` additionally wraps a
      // value in <b>: Figma emphasises the organiser and the folder inside the
      // invitation sentence, and doing that here rather than in the locale
      // string keeps the translations free of markup and leaves the
      // placeholders reorderable for languages that need a different order.
      const esc = (v) => _.escape(String(v == null ? "" : v));
      const bold = (v) => `<b>${esc(v)}</b>`;

      const heading =
        variant === "invite"
          ? LOCALE.MEETING_INVITE_TITLE
          : data.title || LOCALE.MEETING;
      const description = String(data.message || "").trim();
      const attendees = Array.isArray(data.attendees) ? data.attendees : [];
      // How many are actually in the room. Only a started meeting carries it.
      const joined = Number(data.joined) || 0;
      const stime = Number(data.stime) || 0;
      // A meeting started on the spot has no scheduled time to print, but the
      // slot still belongs there — see the meta block below.
      const startsNow = !!data.starts_now;

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
            kids: attendees.slice(0, 2).map((a) => {
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
        // Figma's stack (component "3+ members") shows TWO faces and rolls the
        // rest into the +N chip beside them.
        if (attendees.length > 2) {
          meta.push(
            Skeletons.Note({
              className: "desk-meeting-toast__avatar-more",
              content: `+${attendees.length - 2}`,
            }),
          );
        }
        // "N joined" vs "N invited" is decided by whether anyone is actually
        // IN the room, not by which push arrived (Duy, 2026-08-26):
        //   · a started meeting HAS people in it — conference.js sends the
        //     room's roster and `joined`, so this says "joined";
        //   · a schedule notice names invitees and the room is empty (or it is
        //     not even time yet), so it says "invited".
        // room.reminder carries no join data at all — it fires at the start
        // time whether or not anyone turned up — so it correctly stays
        // "invited" rather than claiming attendance nobody has verified.
        meta.push(
          Skeletons.Note({
            className: "desk-meeting-toast__count",
            content: joined
              ? LOCALE.X_JOINED_COUNT.format(joined)
              : LOCALE.X_INVITED_COUNT.format(attendees.length),
          }),
        );
      }
      // The "when" slot. A scheduled meeting prints its start time; one
      // started on the spot says "Start now" in the same place, so both
      // flavours read the same way beside the count (Duy, 2026-08-26).
      // conference.start carries no stime — there is nothing to schedule —
      // which is why this cannot key off stime alone.
      if (stime || startsNow) {
        if (meta.length) {
          // Figma bakes the separator into the time string as "  - Start at
          // 9:00 AM"; kept as its own node so the gap stays CSS-controlled.
          meta.push(Skeletons.Note({ className: "desk-meeting-toast__dot", content: "-" }));
        }
        meta.push(
          Skeletons.Note({
            className: "desk-meeting-toast__when",
            content: stime
              ? LOCALE.MEETING_START_AT.format(Dayjs.unix(stime).format("h:mm A"))
              : LOCALE.MEETING_START_NOW,
          }),
        );
      }

      const body = [
        Skeletons.Box.X({
          className: "desk-meeting-toast__title-row",
          kids: [
            Skeletons.Note({ className: "desk-meeting-toast__title", content: esc(heading) }),
            // The dot means "in progress". An invitation is for a meeting that
            // has not started — often days away — so it would be stating
            // something untrue. Only the live flavours carry it.
            variant === "invite"
              ? null
              : Skeletons.Note({ className: "desk-meeting-toast__live" }),
          ].filter(Boolean),
        }),
      ];
      // An invitation has to say it is one, and by whom. Without this the card
      // is just a meeting title and a time — indistinguishable from the
      // "starting now" reminder, which is the one flavour that means "go now".
      let hasDesc = 0;
      if (variant === "invite" && data.from) {
        // room.js stamps folder_name on the invitation push. Without it there
        // is no honest "in <somewhere>" to print, so the shorter sentence
        // stands in rather than trailing a dangling "in ".
        const where = String(data.folder_name || "").trim();
        body.push(
          Skeletons.Note({
            className: "desk-meeting-toast__desc",
            content: where
              ? LOCALE.X_INVITED_YOU_JOIN_MEETING_IN.format(bold(data.from), bold(where))
              : LOCALE.X_INVITED_YOU_TO_MEETING.format(bold(data.from)),
          }),
        );
        hasDesc = 1;
      }
      if (description) {
        body.push(
          Skeletons.Note({
            className: "desk-meeting-toast__desc",
            content: esc(description),
          }),
        );
        hasDesc = 1;
      }
      // Figma's card always carries a description line under the title. The
      // reminder is the one flavour that can reach here with nothing to say —
      // a meeting booked without an agenda — and a card that is only a title
      // and a time reads as an invitation rather than "go now". Say what the
      // reminder actually means instead of leaving the slot empty.
      if (!hasDesc && variant === "now") {
        body.push(
          Skeletons.Note({
            className: "desk-meeting-toast__desc",
            content: LOCALE.MEETING_STARTING_NOW,
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
          // data-hub lets a later push tell whether a card for the SAME
          // workspace is already on screen. The per-key dedup below cannot:
          // reminderWorker sends the meeting node's nid while conference_join
          // returns the room id, so the same meeting arrives under two
          // different keys. Empty for room.scheduled, which carries no hub_id
          // — harmless, that one is never the "now" flavour.
          attrOpt: { "data-variant": variant, "data-hub": String(data.hub_id || "") },
          // Centring is `top:50%` + a -50% translate (see meeting-toast.scss),
          // so nudging `top` keeps the transform and the card centred.
          styleOpt: offset ? { top: `calc(50% + ${offset}px)` } : undefined,
          kids: [
            Skeletons.Button.Svg({
              className: "desk-meeting-toast__close",
              ico: _a.cross,
              tooltips: LOCALE.CLOSE,
            }),
            // `noti-video-camera`, NOT `video-camera`. Figma's tile holds the
            // Phosphor VideoCamera (component 5:66204), which is exactly the
            // glyph already in the sprite as noti-video-camera — the same one
            // the Meeting notification rows use. `video-camera` is a legacy
            // Illustrator asset on a 468px viewBox whose paths are solid, so
            // outlining it produced the washed-out camera Duy reported.
            Skeletons.Box.Y({
              className: "desk-meeting-toast__icon",
              kids: [Skeletons.Image.Svg({ ico: "noti-video-camera" })],
            }),
            Skeletons.Box.Y({ className: "desk-meeting-toast__body", kids: body }),
            Skeletons.Box.X({
              className: "desk-meeting-toast__actions",
              kids: [
                // Figma's meeting card labels this secondary button "Mute",
                // but the designer has not updated that node yet — Duy's
                // ruling 2026-08-25 stands: on the MEETING popup it is
                // Cancel, and Cancel == close == ✕. It writes NOTHING and it
                // does not cancel the meeting, so the popup needs no mute
                // entry point and no outgoing flow. Mute stays on the CHAT
                // card only, where Phase 3 wires it.
                //
                // The CLASS deliberately keeps its `__dismiss` name: the
                // capture-phase click delegate below matches on it, and that
                // delegate is not to be re-plumbed. Only the label changes.
                Skeletons.Note({
                  className: "desk-meeting-toast__dismiss",
                  content: LOCALE.CANCEL,
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
            const node = toast.el;
            if (toast.goodbye) toast.goodbye();
            else if (toast.remove) toast.remove();
            // The fade leaves the node attached and still hit-testing — see
            // detachWhenFaded. Without this every dismissed card leaves an
            // invisible dead zone over the desk.
            detachWhenFaded(node);
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
      // Auto-dismiss. One lifetime for every variant — see MEETING_TOAST_MS.
      setTimeout(kill, MEETING_TOAST_MS);
    } catch (e) {
      this.warn && this.warn("meeting toast failed", e);
    }
  }

  /**
   * Is a meeting card for this workspace already on screen?
   *
   * Used only to stop conference.start from doubling a card the reminder has
   * already put up; see _showMeetingStartToast. Destroyed entries are swept as
   * we go, exactly as _showMeetingToast does.
   */
  _hasLiveMeetingToastFor(hub_id) {
    if (!hub_id || !this._meetingToasts) return false;
    for (const [k, t] of this._meetingToasts) {
      if (!t || (t.isDestroyed && t.isDestroyed())) {
        this._meetingToasts.delete(k);
        continue;
      }
      if (t.el && t.el.getAttribute("data-hub") == hub_id) return true;
    }
    return false;
  }

  /**
   * conference.start → the "meeting has begun" card, in its "now" flavour so
   * it offers Join (the room is open by definition — the host is in it).
   *
   * A method of its own rather than a line in the switch, because this push
   * needs three guards that none of the room.* pushes do:
   *
   *  1. **room_type.** conference.js calls `inform(..., "conference.start")`
   *     for EVERY room type (service/conference.js:157) and only afterwards
   *     fans the meeting-only copy out to hub members (:172). So a P2P call
   *     reaches this case too — and it carries a hub_id, because
   *     conference_join selects one for every row, so hub_id cannot be used to
   *     tell the two apart. Only the hub fan-out stamps room_type; requiring
   *     it is what makes a call unable to raise a meeting card.
   *  2. **self.** entity_sockets excludes by SOCKET id, not uid
   *     (`AND s.id NOT IN (...)`), so the starter's other open tabs receive
   *     their own start event. Without this, starting a meeting pops a
   *     "Join" card in your second tab for the meeting you are hosting.
   *  3. **a card already up for this workspace.** A punctual host makes
   *     reminderWorker's room.reminder and this event land seconds apart, and
   *     the per-key dedup inside _showMeetingToast cannot see they are the
   *     same meeting: the reminder sends the meeting node's nid, while
   *     conference_join returns the room id. The reminder is the better card
   *     of the two (it has the title, the agenda and the invitee stack), so
   *     this one stands down rather than stacking a second box on top of it.
   */
  _showMeetingStartToast(data = {}) {
    try {
      if (!data || data.room_type != _a.meeting) return;
      if (!data.hub_id) return;
      if (data.uid && data.uid == Visitor.id) return;
      if (this._hasLiveMeetingToastFor(data.hub_id)) return;

      // Same derivation the switchcall popup uses for this very payload, so
      // the two surfaces never disagree about who started what and where.
      // `details` is mfs_node_attr(room_id) run against the hub's own db and
      // comes back EMPTY for a meeting (the hub node lives in its owner's db),
      // which is why the server carries hub_name explicitly.
      const name =
        data.username || data.firstname || data.lastname || data.email || "";
      const where =
        (data.details && data.details.filename) || data.filename || data.hub_name || "";

      // The workspace is the heading, the sentence underneath says who — so
      // neither names the workspace twice. It doubles as the window title when
      // Join opens the folder (_joinMeetingFromData reads data.title), which is
      // the other reason not to put "Meeting Started" there.
      // No name means no honest sentence: ".format" would render a leading
      // space and " started a meeting". Leave the heading standing alone.
      const title = where || LOCALE.MEETING_STARTED;
      const message = name ? LOCALE.X_STARTED_A_MEETING.format(name) : "";

      // reminder:1 with no lead_min is what selects the "now" variant — the
      // one that offers Join. room_id keys the card; it is also what
      // _joinMeetingFromData opens.
      // The room's roster and the count of who is in it. conference.js sends
      // both, and they are what make this card say "N joined" rather than
      // "N invited" — a started meeting has people in it by definition.
      return this._showMeetingToast(
        {
          hub_id: data.hub_id,
          room_id: data.room_id || data.hub_id,
          title,
          message,
          attendees: Array.isArray(data.attendees) ? data.attendees : [],
          joined: Number(data.joined) || 0,
          // Started on the spot: the meta line reads "N joined - Start now",
          // mirroring the scheduled card's "N invited - Start at 9:00 AM".
          starts_now: 1,
        },
        { reminder: 1 },
      );
    } catch (e) {
      this.warn && this.warn("meeting start toast failed", e);
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
