import { useSyncExternalStore } from 'react';

import { academicYearStart } from './academicYear';
import { formatMoney } from './format';
import {
  auditKey,
  available,
  canManageCard,
  canManageRoster,
  isOfficer,
  missingSigners,
  officerIds,
  requestStatus,
  ROLE_LABELS,
  SINGLE_HOLDER_ROLES,
} from './orgRules';
import { createSeed, ME } from './seed';
import type {
  AppState,
  Category,
  EventOption,
  LineItem,
  OfficerRole,
  Org,
  OrgEvent,
  ThreadId,
  Transaction,
} from './types';

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

const nameOf = (s: AppState, userId: string) => s.users[userId]?.name ?? 'Someone';

function log(s: AppState, orgId: string, text: string): AppState {
  return {
    ...s,
    activity: [...s.activity, { id: newId('a'), orgId, actorId: ME, text, at: Date.now() }],
  };
}

function updateOrg(s: AppState, org: Org): AppState {
  return { ...s, orgs: s.orgs.map((candidate) => (candidate.id === org.id ? org : candidate)) };
}

/** Pays out any pending request that every current officer has signed. */
function settle(s: AppState, orgId: string): AppState {
  const org = s.orgs.find((candidate) => candidate.id === orgId);
  if (!org || officerIds(org).length === 0) return s;

  let next = s;
  for (const request of s.requests) {
    if (request.orgId !== orgId || requestStatus(request) !== 'pending') continue;
    if (missingSigners(org, request).length > 0) continue;
    const at = Date.now();
    const transaction: Transaction = {
      id: newId('t'),
      orgId,
      direction: 'out',
      amount: request.amount,
      description: request.title,
      category: request.category,
      method: 'request',
      vendorId: request.vendorId,
      requestId: request.id,
      at,
    };
    next = {
      ...next,
      requests: next.requests.map((r) => (r.id === request.id ? { ...r, paidAt: at } : r)),
      transactions: [...next.transactions, transaction],
    };
    next = log(next, orgId, `${formatMoney(request.amount)} paid out for ${request.title}`);
  }
  return next;
}

export function assignRole(orgId: string, userId: string, role: OfficerRole | null) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    if (!org || !canManageRoster(org)) return s;
    const previous = org.officers[userId];
    if (previous === 'president' && role !== 'president') return s;

    const officers = { ...org.officers };
    const successors = { ...org.successors };
    let text: string;

    if (role === null) {
      if (!previous) return s;
      delete officers[userId];
      delete successors[userId];
      text = `${nameOf(s, ME)} removed ${nameOf(s, userId)} as ${ROLE_LABELS[previous]}`;
    } else {
      if (SINGLE_HOLDER_ROLES.includes(role)) {
        for (const [holderId, held] of Object.entries(officers)) {
          if (held === role && holderId !== userId) {
            delete officers[holderId];
            delete successors[holderId];
          }
        }
      }
      officers[userId] = role;
      text =
        role === 'president'
          ? `${nameOf(s, ME)} handed the presidency to ${nameOf(s, userId)}`
          : `${nameOf(s, ME)} made ${nameOf(s, userId)} ${ROLE_LABELS[role]}`;
    }

    return settle(log(updateOrg(s, { ...org, officers, successors }), orgId, text), orgId);
  });
}

export function setSuccessor(orgId: string, officerId: string, successorId: string | null) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    if (!org || !(canManageRoster(org) || officerId === ME)) return s;
    const role = org.officers[officerId];
    if (!role) return s;
    const successors = { ...org.successors };
    if (successorId) successors[officerId] = successorId;
    else delete successors[officerId];
    const text = successorId
      ? `${nameOf(s, ME)} lined up ${nameOf(s, successorId)} to take over as ${ROLE_LABELS[role]}`
      : `${nameOf(s, ME)} cleared the ${ROLE_LABELS[role]} successor`;
    return log(updateOrg(s, { ...org, successors }), orgId, text);
  });
}

export function handOff(orgId: string, officerId: string) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    if (!org || !(canManageRoster(org) || officerId === ME)) return s;
    const role = org.officers[officerId];
    const successorId = org.successors[officerId];
    if (!role || !successorId) return s;

    const officers = { ...org.officers };
    const successors = { ...org.successors };
    delete officers[officerId];
    delete successors[officerId];
    delete successors[successorId];
    officers[successorId] = role;

    const text = `${nameOf(s, officerId)} handed ${ROLE_LABELS[role]} to ${nameOf(s, successorId)}`;
    return settle(log(updateOrg(s, { ...org, officers, successors }), orgId, text), orgId);
  });
}

export function createRequest(input: {
  orgId: string;
  title: string;
  amount: number;
  category: Category;
  vendorId?: string;
  items?: LineItem[];
  eventId?: string;
  note: string;
}) {
  const id = newId('r');
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === input.orgId);
    if (!org || !isOfficer(org) || input.amount <= 0 || input.amount > available(s, org.id)) {
      return s;
    }
    const at = Date.now();
    const next: AppState = {
      ...s,
      requests: [
        ...s.requests,
        { ...input, id, requestedBy: ME, createdAt: at, signatures: [{ userId: ME, at }] },
      ],
    };
    const text = `${nameOf(s, ME)} requested ${formatMoney(input.amount)} for ${input.title}`;
    return settle(log(next, org.id, text), org.id);
  });
  return id;
}

export function signRequest(requestId: string) {
  update((s) => {
    const request = s.requests.find((candidate) => candidate.id === requestId);
    const org = request && s.orgs.find((candidate) => candidate.id === request.orgId);
    if (!request || !org || requestStatus(request) !== 'pending') return s;
    if (!missingSigners(org, request).includes(ME)) return s;
    const next: AppState = {
      ...s,
      requests: s.requests.map((r) =>
        r.id === requestId ? { ...r, signatures: [...r.signatures, { userId: ME, at: Date.now() }] } : r,
      ),
    };
    return settle(log(next, org.id, `${nameOf(s, ME)} signed off on ${request.title}`), org.id);
  });
}

export function rejectRequest(requestId: string) {
  update((s) => {
    const request = s.requests.find((candidate) => candidate.id === requestId);
    const org = request && s.orgs.find((candidate) => candidate.id === request.orgId);
    if (!request || !org || !isOfficer(org) || requestStatus(request) !== 'pending') return s;
    const next: AppState = {
      ...s,
      requests: s.requests.map((r) =>
        r.id === requestId ? { ...r, rejection: { userId: ME, at: Date.now() } } : r,
      ),
    };
    return log(next, org.id, `${nameOf(s, ME)} declined ${request.title}`);
  });
}

export function setCardLimit(orgId: string, monthlyLimit: number) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    const card = s.cards[orgId];
    if (!org || !card || !canManageCard(org)) return s;
    const next = { ...s, cards: { ...s.cards, [orgId]: { ...card, monthlyLimit } } };
    return log(next, orgId, `${nameOf(s, ME)} set the card limit to ${formatMoney(monthlyLimit)}/month`);
  });
}

export function toggleCardFrozen(orgId: string) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    const card = s.cards[orgId];
    if (!org || !card || !canManageCard(org)) return s;
    const frozen = !card.frozen;
    const next = { ...s, cards: { ...s.cards, [orgId]: { ...card, frozen } } };
    return log(next, orgId, `${nameOf(s, ME)} ${frozen ? 'froze' : 'unfroze'} the org card`);
  });
}

export function submitAudit(orgId: string) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    if (!org || !isOfficer(org)) return s;
    const key = auditKey(orgId, academicYearStart(Date.now()));
    const next = {
      ...s,
      audits: { ...s.audits, [key]: { submittedBy: ME, submittedAt: Date.now() } },
    };
    return log(next, orgId, `${nameOf(s, ME)} submitted the year-end report to Student Activities`);
  });
}
