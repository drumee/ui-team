// Hover tip on a hyperlink inside an editable mention editor: the link's URL
// plus an Edit button that opens the Ctrl+K prompt on that link. Mixed into
// __tasks_panel's prototype at the bottom of index.js, so `this` is the panel.
//
// Raw DOM, not the framework's `tooltips` option: links are plain <a> nodes
// built by _makeLinkNode, and the tip has to take the pointer (the Edit
// button), where the framework tip is pointer-events: none.
//
// The tip is a sibling of the editor inside its field (position: relative),
// like the mention dropdown and the link prompt — the editor scrolls
// (overflow-y: auto), so a child of the link would be clipped, and
// position: fixed is relative to the transformed window, not the viewport.
//
// State: `_linkTip` — `{ el, anchor, scope, editorEl }` or null. One tip per
// panel; hovering another link moves it.

const SHOW_MS = 250;
// Pointer travel from the link to the tip crosses an 8px gap.
const HIDE_MS = 200;

module.exports = {
  // Idempotent: _initDescEditor runs on every reopen.
  _wireLinkTip(editorEl, scope) {
    if (editorEl.__linkTipWired) return;
    editorEl.__linkTipWired = 1;
    editorEl.addEventListener("mouseover", (e) => {
      const a = this._closestLink(e.target, editorEl);
      if (!a) return;
      this._clearLinkTipTimers();
      const cur = this._linkTip;
      if (cur && cur.anchor === a) return;
      this._linkTipShowTimer = setTimeout(
        () => this._showLinkTip(a, scope, editorEl),
        cur ? 0 : SHOW_MS,
      );
    });
    editorEl.addEventListener("mouseout", (e) => {
      const a = this._closestLink(e.target, editorEl);
      if (!a || a.contains(e.relatedTarget)) return;
      this._scheduleHideLinkTip();
    });
    // The tip is placed against the link's rect at show time.
    editorEl.addEventListener("scroll", () => this._hideLinkTip(), { passive: true });
    editorEl.addEventListener("keydown", () => this._hideLinkTip());
  },

  _showLinkTip(anchor, scope, editorEl) {
    const field = editorEl.parentNode;
    if (!field || !anchor.isConnected) return;
    const pfx = this.fig.family;
    let tip = field.querySelector(`:scope > .${pfx}__link-tip`);
    if (!tip) {
      tip = document.createElement("div");
      tip.className = `${pfx}__link-tip`;
      const url = document.createElement("span");
      url.className = `${pfx}__link-tip-url`;
      const btn = document.createElement("span");
      btn.className = `${pfx}__link-tip-edit`;
      btn.textContent = LOCALE.EDIT || "Edit";
      tip.append(url, btn);
      tip.addEventListener("mouseenter", () => this._clearLinkTipTimers());
      tip.addEventListener("mouseleave", () => this._scheduleHideLinkTip());
      // Keep the caret where it is: the prompt reads the link, not the caret.
      btn.onmousedown = (ev) => ev.preventDefault();
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const ref = this._linkTip;
        this._hideLinkTip();
        if (ref && ref.anchor.isConnected) {
          this._openLinkPrompt(ref.scope, ref.anchor);
        }
      };
      field.appendChild(tip);
    }
    const href = anchor.dataset.href || anchor.getAttribute("href") || "";
    tip.firstChild.textContent = href;
    tip.firstChild.title = href; // the full URL when the tip truncates it
    this._linkTip = { el: tip, anchor, scope, editorEl };
    this._placeLinkTip(tip, anchor, field);
    tip.dataset.open = "1";
  },

  // Centred above the link (the comment-action tip's placement), flipped below
  // when the viewport has no room above. Clamped to the field's width.
  _placeLinkTip(tip, anchor, field) {
    // A link that wraps has several boxes; aim at the one the line starts on.
    const r = anchor.getClientRects()[0] || anchor.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    tip.dataset.open = "1"; // measurable
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const centre = r.left + r.width / 2 - f.left;
    const left = Math.max(0, Math.min(centre - w / 2, f.width - w));
    tip.style.left = `${Math.round(left)}px`;
    // Caret stays on the link even when the body is clamped sideways.
    tip.style.setProperty("--caret-x", `${Math.round(centre - left)}px`);
    const below = r.top - h - 8 < 0;
    tip.dataset.side = below ? "below" : "above";
    if (below) {
      tip.style.bottom = "auto";
      tip.style.top = `${Math.round(r.bottom - f.top + 8)}px`;
    } else {
      tip.style.top = "auto";
      tip.style.bottom = `${Math.round(f.bottom - r.top + 8)}px`;
    }
  },

  _scheduleHideLinkTip() {
    this._clearLinkTipTimers();
    this._linkTipHideTimer = setTimeout(() => this._hideLinkTip(), HIDE_MS);
  },

  _clearLinkTipTimers() {
    clearTimeout(this._linkTipShowTimer);
    clearTimeout(this._linkTipHideTimer);
    this._linkTipShowTimer = this._linkTipHideTimer = null;
  },

  _hideLinkTip() {
    this._clearLinkTipTimers();
    const ref = this._linkTip;
    this._linkTip = null;
    if (ref && ref.el) ref.el.dataset.open = "0";
  },
};
