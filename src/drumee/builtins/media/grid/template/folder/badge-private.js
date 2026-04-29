// Workspace badge — Private (lock icon, Phosphor regular weight).
// Replaces legacy inline SVG path blob with sprite reference for token-driven color.
export function badgePrivate(model, child_area, pos = 0) {
  const { area } = model;
  let child = '';
  if (pos) {
    child = `child child-${child_area} pos-${pos}`;
  }
  return `
    <svg class="folder-badge folder-badge--private badge ${area} ${child}" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      ${Template.Xmlns('phosphor-lock')}
    </svg>`;
}
