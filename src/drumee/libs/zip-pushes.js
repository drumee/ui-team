/**
 * media.download pushes that arrive before their zipid is known.
 *
 * A folder zipped in the background is announced twice: the media.download
 * REPLY (http) hands out the zipid, which the tile or the downloader window
 * then carries, and the worker's PUSHES (websocket) report its progress and
 * its end to whatever carries that zipid (window/utils downloadContent). The
 * worker starts as the reply is written and zips a folder of a few dozen MB
 * in under a second, so the two race. On HTTP/2 the reply shares the page's
 * one connection with any zip still streaming down, while the push has a
 * socket of its own: when the push won, nothing carried the zipid yet, the
 * end was dropped, and the download never started — the zip sat built on the
 * server and the tile stayed on "In preparation" (prod, 2026-10-23: some
 * folders of a workspace downloaded, others never did).
 *
 * So the last push of every zipid is kept for KEEP_MS, and whoever takes on a
 * zipid replays what it missed (take).
 */
const KEEP_MS = 2 * 60 * 1000;
const MAX_KEPT = 50;
const pushes = new Map();

// The worker's last word: the archive is built (exit) or failed (error).
const isFinal = (data) => !!data && ["exit", "error"].includes(data.phase);

/**
 * Keep a media.download push. A final one is never replaced by a later
 * progress push, which can still trail the worker's exit.
 * @param {Object} data the push's model ({ zipid, phase, ... })
 */
function remember(data) {
  if (!data || !data.zipid) return;
  const now = Date.now();
  for (const [zipid, kept] of pushes) {
    if (now - kept.at > KEEP_MS) pushes.delete(zipid);
  }
  const kept = pushes.get(data.zipid);
  if (kept && isFinal(kept.data) && !isFinal(data)) return;
  pushes.delete(data.zipid);
  pushes.set(data.zipid, { data, at: now });
  if (pushes.size > MAX_KEPT) pushes.delete(pushes.keys().next().value);
}

/**
 * The push a zipid's new carrier missed, if any — once.
 * @param {String} zipid
 * @returns {Object|null}
 */
function take(zipid) {
  const kept = zipid ? pushes.get(zipid) : null;
  if (!kept) return null;
  pushes.delete(zipid);
  return Date.now() - kept.at > KEEP_MS ? null : kept.data;
}

module.exports = { remember, take, KEEP_MS };
