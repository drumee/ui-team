function item(ui, title, subtitle, description, buttonTitle, features) {
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
          className: `${fig} buttonTitle primary`,
          content: buttonTitle,
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
      className: `${fig} features item`,
      uiHandler: [ui],

      kids: [
        Skeletons.Note({
          content: f,
        }),
      ],
    })
  });

  const featuresWrapper = Skeletons.Box.Y({
    className: `${fig} features`,
    kids: featureItems,
  });

  return Skeletons.Box.Y({
    className: `${fig} item`,
    // kidsOpt: { active: 0 },
    // radio: `color-radio-${ui._id}`,
    kids: [header, button, featuresWrapper],
  });
}

function billing_content(ui) {
  const fig = `${ui.fig.family}-billing__content`;

  return Skeletons.Box.G({
    className: `${fig} main`,
    debug: __filename,
    kids: [
      item(ui, "Free", "Free", "", "", ["20G", "Up to 3", "None"]),
      item(
        ui,
        "Pro",
        "Start from $16.99 / month",
        "5 seats included, each additional seat $5",
        "Upgrade",
        [
          "50G",
          "5 included",
          "1",
          "1 days",
          "Permissions & roles",
          "Guest access",
        ]
      ),
      item(
        ui,
        "Start Ups",
        "Start from $35.99 / month",
        "10 seats included, each additional seat $5",
        "Upgrade",
        [
          "100G",
          "Up to 10",
          "3",
          "30 days",
          "Permissions & roles",
          "Guest access",
          "Activity logs",
        ]
      ),
      item(
        ui,
        "Enterprise",
        "Contact sales",
        "Custom pricing for your team",
        "Contact sales",
        [
          "Custom",
          "Custom",
          "Yes",
          "Up to 90 days",
          "Permissions & roles",
          "Guest access",
          "Activity logs",
        ]
      ),
    ],
  });
}

export default billing_content;
