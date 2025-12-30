// /src/js/.../term_of_service.js

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
  // Render: "Last updated:" + pill
  return boxX(`${fig} wrap-description`, [
    note(label, `${fig} description bold-note`),
    Skeletons.Note({
      content: value,
      className: `${fig} tos-pill`, // add css below
    }),
  ]);
}

// ---------- bullets renderer (schema: line/block/sublist) ----------
function bulletMarker(variant = "dot") {
  // variant: dot | subdot | icon | none
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
    note(p.text, p.bold ? `${fig} description bold-note` : undefined)
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
        ])
      ),
    ]);
  }

  return null;
}

/**
 * Section:
 * - title (big)
 * - paragraphs (no bullet)
 * - bullets
 * - after (paragraphs after list)
 */
function section(ui, { title, paragraphs = [], bullets = [], after = [] }) {
  const fig = figOf(ui);

  return boxY(`${fig} container`, [
    ...(title ? [boxX(`${fig} title`, [note(title)])] : []),

    ...paragraphs.map((p) =>
      boxX(`${fig} description`, [
        note(
          p.text ?? p,
          p.isBold ? `${fig} description bold-note` : undefined
        ),
      ])
    ),

    ...bullets.map((b) => renderBullet(ui, b)).filter(Boolean),

    ...after.map((a) =>
      boxX(`${fig} description`, [
        note(
          a.text ?? a,
          a.isBold ? `${fig} description bold-note` : undefined
        ),
      ])
    ),
  ]);
}

// ---------- data ----------
const TOS = {
  title: "Terms of Service",
  lastUpdated: "Dec 16, 2025",
  intro: [
    `These Terms of Service ("Terms") govern your access to and use of Drumee ("Drumee", "we", "our", or "us"), including our website, applications, and services (collectively, the "Service"). By creating an account or using Drumee, you agree to be bound by these Terms.`,
    "If you do not agree to these Terms, you must not use the Service.",
  ],

  sections: [
    {
      title: "1. Description of the Service",
      paragraphs: [
        "Drumee is a cloud-based workspace that allows users to store files, create folders, communicate with others, manage contacts, and collaborate securely.",
        "The Service may evolve over time. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.",
      ],
    },

    {
      title: "2. Eligibility",
      paragraphs: [
        "You must be at least 16 years old to use Drumee. By using the Service, you represent and warrant that:",
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "You meet the minimum age requirement" }],
        },
        {
          type: "line",
          parts: [
            { text: "You have the legal capacity to enter into these Terms" },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "You are using the Service in compliance with applicable laws",
            },
          ],
        },
      ],
    },

    {
      title: "3. Account Registration and Security",
      paragraphs: [{ text: "3.1 Account Creation", isBold: true }],
      after: [
        "You are responsible for providing accurate and complete information when creating an account.",
      ],
    },
    {
      paragraphs: [
        { text: "3.2 Account Security", isBold: true },
        { text: "You are responsible for:" },
      ],
      bullets: [
        {
          type: "line",
          parts: [
            {
              text: "Maintaining the confidentiality of your login credentials",
            },
          ],
        },
        {
          type: "line",
          parts: [{ text: "All activities that occur under your account" }],
        },
      ],
      after: [
        "You agree to notify us immediately of any unauthorized access or security breach.",
      ],
    },

    {
      title: "4. Acceptable Use",
      paragraphs: ["You agree not to use Drumee to:"],
      bullets: [
        {
          type: "line",
          parts: [{ text: "Violate any applicable laws or regulations" }],
        },
        {
          type: "line",
          parts: [
            { text: "Upload or share illegal, harmful, or abusive content" },
          ],
        },
        {
          type: "line",
          parts: [{ text: "Infringe intellectual property or privacy rights" }],
        },
        {
          type: "line",
          parts: [
            { text: "Attempt to gain unauthorized access to systems or data" },
          ],
        },
        {
          type: "line",
          parts: [{ text: "Disrupt or interfere with the Service" }],
        },
      ],
      after: [
        "We reserve the right to suspend or terminate accounts that violate these rules.",
      ],
    },

    {
      title: "5. User Content",
      paragraphs: [{ text: "5.1 Ownership", isBold: true }],
      after: [
        `You retain full ownership of all content you upload, store, or create on Drumee ("User Content"). Drumee does not claim ownership of your files, messages, notes, or any other data.`,
      ],
    },
    {
      paragraphs: [
        { text: "5.2 No Data Exploitation", isBold: true },
        {
          text: "Drumee does not collect, analyze, sell, or navigate through your User Content for advertising, profiling, training models, or any other secondary purpose.",
        },
        { text: "Your data is:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Not mined" }] },
        { type: "line", parts: [{ text: "Not analyzed for commercial gain" }] },
        { type: "line", parts: [{ text: "Not shared with third parties" }] },
        {
          type: "line",
          parts: [{ text: "Not accessed manually by Drumee staff" }],
        },
      ],
    },
    {
      paragraphs: [
        { text: "5.3 Limited License for Service Operation", isBold: true },
      ],
      after: [
        "You grant Drumee a limited, non-exclusive, and revocable license to host, store, process, and transmit your User Content solely for the purpose of operating the Service and providing features you explicitly use.",
        "Any access to User Content beyond normal system operation requires your explicit consent, unless required by law.",
      ],
    },

    {
      title: "6. Privacy and Data Protection",
      paragraphs: [
        "Drumee is designed with a privacy-first architecture.",
        "We do not collect, analyze, monetize, or navigate through your content or personal data for purposes other than providing the Service you explicitly choose to use.",
      ],
    },
    {
      paragraphs: [
        { text: "6.1 What We Do NOT Do", isBold: true },
        { text: "Drumee does not:" },
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "Track your behavior for advertising" }],
        },
        { type: "line", parts: [{ text: "Sell or share your personal data" }] },
        {
          type: "line",
          parts: [
            {
              text: "Analyze your files, messages, or notes for analytics or profiling",
            },
          ],
        },
        {
          type: "line",
          parts: [{ text: "Use your data to train algorithms or models" }],
        },
      ],
    },
    {
      paragraphs: [
        { text: "6.2 Minimal Data Processing", isBold: true },
        { text: "We process only the minimum technical data required to:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Create and maintain your account" }] },
        { type: "line", parts: [{ text: "Authenticate access" }] },
        {
          type: "line",
          parts: [{ text: "Store and transmit your content at your request" }],
        },
        {
          type: "line",
          parts: [{ text: "Ensure security, reliability, and performance" }],
        },
      ],
      after: [
        "This processing is strictly limited to operating the Service and is never used for secondary purposes.",
      ],
    },
    {
      paragraphs: [{ text: "6.3 User Control and Consent", isBold: true }],
      after: [
        "Any access to your data beyond automated system operations requires your explicit consent, unless disclosure is required by law.",
        "You remain in full control of your data at all times.",
      ],
    },

    {
      title: "7. Storage and Data Limits",
      paragraphs: ["Drumee provides storage based on your selected plan."],
      bullets: [
        { type: "line", parts: [{ text: "Storage limits may apply" }] },
        {
          type: "line",
          parts: [
            {
              text: "Exceeding limits may restrict uploads or require plan upgrades",
            },
          ],
        },
      ],
      after: [
        "We are not responsible for data loss caused by exceeding storage limits.",
      ],
    },

    {
      title: "8. Third-Party Services",
      paragraphs: [
        "Drumee may integrate or link to third-party services. We are not responsible for third-party content, policies, or practices.",
        "Your use of third-party services is governed by their respective terms.",
      ],
    },

    {
      title: "9. Intellectual Property",
      paragraphs: [
        "All intellectual property related to Drumee, including software, design, trademarks, and logos, is owned by Drumee or its licensors.",
        "You may not copy, modify, distribute, or reverse-engineer any part of the Service without prior written consent.",
      ],
    },

    {
      title: "10. Termination",
      paragraphs: [
        "You may stop using Drumee at any time.",
        "We may suspend or terminate your access if:",
      ],
      bullets: [
        { type: "line", parts: [{ text: "You violate these Terms" }] },
        {
          type: "line",
          parts: [{ text: "Your use poses a security or legal risk" }],
        },
        { type: "line", parts: [{ text: "Required by law" }] },
      ],
      after: ["Upon termination, your right to access the Service will end."],
    },

    {
      title: "11. Disclaimer of Warranties",
      paragraphs: [
        'The Service is provided "as is" and "as available".',
        "We make no warranties regarding:",
      ],
      bullets: [
        { type: "line", parts: [{ text: "Availability or reliability" }] },
        { type: "line", parts: [{ text: "Accuracy of content" }] },
        { type: "line", parts: [{ text: "Fitness for a particular purpose" }] },
      ],
      after: ["Your use of Drumee is at your own risk."],
    },

    {
      title: "12. Limitation of Liability",
      paragraphs: [
        "To the maximum extent permitted by law, Drumee shall not be liable for:",
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "Indirect or consequential damages" }],
        },
        {
          type: "line",
          parts: [{ text: "Loss of data, profits, or business" }],
        },
      ],
      after: [
        "Our total liability shall not exceed the amount you paid to Drumee in the last 12 months, if any.",
      ],
    },

    {
      title: "13. Indemnification",
      paragraphs: [
        "You agree to indemnify and hold Drumee harmless from any claims, damages, or expenses arising from:",
      ],
      bullets: [
        { type: "line", parts: [{ text: "Your use of the Service" }] },
        { type: "line", parts: [{ text: "Your violation of these Terms" }] },
        { type: "line", parts: [{ text: "Your User Content" }] },
      ],
    },

    {
      title: "14. Changes to These Terms",
      paragraphs: [
        "We may update these Terms from time to time.",
        "If changes are material, we will provide notice through the Service or by email. Continued use of Drumee after changes become effective constitutes acceptance of the updated Terms.",
      ],
    },

    {
      title: "15. Governing Law",
      paragraphs: [
        "These Terms of Service shall be governed by and construed in accordance with the laws of France, without regard to its conflict of law principles.",
        "Any dispute arising out of or in connection with these Terms or the use of the Service shall fall under the exclusive jurisdiction of the competent courts of France",
      ],
    },

    {
      title: "16. Contact Information",
      paragraphs: [
        "If you have questions about these Terms of Service, need assistance, or wish to contact Drumee for service-related matters, you can reach us at:",
      ],
      bullets: [
        {
          type: "line",
          marker: "none",
          parts: [{ text: "Email: " }, { text: "fren@drumee.org", bold: true }],
        },
      ],
      after: [
        "By using Drumee, you acknowledge that you have read, understood, and agreed to these Terms of Service.",
      ],
    },
  ],
};

// ---------- render ----------
function term_of_service(ui) {
  const fig = figOf(ui);

  return [
    // Title
    docTitle(ui, TOS.title),

    // Last updated pill row
    boxY(`${fig} container`, [
      metaRow(ui, { label: "Last updated:", value: TOS.lastUpdated }),
    ]),

    // Intro paragraphs
    boxY(`${fig} container`, [
      ...TOS.intro.map((p) => boxX(`${fig} description`, [note(p)])),
    ]),

    // Content
    ...TOS.sections.map((s) => section(ui, s)),
  ];
}

export default term_of_service;
