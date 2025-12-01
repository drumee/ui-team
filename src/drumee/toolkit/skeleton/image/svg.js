const __icon = require("../../builder/button/svg");

const __skl_icon = function(props, style) {

  const x = new __icon(props, style);
  const a = x.render({
    kind : KIND.image.svg
  });
    
  return a;
};

module.exports = __skl_icon;