/**
 * ⚠️ UI-TEST MOCK — mock folder chat topics appended to the real list so the
 * Files-tab topic carousel (3 per page) — and the Inbox's Workspace chat
 * strip — can be seen paging. Remove before
 * release: set MOCK_TOPICS to false (or delete this file and its two calls:
 * ./topics.js fetchTopics and widget/chat-p2p/workspace-topics.js refresh).
 *
 * The ids pass the server's topic_id pattern but exist nowhere: picking a
 * mock topic lists nothing and posting into one is refused (INVALID_TOPIC).
 */
const MOCK_TOPICS = true;

const MOCK = [
  ["mocktopic01", "Design review", "🎨"],
  ["mocktopic02", "Budget 2027", "💰"],
  ["mocktopic03", "Launch plan", "🚀"],
  ["mocktopic04", "Customer feedback", "💬"],
  ["mocktopic05", "Hiring", "🤝"],
  ["mocktopic06", "Q4 roadmap", "🗺️"],
  ["mocktopic07", "Bugs and fixes", "🛠️"],
].map(([id, name, emoji], i) => ({ id, name, emoji, unread: i % 3 === 0 ? i + 2 : 0, mock: 1 }));

/** `rows` plus the mock topics (none of them duplicating a real id). */
function withMockTopics(rows, on = MOCK_TOPICS) {
  if (!on) return rows;
  const real = Array.isArray(rows) ? rows : [];
  const ids = new Set(real.map((t) => `${t.id}`));
  return real.concat(MOCK.filter((t) => !ids.has(t.id)));
}

module.exports = { withMockTopics, MOCK_TOPICS };
