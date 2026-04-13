
module.exports = function (model) {
  let { area, widgetId = _.uniqueId(), filetype, role } = model;
  if (role != 'desk' && filetype != _a.hub) {
    area = 'inner-folder'
  }
  let main = `
    <svg class="folder-shape ${area}" width="105" height="86" viewBox="0 0 105 86" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter-${widgetId})">
        <path d="M33.5743 1.5H15C8.37258 1.5 3 6.87258 3 13.5V69C3 75.6274 8.37258 81 15 81H90C96.6274 81 102 75.6274 102 69L102 28.2C102 21.5726 96.6274 16.2 90 16.2H58.8349C55.8072 16.2 52.8913 15.0555 50.672 12.9959L41.7372 4.70411C39.5179 2.64453 36.6021 1.5 33.5743 1.5Z"/>
      </g>
      <defs>
        <filter id="filter-${widgetId}" x="0" y="0" width="105" height="85.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="1.5"/>
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.133333 0 0 0 0 0.152941 0 0 0 0 0.196078 0 0 0 0.32 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="shadow-${widgetId}"/>
          <feBlend mode="normal" in="SourceGraphic" in2="shadow-${widgetId}" result="shape"/>
        </filter>
      </defs>
    </svg>`;
  return main;
};

