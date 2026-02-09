
module.exports = function (ui) {

  let contactDetail;
  const contact = ui.mget(_a.contact);
  const contactFig = `${ui.fig.family}`;

  if (contact.is_mycontact === 0) {
    contactDetail = require('./invite')(ui);
  } else {
    contactDetail = require('./show')(ui);
  }

  return Skeletons.Box.Y({
    className: `${contactFig}__main`,
    debug: __filename,
    kids: [
      contactDetail
    ]
  });
};
