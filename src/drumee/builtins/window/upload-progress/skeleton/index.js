/**
 * Main skeleton function for upload progress window
 * Combines header, content, and footer components
 */

module.exports = function (ui) {
  const pfx = `${ui.fig.family}`;
  
  // Import skeleton components
  const header = require('./header')(ui);
  const content = require('./content')(ui);
  const footer = require('./footer')(ui);
  
  // Main container
  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    dataset: {
      expanded: "1"
    },
    kids: [
      header,
      content,
      footer,
    ]
  });
}

