// /src/js/.../user-guide.js

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

// ---------- bullets renderer (schema: line/block/sublist) ----------
function bulletMarker(variant = "dot") {
  // variant: dot | subdot | icon | none
  if (variant === "none") return Skeletons.Element({ content: "" });
  if (variant === "icon") return Skeletons.Button.Label({ ico: "available" });
  if (variant === "subdot") return note("◦");
  return note("•");
}

function bulletSpacer(fig, variant = "dot") {
  // requires CSS class below to align second line / nested items
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
 * - { type:"line", parts:[{text,bold?}], marker?:"dot"|"icon"|"none" }
 * - { type:"block", head:[...], body:[...], marker? }
 * - { type:"sublist", items:[ {parts:[...]}, ... ] }  // nested ◦ under previous bullet
 */
function renderBullet(ui, b) {
  const fig = figOf(ui);
  const marker = b.marker ?? "dot";

  // single-line bullet
  if (b.type === "line") {
    return boxX(`${fig} wrap-description`, [
      bulletMarker(marker),
      ...renderParts(ui, b.parts),
    ]);
  }

  // two-line bullet (bold head + new line desc indented)
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

  // nested bullets (◦)
  if (b.type === "sublist") {
    return boxY(`${fig}`, [
      ...b.items.map((it) =>
        boxX(`${fig} wrap-description`, [
          bulletSpacer(fig, "subdot"), // indent under parent
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
 * - bullets (line/block/sublist)
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
const GUIDE = {
  title: "Drumee User Guide",
  introParts: [
    { text: "This document explains how to use " },
    { text: "Drumee", bold: true },
    { text: " based on the currently visible features in the interface. " },
    { text: "Drumee is a cloud workspace that combines " },
    { text: "file management", bold: true },
    { text: ", " },
    { text: "chat", bold: true },
    { text: ", " },
    { text: "contacts", bold: true },
    { text: ", " },
    { text: "notes", bold: true },
    { text: ", and " },
    { text: "personal settings", bold: true },
    { text: " in one place." },
  ],

  sections: [
    // 1
    {
      title: "1. Getting Started",
      paragraphs: [{ text: "1.1 Accessing Drumee", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "Open Drumee in your browser." }] },
        { type: "line", parts: [{ text: "Log in using your email account." }] },
        {
          type: "line",
          parts: [
            { text: "Once logged in, you will see the " },
            { text: "main workspace", bold: true },
            { text: " with a top navigation bar and interactive panels." },
          ],
        },
      ],
    },

    // 2
    {
      title: "2. File & Folder Management",
      paragraphs: [
        { text: "2.1 Creating Folders", isBold: true },
        { text: "When creating a new folder, Drumee offers multiple options:" },
      ],
      bullets: [
        {
          type: "block",
          head: [{ text: "Create an external workspace", bold: true }],
          body: [
            {
              text: "Use this when you want to share files externally with your clients.",
            },
          ],
        },
        {
          type: "block",
          head: [{ text: "Create a personal workspace", bold: true }],
          body: [
            {
              text: "Only you can access this workspace. Ideal for personal or sensitive documents.",
            },
          ],
        },
        {
          type: "block",
          head: [{ text: "Create the folder", bold: true }],
          body: [
            {
              text: "Confirms the folder creation with your selected visibility.",
            },
          ],
        },
      ],
      after: [
        {
          text: "Folders appear in your workspace and can be used for file storage, collaboration, and chat contexts.",
        },
      ],
    },

    // 3
    {
      title: "3. Chat & Collaboration",
      paragraphs: [{ text: "3.1 Chat Interface", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Each folder can act as a " },
            { text: "chat space", bold: true },
            { text: "." },
          ],
        },
        {
          type: "line",
          parts: [{ text: "Messages appear on the right panel." }],
        },
        {
          type: "line",
          parts: [{ text: "You can send text messages in real time." }],
        },
        {
          type: "line",
          parts: [
            {
              text: "Example use case: create a folder → invite collaborators → chat and share files in one place.",
            },
          ],
        },
      ],
    },
    {
      paragraphs: [{ text: "3.2 Message Status", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "Sent messages show timestamps." }] },
        {
          type: "line",
          parts: [
            { text: "Delivered/read status is visible next to messages." },
          ],
        },
      ],
    },

    // 4
    {
      title: "4. Contacts Management",
      paragraphs: [
        { text: "4.1 Contacts Panel", isBold: true },
        {
          text: "The Contacts window allows you to manage people in your workspace",
        },
      ],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "All contacts:", bold: true },
            { text: " Displays everyone you have added." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Tags:", bold: true },
            { text: " Organize contacts into groups." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Pending invitation:", bold: true },
            {
              text: " View people you have invited but who have not yet joined.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Archives:", bold: true },
            { text: " Archived contacts." },
          ],
        },
      ],
    },
    {
      paragraphs: [{ text: "4.2 Adding Contacts", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Click " },
            { text: "Contact +", bold: true },
            { text: " in the top banner." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Enter the contact details and send an invitation." },
          ],
        },
      ],
    },

    // 5
    {
      title: "5. Notes",
      paragraphs: [{ text: "5.1 Creating Notes", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [{ text: "Notes open in a dedicated window." }],
        },
        {
          type: "line",
          parts: [
            { text: "Each note includes a " },
            { text: "timestamp", bold: true },
            { text: "." },
          ],
        },
        { type: "line", parts: [{ text: "Notes can be used for:" }] },
        {
          type: "sublist",
          items: [
            { parts: [{ text: "Personal reminders" }] },
            { parts: [{ text: "Meeting notes" }] },
            { parts: [{ text: "Quick drafts" }] },
          ],
        },
      ],
    },
    {
      paragraphs: [{ text: "5.2 Saving Notes", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Click the " },
            { text: "save icon", bold: true },
            { text: " to store the note." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Notes are automatically stored in your workspace." },
          ],
        },
      ],
    },

    // 6 (match screenshot: 2 bullets + paragraph after)
    {
      title: "6. Activity & Notifications",
      paragraphs: [{ text: "6.1 Activity Panel", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [{ text: "Shows recent actions and updates." }],
        },
        {
          type: "line",
          parts: [
            { text: "Use " },
            { text: "Mark as all read", bold: true },
            { text: " to clear notifications." },
          ],
        },
      ],
      after: [
        {
          text: "This helps you keep track of messages, file updates, and system actions.",
        },
      ],
    },

    // 7
    {
      title: "7. Customizing Your Workspace",
      paragraphs: [
        { text: "7.1 Background Customization", isBold: true },
        { text: "You can personalize your workspace appearance:" },
      ],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Click " },
            { text: "Customize Background", bold: true },
            { text: "." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Choose from " },
            { text: "built-in", bold: true },
            { text: " images or " },
            { text: "upload your own image", bold: true },
            { text: " (max 10 MB)." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Select a " },
            { text: "theme color", bold: true },
            { text: "." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Click " },
            { text: "Apply & Save", bold: true },
            { text: " to confirm." },
          ],
        },
      ],
    },

    // 8
    {
      title: "8. Profile & Account Settings",
      paragraphs: [{ text: "Access settings from the top-right user menu." }],
    },
    {
      paragraphs: [
        { text: "8.1 Profile", isBold: true },
        {
          text: "You can update all your personal information within this page. Including your personal information or changing your avatar.",
        },
      ],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Click " },
            { text: "Apply all and save", bold: true },
            { text: " to confirm changes." },
          ],
        },
      ],
    },

    // 9 (match screenshot: bullets + sublist)
    {
      title: "9. Storage Management",
      paragraphs: [{ text: "9.1 Viewing Storage Usage", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Go to " },
            { text: "Settings → Storage", bold: true },
            { text: "." },
          ],
        },
        {
          type: "line",
          parts: [{ text: "See total storage used and remaining quota." }],
        },
        { type: "line", parts: [{ text: "Storage is categorized by:" }] },
        {
          type: "sublist",
          items: [
            { parts: [{ text: "Video" }] },
            { parts: [{ text: "Image" }] },
            { parts: [{ text: "Note" }] },
            { parts: [{ text: "All files" }] },
          ],
        },
      ],
    },
    {
      title: "9.2 Upgrading Storage",
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Click " },
            { text: "Upgrade plan", bold: true },
            { text: " to increase your storage capacity." },
          ],
        },
      ],
    },

    // 10
    {
      title: "10. Security Settings",
      paragraphs: [{ text: "10.1 Password Management", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Change your password from " },
            { text: "Settings → Security", bold: true },
            { text: "." },
          ],
        },
      ],
    },
    {
      paragraphs: [
        { text: "10.2 Multi-Factor Authentication (MFA)", isBold: true },
      ],

      bullets: [
        {
          type: "line",
          parts: [{ text: "Enable MFA for additional account security." }],
        },
        {
          type: "line",
          parts: [
            { text: "MFA adds an extra verification step during login." },
          ],
        },
      ],
    },
    {
      paragraphs: [{ text: "10.3 Logout", isBold: true }],

      bullets: [
        {
          type: "line",
          parts: [
            { text: "Use " },
            { text: "Logout", bold: true },
            { text: " to securely end your session on the current device." },
          ],
        },
      ],
    },

    // 11
    {
      title: "11. Best Practices",
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Use " },
            { text: "personal workspaces", bold: true },
            { text: " for sensitive files." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Use " },
            { text: "external workspaces", bold: true },
            { text: " for collaboration with outside users." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Organize contacts with tags for faster communication." },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Enable " },
            { text: "MFA", bold: true },
            { text: " to protect your account." },
          ],
        },
        { type: "line", parts: [{ text: "Monitor storage usage regularly." }] },
      ],
    },
  ],
};

// ---------- render ----------
function user_guide(ui) {
  const fig = figOf(ui);

  const introWrap = boxX(`${fig} wrap-description`, [
    ...GUIDE.introParts.map((p) =>
      note(p.text, p.bold ? `${fig} description bold-note` : undefined)
    ),
  ]);

  return [
    docTitle(ui, GUIDE.title),
    boxY(`${fig} container`, [introWrap]),
    ...GUIDE.sections.map((s) => section(ui, s)),
  ];
}

export default user_guide;
