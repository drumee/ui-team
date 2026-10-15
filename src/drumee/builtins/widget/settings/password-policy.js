// Password policy for the settings change-password modal.
//
// KEEP IN STEP with PW_RULES in the signup UI (signup/src/widgets/form/index.js)
// and the server (server-team/service/lib/password-policy.js), which enforces
// the same rules and answers `uncompliant_password` with the unmet keys in
// `missing`. Keys are LOCALE keys; the text is the fallback when a key is
// missing from the locale.
const SPECIALS = /[\[\]\{\}\'\"\ \-\_\+\=\|\!\:\;\,\?\.\/\*\%\$\&\#\(\)\@]/;

const PW_RULES = [
  { key: "PW_NEEDS_MIN", text: "at least 8 characters", test: (v) => v.length >= 8 },
  { key: "PW_NEEDS_UPPERCASE", text: "an uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "PW_NEEDS_NUMBER", text: "a number", test: (v) => /[0-9]/.test(v) },
  { key: "PW_NEEDS_SYMBOL", text: "a symbol", test: (v) => SPECIALS.test(v) },
];

/**
 * @param {string} password already trimmed (the server trims before hashing)
 * @returns {string[]} keys of the unmet rules, empty when compliant
 */
function missingPasswordRules(password) {
  const v = String(password == null ? "" : password);
  return PW_RULES.filter((r) => !r.test(v)).map((r) => r.key);
}

/**
 * "Your password still needs: an uppercase letter, a number", localized.
 * Unknown keys (a server rule this copy doesn't know yet) are skipped; if
 * nothing is left, fall back to the generic length message.
 * @param {string[]} keys
 * @returns {string}
 */
function passwordNeedsMessage(keys) {
  const labels = (keys || [])
    .map((k) => {
      const rule = PW_RULES.find((r) => r.key === k);
      if (!rule) return null;
      return (typeof LOCALE !== "undefined" && LOCALE[k]) || rule.text;
    })
    .filter(Boolean);
  if (!labels.length) return LOCALE.PASSWORD_TOO_SHORT;
  const tpl = LOCALE.PASSWORD_STILL_NEEDS || "Your password still needs: {0}";
  return tpl.replace("{0}", labels.join(", "));
}

module.exports = { PW_RULES, missingPasswordRules, passwordNeedsMessage };
