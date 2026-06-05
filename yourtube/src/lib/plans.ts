export interface PlanType {
  _id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  watchLimitMinutes: number | null;
  features: string[];
  color: string;
  isActive: boolean;
  order: number;
}

export const FREE_WATCH_LIMIT_MINUTES = 5;

export const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
};

export function getWatchLimitSeconds(plan: PlanType | null | undefined): number | null {
  if (!plan) return FREE_WATCH_LIMIT_MINUTES * 60;
  if (plan.watchLimitMinutes === null) return null; // unlimited
  return plan.watchLimitMinutes * 60;
}

export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}
