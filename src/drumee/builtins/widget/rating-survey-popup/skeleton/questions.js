/**
 * PMF survey definition — source: Drumee_PMF_Program.md (v1.0, May 2026).
 * 4 pages. type: text (Textarea) | choice (radio) | multi (checkboxes).
 * `follow`: per-option follow-up textarea (answer key = `${id}_follow`).
 * Only q4 is required (Sean Ellis PMF metric).
 *
 * Exported as a function (not a constant) so LOCALE is read at render time,
 * after the locale bundle has loaded.
 */
const L = (key, fb) => LOCALE[key] || fb;

module.exports = function pages() {
  return [
    [ // page 1
      { id: "q1", type: "text", label: L("PMF_Q1_LABEL", "What is Drumee, in your own words?"), rows: 2 },
      {
        id: "q2", type: "choice", label: L("PMF_Q2_LABEL", "Did Drumee click for you in the first week?"),
        options: [L("PMF_Q2_OPT_1", "Yes"), L("PMF_Q2_OPT_2", "Somewhat"), L("PMF_Q2_OPT_3", "No")],
        follow: [L("PMF_Q2_FOLLOW_YES", "What triggered it?"), L("PMF_Q2_FOLLOW_NO", "What would you change?"), L("PMF_Q2_FOLLOW_NO", "What would you change?")],
      },
      { id: "q3", type: "text", label: L("PMF_Q3_LABEL", "Your biggest frustration before Drumee?"), rows: 3 },
    ],
    [ // page 2
      {
        id: "q4", type: "choice", required: 1, label: L("PMF_Q4_LABEL", "How would you feel if you could no longer use Drumee?"),
        options: [L("PMF_Q4_OPT_1", "Very Disappointed"), L("PMF_Q4_OPT_2", "Somewhat Disappointed"), L("PMF_Q4_OPT_3", "Not Disappointed")],
      },
      { id: "q5", type: "text", label: L("PMF_Q5_LABEL", "What do you like MOST about Drumee?"), rows: 3 },
      { id: "q6", type: "text", label: L("PMF_Q6_LABEL", "What do you like LEAST about Drumee?"), rows: 3 },
    ],
    [ // page 3
      {
        id: "q7", type: "multi", label: L("PMF_Q7_LABEL", "Where are you with Drumee right now?"),
        options: [
          L("PMF_Q7_OPT_1", "Keep using it"), L("PMF_Q7_OPT_2", "Recommended it"),
          L("PMF_Q7_OPT_3", "Want to self-host"), L("PMF_Q7_OPT_4", "Would pay"),
          L("PMF_Q7_OPT_5", "Still evaluating"), L("PMF_Q7_OPT_6", "Won't keep using it"),
        ],
      },
      { id: "q8", type: "text", label: L("PMF_Q8_LABEL", "ONE thing that would make Drumee 10x better?"), rows: 2 },
    ],
    [ // page 4 — demographics
      {
        id: "qb1", type: "choice", label: L("PMF_QB1_LABEL", "What type of team do you work in?"),
        options: [
          L("PMF_QB1_OPT_1", "Agency"), L("PMF_QB1_OPT_2", "Tech Team"),
          L("PMF_QB1_OPT_3", "Healthcare"), L("PMF_QB1_OPT_4", "Legal"),
          L("PMF_QB1_OPT_5", "Freelancer"), L("PMF_QB1_OPT_6", "Other"),
        ],
        follow: [null, null, null, null, null, L("PMF_QB1_FOLLOW", "Please specify")],
      },
      {
        id: "qb2", type: "choice", label: L("PMF_QB2_LABEL", "Primary way you use Drumee?"),
        options: [
          L("PMF_QB2_OPT_1", "Team files + collaboration"), L("PMF_QB2_OPT_2", "Client workspace"),
          L("PMF_QB2_OPT_3", "Knowledge base"), L("PMF_QB2_OPT_4", "Secure storage"),
          L("PMF_QB2_OPT_5", "Developer workflow"), L("PMF_QB2_OPT_6", "Other"),
        ],
      },
      {
        id: "qb3", type: "choice", label: L("PMF_QB3_LABEL", "Team size?"),
        options: [
          L("PMF_QB3_OPT_1", "Solo"), L("PMF_QB3_OPT_2", "2–5"), L("PMF_QB3_OPT_3", "6–20"),
          L("PMF_QB3_OPT_4", "21–50"), L("PMF_QB3_OPT_5", "50+"),
        ],
      },
      { id: "qb4", type: "text", label: L("PMF_QB4_LABEL", "What would you use instead?"), rows: 1 },
      { id: "qb5", type: "text", label: L("PMF_QB5_LABEL", "Biggest benefit vs your previous tool?"), rows: 2 },
    ],
  ];
};
