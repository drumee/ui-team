/**
 * Emoji set of the New Topic dialog's picker (Figma 867:186725): the eight
 * category tabs after the search tab, in the design's order, each emoji with
 * a few English keywords the search tab matches. Curated and dependency-free
 * (no emoji-name dataset ships with the app), like the chat reaction picker.
 */
const TOPIC_EMOJI_GROUPS = [
  {
    key: "smileys",
    ico: "ph-smiley",
    emojis: [
      ["😀", "grin grinning smile happy"], ["😃", "smile happy joy open"], ["😄", "smile happy laugh eyes"],
      ["😁", "grin beam smile teeth"], ["😆", "laugh squint happy"], ["😅", "sweat smile relief"],
      ["🤣", "rofl laugh rolling floor"], ["😂", "joy tears laugh"], ["🙂", "slight smile"],
      ["🙃", "upside down silly"], ["😉", "wink"], ["😊", "blush smile happy"],
      ["😇", "angel halo innocent"], ["🥰", "love hearts smile"], ["🫠", "melting"],
      ["🥲", "smile tear grateful"], ["😍", "heart eyes love"], ["🤩", "star struck wow"],
      ["😘", "kiss heart"], ["😗", "kiss"], ["☺️", "smile relaxed"],
      ["😚", "kiss closed eyes"], ["😙", "kiss smile"], ["😋", "yum tasty tongue"],
      ["😛", "tongue playful"], ["😜", "wink tongue crazy"], ["🤪", "zany crazy goofy"],
    ],
  },
  {
    key: "nature",
    ico: "ph-leaf",
    emojis: [
      ["🌱", "seedling sprout grow"], ["🌿", "herb leaf plant"], ["🍀", "clover luck"],
      ["🍁", "maple leaf autumn"], ["🌳", "tree deciduous"], ["🌲", "tree evergreen pine"],
      ["🌵", "cactus desert"], ["🌸", "cherry blossom flower"], ["🌻", "sunflower flower"],
      ["🌹", "rose flower"], ["🌷", "tulip flower"], ["🌊", "wave ocean sea"],
      ["☀️", "sun sunny weather"], ["🌙", "moon night"], ["⭐", "star"],
      ["🌈", "rainbow"], ["🐶", "dog puppy animal"], ["🐱", "cat kitten animal"],
      ["🦊", "fox animal"], ["🐼", "panda animal"], ["🦋", "butterfly insect"],
    ],
  },
  {
    key: "food",
    ico: "ph-hamburger",
    emojis: [
      ["🍎", "apple fruit red"], ["🍊", "orange tangerine fruit"], ["🍋", "lemon fruit"],
      ["🍇", "grapes fruit"], ["🍓", "strawberry fruit"], ["🥑", "avocado"],
      ["🍕", "pizza food"], ["🍔", "burger hamburger food"], ["🍟", "fries food"],
      ["🌮", "taco food"], ["🍜", "noodles ramen food"], ["🍣", "sushi food"],
      ["🥗", "salad food healthy"], ["🍰", "cake dessert"], ["🍩", "donut dessert"],
      ["🍪", "cookie dessert"], ["☕", "coffee drink"], ["🍵", "tea drink"],
      ["🍺", "beer drink"], ["🥂", "cheers celebrate drink"],
    ],
  },
  {
    key: "travel",
    ico: "ph-airplane-tilt",
    emojis: [
      ["✈️", "airplane plane flight travel"], ["🚀", "rocket launch space"], ["🚗", "car drive"],
      ["🚕", "taxi car"], ["🚌", "bus"], ["🚆", "train rail"],
      ["🚲", "bicycle bike"], ["⛵", "sailboat boat"], ["🚢", "ship boat"],
      ["🗺️", "map world"], ["🧭", "compass direction"], ["🏔️", "mountain snow"],
      ["🏖️", "beach holiday"], ["🏝️", "island holiday"], ["🏙️", "city skyline"],
      ["🏠", "house home"], ["🏢", "office building"], ["🗽", "statue liberty"],
      ["🌍", "globe earth world"], ["🧳", "luggage suitcase trip"],
    ],
  },
  {
    key: "activity",
    ico: "ph-football",
    emojis: [
      ["⚽", "soccer football ball sport"], ["🏀", "basketball ball sport"], ["🏈", "american football sport"],
      ["⚾", "baseball sport"], ["🎾", "tennis sport"], ["🏐", "volleyball sport"],
      ["🏓", "ping pong table tennis"], ["🏆", "trophy win award"], ["🥇", "gold medal first"],
      ["🎯", "target goal dart"], ["🎮", "game controller play"], ["🎲", "dice game"],
      ["🎨", "art palette paint"], ["🎭", "theater drama"], ["🎸", "guitar music"],
      ["🎹", "piano music"], ["🎤", "microphone sing"], ["🎧", "headphones music"],
      ["🏃", "run running sport"], ["🧘", "yoga meditation"],
    ],
  },
  {
    key: "objects",
    ico: "ph-lightbulb",
    emojis: [
      ["💡", "idea light bulb"], ["📌", "pin pushpin"], ["📎", "paperclip attachment"],
      ["📁", "folder file"], ["📄", "document page"], ["📊", "chart bar stats"],
      ["📈", "chart up growth"], ["🗂️", "dividers files"], ["📅", "calendar date"],
      ["⏰", "alarm clock time"], ["💻", "laptop computer"], ["📱", "phone mobile"],
      ["🖨️", "printer print"], ["🔑", "key lock"], ["🔒", "lock secure"],
      ["🛠️", "tools build"], ["⚙️", "gear settings"], ["💰", "money bag budget"],
      ["📦", "package box ship"], ["✉️", "envelope mail email"], ["📣", "megaphone announce"],
    ],
  },
  {
    key: "symbols",
    ico: "ph-peace",
    emojis: [
      ["❤️", "heart love red"], ["🧡", "heart orange"], ["💛", "heart yellow"],
      ["💚", "heart green"], ["💙", "heart blue"], ["💜", "heart purple"],
      ["✅", "check done yes"], ["❌", "cross no wrong"], ["⚠️", "warning caution"],
      ["❓", "question help"], ["❗", "exclamation important"], ["💯", "hundred perfect"],
      ["🔥", "fire hot lit"], ["✨", "sparkles magic new"], ["⚡", "lightning zap fast"],
      ["☮️", "peace"], ["♻️", "recycle"], ["🔔", "bell notification"],
      ["🎉", "party celebrate tada"], ["🚩", "red flag"],
    ],
  },
  {
    key: "flags",
    ico: "ph-flag",
    emojis: [
      ["🏁", "checkered flag finish"], ["🏳️", "white flag"], ["🇺🇸", "united states usa america"],
      ["🇬🇧", "united kingdom uk britain"], ["🇫🇷", "france french"], ["🇩🇪", "germany german"],
      ["🇪🇸", "spain spanish"], ["🇮🇹", "italy italian"], ["🇨🇭", "switzerland swiss"],
      ["🇧🇪", "belgium"], ["🇳🇱", "netherlands dutch"], ["🇵🇹", "portugal"],
      ["🇨🇦", "canada"], ["🇧🇷", "brazil"], ["🇯🇵", "japan"],
      ["🇨🇳", "china"], ["🇮🇳", "india"], ["🇰🇭", "cambodia"],
      ["🇻🇳", "vietnam"], ["🇷🇺", "russia"],
    ],
  },
];

const DEFAULT_TOPIC_EMOJI = "😀";
const TOPIC_SEARCH_ICO = "magnifying-glass";

/** Emojis whose keywords contain `q` (case-insensitive), across all groups. */
function searchTopicEmojis(q) {
  const needle = `${q || ""}`.trim().toLowerCase();
  if (!needle) return [];
  const out = [];
  for (const g of TOPIC_EMOJI_GROUPS) {
    for (const [e, k] of g.emojis) {
      if (k.toLowerCase().includes(needle) && !out.includes(e)) out.push(e);
    }
  }
  return out;
}

module.exports = { TOPIC_EMOJI_GROUPS, DEFAULT_TOPIC_EMOJI, TOPIC_SEARCH_ICO, searchTopicEmojis };
