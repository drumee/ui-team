
/**
 * The plugin-loading screen: the drumee lockup over "the plugin X is loading".
 *
 * The SAME lockup the sign-in form uses (signin/src/widgets/form → its
 * toolkit header) — the exported Figma file, mark and wordmark together, not
 * the sprite's `logo` symbol. That symbol is the mark alone and carries no
 * fill attribute, so it paints SVG-default black unless something colours it.
 *
 * The file is COPIED from the signin plugin rather than shared: the two are
 * separate repos with separate builds. tests/plugins-loading-screen.test.js
 * compares the bytes so the copy cannot drift unnoticed.
 *
 * require(), so url-loader turns it into a data URI at build time
 * (webpack/module.js). That matters more here than anywhere: this screen is
 * on display precisely BECAUSE the network is busy fetching the plugin, and
 * a logo needing its own request could arrive after the screen it belongs to
 * has gone.
 *
 * Element, NOT Note: Note pipes content through DOMPurify against
 * _K.allowed_tag, which does not include `img` — the lockup would be
 * stripped and render as nothing while CSS still reserved its box. The same
 * reason the signin toolkit's header uses Element for it.
 *
 * See the test file for why the message colour needs a literal fallback:
 * --an-purple belongs to analytics-ui's stylesheet, which is not loaded
 * while this is on screen.
 */
// CJS, not `export default`: this file `require()`s an asset, which webpack
// resolves but node does not allow inside an ES module — and the loading
// screen is covered by tests that load it in node. Same shape as the desk
// and router skeletons.
const LOGO = require("assets/drumee-logo.svg");

module.exports = function (ui, name) {
  const fig = ui.fig.family;
  const logo = LOGO.default || LOGO;
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__card`,
        kids: [
          Skeletons.Element({
            className: `${fig}__logo`,
            // Intrinsic size of the exported file, as the sign-in card
            // states it; the skin scales it by height alone.
            content: `<img src="${logo}" alt="drumee" width="121" height="24">`,
          }),
          Skeletons.Note({
            className: `${fig}__message`,
            content: `The plugin ${decodeURI(name)} is being loaded. Please wait...`
          }),
        ],
      }),
    ]
  })
}
