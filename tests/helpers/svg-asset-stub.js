// What `require("some.svg")` evaluates to under webpack: url-loader inlines
// the file as a data URI STRING (webpack/module.js).
//
// alias-stub.js cannot stand in for it. That one is a callable Proxy whose
// every property is a function, so a skeleton doing `${LOGO.default || LOGO}`
// interpolates a function's SOURCE into its markup — and that source contains
// `>` (from `=>`), which silently breaks any assertion matching an HTML tag.
// Cost an otherwise-green run to find.
module.exports = "data:image/svg+xml;base64,PHN2ZyBzdHViLz4=";
