import { useSyncExternalStore } from 'react';

import { createSeed, ME } from './seed';
import type { AppState, EventOption, OrgEvent, ThreadId } from './types';

export { ME };

let state: AppState = createSeed(Date.now());
const listeners = new Set<() => void>();

function update(recipe: (current: AppState) => AppState) {
  state = recipe(state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppState() {
  return useSyncExternalStore(subscribe, () => state);
}

let idCounter = 0;
function newId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function sendMessage(threadId: ThreadId, text: string) {
  update((s) => ({
    ...s,
    messages: [...s.messages, { id: newId('m'), threadId, senderId: ME, text, sentAt: Date.now() }],
  }));
}

export function joinOrg(orgId: string) {
  update((s) => ({
    ...s,
    orgs: s.orgs.map((org) =>
      org.id === orgId && !org.memberIds.includes(ME)
        ? { ...org, memberIds: [...org.memberIds, ME] }
        : org,
    ),
  }));
}

export function requestConnection(userId: string) {
  update((s) => ({ ...s, connections: { ...s.connections, [userId]: 'outgoing' } }));
}

export function acceptConnection(userId: string) {
  update((s) => ({ ...s, connections: { ...s.connections, [userId]: 'connected' } }));
}

export function removeConnection(userId: string) {
  update((s) => {
    const { [userId]: _removed, ...connections } = s.connections;
    return { ...s, connections };
  });
}

export function createEvent(input: {
  orgId: string;
  title: string;
  description: string;
  startTimes: number[];
  pollClosesAt: number;
}) {
  const options: EventOption[] = [...input.startTimes]
    .sort((a, b) => a - b)
    .map((startsAt) => ({ id: newId('o'), startsAt }));
  const event: OrgEvent = {
    id: newId('e'),
    orgId: input.orgId,
    title: input.title,
    description: input.description,
    creatorId: ME,
    createdAt: Date.now(),
    options,
    votes: Object.fromEntries(options.map((option) => [option.id, []])),
    pollClosesAt: input.pollClosesAt,
  };
  update((s) => ({ ...s, events: [...s.events, event] }));
  return event.id;
}

export function toggleVote(eventId: string, optionId: string) {
  update((s) => ({
    ...s,
    events: s.events.map((event) => {
      if (event.id !== eventId) return event;
      const voters = event.votes[optionId] ?? [];
      const next = voters.includes(ME) ? voters.filter((id) => id !== ME) : [...voters, ME];
      return { ...event, votes: { ...event.votes, [optionId]: next } };
    }),
  }));
}

export function closePoll(eventId: string) {
  update((s) => ({
    ...s,
    events: s.events.map((event) =>
      event.id === eventId ? { ...event, closedAt: Date.now() } : event,
    ),
  }));
}
