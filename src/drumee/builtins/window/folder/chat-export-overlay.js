/**
 * The folder window's "Export chat" overlay (widget_chat_export), opened by
 * the Download tile / menu rows.
 *
 * It lives in a SLOT the window skeleton builds with the window (./skeleton),
 * fed on open and emptied on close. It must never be appended to (or removed
 * from) the window itself: that is a collection update on the window, which
 * Marionette 4 answers with sort() → _renderChildren() over every child (the
 * default sortWithCollection comparator drops the add-at-end shortcut). __main
 * got detached and re-attached, dom:refresh ran down the tree, and the file
 * grid, the chat and the thread rail reloaded on every Download — and again on
 * close, when goodbye() took the wrapper back out.
 *
 * Plain functions of the window (`win`), tested with a fake
 * (tests/folder-chat-export-overlay.test.js).
 */

// Skeleton: the always-present, empty-until-open viewport backdrop. `name`
// makes it the "wrapper-chat-export" part. Hidden unless data-state="open"
// (widget/chat-export/skin), so an empty one never covers the viewport.
function slot(ui) {
  return Skeletons.Wrapper.Y({
    className: "widget-chat-export__viewport-backdrop",
    name: "chat-export",
    partHandler: ui,
  });
}

function alive(part) {
  return !!(part && !(part.isDestroyed && part.isDestroyed()));
}

/**
 * Feed `descriptor` (a widget_chat_export) into the slot.
 * @returns what Kind.waitFor returns once the dialog's lazy chunk is in
 */
function mount(win, descriptor, deps = {}) {
  const Kind_ = deps.Kind !== undefined ? deps.Kind : typeof Kind !== "undefined" ? Kind : null;
  return win.ensurePart("wrapper-chat-export").then((wrapper) => {
    if (!alive(wrapper)) return undefined;
    win._chatExportWrapper = wrapper;
    win._wireChatExportBackdrop(wrapper);
    wrapper.feed(descriptor);
    if (Kind_ && typeof Kind_.waitFor === "function") return Kind_.waitFor("widget_chat_export");
    return undefined;
  });
}

// Close: empty the slot (the wrapper goes back to data-state="closed").
function unmount(win) {
  const wrapper = win._chatExportWrapper;
  if (alive(wrapper) && typeof wrapper.clear === "function") wrapper.clear();
  win._chatExportWrapper = null;
}

module.exports = { slot, mount, unmount };
