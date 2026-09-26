// "Updated by" toast for a peer's inline edit in the task List view — Figma
// "pop up notification" frames 762:88650 … 867:127547 in the Task List Inline
// Edit section (741:92816).
//
// Figma draws the SAME card the chat toast uses (`call-pop-up`: 512 wide,
// padding 24, gap 24, radius 12; 40px avatar with the ChatsCircle badge; name
// SemiBold 16 / line Regular 14 / "Just now" 12 Grey/80; ✕; Mute + Open), so
// this reuses that card's markup and its `panel-activity-toast` skin rather
// than drawing a second copy. Its own host fields (`_taskToast*`) keep it
// independent of the chat toast's replace/timer discipline.
//
// Rules:
//   · a newer edit REPLACES the card and restarts the timer — never stacks;
//   · Mute silences these task pop-ups for this workspace for the rest of the
//     session (a per-viewer convenience — nothing server-side, nothing a
//     reload cannot undo);
//   · Open opens the edited task's detail card.

require("../../panel/activity/skin");

const TASK_TOAST_MS = 10000;
const MUTE_KEY = "drumee.tasks.toast.muted";

const muted = new Set();
try {
  const raw = sessionStorage.getItem(MUTE_KEY);
  if (raw) JSON.parse(raw).forEach((h) => muted.add(String(h)));
} catch (e) {}

function isToastMuted(hubId) {
  return muted.has(String(hubId || ""));
}

function muteToasts(hubId) {
  muted.add(String(hubId || ""));
  try {
    sessionStorage.setItem(MUTE_KEY, JSON.stringify(Array.from(muted)));
  } catch (e) {}
}

const esc = (v = "") => _.escape(String(v));

function killTaskToast(host) {
  if (!host) return;
  try {
    if (host._taskToastTimer) clearTimeout(host._taskToastTimer);
    host._taskToastTimer = null;
    const t = host._taskToast;
    host._taskToast = null;
    if (t && (!t.isDestroyed || !t.isDestroyed())) {
      const node = t.el;
      // goodbye() is a no-op on the windows layer — see chat-toast.js.
      if (t.destroy) t.destroy();
      if (node && node.isConnected && node.remove) node.remove();
    }
  } catch (e) {}
}

function buildCard({ sender = {}, name, message }, replacing) {
  const pfx = "panel-activity-toast";
  const uid = sender.uid || sender.id;
  const who = name || sender.firstname || LOCALE.SOMEONE || "";
  return Skeletons.Box.Y({
    className: `${pfx} tasks-panel-toast`,
    attrOpt: { "data-replace": replacing ? "1" : "0" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__head`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__avatar-wrap`,
            kids: [
              Skeletons.Avatar(
                (Visitor.avatar && uid && Visitor.avatar(uid)) || "default",
                `${pfx}__avatar`,
                who,
              ),
              Skeletons.Box.X({
                className: `${pfx}__badge`,
                kids: [Skeletons.Image.Svg({ ico: "noti-chats-circle" })],
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__body`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__title-row`,
                kids: [Skeletons.Note({ className: `${pfx}__sender`, content: esc(who) })],
              }),
              // Task titles are user input and Note renders content as markup.
              Skeletons.Note({ className: `${pfx}__message`, content: esc(message) }),
              Skeletons.Note({ className: `${pfx}__time`, content: LOCALE.JUST_NOW }),
            ],
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: _a.cross,
            tooltips: LOCALE.CLOSE,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__actions`,
        kids: [
          // Notes, not Buttons — an active descendant would eat the click
          // before the capture delegate below (same as the chat toast).
          Skeletons.Note({ className: `${pfx}__mute`, content: LOCALE.MUTE }),
          Skeletons.Note({ className: `${pfx}__open`, content: LOCALE.OPEN }),
        ],
      }),
    ],
  });
}

/**
 * Show (or replace) the toast.
 * @param {Object} host  the tasks panel
 * @param {Object} data  { sender, name, message, taskId }
 */
function showTaskToast(host, data) {
  const layer = typeof Wm !== "undefined" && Wm && Wm.windowsLayer;
  if (!host || !data || !layer || !layer.append) return null;
  const replacing = !!host._taskToast;
  killTaskToast(host);
  const toast = layer.append(buildCard(data, replacing));
  host._taskToast = toast;
  host._taskToastTimer = setTimeout(() => killTaskToast(host), TASK_TOAST_MS);
  if (!toast || !toast.el) return toast;
  // Capture phase: ui-core's own el.onclick stops propagation first.
  toast.el.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const pfx = ".panel-activity-toast";
      if (t.closest(`${pfx}__open`)) {
        e.stopPropagation();
        killTaskToast(host);
        if (!(host.isDestroyed && host.isDestroyed()) && host.getTask(data.taskId)) {
          host._openDetail(data.taskId);
        }
        return;
      }
      if (t.closest(`${pfx}__mute`)) {
        e.stopPropagation();
        muteToasts(host._hubId);
        killTaskToast(host);
        return;
      }
      if (t.closest(`${pfx}__close`)) {
        e.stopPropagation();
        killTaskToast(host);
      }
    },
    true,
  );
  return toast;
}

module.exports = { showTaskToast, killTaskToast, isToastMuted, muteToasts, TASK_TOAST_MS };
