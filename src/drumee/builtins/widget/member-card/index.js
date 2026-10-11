/* ==================================================================== *
 * member_card
 * The card a person's avatar opens -- B2B Org Structure Figma 978:125420
 * ("card hover when user click other avatar in other screen"), and the
 * contact half of the org chart's edit member (910:81010, "edit contact,
 * sync with contact page").
 *
 * Name, title and departments come from organization.member_card. Email and
 * phone are the viewer's CONTACT entry for that person (contact.of_user), the
 * very record the Contacts page edits, so a number changed here is the number
 * the Contacts page shows, and the other way round.
 *
 * Hosted by Wm's wrapper-modal (Wm "member-card"), like the department form.
 * ==================================================================== */

/**
 * Ring one person (1:1 "Drumee connect" call) -- the Contacts panel's Call:
 * libs/p2p-call's startP2PCall, kept here so the card does not depend on a
 * module every branch may not carry.
 */
function startP2PCall(callee, opt = {}) {
  const guest_id = callee && (callee.drumate_id || callee.entity_id || callee.uid || callee.id);
  if (!guest_id) return false;
  if (Wm.getItemByKind("window_connect") || Wm.getItemByKind("window_meeting")) {
    Wm.alert(LOCALE.ALREADY_ANOTHER_CALL);
    return false;
  }
  const name = callee.fullname || callee.display
    || `${callee.firstname || ""} ${callee.lastname || ""}`.trim();
  Wm.launch({
    kind: "window_connect",
    hub_id: Visitor.id,
    nid: Visitor.get(_a.home_id) || Visitor.get(_a.nid),
    filename: name,
    display: name,
    callee: { ...callee, drumate_id: guest_id },
    video: opt.video === 0 ? 0 : 1,
    audio: 1,
  }, { explicit: 1, singleton: 1 });
  return true;
}

// A refusal is a SHOUT_CASE code; a contact record carries its lifecycle
// status ("active", "memory"...), which is not one (same rule as the
// Contacts page).
const refused = (res) => !res || (typeof res.status === "string" && /^[A-Z][A-Z0-9_]*$/.test(res.status));

class __member_card extends LetcBox {

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._uid = String(this.mget(_a.uid) || "");
    this._person = null;
    this._contact = null;
    this._loaded = false;
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    this._load();
  }

  async _load() {
    const uid = this._uid;
    if (!uid) return this._close();
    const [person, contact] = await Promise.all([
      SERVICE.organization && SERVICE.organization.member_card
        ? this.postService(SERVICE.organization.member_card, { hub_id: Visitor.id, uid }).catch(() => null)
        : null,
      SERVICE.contact && SERVICE.contact.of_user
        ? this.postService(SERVICE.contact.of_user, { hub_id: Visitor.id, uid }).catch(() => null)
        : null,
    ]);
    if (this.isDestroyed && this.isDestroyed()) return;
    // Outside an organisation (or someone not in it) the card still shows the
    // person, from what the caller passed in and the contact entry.
    const given = this.mget("person") || {};
    this._person = person && !person.status
      ? person
      : { uid, fullname: given.fullname || given.display || "", email: given.email || "", departments: [] };
    this._contact = contact && contact.contact_id ? contact : null;
    this._phone = this._defaultPhone();
    this._loaded = true;
    this.feed(require("./skeleton")(this));
  }

  /** The contact's default mobile number, as the Contacts page lists it. */
  _defaultPhone() {
    const list = (this._contact && Array.isArray(this._contact.mobile)) ? this._contact.mobile : [];
    const m = list[0];
    if (!m) return "";
    return [m.areacode, m.phone].filter(Boolean).join(" ").trim();
  }

  _name() {
    const p = this._person || {};
    return p.fullname || `${p.firstname || ""} ${p.lastname || ""}`.trim() || p.email || "";
  }

  _peer() {
    const p = this._person || {};
    return {
      entity_id: this._uid, drumate_id: this._uid, uid: this._uid,
      firstname: p.firstname, lastname: p.lastname, fullname: this._name(), display: this._name(),
    };
  }

  _close() {
    // Embedded, the host dialog decides when to go.
    if (this.mget("embedded")) return null;
    if (this.parent && _.isFunction(this.parent.clear)) return this.parent.clear();
    return this.goodbye();
  }

  _input(cls) {
    return this.el && this.el.querySelector(`.${this.fig.family}__${cls} input, .${this.fig.family}__${cls} textarea`);
  }

  _note(message, ok) {
    return this.ensurePart("status").then((p) => {
      if (!p) return;
      p.el.dataset.ok = ok ? 1 : 0;
      p.setState(message ? 1 : 0);
      p.set({ content: message || "" });
    });
  }

  async _send() {
    const input = this._input("message");
    const message = String((input && input.value) || "").trim();
    if (!message || this._sending) return;
    this._sending = 1;
    const res = await this.postService(SERVICE.chat.post, {
      hub_id: Visitor.id, entity_id: this._uid, message,
    }).catch(() => null);
    this._sending = 0;
    if (refused(res)) return this._note(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong.");
    if (input) input.value = "";
    return this._note(LOCALE.MESSAGE_SENT || "Message sent", 1);
  }

  _chat() {
    const desk = window.Desk;
    this._close();
    if (desk && _.isFunction(desk.openPeerChat)) desk.openPeerChat(this._peer());
  }

  _call() {
    if (startP2PCall(this._peer(), { video: 0 })) this._close();
  }

  async _addContact() {
    const res = await this.postService(SERVICE.contact.add, {
      hub_id: Visitor.id, invitee_id: this._uid,
    }).catch(() => null);
    if (refused(res)) return this._note(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong.");
    this._contact = res.id ? { ...res, contact_id: res.id } : this._contact;
    await this._load();
    return this._note(LOCALE.CONTACT_ADDED || "Added to your contacts", 1);
  }

  /**
   * Update: the phone number goes to the viewer's contact entry for this
   * person (contact.update, the Contacts page's own save), created first
   * (contact.add) when there is none yet.
   */
  async _update() {
    const ok = await this.savePhone();
    if (ok) return this._close();
  }

  /**
   * Save the phone field to the contact entry when it changed.
   * Public: a host dialog embedding the card (Edit member) calls it on its
   * own Update. Resolves true when there was nothing to do or it saved.
   * @returns {Promise<Boolean>}
   */
  async savePhone() {
    if (!this._loaded) return true;
    const input = this._input("phone");
    const phone = String((input && input.value) || "").trim();
    if (phone === this._phone) return true;
    const p = this._person || {};
    // The card shows (and edits) the FIRST number: contact_phone keeps no
    // default flag, so the rest are kept as they are, after it.
    const others = ((this._contact && this._contact.mobile) || []).slice(1)
      .map((m) => ({ phone: m.phone, areacode: m.areacode || "", category: m.category || "priv" }));
    const mobile = phone ? [{ phone, areacode: "", category: "priv", is_default: 1 }, ...others] : others;
    let res;
    if (this._contact) {
      const c = this._contact;
      res = await this.postService(SERVICE.contact.update, {
        hub_id: Visitor.id,
        contact_id: c.contact_id,
        firstname: c.firstname || p.firstname || "",
        lastname: c.lastname || p.lastname || "",
        surname: c.surname || "",
        email: c.email || [],
        mobile,
        address: c.address || [],
      }).catch(() => null);
    } else {
      res = await this.postService(SERVICE.contact.add, {
        hub_id: Visitor.id, invitee_id: this._uid, mobile,
      }).catch(() => null);
    }
    if (refused(res)) {
      const code = res && res.status;
      this._note((code && LOCALE[code] && LOCALE[code] !== code && LOCALE[code])
        || LOCALE.SOMETHING_WENT_WRONG || "Something went wrong.");
      return false;
    }
    this._phone = phone;
    RADIO_BROADCAST.trigger("contact:changed", { uid: this._uid });
    return true;
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd.get && cmd.get(_a.service));
    switch (service) {
      case _e.close:
      case "member-card-cancel":
        return this._close();
      case "member-card-send":
        return this._send();
      case "member-card-chat":
        return this._chat();
      case "member-card-call":
        return this._call();
      case "member-card-add-contact":
        return this._addContact();
      case "member-card-update":
        return this._update();
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __member_card;
