const { badgePrivate } = require("./badge-private")
const { badgeShare } = require("./badge-share")
const { badgePublic } = require("./badge-public")

module.exports = function (ui) {
  const model = ui.model.toJSON();
  let { areas = "" } = model;
  let badges = ""
  let i = 0;
  for (let area of areas.split(',')) {
    i++;
    switch (area) {
      case _a.private:
        badges = badges + badgePrivate(model, area, i);
        break;
      case _a.share:
      case _a.dmz:
        badges = badges + badgeShare(model, area, i);
        break;
      case _a.public:
        badges = badges + badgePublic(model, area, i);
        break;
    }
  }
  return badges;
};

