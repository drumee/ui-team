// Shared in-call reactions behavior, mixed into the team meeting and the 1:1
// connect windows (Object.assign onto each class prototype). Sending a reaction
// floats it on the bottom-left stack and broadcasts a REACTION to peers; the
// full emoji picker reuses assets/emojis. Requires (on the host instance):
// this.el, this.fig.family, this.__wrapperReactions (Wrapper name "reactions"),
// this.room, this.endpoints, and a `${family}__reaction-stack` element.
//
// The dispatch hooks stay per-window (onUiEvent "react"/"reactions-more",
// onWsMessage "REACTION", onBeforeDestroy → _closeReactionsPicker) — they only
// route to the methods below.
module.exports = {
  // Send a reaction: float it on our own tile immediately and broadcast it to
  // every peer (mirrors the HAND_RAISE broadcast). No-op on an empty glyph.
  // The sender's name rides along so peers can label the float (Figma
  // "reaction-sent": emoji above a pill with the sender's name).
  _sendReaction(emoji) {
    if (!emoji) return;
    const name = (Visitor.fullname && Visitor.fullname()) || "";
    this._floatReaction(this._reactionStackEl(), emoji, name);
    try {
      this.sendRoomSignaling(SERVICE.conference.broadcast, {
        event: "REACTION",
        payload: {
          room_id: this.mget(_a.room_id),
          participant_id: this.room && this.room.myUserId && this.room.myUserId(),
          uid: Visitor.id,
          username: name,
          emoji,
        },
      });
    } catch (e) {
      if (this.warn) this.warn("reaction broadcast failed", e);
    }
  },

  // The bottom-left overlay layer where every reaction floats up.
  _reactionStackEl() {
    return this.el && this.el.querySelector(`.${this.fig.family}__reaction-stack`);
  },

  // A peer's reaction arrived — float it on the shared stack. Guard against our
  // own echo (already floated locally in _sendReaction) and drop reactions from
  // participants who have already left (spec edge case).
  _applyRemoteReaction(data) {
    if (!data || !data.emoji) return;
    const myId = this.room && this.room.myUserId && this.room.myUserId();
    if (data.participant_id === myId || data.uid === Visitor.id) return;
    const pid = data.participant_id;
    const endpoint = pid && this.endpoints ? this.endpoints[pid] : null;
    if (!endpoint || endpoint.isDestroyed()) return;
    this._floatReaction(this._reactionStackEl(), data.emoji, data.username);
  },

  // Spawn a transient reaction that rises and fades on the bottom-left stack
  // (Figma "reaction-sent": emoji on top, a rounded name pill below). Each
  // call is independent — rapid/repeat reactions stack without a limit and a
  // small horizontal drift (via margin, so the keyframe's centering transform
  // is untouched) keeps them from perfectly overlapping. The CSS animation
  // drives it; we just clean up when it ends.
  _floatReaction(container, emoji, name) {
    if (!container || !emoji) return;
    const fam = this.fig.family;

    const wrap = document.createElement("div");
    wrap.className = `${fam}__reaction-float`;
    // ± up to 24px so simultaneous floats fan out instead of overlapping.
    const drift = Math.round((Math.random() - 0.5) * 48);
    wrap.style.marginLeft = `${drift}px`;

    const glyph = document.createElement("span");
    glyph.className = `${fam}__reaction-float-emoji`;
    glyph.textContent = emoji;
    wrap.appendChild(glyph);

    if (name) {
      const pill = document.createElement("span");
      pill.className = `${fam}__reaction-float-name`;
      pill.textContent = name;
      wrap.appendChild(pill);
    }

    container.appendChild(wrap);
    const done = () => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); };
    wrap.addEventListener("animationend", done);
    // Fallback removal in case animationend never fires (layer torn down, etc.);
    // must exceed the CSS rise duration (4s).
    setTimeout(done, 5000);
  },

  // Toggle the full emoji picker for the reactions "…" button, reusing the
  // shared assets/emojis picker. Fed into the __wrapperReactions wrapper.
  _toggleReactionsPicker() {
    const w = this.__wrapperReactions;
    if (!w) return;
    if (w.isEmpty()) {
      w.feed(require("assets/emojis")(this));
      this._positionReactionsPicker();
      this._bindReactionsPickerDismiss();
    } else {
      this._closeReactionsPicker();
    }
  },

  // Anchor the picker directly below the open reactions bar. The bar is the
  // menu.topic items (a separate DOM subtree from the picker's __main-anchored
  // wrapper), so we measure it and set the picker's top/left relative to
  // __main (its positioned ancestor). Falls back to the CSS default if either
  // element is missing.
  _positionReactionsPicker() {
    const w = this.__wrapperReactions;
    const fam = this.fig.family;
    const bar = this.el && this.el.querySelector(`.${fam}__reactions-bar`);
    const main = this.el && this.el.querySelector(`.${fam}__main`);
    if (!w || !w.el || !bar || !main) return;
    const b = bar.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    w.el.style.top = `${Math.round(b.bottom - m.top + 8)}px`;
    w.el.style.left = `${Math.round(b.left - m.left)}px`;
  },

  // Document-capture click handler while the picker is open. It (a) picks a
  // glyph and (b) dismisses on a true outside click. Capture phase matters:
  // for a glyph we send the reaction and stopImmediatePropagation, so the click
  // never reaches the emoji row's view handler — that handler fires RADIO_CLICK
  // which the reactions bar treats as an outside click and closes on. Swallowing
  // it keeps BOTH the bar and the picker open. Bound on the next tick so the "…"
  // click that opened the picker doesn't immediately dismiss it.
  _bindReactionsPickerDismiss() {
    if (this._reactionsPickerDismiss) return;
    this._reactionsPickerDismiss = (e) => {
      const w = this.__wrapperReactions;
      if (!w || w.isEmpty() || !w.el) {
        this._closeReactionsPicker();
        return;
      }
      const t = e.target;
      // Any click inside the picker keeps it (and the bar) open.
      if (w.el.contains(t)) {
        const span = t.closest && t.closest('[data-service="emoji"]');
        if (span) {
          e.stopImmediatePropagation();
          e.preventDefault();
          this._sendReaction(span.textContent && span.textContent.trim());
        }
        return;
      }
      // Clicks in the reactions menu (bar + smiley) are the menu's business.
      const menu =
        this.el && this.el.querySelector(`.${this.fig.family}__reactions-menu`);
      if (menu && menu.contains(t)) return;
      // Anything else is a true outside click — dismiss the picker.
      this._closeReactionsPicker();
    };
    setTimeout(() => {
      if (this._reactionsPickerDismiss) {
        document.addEventListener("click", this._reactionsPickerDismiss, true);
      }
    }, 0);
  },

  _closeReactionsPicker() {
    if (this._reactionsPickerDismiss) {
      document.removeEventListener("click", this._reactionsPickerDismiss, true);
      this._reactionsPickerDismiss = null;
    }
    if (this.__wrapperReactions && !this.__wrapperReactions.isEmpty()) {
      this.__wrapperReactions.clear();
    }
  },
};
