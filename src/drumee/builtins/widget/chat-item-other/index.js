const ChatItem = require("../chat-item");
require("./skin");

// Marker class added to every chat-item-other row. The variant reuses the base
// .widget-chatItem skin (figName is pinned below), so this marker is the scope
// hook the override skin uses to restyle ONLY the "other-only" rows without
// touching the base chat-item rendered elsewhere.
const OTHER_MARKER = "widget-chatItem--other";

/**
 * DMZ share chat variant of the chat item.
 *
 * The standard chat-item splits messages into "me" (right-aligned) and "other"
 * (left) based on `author_id === Visitor.id`. In the DMZ sharebox conversation
 * we want a single uniform column: EVERY message — including the viewer's own —
 * renders in the "other" position, as if the whole thread came from someone
 * else. This drops the right-aligned self bubbles and keeps the share chat
 * reading as one flat list.
 *
 * Everything else (templates, attachments, hover actions, read receipts) is
 * inherited unchanged; only the side decision is overridden.
 */
class ___widget_chatItemOther extends ChatItem {
  /**
   * `fig.family` is derived from the constructor name (see ui-core letc addon),
   * which drives every CSS class the templates and skin emit. Pin `figName` to the
   * base widget so this variant reuses the chat-item skin verbatim — without it the
   * family would resolve to "widget-chatItemOther" and render unstyled.
   */
  initialize(opt = {}) {
    this.figName = "___widget_chatItem";
    super.initialize(opt);
  }

  /**
   * Pin every message to the "other" side regardless of author.
   * @returns {String} "other"
   */
  _resolveAuthor() {
    return _a.other;
  }

  /**
   * Tag the row root with the variant marker so the override skin
   * (skin/index.scss) can scope its tweaks to "other-only" rows. Added after the
   * base render so it sits alongside the framework's family classes.
   */
  onDomRefresh() {
    super.onDomRefresh();
    this.$el.addClass(OTHER_MARKER);
  }
}
___widget_chatItemOther.initClass();

module.exports = ___widget_chatItemOther;
