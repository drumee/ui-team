// Country calling code of a contact phone. The edit form shows a fixed "+"
// in front of the field, so people type digits only ("84") and the row is
// stored as "+84". Stored values may come in either shape ("+84", "84",
// "+ 84"), so everything goes through these two helpers.

// Longest real code is 4 digits once written without separators (+1 684).
const MAX_DIGITS = 4;

// What the input shows: the digits only, e.g. "+84" → "84".
function areacodeDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, MAX_DIGITS);
}

// What is saved and displayed: "+84", or "" when there are no digits.
function formatAreacode(value) {
  const digits = areacodeDigits(value);
  return digits ? `+${digits}` : "";
}

module.exports = { areacodeDigits, formatAreacode };
