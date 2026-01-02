const {
  badgePersonal,
} = require("builtins/media/grid/template/folder/badge-personal");

// ---------- small helpers ----------
const note = (content, className) =>
  Skeletons.Note({ content, ...(className ? { className } : {}) });

const boxX = (className, kids) => Skeletons.Box.X({ className, kids });
const boxY = (className, kids) => Skeletons.Box.Y({ className, kids });

const sectionFig = (ui) => `${ui.fig.family}__content-item`;

function gradient_logo(ui, c) {
  return boxX(`${ui.fig.family}__logo`, [
    Skeletons.Element({
      content: badgePersonal({
        area: _a.personal,
        widgetId: `${ui.mget(_a.widgetId)}-${c}`,
      }),
      className: `${ui.fig.family}__icon logo ${c}`,
    }),
  ]);
}

// ---------- section builders ----------
function titleRow(fig, title) {
  return boxX(`${fig} title`, [note(title)]);
}

function paragraphRow(fig, classSuffix, text, noteClassName) {
  return boxX(`${fig} ${classSuffix}`, [note(text, noteClassName)]);
}

function wrapRow(fig, items) {
  // items: [{ text, bold }]
  return boxX(`${fig} wrap-description`, [
    ...items.map(({ text, bold }) =>
      note(text, bold ? `${fig} description bold-note` : undefined)
    ),
  ]);
}

function baseSection(ui, { title, rows = [] }) {
  const fig = sectionFig(ui);

  return boxY(`${fig} container`, [
    titleRow(fig, title),
    ...rows
      .map((r) => {
        if (r.type === "paragraph") {
          return paragraphRow(
            fig,
            r.classSuffix ?? "description",
            r.text,
            r.noteClassName
          );
        }
        if (r.type === "wrap") {
          return wrapRow(fig, r.items);
        }
        return null;
      })
      .filter(Boolean),
  ]);
}

// ---------- feature builders ----------
function featureRow(fig, { boldText, tailText }) {
  return boxX(`${fig} wrap-description`, [
    Skeletons.Button.Label({ ico: "available" }),
    note(boldText, `${fig} description bold-note`),
    ...(tailText ? [note(tailText)] : []),
  ]);
}

function featuresSection(ui, featureItems) {
  const fig = sectionFig(ui);

  return boxY(`${fig} container`, [
    titleRow(fig, "Key features"),
    boxY(
      `${fig}`,
      featureItems.map((it) => featureRow(fig, it))
    ),
  ]);
}

// ---------- content config ----------
const CONTENT = {
  intro: {
    title: "What's Drumee:",
    description:
      "Drumee is a privacy-first cloud desktop that gives you full control over your data, where it lives, who can access it, and how it is used. Your workspace is encrypted, local-hostable, and never harvested for ads or AI training. Combined with AI auto-organization, Drumee delivers a clean, private, all-in-one digital workspace.",
  },

  problem: {
    title: "The Problem We Solve",
    description:
      "Modern work is fragmented across dozens of apps: Google Drive, Slack, Zoom, Dropbox, and Notion. Files are unorganized, data is scattered, privacy is compromised, and workers waste hours searching instead of creating.",
    highlight:
      "People don’t organize their drive. Their drive becomes unsearchable. Work slows down.",
  },

  simpleWords: {
    title: "In Simple Words",
    wrap: [
      { text: "Drumee is a" },
      { text: "privacy-first collaborative and storage app:", bold: true },
      {
        text: "an all-in-one workspace that feels like your computer but is accessible anywhere, with built-in messaging, file sharing, calls, and collaboration.",
      },
    ],
  },

  features: [
    {
      boldText: "AI-powered auto-organization",
      tailText: "that keeps your drive clean without effort.",
    },
    {
      boldText: "Natural-language search",
      tailText: "that understands intent, not filenames",
    },
    {
      boldText: "A privacy-first architecture",
      tailText: "with flexible hosting (cloud or local-hosted)",
    },
    { boldText: "Encrypted messaging, calls, and storage" },
    { boldText: "Zero data harvesting or behavioral tracking" },
    {
      boldText:
        "AI that never trains on your data unless you explicitly allow it",
    },
    { boldText: "A plugin ecosystem", tailText: "that adapts to how you work" },
  ],
};

function welcome(ui) {
  const fig = sectionFig(ui);

  return [
    gradient_logo(ui, "c1"),

    // Intro: reuse baseSection
    baseSection(ui, {
      title: CONTENT.intro.title,
      rows: [
        {
          type: "paragraph",
          classSuffix: "description",
          text: CONTENT.intro.description,
        },
      ],
    }),

    // Problem
    baseSection(ui, {
      title: CONTENT.problem.title,
      rows: [
        {
          type: "paragraph",
          classSuffix: "description",
          text: CONTENT.problem.description,
        },
        {
          type: "paragraph",
          classSuffix: "bold-description",
          text: CONTENT.problem.highlight,
          noteClassName: `${fig} description bold-note`,
        },
      ],
    }),

    // Simple words (wrap)
    baseSection(ui, {
      title: CONTENT.simpleWords.title,
      rows: [{ type: "wrap", items: CONTENT.simpleWords.wrap }],
    }),

    // Features
    featuresSection(ui, CONTENT.features),
  ];
}

export default welcome;
