import { NextRequest, NextResponse } from "next/server";
import { ensureProfile, getAccountContext, getProfile } from "@/lib/accountProfile";
import { isPassengerOnboardingComplete } from "@/lib/profileOnboarding";
import { NATIONALITIES } from "@/lib/nationalities";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { UpdateProfileBody } from "@/types/operator";

export async function GET() {
  try {
    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ctx = await getAccountContext(user.id);
    return NextResponse.json({
      profile: ctx.profile,
      isOperator: ctx.isOperator,
      onboardingComplete: isPassengerOnboardingComplete(ctx.profile),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as UpdateProfileBody;
    const display_name = body.display_name?.trim();
    const nationality = body.nationality?.trim();

    if (display_name !== undefined && display_name.length < 2) {
      return NextResponse.json(
        { error: "Display name — must be at least 2 characters" },
        { status: 400 },
      );
    }
    if (nationality !== undefined && nationality.length > 0) {
      const valid = NATIONALITIES.some((n) => n.code === nationality);
      if (!valid) {
        return NextResponse.json({ error: "Nationality — select from the list" }, { status: 400 });
      }
    }

    await ensureProfile(user.id);
    const svc = createServiceClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (display_name !== undefined) patch.display_name = display_name;
    if (nationality !== undefined) patch.nationality = nationality;
    if (body.complete_onboarding) {
      patch.account_type = "passenger";
      patch.onboarding_completed_at = new Date().toISOString();
    }

    const { data, error } = await svc
      .from("profiles")
      .update(patch)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw error;

    const profile = data as Awaited<ReturnType<typeof getProfile>>;
    return NextResponse.json({
      profile,
      onboardingComplete: isPassengerOnboardingComplete(profile),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
