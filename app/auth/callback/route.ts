import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAccountContext } from "@/lib/accountProfile";
import { isPassengerOnboardingComplete } from "@/lib/profileOnboarding";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next")?.trim() || "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              /* ignore */
            }
          },
        },
      },
    );
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const ctx = await getAccountContext(user.id);
      if (ctx.isOperator) {
        return NextResponse.redirect(`${origin}/my-journeys`);
      }
      if (!isPassengerOnboardingComplete(ctx.profile)) {
        const onboardNext = encodeURIComponent(safeNext);
        return NextResponse.redirect(`${origin}/onboarding?next=${onboardNext}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
