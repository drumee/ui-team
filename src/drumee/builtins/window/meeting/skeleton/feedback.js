/**
 * Post-meeting feedback popup. Shown when the local user leaves a folder
 * meeting (or the meeting empties out). Frontend-only — Submit collects
 * rating + comment, calls back to the window via "feedback-submit", and
 * closes the meeting. Skip closes without collecting.
 *
 * Layout follows Figma 172:100435 in the Drumee design file.
 */
const __window_meeting_feedback = function (_ui_, opts = {}) {
  const fig = _ui_.fig.family;
  const { duration = "0:00", participantCount = 0, ended = true } = opts;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      Skeletons.Button.Svg({
        className: `${fig}__feedback-star`,
        ico: "app-rating-star",
        service: "rate-meeting",
        sys_pn: `feedback-star-${i}`,
        uiHandler: [_ui_],
        partHandler: _ui_,
        dataset: { rating: i, on: "0" },
      }),
    );
  }

  const card = Skeletons.Box.Y({
    className: `${fig}__feedback-card`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__feedback-header`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__feedback-icon`,
            kids: [Skeletons.Image.Svg({ ico: "app-check" })],
          }),
          Skeletons.Note({
            className: `${fig}__feedback-title`,
            // `ended` false = the host left a meeting that is still running for
            // everyone else, so it has NOT ended.
            content: ended ? LOCALE.MEETING_ENDED : LOCALE.YOU_LEFT_THE_MEETING,
          }),
        ],
      }),

      Skeletons.Box.X({
        className: `${fig}__feedback-stats`,
        kids: [
          Skeletons.Note({
            className: `${fig}__feedback-stat`,
            content: `${LOCALE.DURATION || "Duration"}: ${duration}`,
          }),
          Skeletons.Note({
            className: `${fig}__feedback-stats-dot`,
            content: "",
          }),
          Skeletons.Note({
            className: `${fig}__feedback-stat`,
            content: `${participantCount} ${
              participantCount === 1
                ? LOCALE.PARTICIPANT || "Participant"
                : LOCALE.PARTICIPANTS || "Participants"
            }`,
          }),
        ],
      }),

      Skeletons.Box.Y({
        className: `${fig}__feedback-rating`,
        kids: [
          Skeletons.Note({
            className: `${fig}__feedback-prompt`,
            content: LOCALE.HOW_WAS_THE_MEETING || "How was the meeting?",
          }),
          Skeletons.Box.X({
            className: `${fig}__feedback-stars`,
            kids: stars,
          }),
        ],
      }),

      Skeletons.Textarea({
        className: `${fig}__feedback-comment`,
        sys_pn: "feedback-comment",
        name: "feedback-comment",
        placeholder: LOCALE.ANY_COMMENTS_OPTIONAL || "Any comments? (Optional)",
        rows: 1,
        ignoreEnter: true,
        require: "any",
        partHandler: _ui_,
      }),

      Skeletons.Box.X({
        className: `${fig}__feedback-actions`,
        kids: [
          Skeletons.Note({
            className: `${fig}__feedback-skip`,
            content: LOCALE.SKIP || "Skip",
            service: "feedback-skip",
            uiHandler: [_ui_],
          }),
          Skeletons.Note({
            className: `${fig}__feedback-submit`,
            content: LOCALE.SUBMIT || "Submit",
            service: "feedback-submit",
            uiHandler: [_ui_],
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__feedback-overlay`,
    sys_pn: "feedback-overlay",
    kids: [card],
  });
};

module.exports = __window_meeting_feedback;
