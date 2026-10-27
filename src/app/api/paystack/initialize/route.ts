import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/lib/server/guard";
import {
  CHANNELS,
  initializeTransaction,
  newReference,
  paystackConfigured,
  premiumPrice,
  type PayMethod,
} from "@/lib/server/paystack";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Starts a Premium payment and returns Paystack's checkout page address. */
export async function POST(request: NextRequest) {
  if (!paystackConfigured()) {
    return jsonError(503, "Payments are not switched on yet. Please try again later.");
  }
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return jsonError(401, "Your session has ended. Sign in again.");

  const body = (await request.json().catch(() => ({}))) as { method?: unknown };
  const method: PayMethod =
    body.method === "card" || body.method === "bank" ? body.method : "mobile_money";

  const { pesewas, days } = premiumPrice();
  const reference = newReference();
  const admin = supabaseAdmin();

  // Limit abuse: no more than 10 payment attempts an hour per account.
  const { count } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= 10) return jsonError(429, "Too many payment attempts. Wait an hour and try again.");

  const { error } = await admin.from("payments").insert({
    user_id: user.id,
    reference,
    amount_pesewas: pesewas,
    currency: "GHS",
    status: "pending",
    days_granted: days,
  });
  if (error) return jsonError(500, "The payment could not be started. Try again.");

  try {
    const { authorizationUrl } = await initializeTransaction({
      email: user.email,
      pesewas,
      reference,
      callbackUrl: `${request.nextUrl.origin}/app/upgrade/complete`,
      channels: CHANNELS[method],
      metadata: { user_id: user.id, plan: "premium", days },
    });
    return NextResponse.json({ authorizationUrl, reference });
  } catch (e) {
    console.error("[paystack] initialize:", e);
    await admin.from("payments").update({ status: "failed", provider_status: "init_error" }).eq("reference", reference);
    return jsonError(502, "Paystack could not start the payment. Try again in a minute.");
  }
}
