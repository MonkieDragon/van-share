import { createServiceClient } from "@/lib/supabaseServer";
import type { DbMessage, DbMessageThread, MessageThreadListItem } from "@/types/messaging";

function svc() {
  return createServiceClient();
}

function routeNameFromJoin(routes: unknown): string {
  if (Array.isArray(routes)) {
    const first = routes[0] as { name?: string } | undefined;
    return first?.name ?? "Journey";
  }
  if (routes && typeof routes === "object" && "name" in routes) {
    return String((routes as { name: string }).name);
  }
  return "Journey";
}

export async function getThreadById(threadId: string): Promise<DbMessageThread | null> {
  const { data, error } = await svc()
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  return data as DbMessageThread | null;
}

export async function assertThreadParticipant(threadId: string, userId: string): Promise<DbMessageThread> {
  const thread = await getThreadById(threadId);
  if (!thread) throw new Error("Thread not found");
  if (thread.host_user_id !== userId && thread.counterparty_user_id !== userId) {
    throw new Error("Forbidden");
  }
  return thread;
}

export async function getOrCreatePassengerThread(
  journeyId: string,
  participantId: string,
  hostUserId: string,
  counterpartyUserId: string,
): Promise<DbMessageThread> {
  const client = svc();
  const { data: existing } = await client
    .from("message_threads")
    .select("*")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (existing) return existing as DbMessageThread;

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("message_threads")
    .insert({
      journey_id: journeyId,
      kind: "passenger",
      host_user_id: hostUserId,
      counterparty_user_id: counterpartyUserId,
      participant_id: participantId,
      contact_unlocked_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DbMessageThread;
}

export async function getOrCreateOperatorThread(
  journeyId: string,
  claimId: string,
  hostUserId: string,
  operatorUserId: string,
): Promise<DbMessageThread> {
  const client = svc();
  const { data: existing } = await client
    .from("message_threads")
    .select("*")
    .eq("operator_claim_id", claimId)
    .maybeSingle();
  if (existing) return existing as DbMessageThread;

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("message_threads")
    .insert({
      journey_id: journeyId,
      kind: "operator",
      host_user_id: hostUserId,
      counterparty_user_id: operatorUserId,
      operator_claim_id: claimId,
      contact_unlocked_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DbMessageThread;
}

export async function listMessages(threadId: string, limit = 100): Promise<DbMessage[]> {
  const { data, error } = await svc()
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DbMessage[];
}

export async function postMessage(
  threadId: string,
  senderUserId: string,
  body: string,
): Promise<DbMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  await assertThreadParticipant(threadId, senderUserId);
  const { data, error } = await svc()
    .from("messages")
    .insert({ thread_id: threadId, sender_user_id: senderUserId, body: trimmed })
    .select("*")
    .single();
  if (error) throw error;
  return data as DbMessage;
}

export async function findPassengerThreadId(participantId: string): Promise<string | null> {
  const { data } = await svc()
    .from("message_threads")
    .select("id")
    .eq("participant_id", participantId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function findOperatorThreadId(claimId: string): Promise<string | null> {
  const { data } = await svc()
    .from("message_threads")
    .select("id")
    .eq("operator_claim_id", claimId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function listThreadsForUser(userId: string): Promise<MessageThreadListItem[]> {
  const client = svc();
  const { data: threads, error } = await client
    .from("message_threads")
    .select("*")
    .or(`host_user_id.eq.${userId},counterparty_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!threads?.length) return [];

  const journeyIds = [...new Set(threads.map((t) => t.journey_id as string))];
  const { data: journeys } = await client
    .from("journeys")
    .select("id, departure_date, routes(name)")
    .in("id", journeyIds);
  const journeyMap = new Map(
    (journeys ?? []).map((j) => [
      j.id as string,
      {
        routeName: routeNameFromJoin(j.routes),
        departureDate: j.departure_date as string,
      },
    ]),
  );

  const threadIds = threads.map((t) => t.id as string);
  const { data: lastMsgs } = await client
    .from("messages")
    .select("thread_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });

  const lastByThread = new Map<string, { body: string; created_at: string }>();
  for (const m of lastMsgs ?? []) {
    const tid = m.thread_id as string;
    if (!lastByThread.has(tid)) {
      lastByThread.set(tid, { body: m.body as string, created_at: m.created_at as string });
    }
  }

  const counterpartyIds = [
    ...new Set(
      threads.map((t) =>
        (t.host_user_id as string) === userId
          ? (t.counterparty_user_id as string)
          : (t.host_user_id as string),
      ),
    ),
  ];
  const { data: profiles } = await client
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", counterpartyIds);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, (p.display_name as string) || "User"]),
  );

  return threads.map((t) => {
    const thread = t as DbMessageThread;
    const isHost = thread.host_user_id === userId;
    const counterId = isHost ? thread.counterparty_user_id : thread.host_user_id;
    const j = journeyMap.get(thread.journey_id);
    const last = lastByThread.get(thread.id);
    return {
      ...thread,
      journey_route_name: j?.routeName ?? "Journey",
      journey_departure_date: j?.departureDate ?? "",
      counterparty_label: profileMap.get(counterId) ?? "Contact",
      last_message_body: last?.body ?? null,
      last_message_at: last?.created_at ?? null,
      is_host: isHost,
    };
  });
}

export async function getThreadDetailForUser(
  threadId: string,
  userId: string,
): Promise<MessageThreadListItem & { messages: DbMessage[] }> {
  const thread = await assertThreadParticipant(threadId, userId);
  const items = await listThreadsForUser(userId);
  const meta = items.find((i) => i.id === threadId);
  const messages = await listMessages(threadId);
  return {
    ...(meta ?? {
      ...thread,
      journey_route_name: "Journey",
      journey_departure_date: "",
      counterparty_label: "Contact",
      last_message_body: null,
      last_message_at: null,
      is_host: thread.host_user_id === userId,
    }),
    messages,
  };
}
