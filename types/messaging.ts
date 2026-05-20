export type MessageThreadKind = "passenger" | "operator";

export type DbMessageThread = {
  id: string;
  journey_id: string;
  kind: MessageThreadKind;
  host_user_id: string;
  counterparty_user_id: string;
  participant_id: string | null;
  operator_claim_id: string | null;
  contact_unlocked_at: string | null;
  created_at: string;
};

export type DbMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

export type MessageThreadListItem = DbMessageThread & {
  journey_route_name: string;
  journey_departure_date: string;
  counterparty_label: string;
  last_message_body: string | null;
  last_message_at: string | null;
  is_host: boolean;
};

export type MessageThreadDetail = MessageThreadListItem & {
  messages: DbMessage[];
};
