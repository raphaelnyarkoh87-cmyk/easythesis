import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PLANS } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

const API = "https://api.paystack.co";

export type PayMethod = "mobile_money" | "card" | "bank";

/** Paystack payment channels shown for each choice on the upgrade page. */
export const CHANNELS: Record<PayMethod, string[]> = {
  mobile_money: ["mobile_money"],
  card: ["card"],
  bank: ["bank", "bank_transfer"],
};

/** The price always comes from the server, never from the browser. */
export function premiumPrice() {
  const p = PLANS.premium;
  return { pesewas: Math.round(p.priceGhs * 100), days: p.periodDays ?? 30 };
}

export function paystackConfigured() {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function newReference() {
  return `ET-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

export async function initializeTransaction(args: {
  email: string;
  pesewas: number;
  reference: string;
  callbackUrl: string;
  channels: string[];
  metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string }> {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: args.email,
      amount: String(args.pesewas),
      currency: "GHS",
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: args.channels,
      metadata: JSON.stringify(args.metadata),
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string };
  };
  if (!res.ok || !json.status || !json.data?.authorization_url) {
    throw new Error(`Paystack initialize failed: ${res.status} ${json.message ?? ""}`);
  }
  return { authorizationUrl: json.data.authorization_url };
}

export interface PaystackTransaction {
  status: string; // success | failed | abandoned | ongoing | pending | processing | reversed ...
  reference: string;
  amount: number;
  currency: string;
  channel?: string | null;
  paid_at?: string | null;
  gateway_response?: string | null;
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction | null> {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return null;
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; data?: PaystackTransaction };
  if (!res.ok || !json.status || !json.data) throw new Error(`Paystack verify failed: ${res.status}`);
  return json.data;
}

/** Checks a webhook really came from Paystack (HMAC SHA512 of the raw body). */
export function validSignature(rawBody: string, header: string | null): boolean {
  if (!header || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(header.trim(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type Outcome =
  | { state: "paid"; premiumUntil: string; newlyGranted: boolean }
  | { state: "pending"; message: string }
  | { state: "failed"; message: string }
  | { state: "unknown" };

const FINAL_FAILURES = new Set(["failed", "abandoned", "reversed"]);

/**
 * Applies what Paystack says about a payment to our records.
 * Safe to call any number of times for the same reference.
 */
export async function applyTransaction(tx: PaystackTransaction): Promise<Outcome> {
  const admin = supabaseAdmin();
  if (tx.status === "success") {
    const { data, error } = await admin.rpc("grant_premium", {
      p_reference: tx.reference,
      p_amount_pesewas: tx.amount,
      p_currency: tx.currency,
      p_channel: tx.channel ?? null,
      p_paid_at: tx.paid_at ?? null,
    });
    if (error) {
      if (error.message.includes("PAYMENT_NOT_FOUND")) return { state: "unknown" };
      if (error.message.includes("PAYMENT_AMOUNT_MISMATCH")) {
        await admin
          .from("payments")
          .update({ status: "failed", provider_status: "amount_mismatch", updated_at: new Date().toISOString() })
          .eq("reference", tx.reference)
          .neq("status", "success");
        console.error(`[paystack] amount mismatch on ${tx.reference}: ${tx.amount} ${tx.currency}`);
        return {
          state: "failed",
          message: "The amount paid did not match the Premium price, so Premium was not activated. Contact us with the payment reference.",
        };
      }
      throw new Error(error.message);
    }
    const row = (Array.isArray(data) ? data[0] : data) as { out_premium_until: string; out_newly_granted: boolean };
    return { state: "paid", premiumUntil: row.out_premium_until, newlyGranted: row.out_newly_granted };
  }

  const status = FINAL_FAILURES.has(tx.status) ? (tx.status === "reversed" ? "failed" : tx.status) : "pending";
  await admin
    .from("payments")
    .update({ status, provider_status: tx.status, updated_at: new Date().toISOString() })
    .eq("reference", tx.reference)
    .neq("status", "success");

  if (status === "pending") {
    return {
      state: "pending",
      message: "Paystack has not confirmed the payment yet. If you approved it on your phone, this can take a minute.",
    };
  }
  const reason =
    tx.gateway_response && !/^(approved|successful)$/i.test(tx.gateway_response.trim())
      ? ` Paystack's reason: ${tx.gateway_response.trim().replace(/\.$/, "")}.`
      : "";
  return {
    state: "failed",
    message: `The payment did not go through.${reason} Premium has not been activated. If money left your account anyway, contact us with the payment reference.`,
  };
}
