// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/builtins/media/template/expiry-status.coffee
//   TYPE : Skeleton
// ==================================================================== *
const __expiry_status = function(m) {
  const pfx = `${m.fig.family}-expiry-status`;

  const html = `\
<div id=\"${m._id}-expiry-status\" class=\"${pfx}__icon expiry-status svg-wrapper drumee-widget drumee drumee-svg drumee__item drumee__ui drumee-svg__ui\"> \
<svg id=\"icon-${m._id}\" class=\"full inner drumee-picto svg-inner\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-raw-clock\"></use> \
</svg> \
</div>\
`;
  return html;
};

module.exports = __expiry_status;