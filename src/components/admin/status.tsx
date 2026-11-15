import { Badge } from "@/components/ui/misc";

const SHOOT: Record<string, [string, "neutral" | "olive" | "champagne" | "success" | "warning" | "danger" | "dark"]> = {
  INQUIRY: ["Inquiry", "neutral"],
  CONFIRMED: ["Confirmed", "olive"],
  UPCOMING: ["Upcoming", "champagne"],
  IN_PROGRESS: ["In progress", "warning"],
  EDITING: ["Editing", "warning"],
  READY_FOR_REVIEW: ["Ready for review", "champagne"],
  DELIVERED: ["Delivered", "success"],
  COMPLETED: ["Completed", "dark"],
};
const BOOKING: Record<string, [string, "neutral" | "olive" | "success" | "danger" | "warning"]> = {
  PENDING: ["Pending", "warning"],
  CONFIRMED: ["Confirmed", "olive"],
  COMPLETED: ["Completed", "success"],
  CANCELLED: ["Cancelled", "danger"],
};
const INQUIRY: Record<string, [string, "neutral" | "olive" | "success" | "danger" | "warning" | "champagne"]> = {
  NEW: ["New", "champagne"],
  CONTACTED: ["Contacted", "olive"],
  QUOTED: ["Quoted", "warning"],
  CONVERTED: ["Converted", "success"],
  CLOSED: ["Closed", "neutral"],
};
const PAYMENT: Record<string, [string, "neutral" | "success" | "danger" | "warning"]> = {
  PENDING: ["Pending", "warning"],
  PAID: ["Paid", "success"],
  FAILED: ["Failed", "danger"],
  REFUNDED: ["Refunded", "neutral"],
};
const GALLERY: Record<string, [string, "neutral" | "success" | "warning"]> = {
  DRAFT: ["Draft", "warning"],
  PUBLISHED: ["Published", "success"],
  ARCHIVED: ["Archived", "neutral"],
};

export const SHOOT_STATUS_LABEL = Object.fromEntries(Object.entries(SHOOT).map(([k, v]) => [k, v[0]]));

export function StatusBadge({ kind, value }: { kind: "shoot" | "booking" | "inquiry" | "payment" | "gallery"; value: string }) {
  const map = { shoot: SHOOT, booking: BOOKING, inquiry: INQUIRY, payment: PAYMENT, gallery: GALLERY }[kind] as Record<string, [string, never]>;
  const [label, tone] = map[value] ?? [value, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}
