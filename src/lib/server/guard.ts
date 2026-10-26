import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type UsageKind = "chapter_draft" | "literature_search";

/** Safety ceiling for Premium, so one account cannot run up unlimited costs. */
const PREMIUM_DAILY_CEILING: Record<UsageKind, number> = {
  literature_search: 150,
  chapter_draft: 40,
};

export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** The signed-in user, and the project if it belongs to them. */
export async function requireOwnedProject(projectId: unknown) {
  if (typeof projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return { error: jsonError(400, "Choose a thesis project first.") } as const;
  }
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: jsonError(401, "Your session has ended. Sign in again.") } as const;
  // Row-level security returns the project only to its owner.
  const { data: project } = await sb
    .from("projects")
    .select("id, title, discipline, level, approach, objectives, referencing")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { error: jsonError(404, "That thesis was not found in your account.") } as const;
  return { user, project, sb } as const;
}

export interface Allowance {
  plan: "free" | "premium";
  used: number;
  limit: number | null;
  remaining: number | null;
}

/** Checks the monthly allowance for an action (and Premium's daily ceiling). */
export async function checkAllowance(userId: string, kind: UsageKind): Promise<Allowance & { allowed: boolean; reason?: string }> {
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan, premium_until")
    .eq("id", userId)
    .maybeSingle();
  const plan: "free" | "premium" =
    profile?.plan === "premium" && profile.premium_until && new Date(profile.premium_until) > new Date()
      ? "premium"
      : "free";

  const { data: limits } = await admin.from("plan_limits").select("*").eq("plan", plan).single();
  const column = kind === "literature_search" ? "literature_searches_per_month" : "chapter_drafts_per_month";
  const limit = (limits?.[column] as number | null) ?? null;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: used = 0 } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", monthStart.toISOString());

  const usedN = used ?? 0;
  if (limit !== null && usedN >= limit) {
    return {
      plan,
      used: usedN,
      limit,
      remaining: 0,
      allowed: false,
      reason:
        kind === "literature_search"
          ? `You have used all ${limit} literature searches in the Free plan this month. Get Premium for unlimited searches.`
          : `You have used all ${limit} chapter drafts in the Free plan this month. Get Premium for unlimited drafts.`,
    };
  }

  if (plan === "premium") {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: today = 0 } = await admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", kind)
      .gte("created_at", dayStart.toISOString());
    if ((today ?? 0) >= PREMIUM_DAILY_CEILING[kind]) {
      return {
        plan,
        used: usedN,
        limit,
        remaining: null,
        allowed: false,
        reason: "You have reached today's fair-use limit. It resets at midnight GMT.",
      };
    }
  }

  return {
    plan,
    used: usedN,
    limit,
    remaining: limit === null ? null : limit - usedN,
    allowed: true,
  };
}

export async function recordUsage(userId: string, kind: UsageKind, projectId: string) {
  await supabaseAdmin().from("usage_events").insert({ user_id: userId, kind, project_id: projectId });
}
