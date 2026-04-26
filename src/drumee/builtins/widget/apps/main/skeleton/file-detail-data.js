// Mock document preview + version history for the file-detail screen.
// In a real wiring this comes from the file's MFS node + a versions list.
const sections = [
  {
    heading: "1. Overview",
    body:
      "In Q2, the team will focus on scaling user acquisition while improving overall funnel efficiency. " +
      "Instead of relying purely on paid traffic, this quarter aims to balance between performance " +
      "marketing, organic content, and product-driven growth. The goal is not just to bring in more users, " +
      "but to ensure better quality traffic and stronger activation once they land on the platform. " +
      "We expect a more aggressive approach compared to Q1, with faster testing cycles and tighter " +
      "collaboration between Marketing, Product, and Design.",
  },
  {
    heading: "2. Objectives",
    bullets: [
      "Increase total user acquisition by 25% QoQ",
      "Improve landing page conversion rate from 3.2% → 4.5%",
      "Reduce Customer Acquisition Cost (CAC) by 15%",
      "Achieve +30% growth in active users (WAU)",
    ],
  },
  {
    heading: "3. Key Strategies",
    subsections: [
      {
        title: "3.1 Paid Acquisition",
        bullets: [
          "Expand campaigns on TikTok Ads and Meta Ads",
          "Test 3 new creative directions (UGC, motion ads, product demo)",
          "Weekly A/B testing on creatives and copy",
        ],
      },
      {
        title: "3.2 Organic Growth",
        bullets: [
          "Build short-form content pipeline (3–5 posts/week)",
          "Focus on educational + trend-based content",
          "Improve SEO for landing pages and blog articles",
        ],
      },
      {
        title: "3.3 Product Optimization",
        bullets: [
          "Redesign onboarding flow to reduce drop-off",
          "Add social proof (testimonials, usage stats) on landing pages",
          "Improve loading speed and mobile experience",
        ],
      },
    ],
  },
];

const versions = [
  {
    id: "v3",
    version: "v3.0",
    timestamp: "active now",
    file: "Q2_Growth_Plan_v2.docx",
    editor: "Alex Rivers",
    active: true,
  },
  {
    id: "v2",
    version: "v2.0",
    timestamp: "yesterday, 4:20 pm",
    file: "Q2_Growth_Plan_v2.docx",
    editor: "Alex Rivers",
    active: false,
  },
  {
    id: "v1",
    version: "v1.0",
    timestamp: "oct 24, 9:00 AM",
    file: "Q2_Growth_Plan_v2.docx",
    editor: "Alex Rivers",
    active: false,
  },
];

export default {
  title: "Q2 Growth Plan 2026 (v2)",
  filename: "Q2_Growth_Plan_v2.docx",
  size: "12 MB",
  retention: "30 Days",
  sections,
  versions,
};
