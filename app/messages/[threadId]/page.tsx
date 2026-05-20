import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import MessageComposer from "@/components/Messages/MessageComposer";
import MessageThreadPoller from "@/components/Messages/MessageThreadPoller";
import { getThreadDetailForUser } from "@/lib/messaging";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ threadId: string }> };

export async function generateMetadata() {
  return { title: "Conversation | Van Share" };
}

export default async function MessageThreadPage({ params }: Props) {
  const { threadId } = await params;
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/messages/${threadId}`)}`);

  let thread;
  try {
    thread = await getThreadDetailForUser(threadId, user.id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col text-gray-900">
      <Link href="/messages" className="text-sm font-semibold text-blue-700 hover:underline">
        ← All messages
      </Link>
      <header className="mt-4 border-b border-gray-200 pb-4">
        <h1 className="text-xl font-bold text-gray-950">
          {thread.journey_route_name} · {thread.journey_departure_date}
        </h1>
        <p className="mt-1 text-sm text-gray-700">
          {thread.is_host ? "With" : "Host"}: {thread.counterparty_label}
        </p>
        <div className="mt-2">
          <MessageThreadPoller threadId={threadId} />
        </div>
      </header>

      <ul className="flex-1 space-y-3 py-4">
        {thread.messages.length === 0 ? (
          <li className="text-sm text-gray-600">No messages yet. Say hello to coordinate pickup.</li>
        ) : (
          thread.messages.map((m) => {
            const mine = m.sender_user_id === user.id;
            return (
              <li
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-xs ${mine ? "text-blue-100" : "text-gray-500"}`}>
                    {new Date(m.created_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <MessageComposer threadId={threadId} />
    </div>
  );
}
