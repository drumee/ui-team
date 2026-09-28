/**
 * Time-of-day logic for the daily reminder card. PURE: no LOCALE, no _, no
 * DOM, so it runs under `node --test`. Everything is read off the viewer's
 * LOCAL clock, for the same reason dayKey() is: "morning" is whatever the
 * person in front of the screen calls morning.
 *
 * Midnight to 04:59 is EVENING, not morning. Someone opening the desk at 2am
 * is still in their night; a rising sun would be wrong.
 */
const PERIODS = ["morning", "noon", "afternoon", "evening"];

function validDate(d) {
  return d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
}

function periodOf(date) {
  const h = validDate(date).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 14) return "noon";
  if (h >= 14 && h < 18) return "afternoon";
  return "evening";
}

function weekdayName(date, lang) {
  const d = validDate(date);
  try {
    return new Intl.DateTimeFormat(lang, { weekday: "long" }).format(d);
  } catch (e) {
    return new Intl.DateTimeFormat("en", { weekday: "long" }).format(d);
  }
}

// Friday from 14:00 gets the mockup's "wrap up the week" line.
function sublineKey(period, date) {
  const friday = validDate(date).getDay() === 5;
  if (friday && (period === "afternoon" || period === "evening")) {
    return "DAILY_REMINDER_SUB_WEEK_END";
  }
  return `DAILY_REMINDER_SUB_${String(period).toUpperCase()}`;
}

// CLDR plural category, upper-cased to match the locale key suffixes
// (_ONE, _FEW, _MANY, _OTHER). "1 unread messages" cannot be fixed with
// n === 1: French puts 0 in ONE, Russian has three forms, Chinese none.
function pluralCategory(n, lang) {
  let cat = n === 1 ? "one" : "other";
  try {
    cat = new Intl.PluralRules(lang).select(n);
  } catch (e) {
    /* keep the English-shaped default */
  }
  return cat.toUpperCase();
}

// Counts arrive over the wire and are rendered as markup; coercing means a
// malformed response can only ever render a number.
function coerceCount(v) {
  return Math.max(0, Math.floor(Number(v) || 0));
}

module.exports = { PERIODS, periodOf, weekdayName, sublineKey, pluralCategory, coerceCount };
