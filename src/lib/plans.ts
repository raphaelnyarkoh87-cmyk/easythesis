/**
 * Plans and usage limits.
 * Prices are placeholders: change them here and every page updates.
 * Premium is a prepaid pass because Paystack does not support
 * recurring charges on mobile money.
 */

export type PlanId = "free" | "premium";

export interface Plan {
  id: PlanId;
  name: string;
  priceGhs: number;
  periodDays: number | null;
  summary: string;
  limits: {
    projects: number | null; // null = unlimited
    chapterDraftsPerMonth: number | null;
    literatureSearchesPerMonth: number | null;
    uploads: number | null;
    chaptersAvailable: number[];
    exportDocx: boolean;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceGhs: 0,
    periodDays: null,
    summary: "Try EasyThesis on one project.",
    limits: {
      projects: 1,
      chapterDraftsPerMonth: 2,
      literatureSearchesPerMonth: 10,
      uploads: 2,
      chaptersAvailable: [1],
      exportDocx: false,
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceGhs: 150,
    periodDays: 30,
    summary: "Every chapter, without limits, for 30 days.",
    limits: {
      projects: null,
      chapterDraftsPerMonth: null,
      literatureSearchesPerMonth: null,
      uploads: null,
      chaptersAvailable: [1, 2, 3, 4, 5],
      exportDocx: true,
    },
  },
};

export const PAYMENT_METHODS = [
  { id: "mtn", label: "MTN MoMo", kind: "mobile_money" },
  { id: "tcl", label: "Telecel Cash", kind: "mobile_money" },
  { id: "atl", label: "AirtelTigo Money", kind: "mobile_money" },
  { id: "card", label: "Visa or Mastercard", kind: "card" },
  { id: "bank", label: "Bank account", kind: "bank" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export function formatGhs(amount: number) {
  return `GH₵${amount.toLocaleString("en-GH")}`;
}
