/**
 * The tutorial callout — Drumee 2.0 (Figma canvas 129:13815).
 *
 * The 2.0 design replaces the badge card with a speech BUBBLE: a white
 * rounded card with a beak pointing at what it is talking about. What went
 * away with it is not cosmetic —
 *
 *   the dot + line connector → a beak drawn on the card's own edge
 *   the formatted badge string → `step`/`steps`, rendered by the callout
 *
 * 2.0 draws progress two ways — a dash bar in the chat flow, a "STEP n/m" pill
 * in the share flow. Both are supported; the pill is the default, because it
 * is the only one that lets a screen be named. See `progressStyle`.
 *
 * The ✕ skip control the frames drop is dropped here too. Escape leaves a tour
 * (tutorial/index.js _bindEscape), and a tour is recorded the moment it mounts,
 * so leaving one early costs nothing that reloading the page did not already.
 *
 * Shapes, chosen by what the caller supplies rather than by a `variant` flag:
 *
 *   text                 a bare bubble — one bold line, tight insets.
 *                        "Type your workspace name here".
 *   title + desc         the standard card.
 *   + steps              adds the progress indicator.
 *   + done               the forward button reads Done and ends the tour.
 *
 * Every shape carries the Back/Next footer, including the bare one. The frames
 * draw those two workspace callouts with no control at all, because in the
 * real product the user advances by typing a name or picking a type — in a
 * mock there is nothing to type into, so a callout without a footer is a dead
 * end. That is the one deliberate deviation from the design here.
 */

const BEAK_OFFSETS = ["start", "center", "end"];

/**
 * How far through, drawn two ways — because the design uses both.
 *
 *   'dashes'  a bar per screen, filled up to the current one. The chat frames
 *             (142:39178 and the rest of that flow).
 *   'pill'    a dot and "STEP n/m" in a tinted pill. The share frames
 *             (148:41197 -> 148:44198).
 *
 * Neither is rendered for a single-screen run: one dash, or "STEP 1/1", is not
 * progress — it is a decoration saying the tour is one screen long, which the
 * design does not put on its one-screen callouts either.
 */
function progress(p, step, steps, style) {
  const total = ~~steps;
  if (total < 2) return null;
  const at = Math.max(0, Math.min(total - 1, ~~step));

  if (style === "pill") {
    return Skeletons.Box.X({ active: 0,
      className: `${p}-pill`,
      kids: [
        Skeletons.Box.Y({ active: 0, className: `${p}-pill-dot` }),
        Skeletons.Note({ active: 0,
          className: `${p}-pill-text`,
          // Substituted here rather than through String.prototype.format: that
          // is a bootstrap extension (drumee.js), and the pill is now on the
          // hot path of EVERY callout in every tour. A hidden dependency on a
          // prototype patch is not worth it for two placeholders.
          content: String(LOCALE.TUTORIAL_STEP || "STEP {0}/{1}")
            .replace("{0}", at + 1)
            .replace("{1}", total),
        }),
      ],
    });
  }

  const kids = [];
  for (let i = 0; i < total; i++) {
    kids.push(
      Skeletons.Box.Y({ active: 0,
        className: `${p}-dash`,
        dataset: { on: i <= at ? 1 : 0 },
        attrOpt: { "data-on": i <= at ? 1 : 0 },
      }),
    );
  }
  return Skeletons.Box.X({ active: 0, className: `${p}-dashes`, kids });
}

/**
 * @param {Object} ui             the STEP widget — Back/Next are its business
 * @param {Object} opt
 * @param {String} [opt.text]     bare-bubble copy; replaces title/desc
 * @param {String} [opt.title]
 * @param {String} [opt.desc]
 * @param {Number} [opt.step]     0-based screen index, for the dashes
 * @param {Number} [opt.steps]    how many screens this run has
 * @param {String} [opt.progressStyle='pill'] 'pill' or 'dashes'. The design
 *   draws both — a dash bar in the chat flow, a "STEP n/m" pill in the share
 *   flow — and the pill is the default because it NAMES the screen. A dash bar
 *   shows how far along you are; only the pill lets someone say "step 4 is
 *   wrong", which is what reviewing a tour actually needs.
 * @param {Object} [opt.style]    absolute placement, from spotlight.anchorFor
 * @param {String} [opt.direction='north'] which edge the beak sits on — same
 *   four names, and the same meaning, as before: the direction the callout
 *   REACHES OUT in. 'west' puts the card to the right of its target.
 * @param {String} [opt.beak='center'] where the beak sits along that edge
 * @param {Boolean} [opt.hide_back]
 * @param {Boolean} [opt.done]    forward button ends the tour
 * @param {Boolean} [opt.hide_footer] no Back/Next at all. For the screens the
 *   user is FILLING IN rather than being walked through: the form has its own
 *   Create and the invite card its own Send and Skip, and a Next beside them
 *   is a second, contradictory way forward that skips the thing being asked
 *   for. On those screens the callout is a caption, not a control.
 */
export function tooltipBubble(ui, opt = {}) {
  const {
    text,
    title,
    desc,
    step,
    steps,
    progressStyle = "pill",
    style,
    direction = "north",
    beak = "center",
    hide_back = false,
    done = false,
    hide_footer = false,
  } = opt;

  const p = `${ui.fig.group}__bubble`;
  const side = BEAK_OFFSETS.includes(beak) ? beak : "center";

  // Back / Next. Every callout gets these, including the "bare" ones.
  //
  // The frames draw two of the workspace callouts as a line of copy and
  // nothing else — because in the real product those screens advance when the
  // user TYPES a name or PICKS a type. The tour is a mock: there is nothing to
  // type into, so a callout with no control is a dead end. Making the whole
  // card clickable was the first attempt and it is worse than a button —
  // nothing on screen says the card is a control, so it reads as stuck either
  // way. The footer is the deviation from the frames that makes the tour
  // usable, and it is the same footer on every screen.
  const footer = () =>
    Skeletons.Box.X({ active: 0,
      className: `${p}-footer`,
      kids: [
        hide_back
          ? null
          : Skeletons.Note({
              className: `${p}-back`,
              content: LOCALE.BACK,
              service: "back-step",
              uiHandler: [ui],
            }),
        // `is-done` is load-bearing, not decoration: spotlight.busy() queries
        // it to mark the button pending while the tour's closing write is in
        // flight. Only the last screen can wait on anything.
        Skeletons.Note({
          className: `${p}-next${done ? " is-done" : ""}`,
          content: done ? LOCALE.DONE : `${LOCALE.NEXT} →`,
          service: "next-step",
          uiHandler: [ui],
        }),
      ].filter(Boolean),
    });

  // Just the progress now — the ✕ that used to sit opposite it is gone, and the
  // frames never had one.
  //
  // Which makes the row optional: it existed as a ROW because two things had to
  // sit at opposite ends of it, and the spacer existed to hold the ✕ against the
  // right edge on a screen with no dashes. With one child and nothing to push
  // against, a screen that shows no progress (a single-screen run) now draws no
  // header at all rather than an empty 20px band above the copy.
  //
  // Escape is what leaves a tour now. It is bound in capture phase by the host
  // (tutorial/index.js _bindEscape) and goes to the same _skipTour().
  const header = () => progress(p, step, steps, progressStyle);

  // A bare bubble keeps the design's look — one bold line, tighter insets —
  // and gains the header and footer so it can be numbered and left.
  const foot = () => (hide_footer ? null : footer());
  const kids = text
    ? [
        header(),
        Skeletons.Note({ active: 0, className: `${p}-text`, content: text }),
        foot(),
      ].filter(Boolean)
    : [
        header(),
        Skeletons.Note({ active: 0, className: `${p}-title`, content: title }),
        desc ? Skeletons.Note({ active: 0, className: `${p}-desc`, content: desc }) : null,
        foot(),
      ].filter(Boolean);

  return Skeletons.Box.Y({
    className: `${p}-card${text ? ` ${p}-card--bare` : ""}`,
    sys_pn: "badge-tooltip",
    partHandler: [ui],
    style,
    // dataset alone is dropped at render unless an attribute map rides along —
    // the beak is drawn off these two, so they have to actually land.
    dataset: { direction, beak: side },
    attrOpt: { "data-direction": direction, "data-beak": side },
    // Inert. Every shape of this card now carries a real Back/Next footer, so
    // the card itself is never the control — which also means a stray click on
    // its padding cannot advance the tour by accident.
    active: 0,
    kids,
  });
}
