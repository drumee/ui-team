/**
 * Readable message for a refusal from the offer rules (yp mkt_offer_check,
 * e.g. TEAM1). Shared by the checkout (preview / Proceed) and the result
 * modal, which is where a card already used for the offer is reported — the
 * card is only known once Stripe has collected it.
 *
 * @param {string} status  server status
 * @returns {string|null} the message, or null when status is not an offer rule
 */
function offerStatusMessage(status) {
  switch (status) {
    case "COUPON_PERIOD_MISMATCH":
      return LOCALE.PROMO_CODE_MONTHLY_ONLY
        || "This promo code applies to monthly billing only.";
    case "OFFER_NOT_NEW_WORKSPACE":
      return LOCALE.PROMO_CODE_NEW_ONLY
        || "This offer is for new workspaces that have never had a paid plan.";
    case "OFFER_NOT_COMBINABLE":
      return LOCALE.PROMO_CODE_NOT_COMBINABLE
        || "This offer cannot be combined with Reward Hub or another promotion.";
    case "OFFER_DOMAIN_USED":
      return LOCALE.PROMO_CODE_DOMAIN_USED
        || "This offer has already been used by someone at your company.";
    case "OFFER_EMAIL_DISPOSABLE":
      return LOCALE.PROMO_CODE_EMAIL_DISPOSABLE
        || "This offer is not available for disposable email addresses.";
    case "OFFER_CARD_USED":
      return LOCALE.PROMO_CODE_CARD_USED
        || "This card has already been used for this offer. You can still subscribe at the regular price.";
    case "OFFER_CARD_REQUIRED":
    case "OFFER_PAYMENT_FAILED":
      return LOCALE.PAYMENT_FAILURE_TEXT || "Your payment could not be processed.";
    default:
      return null;
  }
}

module.exports = { offerStatusMessage };
