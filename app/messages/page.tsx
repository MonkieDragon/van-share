import Link from "next/link";
import { redirect } from "next/navigation";
import { listThreadsForUser } from "@/lib/messaging";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Messages | Van Share",
};

export default async function MessagesPage() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/messages");

  const threads = await listThreadsForUser(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Messages</h1>
        <p className="mt-1 text-sm text-gray-800">Coordinate with hosts, passengers, and operators.</p>
      </div>

      {threads.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-800">
          No conversations yet. When a host contacts you or you message about a van offer, threads appear
          here.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/messages/${t.id}`}
                className="block px-4 py-4 hover:bg-gray-50"
              >
                <p className="font-semibold text-gray-950">
                  {t.journey_route_name} · {t.journey_departure_date}
                </p>
                <p className="text-sm text-gray-700">
                  {t.is_host ? "With" : "Host"}: {t.counterparty_label}
                  {t.kind === "operator" ? " (operator)" : " (passenger)"}
                </p>
                {t.last_message_body && (
                  <p className="mt-1 truncate text-sm text-gray-600">{t.last_message_body}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
