// Workspace badge — Personal (lock icon, Phosphor regular weight).
// Per Figma 100:47101: personal-area workspace (purple --area-personal #433CC5)
// is rendered with a closed-padlock badge, semantically signalling the user's
// own private personal space.
export function badgePersonal(model) {
  const { area } = model;
  return `
    <svg class="folder-badge folder-badge--personal badge ${area}" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      ${Template.Xmlns('phosphor-lock')}
    </svg>`;
}
