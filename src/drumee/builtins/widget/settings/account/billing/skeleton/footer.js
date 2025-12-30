function item(ui, title, content, email) {
  const fig = `${ui.fig.family}__footer`;

  let emailItem = "";
  if (email) {
    emailItem = Skeletons.Box.X({
      className: `${fig} item`,
      kids: [
        Skeletons.Note({
          content: " Contact: ",
        }),
        Skeletons.Note({
          className: `${fig}-email`,
          content: email,
        }),
      ],
    });
  }

  return Skeletons.Box.X({
    className: `${fig} item`,
    kids: [
      Skeletons.Note({
        className: `${fig}-title`,
        content: title,
      }),
      Skeletons.Box.X({
        className: `${fig} content`,
        kids: [
          Skeletons.Note({
            content: content,
          }),
          emailItem,
        ],
      }),
    ],
  });
}

function billing_footer(ui) {
  const fig = `${ui.fig.family}__footer`;

  return Skeletons.Box.Y({
    className: `${fig}-main`,
    kids: [
      Skeletons.Note({
        className: `${fig}-header`,
        content: "Additional seat pricing",
      }),
      item(ui, "Pro:", "5 seats included, additional seats $5/month each."),
      item(ui, "Start Ups:", "10 seats included, additional seats $5/month each"),
      item(
        ui,
        "Enterprise:",
        "Custom pricing for your team size.",
        "frenz@drumee.org"
      ),
    ],
  });
}

export default billing_footer;
