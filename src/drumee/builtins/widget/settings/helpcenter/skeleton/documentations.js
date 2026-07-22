// /src/js/.../documentations.js

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
 * - paragraphs (normal, no bullet)
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
const DOCS = {
  sections: [
    {
      title: "What is Drumee?",
      paragraphs: [
        {
          text: "Drumee is a secure cloud workspace that brings files, conversations, notes, and contacts together in one place.",
        },
        {
          text: "Instead of switching between file storage, chat tools, and note apps, Drumee organizes everything around folders and people, with privacy and access control built in by default.",
        },
        { text: "Drumee is designed for:" },
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "Individuals who want a private cloud space" }],
        },
        {
          type: "line",
          parts: [{ text: "Teams collaborating on shared files" }],
        },
        {
          type: "line",
          parts: [
            {
              text: "Users who need to share content securely with external people",
            },
          ],
        },
      ],
    },

    // Core principles
    {
      title: "How Drumee Works (Core Principles)",
      paragraphs: [{ text: "1. Workspace", isBold: true }],
      after: [
        { text: "Your workspace is your personal cloud environment." },
        { text: "Everything you do in Drumee happens inside this workspace." },
        { text: "Inside a workspace, you can:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Create folders" }] },
        { type: "line", parts: [{ text: "Upload files" }] },
        { type: "line", parts: [{ text: "Chat with collaborators" }] },
        { type: "line", parts: [{ text: "Write notes" }] },
        { type: "line", parts: [{ text: "Manage contacts and settings" }] },
      ],
    },
    {
      paragraphs: [
        { text: "2. Folders Are the Center of Everything", isBold: true },
      ],
      after: [
        { text: "In Drumee, folders are more than storage." },
        { text: "A folder can contain:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Files" }] },
        { type: "line", parts: [{ text: "Messages (chat)" }] },
        {
          type: "line",
          parts: [{ text: "Shared access with specific people" }],
        },
      ],
      // last sentence in screenshot
      after: [
        { text: "In Drumee, folders are more than storage." },
        { text: "A folder can contain:" },
        { text: "Each folder has its " },
      ],
    },

    // Fix the above: to keep “own privacy rules” bold inline like screenshot,
    // we’ll do it as a line bullet with marker none (paragraph style)
    {
      title: "",
      bullets: [
        {
          type: "line",
          marker: "none",
          parts: [
            { text: "Each folder has its " },
            { text: "own privacy rules", bold: true },
            { text: "." },
          ],
        },
      ],
    },

    // Workspace Types
    {
      title: "Workspace Types",
      paragraphs: [{ text: "Personal Workspace", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "Only you can access this workspace" }] },
        { type: "line", parts: [{ text: "No one else can see its content" }] },
        {
          type: "line",
          parts: [
            { text: "Best for personal documents, drafts, or sensitive files" },
          ],
        },
      ],
    },
    {
      paragraphs: [{ text: "Internal Workspace", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "Restricted to only your internal team" }] },
        { type: "line", parts: [{ text: "Members must be explicitly invited" }] },
        {
          type: "line",
          parts: [{ text: "Used for day-to-day team collaboration" }],
        },
      ],
    },
    {
      paragraphs: [{ text: "External Workspace", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "Open to share externally with your clients" }] },
        { type: "line", parts: [{ text: "Anyone with the link can access it" }] },
        {
          type: "line",
          parts: [{ text: "Includes both files and chat messages" }],
        },
      ],
      after: [
        {
          text: "When you create a workspace, you choose its type based on how you want to use it.",
        },
      ],
    },

    // Files & Storage
    {
      title: "Files & Storage",
      paragraphs: [
        { text: "Uploading Files", isBold: true },
        {
          text: "You can upload files directly into any folder you own or have access to.",
        },
        { text: "Supported use cases:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Documents" }] },
        { type: "line", parts: [{ text: "Images" }] },
        { type: "line", parts: [{ text: "Videos" }] },
        { type: "line", parts: [{ text: "Notes" }] },
      ],
    },
    {
      paragraphs: [{ text: "Storage Overview", isBold: true }],
      bullets: [
        {
          type: "line",
          marker: "none",
          parts: [
            { text: "In " },
            { text: "Settings → Storage", bold: true },
            { text: ", you can:" },
          ],
        },
        { type: "line", parts: [{ text: "See how much storage you’ve used" }] },
        {
          type: "line",
          parts: [
            { text: "View usage by file type (video, image, note, all files)" },
          ],
        },
        { type: "line", parts: [{ text: "Upgrade your plan if needed" }] },
      ],
    },

    // Chat & Communication
    {
      title: "Chat & Communication",
      paragraphs: [
        { text: "Folder-Based Chat", isBold: true },
        { text: "Every shared folder includes a chat panel." },
        { text: "This means:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Conversations stay tied to files" }] },
        { type: "line", parts: [{ text: "No need to search for context" }] },
        {
          type: "line",
          parts: [{ text: "Messages belong to the work, not a separate app" }],
        },
      ],
    },
    {
      paragraphs: [{ text: "Sending Messages", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "Messages appear with timestamps" }] },
        {
          type: "line",
          parts: [{ text: "Delivery and read status are shown" }],
        },
        { type: "line", parts: [{ text: "Chats update in real time" }] },
      ],
    },

    // Contacts
    {
      title: "Contacts",
      paragraphs: [
        { text: "What Are Contacts?", isBold: true },
        { text: "Contacts are people you interact with in Drumee." },
        { text: "You can:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Add contacts" }] },
        { type: "line", parts: [{ text: "Invite new users" }] },
        { type: "line", parts: [{ text: "Organize contacts using tags" }] },
      ],
    },
    {
      paragraphs: [{ text: "Managing Invitations", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Pending invitations", bold: true },
            { text: " show people you’ve invited but who haven’t joined yet" },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "Archived contacts", bold: true },
            { text: " are hidden but not deleted" },
          ],
        },
      ],
    },

    // Notes
    {
      title: "Notes",
      paragraphs: [
        { text: "Creating Notes", isBold: true },
        { text: "Notes are lightweight documents used for:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Personal reminders" }] },
        { type: "line", parts: [{ text: "Meeting notes" }] },
        { type: "line", parts: [{ text: "Quick ideas" }] },
      ],
      after: [{ text: "Each note includes:" }],
    },
    {
      title: "",

      bullets: [
        { type: "line", parts: [{ text: "A creation timestamp" }] },
        { type: "line", parts: [{ text: "Editable content" }] },
        { type: "line", parts: [{ text: "Manual save option" }] },
      ],
      after: [{ text: "Notes are stored securely inside your workspace." }],
    },

    // Activity & Notifications + Customizing in same screenshot but we keep as 2 sections
    {
      title: "Activity & Notifications",
      paragraphs: [{ text: "The Activity panel shows:" }],
      bullets: [
        { type: "line", parts: [{ text: "Recent actions" }] },
        {
          type: "line",
          parts: [{ text: "Updates related to files and messages" }],
        },
      ],
      after: [{ text: "You can:" }],
    },
    {
      title: "",
      bullets: [
        {
          type: "line",
          parts: [{ text: "Review what happened while you were away" }],
        },
        {
          type: "line",
          parts: [{ text: "Mark all notifications as read" }],
        },
      ],
    },

    // Customizing
    {
      title: "Customizing Your Workspace",
      paragraphs: [{ text: "Background & Theme", isBold: true }],
      after: [{ text: "You can personalize how Drumee looks:" }],
      bullets: [
        { type: "line", parts: [{ text: "Choose a built-in background" }] },
        {
          type: "line",
          parts: [{ text: "Upload your own image (up to 10 MB)" }],
        },
        { type: "line", parts: [{ text: "Select a color theme" }] },
      ],
      after: [{ text: "Customization only affects your own workspace view." }],
    },

    // Account Settings
    {
      title: "Account Settings",
      paragraphs: [{ text: "Profile", isBold: true }],
      bullets: [
        {
          type: "line",
          marker: "none",
          parts: [
            { text: "In " },
            { text: "Settings → Profile", bold: true },
            { text: ", you can:" },
          ],
        },
        { type: "line", parts: [{ text: "Update your name" }] },
        { type: "line", parts: [{ text: "Change your avatar" }] },
        { type: "line", parts: [{ text: "Manage your email and country" }] },
      ],
    },
    {
      paragraphs: [{ text: "Security", isBold: true }],
      bullets: [
        {
          type: "line",
          marker: "none",
          parts: [
            { text: "In " },
            { text: "Settings → Security", bold: true },
            { text: ", you can:" },
          ],
        },
        { type: "line", parts: [{ text: "Change your password" }] },
        {
          type: "line",
          parts: [{ text: "Enable multi-factor authentication (MFA)" }],
        },
        { type: "line", parts: [{ text: "Log out from the current device" }] },
      ],
      after: [
        { text: "MFA adds an extra layer of protection to your account." },
      ],
    },

    // Privacy
    {
      title: "Privacy & Access Control",
      paragraphs: [
        { text: "Drumee is privacy-first by design." },
        { text: "Key rules:" },
      ],
      bullets: [
        { type: "line", parts: [{ text: "Personal workspaces are never shared" }] },
        {
          type: "line",
          parts: [
            { text: "Internal workspaces are accessible only to invited users" },
          ],
        },
        {
          type: "line",
          parts: [{ text: "Access can be controlled at the folder level" }],
        },
        {
          type: "line",
          parts: [
            { text: "You decide who can see and interact with your content" },
          ],
        },
      ],
    },

    // Typical Use Cases (with sub blocks)
    {
      title: "Typical Use Cases",
      paragraphs: [{ text: "Personal Workspace", isBold: true }],
      bullets: [
        { type: "line", parts: [{ text: "A workspace only you can access" }] },
        { type: "line", parts: [{ text: "Notes for daily planning" }] },
        { type: "line", parts: [{ text: "Customized background" }] },
      ],
    },
    {
      paragraphs: [{ text: "Team Collaboration", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [{ text: "External folders for shared projects" }],
        },
        {
          type: "line",
          parts: [{ text: "Folder-based chat for discussions" }],
        },
        {
          type: "line",
          parts: [{ text: "Controlled access for each collaborator" }],
        },
      ],
    },
    {
      paragraphs: [{ text: "External Sharing", isBold: true }],
      bullets: [
        {
          type: "line",
          parts: [
            { text: "Share files without exposing your entire workspace" },
          ],
        },
        {
          type: "line",
          parts: [{ text: "Keep conversations and files in one place" }],
        },
      ],
    },
  ],
};

// ---------- render ----------
function documentations(ui) {
  const fig = figOf(ui);

  return [
    docTitle(ui, DOCS.title),
    ...DOCS.sections.map((s) => section(ui, s)),
  ];
}

export default documentations;
