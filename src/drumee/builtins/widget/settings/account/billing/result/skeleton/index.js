/**
 * Skeleton for the post-Checkout result modal. Mirrors the Figma frames:
 * success = green check + "Payment Success!" + receipt rows; failure = red
 * cross + "Payment Failure!" + Retry Payment.
 */
function detailRow(fig, label, value) {
  if (!value) return null;
  return Skeletons.Box.X({
    className: `${fig}__row`,
    kids: [
      Skeletons.Note({ className: `${fig}__row-label`, content: label }),
      Skeletons.Note({ className: `${fig}__row-value`, content: value }),
    ],
  });
}

/**
 * Resume-confirmation variant (Figma 3050-96691): green check circle,
 * "Resume Subscription" heading, one-line body, full-width primary Done.
 * No receipt rows and no corner close — Done is the only way out.
 */
function resumeCard(ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__card`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__body`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__icon success`,
            kids: [
              Skeletons.Image.Svg({ ico: "available", className: `${fig}__icon-glyph` }),
            ],
          }),
          Skeletons.Note({
            className: `${fig}__title`,
            content: LOCALE.RESUME_SUBSCRIPTION || "Resume Subscription",
          }),
          Skeletons.Note({
            className: `${fig}__subtitle`,
            content: LOCALE.SUBSCRIPTION_RESUMED_TOAST || "Your subscription has been resumed.",
          }),
          Skeletons.Box.X({
            className: `${fig}__done`,
            service: "billing-result-close",
            uiHandler: [ui],
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Note({
                className: `${fig}__done-label`,
                content: LOCALE.DONE || "Done",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function billing_result(ui) {
  const fig = ui.fig.family;
  if (ui._result === "resume") return resumeCard(ui);
  const ok = ui._result === "success";
  const r = ui._receipt || {};

  const money = (minor, currency) => {
    if (minor == null) return null;
    const sym = (currency || "eur").toLowerCase() === "eur" ? "€" : "$";
    return `${sym}${(Number(minor) / 100).toFixed(2)}`;
  };
  const paidAt = r.paid_at
    ? Dayjs(Number(r.paid_at) * 1000).format("MMMM D, YYYY - HH:mm")
    : null;
  const card = r.card_last4
    ? `${(r.card_brand || "").replace(/^./, (c) => c.toUpperCase())} **** ${r.card_last4}`
    : null;
  const planName = r.plan ? r.plan.replace(/^./, (c) => c.toUpperCase()) : "";

  const total = money(r.amount_total, r.currency);
  const details = [
    detailRow(fig, LOCALE.INVOICE_NUMBER || "Invoice number", r.invoice_number),
    // Figma: success shows "Payment date", failure shows "Payment time" —
    // same field, different label per state.
    detailRow(fig, (ok ? LOCALE.PAYMENT_DATE : LOCALE.PAYMENT_TIME) || "Payment date", paidAt),
    detailRow(fig, LOCALE.PAYMENT_METHOD || "Payment method", card),
  ].filter(Boolean);

  const body = [
    Skeletons.Box.X({
      className: `${fig}__icon ${ok ? "success" : "failure"}`,
      kids: [
        Skeletons.Image.Svg({
          ico: ok ? "available" : "cross",
          className: `${fig}__icon-glyph`,
        }),
      ],
    }),
    Skeletons.Note({
      className: `${fig}__title`,
      content: ok
        ? LOCALE.PAYMENT_SUCCESS_TITLE || "Payment Success!"
        : LOCALE.PAYMENT_FAILURE_TITLE || "Payment Failure!",
    }),
    Skeletons.Note({
      className: `${fig}__subtitle`,
      content: ok
        ? (LOCALE.PAYMENT_SUCCESS_TEXT || "Upgraded successfully. You are now in {0} plan.").format(planName || LOCALE.TEAM)
        : LOCALE.PAYMENT_FAILURE_TEXT || "Your payment could not be processed.",
    }),
  ];

  if (total) {
    body.push(
      Skeletons.Box.Y({
        className: `${fig}__total`,
        kids: [
          Skeletons.Note({
            className: `${fig}__total-label`,
            content: LOCALE.TOTAL_PAYMENT || "Total Payment",
          }),
          Skeletons.Note({ className: `${fig}__total-value`, content: total }),
        ],
      }),
    );
  }
  if (details.length) {
    body.push(Skeletons.Box.Y({ className: `${fig}__details`, kids: details }));
  }
  if (!ok) {
    body.push(
      Skeletons.Box.X({
        className: `${fig}__retry`,
        service: "billing-result-retry",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            className: `${fig}__retry-label`,
            content: LOCALE.RETRY_PAYMENT || "Retry Payment",
          }),
        ],
      }),
    );
  }

  return Skeletons.Box.Y({
    className: `${fig}__card`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__close`,
        service: "billing-result-close",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ ico: "cross", className: `${fig}__close-ico` }),
        ],
      }),
      Skeletons.Box.Y({ className: `${fig}__body`, kids: body }),
    ],
  });
}

export default billing_result;
