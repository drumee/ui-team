const { button } = require("builtins/skeleton/toolkit");
/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @param {*} cycle 
 * @returns 
 */
function item(ui, opt) {
  const { title, description, features } = opt;
  const fig = `${ui.fig.family}__plan`;


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
      Skeletons.Note({
      className: `${fig}-description`,
      content: description,
    }),
    ],
  });


  let button = Skeletons.Box.X({
    className: `${fig}-button secondary`,
    kids: [
      Skeletons.Note({
        className: `${fig} buttonTitle secondary`,
        content: "Get started",
      }),
    ],
  });


  return Skeletons.Box.Y({
    className: `${fig}-item`,
    kids: [header, button],
  });
}

export default function (ui) {
  const pfx = `${ui.fig.family}__admin`;

  if (Visitor.quota().plan !== 'pro') {

  }

  if (Visitor.get('domain_id') == 1) {
    { return { kind: "organization_form", uiHandler: [ui] } }
  }

  return Skeletons.Box.Y({
    className: `${pfx}-right`,
    sys_pn: `${pfx}-right-panel`,
    kids: [
      button(ui, {
        label: "Open administration console",
        className: `${pfx}-plan-button`,
        service: "select-checkout-plan",
        priority: "secondary",
        radio: `checkout-plan-${ui._id}`,
        value: "free",
      })
    ]
  })
}
