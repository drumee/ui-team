/**
 * 🚧 TEMPORARY MOCK — REVERT THIS COMMIT BEFORE MERGING feat/chat-details-panel.
 *
 * Pads the Chat details overview of the internal (private-area) workspace
 * named "test" with fake file threads and members, so the scrolling of
 * -thread-list and -members-list can be seen on stage. Real rows come first
 * and are never altered; every other workspace is untouched.
 *
 * Mock rows are display-only: a mock thread's file_nid points at no file, so
 * clicking one scopes the chat to an empty thread.
 */
const THREADS = 15;
const MEMBERS = 30;
const NAMES = [
  "Lucas Zoe", "Brenda Lucy", "Jullie", "Maddy Ernest", "Casey T", "Riley N",
  "Jamie O", "Avery M", "Noah P", "Emma S", "Liam K", "Olivia R", "Ethan W",
  "Mia L", "Lucas B",
];
const SEEN = [0, 8 * 60, 12 * 60, 2 * 3600, 26 * 3600, 3 * 86400];

function isMockWorkspace(win) {
  const name = `${win.mget(_a.hub_name) || win.mget(_a.filename) || ""}`.trim();
  return name.toLowerCase() === "test" && win.mget(_a.area) === "private";
}

function pad(win, overview) {
  if (!isMockWorkspace(win)) return overview;
  const now = Math.floor(Date.now() / 1000);
  const threads = Array.from({ length: THREADS }, (_, i) => ({
    file_nid: `mock-thread-${i + 1}`,
    filename: `Mock_file_thread_${String(i + 1).padStart(2, "0")}.docx`,
    unread: i % 4 === 1 ? (i + 1) * 3 : 0,
  }));
  const members = Array.from({ length: MEMBERS }, (_, i) => {
    const ago = SEEN[i % SEEN.length];
    return {
      id: `mock-member-${i + 1}`,
      fullname: `${NAMES[i % NAMES.length]} (mock ${i + 1})`,
      online: i < 3 ? 1 : 0,
      last_seen: i < 3 || !ago ? 0 : now - ago,
    };
  });
  return {
    ...overview,
    threads: [...(overview.threads || []), ...threads],
    members: [...(overview.members || []), ...members],
  };
}

module.exports = { isMockWorkspace, pad };
