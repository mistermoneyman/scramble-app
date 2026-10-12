import { ME } from './seed';
import type { AppState, EventOption, Message, Org, OrgEvent, ThreadId, User } from './types';

export function myOrgs(state: AppState) {
  return state.orgs.filter((org) => org.memberIds.includes(ME));
}

export function isMember(org: Org) {
  return org.memberIds.includes(ME);
}

export function sharedOrgs(state: AppState, userId: string) {
  return state.orgs.filter((org) => org.memberIds.includes(ME) && org.memberIds.includes(userId));
}

/** You can DM someone you share an org with, or someone who accepted your connection. */
export function canMessage(state: AppState, userId: string) {
  if (userId === ME) return false;
  return state.connections[userId] === 'connected' || sharedOrgs(state, userId).length > 0;
}

export function normalizeUsername(query: string) {
  return query.trim().toLowerCase().replace(/^@/, '');
}

/** Name search only covers people who share an org with you. */
export function searchOrgmates(state: AppState, query: string): User[] {
  const q = normalizeUsername(query);
  return Object.values(state.users)
    .filter((user) => user.id !== ME && sharedOrgs(state, user.id).length > 0)
    .filter((user) => !q || user.name.toLowerCase().includes(q) || user.username.includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Anyone else has to be found by their exact username. */
export function findByUsername(state: AppState, query: string): User | undefined {
  const handle = normalizeUsername(query);
  if (!handle) return undefined;
  return Object.values(state.users).find((user) => user.id !== ME && user.username === handle);
}

export function connectionsWithStatus(state: AppState, status: AppState['connections'][string]) {
  return Object.entries(state.connections)
    .filter(([, value]) => value === status)
    .map(([userId]) => state.users[userId])
    .filter(Boolean);
}

export function threadMessages(state: AppState, threadId: ThreadId) {
  return state.messages
    .filter((message) => message.threadId === threadId)
    .sort((a, b) => a.sentAt - b.sentAt);
}

export function lastMessage(state: AppState, threadId: ThreadId): Message | undefined {
  let latest: Message | undefined;
  for (const message of state.messages) {
    if (message.threadId === threadId && (!latest || message.sentAt > latest.sentAt)) {
      latest = message;
    }
  }
  return latest;
}

export function directThreads(state: AppState) {
  const latestByUser = new Map<string, Message>();
  for (const message of state.messages) {
    if (!message.threadId.startsWith('dm:')) continue;
    const userId = message.threadId.slice(3);
    const current = latestByUser.get(userId);
    if (!current || message.sentAt > current.sentAt) latestByUser.set(userId, message);
  }
  return [...latestByUser.entries()]
    .filter(([userId]) => canMessage(state, userId))
    .map(([userId, last]) => ({ user: state.users[userId], last }))
    .sort((a, b) => b.last.sentAt - a.last.sentAt);
}

export function isPollOpen(event: OrgEvent, now: number) {
  return event.closedAt === undefined && now < event.pollClosesAt;
}

export function voteCount(event: OrgEvent, optionId: string) {
  return event.votes[optionId]?.length ?? 0;
}

/** Most votes wins; ties go to the earliest date. */
export function leadingOption(event: OrgEvent): EventOption {
  return [...event.options].sort(
    (a, b) => voteCount(event, b.id) - voteCount(event, a.id) || a.startsAt - b.startsAt,
  )[0];
}

export function hasVoted(event: OrgEvent) {
  return Object.values(event.votes).some((voters) => voters.includes(ME));
}

const RECENTLY_STARTED = 3 * 60 * 60 * 1000;

export function groupEvents(events: OrgEvent[], now: number) {
  const voting = events
    .filter((event) => isPollOpen(event, now))
    .sort((a, b) => a.pollClosesAt - b.pollClosesAt);
  const decided = events.filter((event) => !isPollOpen(event, now));
  const startOf = (event: OrgEvent) => leadingOption(event).startsAt;
  const upcoming = decided
    .filter((event) => startOf(event) >= now - RECENTLY_STARTED)
    .sort((a, b) => startOf(a) - startOf(b));
  const past = decided
    .filter((event) => startOf(event) < now - RECENTLY_STARTED)
    .sort((a, b) => startOf(b) - startOf(a));

  return [
    { title: 'Voting open', data: voting },
    { title: 'Upcoming', data: upcoming },
    { title: 'Past', data: past },
  ].filter((section) => section.data.length > 0);
}
