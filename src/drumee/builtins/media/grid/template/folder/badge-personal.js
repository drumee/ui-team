// Workspace badge — Personal (user icon, Phosphor regular weight).
// Replaces legacy inline SVG path blob with sprite reference for token-driven color.
// Glyph: phosphor-user (Figma node 264:80393 — verified as single-person silhouette).
export function badgePersonal(model) {
  const { area } = model;
  return `
    <svg class="folder-badge folder-badge--personal badge ${area}" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      ${Template.Xmlns('phosphor-user')}
    </svg>`;
}
