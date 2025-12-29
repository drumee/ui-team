/**
 * Checkout layout with configuration on left and summary on right
 * @param {*} ui
 * @returns
 */
function checkout(ui) {
  const fig = `${ui.fig.family}__checkout`;
  const pfx = fig;

  // Left Panel - Configuration
  const leftPanel = Skeletons.Box.Y({
    className: `${pfx}-left`,
    kids: [
      // Current Plan section
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: "Current Plan",
          }),
          Skeletons.Box.X({
            className: `${pfx}-plan-buttons`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-plan-button`,
                content: "Free",
                state: 0, // Will be dynamic based on selected plan
                radio: `checkout-plan-${ui._id}`,
                service: "select-checkout-plan",
                value: "free",
                uiHandler: [ui],
              }),
              Skeletons.Note({
                className: `${pfx}-plan-button`,
                content: "Pro",
                state: 1, // Will be dynamic based on selected plan
                radio: `checkout-plan-${ui._id}`,
                service: "select-checkout-plan",
                value: "pro",
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),

      // Number of Seats
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: "Number of Seats",
          }),
          Skeletons.EntryBox({
            className: `${pfx}-input`,
            type: "number",
            name: "seats",
            placeholder: "0",
            value: "0",
            interactive: true,
            uiHandler: [ui],
          }),
        ],
      }),

      // Additional Storage
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: "Additional Storage (GB)",
          }),
          Skeletons.EntryBox({
            className: `${pfx}-input`,
            type: "number",
            name: "storage",
            placeholder: "0",
            value: "0",
            ico: "hard-drive",
            interactive: true,
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}-storage-info`,
            content: "$10 per 50GB • Included: 50 GB",
          }),
          Skeletons.Note({
            className: `${pfx}-storage-note`,
            content: "Billed in 50GB increments",
          }),
        ],
      }),

      // Billing Cycle
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-section-title`,
            content: "Billing Cycle",
          }),
          Skeletons.Box.X({
            className: `${pfx}-billing-buttons`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-billing-button`,
                label: "Monthly",
                state: 1, // Will be dynamic
                radio: `checkout-billing-${ui._id}`,
                service: "select-billing-cycle",
                value: "monthly",
                uiHandler: [ui],
              }),
              Skeletons.Note({
                className: `${pfx}-billing-button`,
                label: "Yearly -15%",
                state: 0, // Will be dynamic
                radio: `checkout-billing-${ui._id}`,
                service: "select-billing-cycle",
                value: "yearly",
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),

      // Storage Bundles
      Skeletons.Box.Y({
        className: `${pfx}-section`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-bundles-header`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-bundles-icon`,
                ico: "hard-drive",
              }),
              Skeletons.Note({
                className: `${pfx}-section-title`,
                content: "Storage Bundles",
              }),
            ],
          }),
          Skeletons.Note({
            className: `${pfx}-bundles-subtitle`,
            content: "Storage Add-on",
          }),
          Skeletons.Note({
            className: `${pfx}-bundles-note`,
            content: "Choose one storage upgrade. Click to select or clear.",
          }),
          Skeletons.Box.Y({
            className: `${pfx}-bundles-list`,
            /** Set same attributes to all direct children */
            kidsOpt: {
              radio: `checkout-bundle-${ui._id}`,
              service: "select-bundle",
              className: `${pfx}-bundle-item`,
              uiHandler: [ui],
              active: 0, /** Prevent children to trigger events */
            },
            kids: [
              // +100GB
              Skeletons.Box.X({
                // className: `${pfx}-bundle-item`,
                // radio: `checkout-bundle-${ui._id}`,
                // service: "select-bundle",
                value: "100",
                // uiHandler: [ui],
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}-bundle-radio xxx bundle-radio`,
                    // state: 0,
                  }),
                  Skeletons.Box.Y({
                    className: `${pfx}-bundle-content`,
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}-bundle-title`,
                        content: "+100GB",
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-price`,
                        content: "$8 /mo",
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-unit`,
                        content: "$0.080/GB",
                      }),
                    ],
                  }),
                ],
              }),
              // +200GB
              Skeletons.Box.X({
                // className: `${pfx}-bundle-item`,
                // radio: `checkout-bundle-${ui._id}`,
                // service: "select-bundle",
                value: "200",
                // uiHandler: [ui],
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}-bundle-radio bundle-radio`,
                    // state: 0,
                  }),
                  Skeletons.Box.Y({
                    className: `${pfx}-bundle-content`,
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}-bundle-title`,
                        content: "+200GB",
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-price`,
                        content: "$14 /mo",
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-unit`,
                        content: "$0.070/GB",
                      }),
                    ],
                  }),
                ],
              }),
              // +500GB
              Skeletons.Box.X({
                // className: `${pfx}-bundle-item`,
                // radio: `checkout-bundle-${ui._id}`,
                // service: "select-bundle",
                value: "500",
                // uiHandler: [ui],
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}-bundle-radio bundle-radio`,
                    // state: 0,
                  }),
                  Skeletons.Box.Y({
                    className: `${pfx}-bundle-content`,
                    kids: [
                      Skeletons.Note({
                        className: `${pfx}-bundle-title`,
                        content: "+500GB",
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-price`,
                        content: "$30 /mo",
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-unit`,
                        content: "$0.060/GB",
                      }),
                    ],
                  }),
                ],
              }),
              // +1TB
              Skeletons.Box.X({
                // className: `${pfx}-bundle-item`,
                // radio: `checkout-bundle-${ui._id}`,
                // service: "select-bundle",
                value: "1000",
                // uiHandler: [ui],
                kids: [
                  Skeletons.Box.X({
                    className: `${pfx}-bundle-radio bundle-radio`,
                    // state: 0,
                  }),
                  Skeletons.Box.Y({
                    className: `${pfx}-bundle-content`,
                    kids: [
                      Skeletons.Box.X({
                        className: `${pfx}-bundle-header`,
                        kids: [
                          Skeletons.Note({
                            className: `${pfx}-bundle-title`,
                            content: "+1TB",
                          }),
                          Skeletons.Note({
                            className: `${pfx}-bundle-badge`,
                            content: "BEST VALUE",
                          }),
                        ],
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-price`,
                        content: "$50 /mo",
                      }),
                      Skeletons.Note({
                        className: `${pfx}-bundle-unit`,
                        content: "$0.049/GB",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Right Panel - Summary
  const rightPanel = Skeletons.Box.Y({
    className: `${pfx}-right`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-total-label`,
        content: "Total outcome:",
      }),
      Skeletons.Note({
        className: `${pfx}-total-price`,
        content: "$16.99 /month",
      }),
      Skeletons.Box.Y({
        className: `${pfx}-breakdown`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Base price:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "$16.99",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Included seats:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "5",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "hard-drive",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Total Storage:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "50 GB",
              }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-breakdown-item`,
            kids: [
              Skeletons.Button.Icon({
                className: `${pfx}-breakdown-icon`,
                ico: "trending-up",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-label`,
                content: "Effective price per seat:",
              }),
              Skeletons.Note({
                className: `${pfx}-breakdown-value`,
                content: "$3.40",
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Label({
        className: `${pfx}-checkout-button`,
        label: "Proceed to Checkout",
        ico: "shopping-cart",
        service: "proceed-checkout",
        uiHandler: [ui],
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${pfx}-main`,
    debug: __filename,
    kids: [
      leftPanel,
      rightPanel,
    ],
  });
}

export default checkout;

