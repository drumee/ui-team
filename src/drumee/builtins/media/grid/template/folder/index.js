const { badgePersonal } = require("./badge-personal")
const { badgePrivate } = require("./badge-private")
const { badgeShare } = require("./badge-share")
const { badgePublic } = require("./badge-public")

// Figma-spec workspace/folder kebab (264:80393 / 264:81896): three small
// white circles, 11×9 viewBox, sitting at the bottom-right of the folder
// shape. Distinct from the file kebab which uses the bold-dot-vertical
// sprite — folder kebab needs to be hard-coded white-on-purple to read on
// the colored folder body.
const folderTrigger = `
  <div class="media-context-menu__folder-trigger" data-service="context-menu">
    <svg class="media-context-menu__folder-trigger-icon" width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5.47501" cy="1.095" r="1.095" fill="white"/>
      <circle cx="5.47501" cy="4.37997" r="1.095" fill="white"/>
      <circle cx="5.47501" cy="7.66501" r="1.095" fill="white"/>
    </svg>
  </div>`;

module.exports = function (model) {
  let { area, widgetId = _.uniqueId(), filetype, role } = model;
  if (role != 'desk' && filetype != _a.hub && !area) {
    area = 'inner-folder'
  }
  const showKebab = !model.isAttachment
    && !Visitor.inDmz
    && (model.status !== _a.deleted)
    && !(model.isalink && filetype !== _a.hub);
  const kebab = showKebab ? folderTrigger : '';
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
  if ((area === 'inner-folder' || model.isAttachment) && filetype != _a.hub) {
    return `<div class="media-grid__folder-art">${main}${kebab}</div>`;
  }
  if (filetype != _a.hub) {
    return `<div class="media-grid__folder-art">${main}${kebab}</div>`;
  }
  let badge = '';
  switch (area) {
    case _a.personal:
      badge = badgePersonal({ ...model, area });
      break;
    case _a.private:
      badge = badgePrivate({ ...model, area });
      break;
    case _a.share:
    case _a.dmz:
      badge = badgeShare({ ...model, area });
      break;
    case _a.public:
      badge = badgePublic({ ...model, area });
      break;
  }
  return `<div class="media-grid__folder-art">${main}${badge}${kebab}</div>`;
};
