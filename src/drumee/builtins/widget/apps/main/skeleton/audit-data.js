const auditLogs = [
  {
    id: "a1",
    user: { name: "Marcus Thorne", email: "marcus@drumee.io", initials: "MT", avatar_color: "dark" },
    action: { label: "Grant Access", variant: "grant" },
    resource: { icon: "dock-folder", label: "Design Workspace" },
    timestamp: "Oct 24, 2026 • 14:22:05",
  },
  {
    id: "a2",
    user: { name: "Elena Rodriguez", email: "elena.r@drumee.io", initials: "ER", avatar_color: "dark" },
    action: { label: "Change Policy", variant: "policy" },
    resource: { icon: "account_padlock", label: "Multi-Factor Authentication" },
    timestamp: "Oct 24, 2026 • 11:45:12",
  },
  {
    id: "a3",
    user: { name: "Samir Al-Fayed", email: "samir@drumee.io", initials: "SA", avatar_color: "dark" },
    action: { label: "Share Link", variant: "share" },
    resource: { icon: "editbox_link", label: "Product Roadmap Workspace" },
    timestamp: "Oct 23, 2026 • 18:30:55",
  },
  {
    id: "a4",
    user: { name: "System (Bot)", email: "automation-service", initials: "BT", avatar_color: "neutral" },
    action: { label: "create workspace", variant: "neutral" },
    resource: { icon: "dock-folder", label: "Design Workspace" },
    timestamp: "Oct 23, 2026 • 00:00:01",
  },
  {
    id: "a5",
    user: { name: "Marcus Thorne", email: "marcus@drumee.io", initials: "MT", avatar_color: "dark" },
    action: { label: "Grant Access", variant: "grant" },
    resource: { icon: "dock-folder", label: "Markrting Workspace" },
    timestamp: "Oct 24, 2026 • 14:22:05",
  },
  {
    id: "a6",
    user: { name: "Elena Rodriguez", email: "elena.r@drumee.io", initials: "ER", avatar_color: "dark" },
    action: { label: "Change Policy", variant: "policy" },
    resource: { icon: "account_padlock", label: "Multi-Factor Authentication" },
    timestamp: "Oct 24, 2026 • 11:45:12",
  },
];

export default auditLogs;
