// /src/js/.../community.js

const boxX = (className, kids) => Skeletons.Box.X({ className, kids });
const boxY = (className, kids) => Skeletons.Box.Y({ className, kids });

const note = (content, className) =>
  Skeletons.Note({ content, ...(className ? { className } : {}) });

const figOf = (ui) => `${ui.fig.family}__content-item`;

// safe tiny helper for links (HTML)
const link = (href, text) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;

const COMMUNITY = {
  title: "Drumee Community",
  introParts: [
    {
      text: "If you have any question while using Drumee, visit Drumee's community on ",
    },
    { text: link("https://discord.gg/U5xwgrvGmT", "Discord"), isHtml: true },
    { text: " or " },
    // TODO: replace this with your real contact URL if you have one
    { text: link("https://www.drumee.org/", "Contact us"), isHtml: true },
  ],
  links: [
    { label: "Drumee:", url: "https://www.drumee.org/" },
    { label: "X (Twitter):", url: "https://x.com/DrumeeOS" },
    { label: "Discord Community:", url: "https://discord.gg/U5xwgrvGmT" },
  ],
};

function community(ui) {
  const fig = figOf(ui);

  return boxY(`${fig} container`, [
    // Title
    boxX(`${fig} title`, [note(COMMUNITY.title)]),

    // Intro line (inline wrap + links)
    boxX(`${fig} wrap-description`, [
      ...COMMUNITY.introParts.map((p) =>
        // we keep same typography as description, but allow HTML for links
        note(p.text, `${fig} description`)
      ),
    ]),

    // Links list (each in its own line like screenshot)
    ...COMMUNITY.links.map((row) =>
      boxX(`${fig} wrap-description`, [
        note(`${row.label} `, `${fig} description`),
        note(link(row.url, row.url), `${fig} description`),
      ])
    ),
  ]);
}

export default community;
