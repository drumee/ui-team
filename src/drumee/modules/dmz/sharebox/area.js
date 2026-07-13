// A DMZ share link always presents with the "shared" (pink) chrome — whether the
// underlying hub area is `share`, legacy `dmz`, or `public` (a public/open link).
// Only a true restricted workspace (workspace_restricted, private, …) gets the red
// "restricted" look. A missing area (e.g. file-only shares) also defaults to shared.
//
// This is display-only: it drives the folder-art / header-icon / badge accent
// (see ./skin/index.scss `[data-area="restricted"]`) and the badge label. It never
// touches the session, grant, or login flow.
//
// PROD vs test discrepancy this fixes: preview/prod (prod DB) return `area='public'`
// for open share links while stage returns `share`/`dmz`; without `public` in the
// shared set the same link rendered red + "PUBLIC" on prod but pink + "SHARED" on test.
const SHARED_AREAS = ['share', 'dmz', 'public'];

/**
 * @param {string} [area] the hub area returned by dmz.login
 * @returns {boolean} true when the share should use the pink "shared" chrome
 */
function isSharedArea(area) {
  return !area || SHARED_AREAS.includes(area);
}

module.exports = { isSharedArea };
