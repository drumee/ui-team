import { createBlockSpec, defaultProps } from "@blocknote/core";

/**
 * The Callout block from the Note's "/" menu (Lexis's Figma, 2026-10-22).
 *
 * BlockNote has no callout of its own, so this is the one custom block in the
 * schema: an emoji beside a line of inline text, on a tinted panel. Written
 * against the plain DOM `render` contract rather than React, so it renders the
 * same in the editor and in an export (`toExternalHTML` falls back to it).
 *
 * The emoji is a PROP, not text: it is decoration, and keeping it out of the
 * inline content means search, export and copy see only what was typed.
 */
const DEFAULT_EMOJI = "💡";

const Callout = createBlockSpec(
  {
    type: "callout",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      emoji: { default: DEFAULT_EMOJI },
    },
    content: "inline",
  },
  {
    render(block) {
      const dom = document.createElement("div");
      dom.className = "note-callout";
      const emoji = document.createElement("span");
      emoji.className = "note-callout__emoji";
      emoji.contentEditable = "false";
      emoji.textContent = block.props.emoji || DEFAULT_EMOJI;
      const contentDOM = document.createElement("div");
      contentDOM.className = "note-callout__text";
      dom.appendChild(emoji);
      dom.appendChild(contentDOM);
      return { dom, contentDOM };
    },
  }
);

export default Callout;
