import { redirect } from "next/navigation";
import ProfileForm from "@/components/Profile/ProfileForm";
import { getAccountContext } from "@/lib/accountProfile";
import { defaultVanName } from "@/lib/defaultVanName";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { DbOperatorVehicle } from "@/types/operator";

export const metadata = {
  title: "Profile | Van Share",
};

export default async function ProfilePage() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const ctx = await getAccountContext(user.id);
  let vehicles: DbOperatorVehicle[] = [];

  if (ctx.operator) {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("operator_vehicles")
      .select("*")
      .eq("operator_id", ctx.operator.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    vehicles = ((data ?? []) as DbOperatorVehicle[]).map((v, i) => ({
      ...v,
      name: v.name?.trim() || defaultVanName(i),
    }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Profile</h1>
        <p className="mt-1 text-sm text-gray-800">
          Update your details{ctx.isOperator ? " and manage your fleet" : ""}.
        </p>
      </div>
      <ProfileForm profile={ctx.profile} operator={ctx.operator} vehicles={vehicles} />
    </div>
  );
}
