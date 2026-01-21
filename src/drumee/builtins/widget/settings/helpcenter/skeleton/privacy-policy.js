// /src/js/.../privacy_policy.js

// ---------- small helpers ----------
const boxX = (className, kids) => Skeletons.Box.X({ className, kids });
const boxY = (className, kids) => Skeletons.Box.Y({ className, kids });

const note = (content, className) =>
  Skeletons.Note({ content, ...(className ? { className } : {}) });

const figOf = (ui) => `${ui.fig.family}__content-item`;

// ---------- UI blocks ----------
function docTitle(ui, text) {
  const fig = figOf(ui);
  return boxY(`${fig} container`, [boxX(`${fig} title`, [note(text)])]);
}

function metaRow(ui, { label, value }) {
  const fig = figOf(ui);
  // "Last updated:" + grey pill
  return boxX(`${fig} wrap-description`, [
    note(label, `${fig} description bold-note`),
    Skeletons.Note({ content: value, className: `${fig} tos-pill` }),
  ]);
}

// ---------- bullets renderer (schema: line/block/sublist) ----------
function bulletMarker(variant = "dot") {
  if (variant === "none") return Skeletons.Element({ content: "" });
  if (variant === "icon") return Skeletons.Button.Label({ ico: "available" });
  if (variant === "subdot") return note("◦");
  return note("•");
}

function bulletSpacer(fig, variant = "dot") {
  const cls =
    variant === "subdot" ? `${fig} sub-bullet-spacer` : `${fig} bullet-spacer`;
  return Skeletons.Element({ content: "", className: cls });
}

function renderParts(ui, parts) {
  const fig = figOf(ui);
  return parts.map((p) =>
    note(p.text, p.bold ? `${fig} description bold-note` : undefined),
  );
}

/**
 * bullet schema:
 * - { type:"line", parts:[{text,bold?}], marker? }
 * - { type:"block", head:[...], body:[...], marker? }
 * - { type:"sublist", items:[ {parts:[...]}, ... ] }
 */
function renderBullet(ui, b) {
  const fig = figOf(ui);
  const marker = b.marker ?? "dot";

  if (b.type === "line") {
    return boxX(`${fig} wrap-description`, [
      bulletMarker(marker),
      ...renderParts(ui, b.parts),
    ]);
  }

  if (b.type === "block") {
    return boxY(`${fig}`, [
      boxX(`${fig} wrap-description`, [
        bulletMarker(marker),
        ...renderParts(ui, b.head),
      ]),
      boxX(`${fig} wrap-description`, [
        bulletSpacer(fig, marker),
        ...renderParts(ui, b.body),
      ]),
    ]);
  }

  if (b.type === "sublist") {
    return boxY(`${fig}`, [
      ...b.items.map((it) =>
        boxX(`${fig} wrap-description`, [
          bulletSpacer(fig, "subdot"),
          bulletMarker("subdot"),
          ...renderParts(ui, it.parts),
        ]),
      ),
    ]);
  }

  return null;
}

function section(ui, { title, paragraphs = [], bullets = [], after = [] }) {
  const fig = figOf(ui);

  return boxY(`${fig} container`, [
    ...(title ? [boxX(`${fig} title`, [note(title)])] : []),

    ...paragraphs.map((p) =>
      boxX(`${fig} description`, [
        note(
          p.text ?? p,
          p.isBold ? `${fig} description bold-note` : undefined,
        ),
      ]),
    ),

    ...bullets.map((b) => renderBullet(ui, b)).filter(Boolean),

    ...after.map((a) =>
      boxX(`${fig} description`, [
        note(
          a.text ?? a,
          a.isBold ? `${fig} description bold-note` : undefined,
        ),
      ]),
    ),
  ]);
}

// ---------- data ----------
const PRIVACY = {
  title: "Privacy Policy",
  lastUpdated: "2026",
  intro: [
    "Drumee (“Drumee”, “we”, “our”, or “us”) is committed to protecting your privacy. This Privacy Policy explains what information we process, how we protect it, and the choices you have when using Drumee.",
    "Drumee is designed as a privacy-first cloud workspace. We do not exploit user data, and we do not use your content for advertising, profiling, or any secondary purposes.",
  ],

  sections: [
    {
      title: "1. Our Privacy Principles",
      paragraphs: ["Drumee is built on the following principles:"],
      bullets: [
        { type: "line", parts: [{ text: "Your data belongs to you" }] },
        {
          type: "line",
          parts: [{ text: "We do not analyze or monetize your content" }],
        },
        {
          type: "line",
          parts: [
            {
              text: "We collect only the minimum data required to operate the service",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "You remain in control of access and sharing at all times",
            },
          ],
        },
      ],
    },

    {
      title: "2. What Data We Do NOT Collect",
      paragraphs: ["Drumee does not:"],
      bullets: [
        { type: "line", parts: [{ text: "Sell personal data" }] },
        {
          type: "line",
          parts: [{ text: "Track user behavior for advertising or marketing" }],
        },
        {
          type: "line",
          parts: [{ text: "Analyze files, messages, or notes" }],
        },
        {
          type: "line",
          parts: [
            {
              text: "Access your content for internal review or manual inspection",
            },
          ],
        },
      ],
    },

    {
      title: "3. Data We Process (Minimal & Necessary)",
      paragraphs: [
        "We process only the minimum technical and account-related data required to provide the service:",
      ],
    },
    {
      paragraphs: [{ text: "3.1 Account Information", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "Email address" }] },
        { type: "line", parts: [{ text: "Name (if provided)" }] },
        { type: "line", parts: [{ text: "Account identifiers" }] },
      ],
      after: [
        "This data is used solely for authentication, account management, and communication related to the service.",
      ],
    },
    {
      paragraphs: [
        { text: "3.2 User Content", isBold: true },
        {
          text: "User content includes files, folders, messages, notes, and other information you choose to upload or create.",
        },
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "You retain full ownership of all user content" }],
        },
        {
          type: "line",
          parts: [
            {
              text: "Drumee does not interpret, analyze, or navigate through this content",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "Content is processed only to store, transmit, and display it at your request",
            },
          ],
        },
      ],
    },
    {
      paragraphs: [
        { text: "3.3 Technical Data", isBold: true },
        { text: "Limited technical data may be processed for:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Security" }] },
        { type: "line", parts: [{ text: "Fraud prevention" }] },
        { type: "line", parts: [{ text: "System reliability" }] },
        { type: "line", parts: [{ text: "Performance optimization" }] },
      ],
      after: [
        "This data does not include behavioral profiling or content analysis.",
      ],
    },

    {
      title: "4. Legal Basis for Processing (GDPR)",
      paragraphs: [
        "For users in the European Union, Drumee processes data under the following legal bases:",
      ],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Contractual necessity", bold: true },
            { text: " – to provide the service you request" },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Legal obligations", bold: true },
            { text: " – where required by law" },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Explicit user consent", bold: true },
            { text: " – for any processing beyond core service operation" },
          ],
        },
      ],
    },

    {
      title: "5. Data Sharing",
      paragraphs: [
        "Drumee does not share your personal data or content with third parties, except:",
      ],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "When required by law or lawful government request" },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "With trusted infrastructure providers strictly necessary to operate the service (e.g. hosting, security), under confidentiality agreements",
            },
          ],
        },
      ],
      after: [
        "No third party is permitted to use your data for their own purposes.",
      ],
    },

    {
      title: "6. Data Security",
      paragraphs: [
        "We implement appropriate technical and organizational measures to protect your data, including:",
      ],
      bullets: [
        { type: "line", parts: [{ text: "Access controls" }] },
        {
          type: "line",
          parts: [{ text: "Encryption in transit where applicable" }],
        },
        { type: "line", parts: [{ text: "Secure infrastructure practices" }] },
      ],
      after: [
        "Despite these measures, no system can be guaranteed 100% secure.",
      ],
    },

    {
      title: "7. Data Retention",
      bullets: [
        {
          type: "line",
          parts: [
            {
              text: "User content is retained as long as your account is active",
            },
          ],
        },
        {
          type: "line",
          parts: [{ text: "You may delete content at any time" }],
        },
        {
          type: "line",
          parts: [
            {
              text: "Upon account termination, data may be deleted in accordance with applicable laws and operational requirements",
            },
          ],
        },
      ],
    },

    {
      title: "8. Your Rights",
      paragraphs: ["Depending on your location, you may have the right to:"],
      bullets: [
        { type: "line", parts: [{ text: "Access your personal data" }] },
        { type: "line", parts: [{ text: "Correct inaccurate data" }] },
        { type: "line", parts: [{ text: "Request deletion of your data" }] },
        { type: "line", parts: [{ text: "Restrict or object to processing" }] },
        {
          type: "line",
          parts: [{ text: "Withdraw consent where applicable" }],
        },
      ],
      after: ["Requests can be made by contacting us at the email below."],
    },

    {
      title: "9. International Users",
      paragraphs: [
        "Drumee is operated under French law. If you access the service from outside France or the European Union, your data may be processed in jurisdictions with different data protection laws.",
        "We take steps to ensure adequate protection in accordance with applicable regulations.",
      ],
    },

    {
      title: "10. Changes to This Policy",
      paragraphs: ["We may update this Privacy Policy from time to time."],
      after: [
        "If changes are material, we will notify users through the service or by email. Continued use of Drumee after changes become effective constitutes acceptance of the updated policy.",
      ],
    },

    {
      title: "11. Contact Us",
      paragraphs: [
        "If you have questions about this Privacy Policy or your data, please contact us at:",
      ],
      bullets: [
        {
          type: "line",
          marker: "none",
          parts: [{ text: "Email: " }, { text: "fren@drumee.org", bold: true }],
        },
      ],
      after: [
        "By using Drumee, you acknowledge that you have read and understood this Privacy Policy.",
      ],
    },
  ],
};

// ---------- render ----------
function privacy_policy(ui) {
  const fig = figOf(ui);

  return [
    // Title
    docTitle(ui, PRIVACY.title),

    // Last updated pill row
    boxY(`${fig} container`, [
      metaRow(ui, { label: "Last updated:", value: PRIVACY.lastUpdated }),
    ]),

    // Intro paragraphs
    boxY(`${fig} container`, [
      ...PRIVACY.intro.map((p) => boxX(`${fig} description`, [note(p)])),
    ]),

    // Sections
    ...PRIVACY.sections.map((s) => section(ui, s)),
  ];
}

export default privacy_policy;
