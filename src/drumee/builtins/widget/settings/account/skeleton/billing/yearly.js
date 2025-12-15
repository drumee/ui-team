function item(
  ui,
  title,
  subtitle,
  description,
  buttonTitle,
  features,
  isPopular,
  plan
) {
  const fig = `${ui.fig.family}-billing__content`;

  let descriptionItem = "";

  if (description) {
    descriptionItem = Skeletons.Note({
      className: `${fig} description`,
      content: description,
    });
  }

  const header = Skeletons.Box.Y({
    className: `${fig} header`,
    kids: [
      Skeletons.Note({
        className: `${fig} title`,
        content: title,
      }),
      Skeletons.Note({
        className: `${fig} subtitle`,
        content: subtitle,
      }),
      descriptionItem,
    ],
  });

  let button = "";

  if (buttonTitle) {
    button = Skeletons.Box.X({
      className: `${fig} button primary`,
      kids: [
        Skeletons.Note({
          className: `${fig} buttonTitle primary checkout`,
          content: buttonTitle,
          service: "checkout",
          uiHandler: [ui],
          plan,
          description,
        }),
      ],
    });
  } else {
    button = Skeletons.Box.X({
      className: `${fig} button secondary`,
      kids: [
        Skeletons.Note({
          className: `${fig} buttonTitle secondary`,
          content: "Get started",
        }),
      ],
    });
  }

  const featureItems = features.map((f) => {
    return Skeletons.Box.X({
      className: `${fig} features`,
      uiHandler: [ui],

      kids: [
        Skeletons.Box.X({
          className: `${fig} features __item`,
          uiHandler: [ui],

          kids: [
            Skeletons.Button.Svg({
              ico: "raw-checked-star",
              className: `${fig} features icon`,
              uiHandler: ui,
            }),

            Skeletons.Note({
              content: f.title,
            }),
            Skeletons.Note({
              className: `${fig} features description`,
              content: f.description,
            }),
          ],
        }),
      ],
    });
  });

  const featuresWrapper = Skeletons.Box.Y({
    className: `${fig} features`,
    // service: "select-plan",
    kids: featureItems,
  });

  let popularBadge = "";

  if (isPopular) {
    popularBadge = Skeletons.Box.X({
      className: `${fig} popular-badge`,
      kids: [
        Skeletons.Note({
          content: "Most Popular",
        }),
      ],
    });
  }
  let state = 0;
  if (Visitor.profile().category == plan) state = 1;

  let content = [header, button, featuresWrapper];
  if (popularBadge) content.unshift(popularBadge)
  return Skeletons.Box.Y({
    // className: `${fig} item`,
    kidsOpt: { active: 0 },
    radio: `billing-radio-${ui._id}`,
    plan,
    state,
    description,
    // service: "select-plan",
    kids: content
  });
}

function billing_yearly(ui) {
  const fig = `${ui.fig.family}-billing__content`;

  return Skeletons.Box.G({
    className: `${fig} main`,
    debug: __filename,
    kids: [
      item(
        ui,
        "Free",
        "Free",
        "",
        "",
        [
          { title: "20G", description: "storage" },
          { title: "Up to 3", description: "editor access" },
          { title: "None", description: "admin roles" },
        ],
        false,
        "trial"
      ),
      item(
        ui,
        "Pro",
        "Start from $14.44 / month",
        "5 seats included, each additional seat $5",
        "Upgrade",
        [
          { title: "50G", description: "storage" },
          { title: "5 included", description: "editor access" },
          { title: "1", description: "admin roles" },
          { title: "1 days", description: "version history" },
          { title: "Permissions & roles", description: "" },
          { title: "Guest access", description: "" },
        ],
        true,
        "pro",
      ),
      item(
        ui,
        "Start Ups",
        "Start from $30.59 / month",
        "10 seats included, each additional seat $5",
        "Upgrade",
        [
          { title: "100G", description: "storage" },
          { title: "Up to 10", description: "editor access" },
          { title: "3", description: "admin roles" },
          { title: "30 days", description: "version history" },
          { title: "Permissions & roles", description: "" },
          { title: "Guest access", description: "" },
          { title: "Activity logs", description: "" },
        ],
        false,
        "startups"
      ),
      // item(
      //   ui,
      //   "Enterprise",
      //   "Contact sales",
      //   "Custom pricing for your team",
      //   "Contact sales",
      //   [
      //     { title: "Custom", description: "storage" },
      //     { title: "Custom", description: "editor access" },
      //     { title: "Yes", description: "admin roles" },
      //     { title: "Up to 90 days", description: "version history" },
      //     { title: "Permissions & roles", description: "" },
      //     { title: "Guest access", description: "" },
      //     { title: "Activity logs", description: "" },
      //   ],
      //   false,
      //   3
      // ),
    ],
  });
}

export default billing_yearly;
