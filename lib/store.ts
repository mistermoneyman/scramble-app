import { useSyncExternalStore } from 'react';

import { academicYearStart, termEnd } from './academicYear';
import { formatLongDate, formatMoney } from './format';
import {
  activeCard,
  auditKey,
  available,
  canManageCard,
  canManageRoster,
  cardStatus,
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
  OfficerCard,
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

    const next = log(updateOrg(s, { ...org, officers, successors }), orgId, text);
    return settle(syncCards(next, orgId, org.officers), orgId);
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
    const next = log(updateOrg(s, { ...org, officers, successors }), orgId, text);
    return settle(syncCards(next, orgId, org.officers), orgId);
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
    const settings = s.cardSettings[orgId];
    if (!org || !settings || !canManageCard(org)) return s;
    const next = {
      ...s,
      cardSettings: { ...s.cardSettings, [orgId]: { ...settings, monthlyLimit } },
    };
    return log(next, orgId, `${nameOf(s, ME)} set the card limit to ${formatMoney(monthlyLimit)}/month`);
  });
}

export function toggleCardFrozen(orgId: string) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    const settings = s.cardSettings[orgId];
    if (!org || !settings || !canManageCard(org)) return s;
    const frozen = !settings.frozen;
    const next = { ...s, cardSettings: { ...s.cardSettings, [orgId]: { ...settings, frozen } } };
    return log(next, orgId, `${nameOf(s, ME)} ${frozen ? 'froze' : 'unfroze'} all officer cards`);
  });
}

function withCard(s: AppState, orgId: string, holderId: string): AppState {
  const now = Date.now();
  if (activeCard(s, orgId, holderId, now)) return s;
  const card: OfficerCard = {
    id: newId('c'),
    orgId,
    holderId,
    last4: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
    issuedAt: now,
    expiresAt: termEnd(now),
    inWallet: false,
  };
  const text = `Card •••• ${card.last4} issued to ${nameOf(s, holderId)}, expires ${formatLongDate(card.expiresAt)}`;
  return log({ ...s, cards: [...s.cards, card] }, orgId, text);
}

function withoutCard(s: AppState, cardId: string, reason: string): AppState {
  const card = s.cards.find((candidate) => candidate.id === cardId);
  if (!card || cardStatus(card, Date.now()) !== 'active') return s;
  const next = {
    ...s,
    cards: s.cards.map((c) =>
      c.id === cardId ? { ...c, deactivatedAt: Date.now(), deactivatedReason: reason } : c,
    ),
  };
  return log(next, card.orgId, `Card •••• ${card.last4} turned off: ${reason}`);
}

/**
 * Turns off cards held by anyone who just stopped being an officer, and gives a
 * fresh card to whoever took over their role.
 */
function syncCards(s: AppState, orgId: string, before: Org['officers']): AppState {
  const org = s.orgs.find((candidate) => candidate.id === orgId);
  if (!org) return s;
  let next = s;
  for (const card of s.cards) {
    if (card.orgId !== orgId || cardStatus(card, Date.now()) !== 'active') continue;
    if (org.officers[card.holderId]) continue;
    const role = before[card.holderId];
    next = withoutCard(
      next,
      card.id,
      `${nameOf(s, card.holderId)} stopped being ${role ? ROLE_LABELS[role] : 'an officer'}`,
    );
    const replacement = Object.keys(org.officers).find(
      (userId) => org.officers[userId] === role && before[userId] !== role,
    );
    if (replacement) next = withCard(next, orgId, replacement);
  }
  return next;
}

export function issueCard(orgId: string, holderId: string) {
  update((s) => {
    const org = s.orgs.find((candidate) => candidate.id === orgId);
    if (!org || !canManageCard(org) || !isOfficer(org, holderId)) return s;
    return withCard(s, orgId, holderId);
  });
}

export function deactivateCard(cardId: string) {
  update((s) => {
    const card = s.cards.find((candidate) => candidate.id === cardId);
    const org = card && s.orgs.find((candidate) => candidate.id === card.orgId);
    if (!card || !org || !(canManageCard(org) || card.holderId === ME)) return s;
    return withoutCard(s, cardId, `turned off by ${nameOf(s, ME)}`);
  });
}

export function addCardToWallet(cardId: string) {
  update((s) => {
    const card = s.cards.find((candidate) => candidate.id === cardId);
    if (!card || card.holderId !== ME || card.inWallet) return s;
    return { ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, inWallet: true } : c)) };
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
