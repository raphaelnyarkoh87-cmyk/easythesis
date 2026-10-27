import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/lib/server/guard";
import { applyTransaction, paystackConfigured, verifyTransaction } from "@/lib/server/paystack";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Called by the page students return to from Paystack. */
export async function POST(request: NextRequest) {
  if (!paystackConfigured()) return jsonError(503, "Payments are not switched on yet.");
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return jsonError(401, "Your session has ended. Sign in again.");

  const body = (await request.json().catch(() => ({}))) as { reference?: unknown };
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!/^[A-Za-z0-9.=-]{6,100}$/.test(reference)) return jsonError(400, "That payment reference is not valid.");

  // Row-level security: users can only see their own payments.
  const { data: payment } = await sb.from("payments").select("reference, status").eq("reference", reference).maybeSingle();
  if (!payment) return jsonError(404, "That payment was not found in your account.");

  try {
    const tx = await verifyTransaction(reference);
    if (!tx) {
      return NextResponse.json({
        state: "pending",
        message: "Paystack has no record of this payment yet. If you did not finish paying, start again.",
      });
    }
    return NextResponse.json(await applyTransaction(tx));
  } catch (e) {
    console.error("[paystack] verify:", e);
    return jsonError(502, "We could not reach Paystack to confirm your payment. Check again in a minute.");
  }
}
