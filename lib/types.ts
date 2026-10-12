export type User = {
  id: string;
  name: string;
  username: string;
};

export type Org = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  memberIds: string[];
};

export type ThreadId = `dm:${string}` | `org:${string}`;

export type Message = {
  id: string;
  threadId: ThreadId;
  senderId: string;
  text: string;
  sentAt: number;
};

/** From the current user's point of view. */
export type ConnectionStatus = 'connected' | 'outgoing' | 'incoming';

export type EventOption = {
  id: string;
  startsAt: number;
};

export type OrgEvent = {
  id: string;
  orgId: string;
  title: string;
  description: string;
  creatorId: string;
  createdAt: number;
  options: EventOption[];
  /** optionId -> ids of users who said that time works. */
  votes: Record<string, string[]>;
  pollClosesAt: number;
  /** Set when the creator closes the poll early. */
  closedAt?: number;
};

export type AppState = {
  users: Record<string, User>;
  orgs: Org[];
  messages: Message[];
  connections: Record<string, ConnectionStatus>;
  events: OrgEvent[];
};
