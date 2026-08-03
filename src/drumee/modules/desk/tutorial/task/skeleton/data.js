/**
 * The work items Step 4 shows, in one place.
 *
 * All five tracker views in the design list the SAME tasks — the board groups
 * them by status, the calendar places them by date, the gantt draws their
 * ranges, the list tabulates them and Project Health counts them. Keeping one
 * dataset means the five screens cannot drift apart, and the health figures
 * are derived rather than hardcoded.
 *
 * Statuses and priorities are taken from the List view (Figma 3202:185461),
 * which is the only one that states every field explicitly.
 */

// A `late` task must have a span that ENDS BEFORE the gantt's today marker
// (gantt.js TODAY) — the overdue band runs from the bar's end to that line, so
// a bar reaching today leaves it nowhere to draw.
//
// Status keys double as CSS modifiers (see skin: __pill[data-status]).
const TODO = 'todo';
const PROGRESS = 'progress';
const REVIEW = 'review';
const DONE = 'done';

// `dot` is the saturated colour used for status dots; `tint` is the softer one
// the design gives the donut arcs and legend swatches.
export const STATUSES = [
  { key: TODO, label: 'To Do', dot: '#b0b0b8', tint: '#e5e5ea' },
  { key: PROGRESS, label: 'In Progress', dot: '#5950ff', tint: '#b9b4ff' },
  { key: REVIEW, label: 'To review', dot: '#e8a13b', tint: '#f2c98a' },
  { key: DONE, label: 'Complete', dot: '#34c77b', tint: '#7ed9a8' },
];

export const PRIORITIES = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export const TASKS = [
  {
    name: 'Landing Page Wireframe UX',
    desc: 'Task Tracker · UX',
    status: TODO,
    priority: 'low',
    date: 'Jun 09',
    day: 9,
    span: [7, 8],
    people: 1,
    late: true,
  },
  {
    name: 'Landing Page Wireframe',
    desc: 'Create low-fidelity wireframes for the new product landing page and prepare user flow documentation.',
    status: TODO,
    priority: 'low',
    date: 'Jun 09',
    day: 9,
    span: [7, 8],
    people: 3,
    late: true,
  },
  {
    name: 'Competitor Analysis',
    desc: 'Research top 5 competitors and summarize their key features, pricing models, and positioning.',
    status: TODO,
    priority: 'high',
    date: 'Jun 10',
    day: 10,
    span: [7, 10],
    people: 3,
    selected: true,
  },
  {
    name: 'Mobile App UI Review',
    status: PROGRESS,
    priority: null,
    day: 10,
    span: [7, 8],
    people: 0,
    late: true,
  },
  {
    name: 'Prepare Q3 marketing report',
    desc: 'Summarize campaign performance and key insights for Q3.',
    status: PROGRESS,
    priority: 'medium',
    date: 'Jun 10-13',
    day: 10,
    span: [10, 13],
    people: 3,
    files: ['spec_v1.docx', 'spec_v2.docx', 'spec_v2.pdf', 'spec_v3.pdf'],
    more: 3,
    progress: 0.55,
    // Screen 1's spotlight lands here: the design's connector points at it.
    focus: true,
  },
  {
    name: 'Design System Update',
    desc: 'Refine button styles, spacing rules, and component documentation for consistency.',
    status: PROGRESS,
    priority: 'low',
    date: 'Jun 12',
    day: 12,
    span: [8, 12],
    people: 1,
  },
  {
    name: 'Dashboard Redesign',
    status: REVIEW,
    priority: null,
    date: null,
    day: 11,
    span: [11, 15],
    people: 1,
  },
  {
    name: 'User Onboarding Flow',
    status: REVIEW,
    priority: null,
    date: 'Jun 09',
    day: 9,
    span: [7, 8],
    people: 0,
    late: true,
  },
  {
    name: 'Newsletter Template',
    status: REVIEW,
    priority: 'urgent',
    date: 'Jun 09',
    day: 9,
    span: [8, 12],
    people: 3,
  },
  {
    name: 'Brand Identity Presentation',
    status: DONE,
    priority: null,
    date: 'Jun 09',
    day: 9,
    span: [7, 8],
    people: 0,
    late: true,
  },
  {
    name: 'Homepage Hero Banner',
    desc: 'Designed and approved. Assets exported and shared with development team.',
    status: DONE,
    priority: 'urgent',
    date: 'Jun 09',
    day: 13,
    span: [7, 9],
    people: 3,
  },
  {
    name: 'Social Media Content Pack',
    desc: 'Created 10 social media templates and organized editable source files.',
    status: DONE,
    priority: null,
    date: 'Jun 08',
    day: 8,
    span: [7, 8],
    people: 1,
  },
  {
    name: 'Design Handoff',
    desc: 'All design files, assets, and documentation successfully transferred to the development team.',
    status: DONE,
    priority: 'medium',
    date: 'Jun 13',
    day: 13,
    span: [8, 13],
    people: 1,
  },
];

/** @returns {Array} tasks in the given status, in dataset order */
export function byStatus(key) {
  return TASKS.filter((t) => t.status === key);
}

/** Counts + percentages for Project Health, derived so they always add up. */
export function statusBreakdown() {
  const total = TASKS.length;
  return STATUSES.map((s) => {
    const n = byStatus(s.key).length;
    return { ...s, count: n, pct: Math.round((n / total) * 100) };
  });
}

export function priorityBreakdown() {
  return PRIORITIES.map((p) => ({
    ...p,
    count: TASKS.filter((t) => t.priority === p.key).length,
  }));
}

export const TOTAL = TASKS.length;
