/**
 * The conversation the chat tour shows.
 *
 * Sample DATA, not UI labels — the same treatment the calendar panel gives its
 * fixture: these strings are the example being taught, so they are literals
 * rather than locale keys. Every chrome label in the pane (This Folder, File
 * Threads, Type a message…) goes through LOCALE as usual.
 *
 * Taken verbatim from the frames (Figma 142:39178, 169:39799, 142:39530,
 * 169:40101) so the tour and the design can be compared line by line.
 */

const FILE = "Drumee_Strategy_Q2";
const TIME = "11:53 AM";
// Sample, not a label: the thread's reply count as the frames show it.
const REPLIES_SUMMARY = "10 replies \u00b7 2 hours ago";

// The folder's own thread list, as the column shows it (142:39142). THREE,
// which is the point of the screen: a folder accumulates conversations, and a
// list of one reads as a feature nobody uses. `FILE` leads it because that is
// the thread every later screen opens.
//
// `badge` is an unread count, on the one the frame marks.
const THREADS = [
  { name: FILE },
  { name: "Drumee_Reddit_Content" },
  { name: "2_Drumee_Premium_Visual02", badge: "34" },
];

// The open folder's own unread count, on the row above them.
const FOLDER_BADGE = "90";

// `own` is the viewer's own side (the salmon bubbles on the right).
const STREAM = [
  {
    from: "Emma",
    // BROKEN BY HAND, on "\n" — three lines, which is how 142:39142 sets it:
    // the filename opens the second line and the last sentence has the third
    // to itself.
    //
    // Left to wrap, where the break falls depends on the font that actually
    // loaded and on a few pixels of bubble width, and it landed one word off:
    // "folder. Please" ran together and "take a look when you have time" was
    // orphaned. This is sample data, not a translated string, so composing it
    // the way the design composes it costs nothing and cannot drift.
    text:
      "Morning team 👋 I've uploaded the latest\n" +
      "Drumee_Strategy_Q2.pdf to the Strategy folder.\n" +
      "Please take a look when you have time.",
    link: "Drumee_Strategy_Q2.pdf",
  },
  {
    from: "Sarah K.",
    text: "Thanks! I'll review the branding and positioning sections this afternoon.",
  },
  {
    own: true,
    text:
      "Just skimmed through it. The AI Workspace vision looks promising, but I " +
      "think we should add a few practical use cases.",
  },
  {
    from: "Sarah K.",
    text: "Agreed. Feel free to leave comments directly in the file.",
  },
  {
    from: "Emma",
    text:
      "I noticed some screenshots in the onboarding section are outdated. " +
      "They're showing the old workspace creation flow.",
  },
  {
    from: "Sarah K.",
    text: "Good catch. Can you update them or share the latest assets?",
  },
  {
    own: true,
    // The message the whole tour turns on: it carries the file, and screen 2
    // opens its thread.
    id: "file-message",
    text: "file chat thread start here everyone please reply this message",
    attachment: { name: `/${FILE}`, meta: "1.2 MB - Show in folder" },
  },
];

// The thread that hangs off that message, shown in the side panel.
const THREAD = [
  {
    own: true,
    text: `/${FILE} file chat thread start here everyone please reply this message`,
    attachment: { name: `/${FILE}`, meta: "1.2 MB - Show in folder" },
  },
  {
    from: "Emma",
    text:
      "I also noticed the onboarding flow described on page 12 doesn't match " +
      "the latest product design. We updated the workspace creation process " +
      "last month.",
  },
  {
    from: "Sarah K.",
    text: "Sure. I've added comments on pages 12–14.",
  },
];

// The hover toolbar on a message.
//
// Every glyph here is one the LIVE toolbar uses
// (builtins/widget/chat-item/skeleton/menu.js), in its order — a tour that
// draws a bar the user will never meet is worse than one that draws none.
// `mark: 'thread'` is the reply-in-thread control, which is what the design
// renders as a `#` and what screen 2 points at; it leads the bar so the
// cursor and the brand tint have one thing to hang off.
const ACTIONS = [
  { ico: "ctxmenu-chat-thread", mark: "thread" },
  { ico: "chat-action-reply" },
  { ico: "chat-action-copy" },
  { ico: "chat-action-forward" },
  { ico: "chat-action-trash" },
  { ico: "chat-action-check" },
  { ico: "chat-action-smiley" },
];

module.exports = { FILE, TIME, REPLIES_SUMMARY, STREAM, THREAD, THREADS, FOLDER_BADGE, ACTIONS };
