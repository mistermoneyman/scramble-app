import { academicYearEnd, academicYearStart, graduatingClass } from './academicYear';
import { ME } from './seed';
import type { AppState, FundRequest, Org, OfficerRole, Transaction } from './types';

export const ROLE_LABELS: Record<OfficerRole, string> = {
  president: 'President',
  treasurer: 'Treasurer',
  vp: 'Vice President',
  secretary: 'Secretary',
};

export const ROLE_ORDER: OfficerRole[] = ['president', 'vp', 'treasurer', 'secretary'];

/** Only one person can hold these at a time. */
export const SINGLE_HOLDER_ROLES: OfficerRole[] = ['president', 'treasurer'];

export function roleOf(org: Org, userId: string): OfficerRole | undefined {
  return org.officers[userId];
}

export function officerIds(org: Org) {
  return Object.keys(org.officers)
    .filter((userId) => org.memberIds.includes(userId))
    .sort((a, b) => ROLE_ORDER.indexOf(org.officers[a]) - ROLE_ORDER.indexOf(org.officers[b]));
}

export function isOfficer(org: Org, userId = ME) {
  return roleOf(org, userId) !== undefined && org.memberIds.includes(userId);
}

export function canManageRoster(org: Org) {
  return roleOf(org, ME) === 'president';
}

export function canManageCard(org: Org) {
  const role = roleOf(org, ME);
  return role === 'president' || role === 'treasurer';
}

/** Officers graduating this academic year who don't have someone lined up. */
export function uncoveredGraduates(state: AppState, org: Org, now: number) {
  const seniors = graduatingClass(now);
  return officerIds(org).filter(
    (userId) => state.users[userId]?.gradYear === seniors && !org.successors[userId],
  );
}

export type RequestStatus = 'pending' | 'paid' | 'rejected';

export function requestStatus(request: FundRequest): RequestStatus {
  if (request.rejection) return 'rejected';
  if (request.paidAt !== undefined) return 'paid';
  return 'pending';
}

/** Every current officer has to sign before money moves. */
export function missingSigners(org: Org, request: FundRequest) {
  const signed = new Set(request.signatures.map((signature) => signature.userId));
  return officerIds(org).filter((userId) => !signed.has(userId));
}

export function orgTransactions(state: AppState, orgId: string) {
  return state.transactions
    .filter((transaction) => transaction.orgId === orgId)
    .sort((a, b) => b.at - a.at);
}

function sum(transactions: Transaction[], direction: Transaction['direction']) {
  return transactions
    .filter((transaction) => transaction.direction === direction)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function balance(state: AppState, orgId: string) {
  const transactions = orgTransactions(state, orgId);
  return sum(transactions, 'in') - sum(transactions, 'out');
}

export function orgRequests(state: AppState, orgId: string) {
  return state.requests
    .filter((request) => request.orgId === orgId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function pendingTotal(state: AppState, orgId: string) {
  return orgRequests(state, orgId)
    .filter((request) => requestStatus(request) === 'pending')
    .reduce((total, request) => total + request.amount, 0);
}

/** Balance minus money already promised to requests waiting on signatures. */
export function available(state: AppState, orgId: string) {
  return balance(state, orgId) - pendingTotal(state, orgId);
}

export function cardSpendThisMonth(state: AppState, orgId: string, now: number) {
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return orgTransactions(state, orgId)
    .filter((t) => t.method === 'card' && t.direction === 'out' && t.at >= start.getTime())
    .reduce((total, t) => total + t.amount, 0);
}

export function awaitingMySignature(state: AppState) {
  return state.requests.filter((request) => {
    if (requestStatus(request) !== 'pending') return false;
    const org = state.orgs.find((candidate) => candidate.id === request.orgId);
    return !!org && isOfficer(org) && missingSigners(org, request).includes(ME);
  });
}

export function auditKey(orgId: string, yearStart: number) {
  return `${orgId}:${yearStart}`;
}

export function yearReport(state: AppState, orgId: string, now: number) {
  const start = academicYearStart(now);
  const end = academicYearEnd(start);
  const all = orgTransactions(state, orgId);
  const inYear = all.filter((t) => t.at >= start && t.at < end);
  const before = all.filter((t) => t.at < start);
  const opening = sum(before, 'in') - sum(before, 'out');
  const moneyIn = sum(inYear, 'in');
  const moneyOut = sum(inYear, 'out');

  const totals = (direction: Transaction['direction']) => {
    const byCategory = new Map<string, number>();
    for (const t of inYear) {
      if (t.direction !== direction) continue;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    }
    return [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  };

  const partnerSpend = inYear
    .filter((t) => t.direction === 'out' && t.vendorId)
    .reduce((total, t) => total + t.amount, 0);

  return {
    start,
    end,
    opening,
    moneyIn,
    moneyOut,
    closing: opening + moneyIn - moneyOut,
    incomeBySource: totals('in'),
    spendByCategory: totals('out'),
    partnerSpend,
    transactions: inYear,
  };
}
