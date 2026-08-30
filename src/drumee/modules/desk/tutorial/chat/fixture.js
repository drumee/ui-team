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

// `own` is the viewer's own side (the salmon bubbles on the right).
const STREAM = [
  {
    from: "Emma",
    text:
      "Morning team 👋 I've uploaded the latest Drumee_Strategy_Q2.pdf to the " +
      "Strategy folder. Please take a look when you have time.",
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

module.exports = { FILE, TIME, REPLIES_SUMMARY, STREAM, THREAD, ACTIONS };
