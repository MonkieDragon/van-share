import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/accountProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OperatorEntryPage() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect("/login?next=/operator");
  }

  const ctx = await getAccountContext(user.id);
  if (ctx.isOperator) {
    redirect("/operator/dashboard");
  }

  redirect("/operator/register");
}
