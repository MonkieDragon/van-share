import { createServiceClient } from "@/lib/supabaseServer";
import type { AccountType, DbProfile } from "@/types/operator";
import type { DbOperator } from "@/types/journey";

export async function ensureProfile(userId: string): Promise<DbProfile> {
  const svc = createServiceClient();
  const { data: existing } = await svc.from("profiles").select("*").eq("user_id", userId).maybeSingle();

  if (existing) return existing as DbProfile;

  const { data, error } = await svc
    .from("profiles")
    .insert({ user_id: userId, account_type: "passenger" })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbProfile;
}

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as DbProfile | null) ?? null;
}

export async function getOperatorForUser(userId: string): Promise<DbOperator | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.from("operators").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as DbOperator | null) ?? null;
}

export type AccountContext = {
  profile: DbProfile;
  operator: DbOperator | null;
  accountType: AccountType;
  isOperator: boolean;
};

export async function getAccountContext(userId: string): Promise<AccountContext> {
  const profile = await ensureProfile(userId);
  const operator = await getOperatorForUser(userId);
  const accountType: AccountType =
    profile.account_type === "operator" && operator ? "operator" : "passenger";
  return {
    profile,
    operator,
    accountType,
    isOperator: accountType === "operator",
  };
}
