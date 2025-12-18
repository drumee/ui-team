const OPTIONS = {
  free: {
    title: "Free",
    subtitle: "Free",
    description: "",
    buttonTitle: "",
    unit_price: 0,
    features: [
      "20G",
      "Up to 3",
      "None",
    ]
  },
  pro: {
    title: "Pro",
    subtitle: "Start from $16.99 / month",
    description: "5 seats included, each additional seat $5",
    buttonTitle: "Upgrade",
    unit_price: 1699,
    badge: 1,
    features: [
      "50G",
      "5 included",
      "1",
      "1 days",
      "Permissions & roles",
      "Guest access",
    ]
  },
  enterprise: {
    title: "Enterprise",
    subtitle: "Contact sales",
    description: "Custom pricing for your team",
    buttonTitle: "Contact sales",
    features: [
      "Custom",
      "Custom",
      "Yes",
      "Up to 90 days",
      "Permissions & roles",
      "Guest access",
      "Activity logs",
    ]
  }
}

function item(ui, opt) {
  const { title, subtitle, description, buttonTitle, features, badge } = OPTIONS[opt]
  const fig = `${ui.fig.family}__plan`;

  let descriptionItem = "";

  if (description) {
    descriptionItem = Skeletons.Note({
      className: `${fig}-description`,
      content: description,
    });
  }

  const header = Skeletons.Box.Y({
    className: `${fig}-header`,
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        content: title,
      }),
      Skeletons.Note({
        className: `${fig}-subtitle`,
        content: subtitle,
      }),
      descriptionItem,
    ],
  });

  let button = "";

  if (buttonTitle) {
    button = Skeletons.Box.X({
      className: `${fig}-button primary`,
      kids: [
        Skeletons.Note({
          className: `${fig} buttonTitle primary`,
          content: buttonTitle,
        }),
      ],
    });
  } else {
    button = Skeletons.Box.X({
      className: `${fig}-button secondary`,
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
      className: `${fig}-features item`,
      uiHandler: [ui],

      kids: [
        Skeletons.Button.Label({
          flow: _a.x,
          ico: "available",
          label: f,
        })
        // Skeletons.Note({
        //   content: f,
        // }),
      ],
    })
  });

  let popularBadge = "";

  if (badge) {
    popularBadge = Skeletons.Box.X({
      className: `${fig} popular-badge`,
      kids: [
        Skeletons.Note({
          content: "Most Popular",
        }),
      ],
    });
  }

  const featuresWrapper = Skeletons.Box.Y({
    className: `${fig}-features`,
    kids: featureItems,
  });

  return Skeletons.Box.Y({
    className: `${fig}-item`,
    // kidsOpt: { active: 0 },
    // radio: `color-radio-${ui._id}`,
    kids: [header, button, featuresWrapper, popularBadge],
  });
}

function billing_content(ui) {
  const fig = `${ui.fig.family}__plans`;

  return Skeletons.Box.G({
    className: `${fig}-main`,
    debug: __filename,
    kids: [
      item(ui, "free"),
      item(ui, "pro"),
      item(ui, "enterprise"),
    ],
  });
}

export default billing_content;
