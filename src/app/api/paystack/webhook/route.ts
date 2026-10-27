import { NextResponse, type NextRequest } from "next/server";
import { applyTransaction, validSignature, verifyTransaction } from "@/lib/server/paystack";

export const runtime = "nodejs";

/**
 * Paystack calls this when a payment succeeds, even if the student
 * closed the page. Set it in Paystack: Settings -> API Keys & Webhooks.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const reference = event.data?.reference;
  if (event.event !== "charge.success" || !reference) return NextResponse.json({ ok: true });

  try {
    // Confirm with Paystack directly rather than trusting the event body.
    const tx = await verifyTransaction(reference);
    if (tx) {
      const outcome = await applyTransaction(tx);
      if (outcome.state === "paid" && outcome.newlyGranted) {
        console.log(`[paystack] Premium granted for ${reference} until ${outcome.premiumUntil}`);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // A temporary failure: a non-200 reply makes Paystack retry later.
    console.error("[paystack] webhook:", e);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
}
