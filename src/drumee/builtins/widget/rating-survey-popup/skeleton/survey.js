/**
 * Survey state: renders wizard page ui.getPage() (0..3) from questions.js.
 * Answers live on the widget instance; free text is captured by the widget
 * (_captureTexts) before every re-render.
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;
  const pages = require("./questions")();
  const page = ui.getPage();
  const defs = pages[page] || [];

  const qBlock = (q) => {
    const kids = [
      Skeletons.Note({
        className: `${pfx}__q-label`,
        dataset: { required: q.required ? 1 : 0 },
        content: q.label,
      }),
    ];
    if (q.type === "text") {
      kids.push(Skeletons.Textarea({
        className: `${pfx}__q-input`,
        name: q.id,
        value: ui.getAnswer(q.id) || "",
        // Without an explicit placeholder the entry widget falls back to
        // LOCALE.FORM_ENTRY, a key that doesn't exist -> renders "FORM_ENTRY".
        placeholder: LOCALE.RATING_SURVEY_INPUT_PLACEHOLDER || "Type your answer…",
        rows: q.rows || 2,
        require: "any",
        ignoreEnter: true,
        uiHandler: [ui],
      }));
    } else {
      const picked = ui.getAnswer(q.id);
      q.options.forEach((label, idx) => {
        const on = q.type === "multi"
          ? (Array.isArray(picked) && picked.includes(idx))
          : picked === idx;
        kids.push(Skeletons.Box.X({
          className: `${pfx}__q-opt`,
          dataset: { on: on ? 1 : 0, kind: q.type },
          service: q.type === "multi" ? "survey-multi" : "survey-choice",
          uiHandler: [ui],
          qid: q.id,
          idx,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Note({ className: `${pfx}__q-mark`, content: "" }),
            Skeletons.Note({ className: `${pfx}__q-opt-label`, content: label }),
          ],
        }));
        // Per-option follow-up textarea (Q2, QB1 "Other").
        if (q.follow && q.follow[idx] && q.type === "choice" && picked === idx) {
          kids.push(Skeletons.Textarea({
            className: `${pfx}__q-input ${pfx}__q-follow`,
            name: `${q.id}_follow`,
            value: ui.getAnswer(`${q.id}_follow`) || "",
            placeholder: q.follow[idx],
            rows: 2,
            require: "any",
            ignoreEnter: true,
            uiHandler: [ui],
          }));
        }
      });
      if (q.id === "q4" && ui.hasQ4Error()) {
        kids.push(Skeletons.Note({
          className: `${pfx}__q-error`,
          content: LOCALE.RATING_SURVEY_REQUIRED || "Please answer this question to continue",
        }));
      }
    }
    return Skeletons.Box.Y({ className: `${pfx}__q`, kids });
  };

  const dots = pages.map((p, i) => Skeletons.Note({
    className: `${pfx}__dot`,
    dataset: { on: i === page ? 1 : 0 },
    content: "",
  }));

  const last = page === pages.length - 1;
  return Skeletons.Box.Y({
    className: `${pfx}__body ${pfx}__body--survey`,
    kids: [
      Skeletons.Box.X({ className: `${pfx}__dots`, kids: dots }),
      Skeletons.Box.Y({ className: `${pfx}__questions`, kids: defs.map(qBlock) }),
      Skeletons.Box.X({
        className: `${pfx}__footer`,
        kids: [
          page > 0 ? Skeletons.Note({
            className: `${pfx}__cancel`,
            content: LOCALE.RATING_SURVEY_BACK || "Back",
            service: "survey-back",
            uiHandler: [ui],
          }) : Skeletons.Note({ className: `${pfx}__spacer`, content: "" }),
          Skeletons.Note({
            className: `${pfx}__primary-btn`,
            content: last
              ? (LOCALE.RATING_SURVEY_SEND || "Send feedback")
              : (LOCALE.RATING_SURVEY_NEXT || "Next"),
            service: last ? "survey-send" : "survey-next",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
