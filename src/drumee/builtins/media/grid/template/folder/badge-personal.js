// Workspace badge — Personal (user icon, Phosphor regular weight).
// Replaces legacy inline SVG path blob with sprite reference for token-driven color.
// Glyph: phosphor-user (Figma node 264:80393 — verified as single-person silhouette).
export function badgePersonal(model) {
  const { area } = model;
  return `
    <svg class="folder-badge folder-badge--personal badge ${area}">
      ${Template.Xmlns('phosphor-user')}
    </svg>`;
}
