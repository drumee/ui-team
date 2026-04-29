// Workspace badge — Private (globe icon, Phosphor regular weight).
// Per Figma 100:47101: private-area workspace (red --area-private #eb6159)
// is rendered with a globe-simple badge — represents a restricted-but-globally-
// addressable workspace. NOT a lock (lock belongs to personal-area badge).
export function badgePrivate(model, child_area, pos = 0) {
  const { area } = model;
  let child = '';
  if (pos) {
    child = `child child-${child_area} pos-${pos}`;
  }
  return `
    <svg class="folder-badge folder-badge--private badge ${area} ${child}" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      ${Template.Xmlns('phosphor-globe-simple')}
    </svg>`;
}
