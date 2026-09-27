/**
 * Period → hero image. Webpack-only (png goes through file-loader), which is
 * why it is not in period.js: node cannot require a .png.
 * Art: Microsoft Fluent Emoji 3D, MIT — assets/daily-reminder/LICENSE.md.
 */
const url = (m) => (m && m.default) || m;

const HERO = {
  morning: url(require("assets/daily-reminder/morning.png")),
  noon: url(require("assets/daily-reminder/noon.png")),
  afternoon: url(require("assets/daily-reminder/afternoon.png")),
  evening: url(require("assets/daily-reminder/evening.png")),
};

function heroFor(period) {
  return HERO[period] || HERO.morning;
}

module.exports = { heroFor };
