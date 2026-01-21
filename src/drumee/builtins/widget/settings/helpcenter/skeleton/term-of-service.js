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
    return boxX(`${fig} wrap-description lengthy-text`, [
      bulletMarker(marker),
      ...renderParts(ui, b.parts),
    ]);
  }

  if (b.type === "block") {
    return boxY(`${fig}`, [
      boxX(`${fig} wrap-description lengthy-text`, [
        bulletMarker(marker),
        ...renderParts(ui, b.head),
      ]),
      boxX(`${fig} wrap-description lengthy-text`, [
        bulletSpacer(fig, marker),
        ...renderParts(ui, b.body),
      ]),
    ]);
  }

  if (b.type === "sublist") {
    return boxY(`${fig}`, [
      ...b.items.map((it) =>
        boxX(`${fig} wrap-description lengthy-text`, [
          bulletSpacer(fig, "subdot"),
          bulletMarker("subdot"),
          ...renderParts(ui, it.parts),
        ]),
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
// const TOS = {
//   title: "Terms of Service",
//   lastUpdated: "Dec 16, 2025",
//   intro: [
//     `These Terms of Service ("Terms") govern your access to and use of Drumee ("Drumee", "we", "our", or "us"), including our website, applications, and services (collectively, the "Service"). By creating an account or using Drumee, you agree to be bound by these Terms.`,
//     "If you do not agree to these Terms, you must not use the Service.",
//   ],

//   sections: [
//     {
//       title: "1. Description of the Service",
//       paragraphs: [
//         "Drumee is a cloud-based workspace that allows users to store files, create folders, communicate with others, manage contacts, and collaborate securely.",
//         "The Service may evolve over time. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.",
//       ],
//     },

//     {
//       title: "2. Eligibility",
//       paragraphs: [
//         "You must be at least 16 years old to use Drumee. By using the Service, you represent and warrant that:",
//       ],
//       bullets: [
//         {
//           type: "line",
//           parts: [{ text: "You meet the minimum age requirement" }],
//         },
//         {
//           type: "line",
//           parts: [
//             { text: "You have the legal capacity to enter into these Terms" },
//           ],
//         },
//         {
//           type: "line",
//           parts: [
//             {
//               text: "You are using the Service in compliance with applicable laws",
//             },
//           ],
//         },
//       ],
//     },

//     {
//       title: "3. Account Registration and Security",
//       paragraphs: [{ text: "3.1 Account Creation", isBold: true }],
//       after: [
//         "You are responsible for providing accurate and complete information when creating an account.",
//       ],
//     },
//     {
//       paragraphs: [
//         { text: "3.2 Account Security", isBold: true },
//         { text: "You are responsible for:" },
//       ],
//       bullets: [
//         {
//           type: "line",
//           parts: [
//             {
//               text: "Maintaining the confidentiality of your login credentials",
//             },
//           ],
//         },
//         {
//           type: "line",
//           parts: [{ text: "All activities that occur under your account" }],
//         },
//       ],
//       after: [
//         "You agree to notify us immediately of any unauthorized access or security breach.",
//       ],
//     },

//     {
//       title: "4. Acceptable Use",
//       paragraphs: ["You agree not to use Drumee to:"],
//       bullets: [
//         {
//           type: "line",
//           parts: [{ text: "Violate any applicable laws or regulations" }],
//         },
//         {
//           type: "line",
//           parts: [
//             { text: "Upload or share illegal, harmful, or abusive content" },
//           ],
//         },
//         {
//           type: "line",
//           parts: [{ text: "Infringe intellectual property or privacy rights" }],
//         },
//         {
//           type: "line",
//           parts: [
//             { text: "Attempt to gain unauthorized access to systems or data" },
//           ],
//         },
//         {
//           type: "line",
//           parts: [{ text: "Disrupt or interfere with the Service" }],
//         },
//       ],
//       after: [
//         "We reserve the right to suspend or terminate accounts that violate these rules.",
//       ],
//     },

//     {
//       title: "5. User Content",
//       paragraphs: [{ text: "5.1 Ownership", isBold: true }],
//       after: [
//         `You retain full ownership of all content you upload, store, or create on Drumee ("User Content"). Drumee does not claim ownership of your files, messages, notes, or any other data.`,
//       ],
//     },
//     {
//       paragraphs: [
//         { text: "5.2 No Data Exploitation", isBold: true },
//         {
//           text: "Drumee does not collect, analyze, sell, or navigate through your User Content for advertising, profiling, training models, or any other secondary purpose.",
//         },
//         { text: "Your data is:" },
//       ],
//       bullets: [
//         { type: "line", parts: [{ text: "Not mined" }] },
//         { type: "line", parts: [{ text: "Not analyzed for commercial gain" }] },
//         { type: "line", parts: [{ text: "Not shared with third parties" }] },
//         {
//           type: "line",
//           parts: [{ text: "Not accessed manually by Drumee staff" }],
//         },
//       ],
//     },
//     {
//       paragraphs: [
//         { text: "5.3 Limited License for Service Operation", isBold: true },
//       ],
//       after: [
//         "You grant Drumee a limited, non-exclusive, and revocable license to host, store, process, and transmit your User Content solely for the purpose of operating the Service and providing features you explicitly use.",
//         "Any access to User Content beyond normal system operation requires your explicit consent, unless required by law.",
//       ],
//     },

//     {
//       title: "6. Privacy and Data Protection",
//       paragraphs: [
//         "Drumee is designed with a privacy-first architecture.",
//         "We do not collect, analyze, monetize, or navigate through your content or personal data for purposes other than providing the Service you explicitly choose to use.",
//       ],
//     },
//     {
//       paragraphs: [
//         { text: "6.1 What We Do NOT Do", isBold: true },
//         { text: "Drumee does not:" },
//       ],
//       bullets: [
//         {
//           type: "line",
//           parts: [{ text: "Track your behavior for advertising" }],
//         },
//         { type: "line", parts: [{ text: "Sell or share your personal data" }] },
//         {
//           type: "line",
//           parts: [
//             {
//               text: "Analyze your files, messages, or notes for analytics or profiling",
//             },
//           ],
//         },
//         {
//           type: "line",
//           parts: [{ text: "Use your data to train algorithms or models" }],
//         },
//       ],
//     },
//     {
//       paragraphs: [
//         { text: "6.2 Minimal Data Processing", isBold: true },
//         { text: "We process only the minimum technical data required to:" },
//       ],
//       bullets: [
//         { type: "line", parts: [{ text: "Create and maintain your account" }] },
//         { type: "line", parts: [{ text: "Authenticate access" }] },
//         {
//           type: "line",
//           parts: [{ text: "Store and transmit your content at your request" }],
//         },
//         {
//           type: "line",
//           parts: [{ text: "Ensure security, reliability, and performance" }],
//         },
//       ],
//       after: [
//         "This processing is strictly limited to operating the Service and is never used for secondary purposes.",
//       ],
//     },
//     {
//       paragraphs: [{ text: "6.3 User Control and Consent", isBold: true }],
//       after: [
//         "Any access to your data beyond automated system operations requires your explicit consent, unless disclosure is required by law.",
//         "You remain in full control of your data at all times.",
//       ],
//     },

//     {
//       title: "7. Storage and Data Limits",
//       paragraphs: ["Drumee provides storage based on your selected plan."],
//       bullets: [
//         { type: "line", parts: [{ text: "Storage limits may apply" }] },
//         {
//           type: "line",
//           parts: [
//             {
//               text: "Exceeding limits may restrict uploads or require plan upgrades",
//             },
//           ],
//         },
//       ],
//       after: [
//         "We are not responsible for data loss caused by exceeding storage limits.",
//       ],
//     },

//     {
//       title: "8. Third-Party Services",
//       paragraphs: [
//         "Drumee may integrate or link to third-party services. We are not responsible for third-party content, policies, or practices.",
//         "Your use of third-party services is governed by their respective terms.",
//       ],
//     },

//     {
//       title: "9. Intellectual Property",
//       paragraphs: [
//         "All intellectual property related to Drumee, including software, design, trademarks, and logos, is owned by Drumee or its licensors.",
//         "You may not copy, modify, distribute, or reverse-engineer any part of the Service without prior written consent.",
//       ],
//     },

//     {
//       title: "10. Termination",
//       paragraphs: [
//         "You may stop using Drumee at any time.",
//         "We may suspend or terminate your access if:",
//       ],
//       bullets: [
//         { type: "line", parts: [{ text: "You violate these Terms" }] },
//         {
//           type: "line",
//           parts: [{ text: "Your use poses a security or legal risk" }],
//         },
//         { type: "line", parts: [{ text: "Required by law" }] },
//       ],
//       after: ["Upon termination, your right to access the Service will end."],
//     },

//     {
//       title: "11. Disclaimer of Warranties",
//       paragraphs: [
//         'The Service is provided "as is" and "as available".',
//         "We make no warranties regarding:",
//       ],
//       bullets: [
//         { type: "line", parts: [{ text: "Availability or reliability" }] },
//         { type: "line", parts: [{ text: "Accuracy of content" }] },
//         { type: "line", parts: [{ text: "Fitness for a particular purpose" }] },
//       ],
//       after: ["Your use of Drumee is at your own risk."],
//     },

//     {
//       title: "12. Limitation of Liability",
//       paragraphs: [
//         "To the maximum extent permitted by law, Drumee shall not be liable for:",
//       ],
//       bullets: [
//         {
//           type: "line",
//           parts: [{ text: "Indirect or consequential damages" }],
//         },
//         {
//           type: "line",
//           parts: [{ text: "Loss of data, profits, or business" }],
//         },
//       ],
//       after: [
//         "Our total liability shall not exceed the amount you paid to Drumee in the last 12 months, if any.",
//       ],
//     },

//     {
//       title: "13. Indemnification",
//       paragraphs: [
//         "You agree to indemnify and hold Drumee harmless from any claims, damages, or expenses arising from:",
//       ],
//       bullets: [
//         { type: "line", parts: [{ text: "Your use of the Service" }] },
//         { type: "line", parts: [{ text: "Your violation of these Terms" }] },
//         { type: "line", parts: [{ text: "Your User Content" }] },
//       ],
//     },

//     {
//       title: "14. Changes to These Terms",
//       paragraphs: [
//         "We may update these Terms from time to time.",
//         "If changes are material, we will provide notice through the Service or by email. Continued use of Drumee after changes become effective constitutes acceptance of the updated Terms.",
//       ],
//     },

//     {
//       title: "15. Governing Law",
//       paragraphs: [
//         "These Terms of Service shall be governed by and construed in accordance with the laws of France, without regard to its conflict of law principles.",
//         "Any dispute arising out of or in connection with these Terms or the use of the Service shall fall under the exclusive jurisdiction of the competent courts of France",
//       ],
//     },

//     {
//       title: "16. Contact Information",
//       paragraphs: [
//         "If you have questions about these Terms of Service, need assistance, or wish to contact Drumee for service-related matters, you can reach us at:",
//       ],
//       bullets: [
//         {
//           type: "line",
//           marker: "none",
//           parts: [{ text: "Email: " }, { text: "fren@drumee.org", bold: true }],
//         },
//       ],
//       after: [
//         "By using Drumee, you acknowledge that you have read, understood, and agreed to these Terms of Service.",
//       ],
//     },
//   ],
// };

const TOS = {
  title: "GENERAL TERMS OF USE – DRUMEE",
  lastUpdated: "2026",

  intro: [
    "IT IS IMPORTANT THAT YOU READ THESE GENERAL TERMS OF USE CAREFULLY BEFORE DOWNLOADING THE DRUMEE SOFTWARE.",
    "IF YOU DO NOT WISH TO ACCEPT THE TERMS OF THESE GENERAL CONDITIONS, YOU MUST NOT CLICK ON “I ACCEPT” OR DOWNLOAD THE SOFTWARE.",
    "BY CLICKING ON “I ACCEPT” AND DOWNLOADING THE SOFTWARE, YOU AGREE TO COMPLY WITH THE TERMS OF THESE GENERAL CONDITIONS, WHICH CONSTITUTE A CONTRACT BETWEEN THE COMPANY “XIALIA” AND YOURSELF.",
  ],

  sections: [
    {
      title: "1 – Definitions",
      paragraphs: [
        "The terms defined in this article and used in these General Terms of Use shall have the following meanings:",
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "“GTU”: refers to these General Terms of Use." }],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Client”: refers to any legal entity that has entered into a Contract with the Company.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Contract”: refers to the service agreement entered into between the Company and the Client, under which the User is authorized to use the Software in accordance with the License.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“License”: refers to the right to use the Software granted to the User (via the Client) for the duration provided for in these GTU.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Software”: refers to the software solution “Drumee” provided to the Client by the Company, consisting of a collaborative system.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Party(ies)”: refers to the Company and the Administrator User, individually or collectively.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Services”: refers to the services offered by the Software as described herein.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Company” (or “THIDIMA”): refers to the company distributing the Software: THIDIMA, a public limited company registered with the Valais Commercial Register under number CHE-336.437.933, with its registered office at c/o Fiduciaire Fidag SA, Rue de la Blancherie 2, 1950 Sion, Switzerland.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Guest User”: refers to any natural person authorized by the Client to use the Software in the course of their professional activity, as a member of the Client’s staff, an external guest, etc.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“Administrator User”: refers to a natural person who is a member of the Client’s staff, authorized by the Client to download and/or use the Software, and benefiting from the most extensive Services on the Software, in particular access to an administration interface.",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "“User”: refers indiscriminately to any user authorized by the Client to use the Software, whether an Administrator User or a Guest User.",
            },
          ],
        },
      ],
    },

    {
      title: "2 – Scope of Application",
      paragraphs: [
        {
          text: "2.1 These GTU define the terms and conditions under which:",
          isBold: true,
        },
      ],
      bullets: [
        {
          type: "line",
          parts: [
            {
              text: "the Administrator User is authorized to download and use the Software,",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "the Guest User is authorized to use the Software.",
            },
          ],
        },
      ],
    },

    {
      paragraphs: [
        { text: "2.2", isBold: true },
        "These GTU are provided to the Client at the time the Contract is entered into, it being specified that the Client guarantees compliance with these GTU by any User to whom it grants access to the Software. Any use of the Software by a User implies full and unconditional acceptance of these GTU. They are also provided to the Administrator User for acceptance before the latter may download the Software.",
      ],
    },

    {
      paragraphs: [
        { text: "2.3", isBold: true },
        "The relationship between the Parties shall always be governed by the latest version of the GTU in force on the date of use of the Software by the User. In the event of any modification to these GTU, the new GTU shall be communicated to the Client, who shall be responsible for communicating them to the Users to whom it grants access to the Software.",
      ],
    },

    {
      title: "3 – Description of the Software",
      paragraphs: [
        "The Software is an “Autonomous Collaborative System”, natively equipped with the main collaborative tools commonly used by companies for remote work and distributed teams. Based on the new web operating system Drumee OS, it can be installed on any type of private infrastructure, NAS, or servers. It enables companies to eliminate reliance on cloud services for collaborative work and to regain confidentiality over their data, which is no longer entrusted to third-party companies.",
        "It includes an administration interface allowing the Client, via the Administrator User, to manage all User access to the Software and their associated rights.",
      ],
    },

    {
      title: "4 – Access to the Software",
      paragraphs: [
        "Once the Contract has been concluded by the Client and the price paid to the Company in accordance with THIDIMA’s General Terms and Conditions of Sale, the Administrator User designated by the Client receives an access key with a license number by email.",
        "The Administrator User is invited to click on the web link provided in order to activate the license and use the Software on their IT infrastructure.",
        "Before using the Software, the Administrator User must read and expressly accept these GTU.",
        "Once the GTU have been accepted, the Administrator User may use the Software, access the Services, and create access for Guest Users via the administration interface.",
      ],
    },

    {
      title: "5 – Services Provided by the Software",
      paragraphs: [
        {
          text: "5.1 Services Available to the Administrator User",
          isBold: true,
        },
        "The Administrator User has access to an administration console enabling them to manage their IT organization, with the following main features:",
      ],
      bullets: [
        {
          type: "line",
          parts: [
            {
              text: "Creation, modification, deletion, and blocking of internal accounts",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "Security settings – passwords and two-factor authentication",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "Access to Guest User accounts only with their authorization",
            },
          ],
        },
      ],
    },

    {
      paragraphs: [
        { text: "5.2 Services Available to All Users", isBold: true },
        "Once access to the Software has been created by the Administrator User, the Guest User may access the following Services:",
      ],
      bullets: [
        {
          type: "line",
          parts: [
            {
              text: "File management: classification, viewing, transfer, sharing, shared spaces",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "Communication: sharing, chat, calls, video",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "Organization: contact directory, shared calendar (under development)",
            },
          ],
        },
      ],
    },

    {
      paragraphs: [{ text: "5.3 Service Developments", isBold: true }],
      after: [
        "The Administrator User acknowledges that the Software may evolve and that the Services may be adapted accordingly.",
        "Any improvement, removal, or substantial modification of Services offered on the Software shall be notified to the Client and/or the Administrator User.",
        "The Administrator User is informed that the provision of Software updates is not systematic and may be subject to the Client subscribing to an additional plan including evolutionary maintenance of the Software.",
      ],
    },

    {
      title: "6 – User Obligations",
      paragraphs: [
        {
          text: "6.1 Obligations of the Administrator User Regarding Use of the Software",
          isBold: true,
        },
        "In using the Software, the Administrator User undertakes to:",
      ],
      bullets: [
        {
          type: "line",
          parts: [
            {
              text: "not use the Software for fraudulent purposes or purposes not provided for in these GTU;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "not impersonate another person or attempt to access any administrator account other than their own;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "not conduct system analysis equivalent to reverse engineering, nor develop or market, directly or indirectly through the Client, products identical or similar to the Software that may compete with the Company;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "not upload viruses or files that may compromise the integrity of the Software;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "not transmit any unsolicited electronic messages, including chain emails or advertising messages, nor any content containing computer viruses or any other code designed to interrupt, destroy, or limit the functionality of any software, computer, or telecommunications tool;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "comply with the conditions, instructions, and general rules communicated by THIDIMA for proper use of the Software;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "and, more generally, use the platform reasonably, in compliance with these GTU and applicable regulations.",
            },
          ],
        },
      ],
    },

    {
      paragraphs: [
        {
          text: "6.2 Obligations Relating to Content Distributed by the User on the Software",
          isBold: true,
        },
        "It is recalled that the Company assumes no responsibility whatsoever for content distributed on the Software, whether as publisher or host.",
        "The User and/or the Client is therefore solely responsible for the content published on the Software, including data, databases, text, photos, videos, etc., that may be published in the course of using the Services.",
      ],
    },

    {
      title: "7 – Intellectual Property",
      paragraphs: [
        {
          text: "7.1",
          isBold: true,
        },
        "All intellectual property rights relating to the Software and all its components (source code, object code, graphical interface, documentation, the “DRUMEE” trademark, logos, etc.) are the full and exclusive property of the Company, its officers, and/or its partners.",
      ],
    },

    {
      paragraphs: [
        {
          text: "7.2 The User undertakes not to infringe these rights.",
          isBold: true,
        },
        "In particular, the User is prohibited from:",
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "copying the Software or any element thereof;" }],
        },
        {
          type: "line",
          parts: [
            {
              text: "distributing copies of the Software or its content to third parties;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "using the Software specifications to create or allow the creation of a program with the same purpose;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "modifying, altering, revising, or decompiling the Software for any purpose;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "making the Software documentation available to third parties, directly or indirectly, in any form or for any reason;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "using passwords and/or identifiers for purposes other than authentication;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "assigning, renting, sub-renting, or transferring the right of use to a third party;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "failing to comply with the Software’s functionalities." },
          ],
        },
      ],
    },

    {
      title: "8 – Personal Data",
      paragraphs: [
        "For the purposes of this article, “Personal Data” of the User includes, in particular, their last name, first name, telephone number, email address, postal address, and photograph.",
        "During maintenance operations required for the proper functioning of the Software, the Company may have access to Users’ Personal Data within the meaning of the French Data Protection Act of January 6, 1978 as amended, and the General Data Protection Regulation (GDPR).",
        "To learn more about the Company’s privacy policy and how Personal Data is processed, Users are invited to consult the privacy policy available on the website: https://drumee.org",
      ],
    },

    {
      title: "9 – Warranties – Liability",
      paragraphs: [
        { text: "9.1", isBold: true },
        "The User is deemed to have full knowledge of the Services accessed and expressly acknowledges having received all necessary information from the Company for using the Software, particularly regarding precautions for its implementation and use. Although THIDIMA takes all necessary precautions to provide accurate information, such information has no contractual value, and THIDIMA’s liability shall not be incurred on this basis.",
      ],
    },

    {
      paragraphs: [
        { text: "9.2", isBold: true },
        "The Company shall not be held liable for content published by the User on the Software, the User being the editor and the Client the host of such content. The User and/or the Client guarantees the Company against all direct and indirect, material and immaterial damages resulting from such content.",
      ],
    },

    {
      paragraphs: [
        { text: "9.3", isBold: true },
        "THIDIMA shall under no circumstances be liable for any damage whatsoever (including, without limitation, loss of profits or loss of information) arising from the use or inability to use the Software, even if THIDIMA has been advised of the possibility of such damage.",
      ],
    },

    {
      paragraphs: [
        { text: "9.4", isBold: true },
        "THIDIMA shall not be liable for indirect damages, including commercial, moral, or financial loss, loss of profits, loss of opportunity, data inaccuracy or corruption, or the cost of obtaining substitute products or services.",
      ],
    },

    {
      paragraphs: [
        { text: "9.5", isBold: true },
        "THIDIMA shall not be liable for the implementation of IT security measures (antivirus, firewall, etc.) required to protect User workstations, nor for any resulting consequences (such as Software slowdowns).",
      ],
    },

    {
      paragraphs: [
        { text: "9.6", isBold: true },
        "The User is solely responsible for their use of the Services, to the exclusion of THIDIMA. Any damages resulting from data transferred to the Software are therefore not the responsibility of THIDIMA. The User acknowledges that data circulating on the internet may be subject to regulations or protected by intellectual property rights.",
      ],
    },

    {
      paragraphs: [
        { text: "9.7", isBold: true },
        "In the event that the Company’s liability is invoked, in particular due to malfunction of the Software, the Company may, at its sole discretion, remedy the issue by correcting the defect or updating the Software.",
      ],
    },

    {
      title: "10 – Term",
      paragraphs: [
        "Access to the Software by the Administrator User is effective from activation of the subscription. Access by the Guest User is effective from the creation of their account by the Administrator User.",
        "The Administrator User’s License is not limited in time.",
        "Access to the Software by Users is entirely managed by the Administrator User. In particular, access may be suspended or terminated at any time at the Client’s discretion.",
        "Any use of the Software without a valid License constitutes an act of infringement and engages the User’s civil liability towards the Company.",
      ],
    },

    {
      title: "11 – Governing Law and Jurisdiction",
      paragraphs: [
        { text: "11.1", isBold: true },
        "These GTU and the relationship between the Company and the User are governed by Swiss law.",
      ],
    },

    {
      paragraphs: [
        { text: "11.2", isBold: true },
        "Any dispute arising herefrom shall be submitted to the competent courts.",
      ],
    },

    {
      paragraphs: [
        { text: "11.3", isBold: true },
        "If the Company provides an English translation of these GTU, the User acknowledges all its components (source code, object code, graphical interface, documentation, the “DRUMEE” trademark, logos, etc.) are the full and exclusive property of the Company, its officers, and/or its partners.",
        "The User undertakes not to infringe these rights.",
        "In particular, the User is prohibited from:",
      ],
      bullets: [
        {
          type: "line",
          parts: [{ text: "copying the Software or any element thereof;" }],
        },
        {
          type: "line",
          parts: [
            {
              text: "distributing copies of the Software or its content to third parties;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "using the Software specifications to create or allow the creation of a program with the same purpose;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "modifying, altering, revising, or decompiling the Software for any purpose;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "making the Software documentation available to third parties, directly or indirectly, in any form or for any reason;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "using passwords and/or identifiers for purposes other than authentication;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            {
              text: "assigning, renting, sub-renting, or transferring the right of use to a third party;",
            },
          ],
        },
        {
          type: "line",
          parts: [
            { text: "failing to comply with the Software’s functionalities." },
          ],
        },
      ],
    },

    {
      title: "12 – Waiver",
      paragraphs: [
        "No tolerance by either Party of any breach by the other shall be deemed a waiver of any rights granted under these GTU.",
      ],
    },

    {
      title: "13 – Evidence",
      paragraphs: [
        "In the event of a dispute, the Parties agree that emails and exchanges via the Software constitute original written evidence and waive any challenge to their evidential value, subject only to disputes as to authenticity.",
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
