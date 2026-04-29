// Workspace badge — Public (users icon, Phosphor regular weight).
// Figma node 100:47101 shows a cluster-of-profiles concept → phosphor-users (group silhouette).
// Deviation documented: Figma node was ambiguous (3 overlapping animal/paw shapes);
// phosphor-users is the semantic match for "publicly accessible workspace".
// Fallback alternative: phosphor-folder-open (kept in sprite for future switch).
export function badgePublic(model, child_area, pos = 0) {
  const { area } = model;
  let child = '';
  if (pos) {
    child = `child child-${child_area} pos-${pos}`;
  }
  return `
    <svg class="folder-badge folder-badge--public badge ${area} ${child}">
      ${Template.Xmlns('phosphor-users')}
    </svg>`;
}
