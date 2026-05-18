import { redirect } from "next/navigation";
import OperatorRegistrationForm from "@/components/Operator/OperatorRegistrationForm";
import { getAccountContext } from "@/lib/accountProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Register as operator | Van Share",
};

export default async function OperatorRegisterPage() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect("/login?next=/operator/register");
  }

  const ctx = await getAccountContext(user.id);
  if (ctx.isOperator) {
    redirect("/operator/dashboard");
  }

  return <OperatorRegistrationForm />;
}
