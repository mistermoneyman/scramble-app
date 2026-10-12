export type User = {
  id: string;
  name: string;
  username: string;
  /** Spring graduation year. */
  gradYear: number;
};

export type OfficerRole = 'president' | 'treasurer' | 'vp' | 'secretary';

export type Org = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  memberIds: string[];
  /** userId -> role. Anyone not listed is a general member. */
  officers: Record<string, OfficerRole>;
  /** officerId -> member lined up to take over their role. */
  successors: Record<string, string>;
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

export type Category = 'Food' | 'Supplies' | 'Travel' | 'Marketing' | 'Events' | 'Other';
export type IncomeSource = 'University allocation' | 'Member dues' | 'Fundraising' | 'Sponsorship';

/** Amounts are in cents. */
export type Transaction = {
  id: string;
  orgId: string;
  direction: 'in' | 'out';
  amount: number;
  description: string;
  category: Category | IncomeSource;
  /**
   * card: tapped at an outside store with an officer's wallet card.
   * transfer: paid to a university department, moved account to account.
   */
  method: 'deposit' | 'request' | 'card' | 'transfer';
  vendorId?: string;
  requestId?: string;
  cardId?: string;
  /** Store name for card purchases. */
  merchant?: string;
  departmentId?: string;
  eventId?: string;
  /** Officer who made the payment. */
  byId?: string;
  at: number;
};

export type LineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  /** Chosen options, e.g. "Large 14" · Thin · Mushrooms". */
  details?: string;
  note?: string;
};

export type Delivery = {
  location: string;
  deliverAt: number;
  /** Who the driver calls on arrival. */
  contactId: string;
  instructions: string;
};

/** Breakdown of a partner order total. Cents. */
export type OrderCharges = {
  subtotal: number;
  deliveryFee: number;
  tip: number;
};

export type Signature = {
  userId: string;
  at: number;
};

export type FundRequest = {
  id: string;
  orgId: string;
  title: string;
  amount: number;
  category: Category;
  vendorId?: string;
  items?: LineItem[];
  delivery?: Delivery;
  charges?: OrderCharges;
  /** The partner's confirmation number, set once paid and placed. */
  orderNumber?: string;
  eventId?: string;
  note: string;
  requestedBy: string;
  createdAt: number;
  signatures: Signature[];
  rejection?: Signature;
  paidAt?: number;
};

/** Applies to every officer card in the org. */
export type CardSettings = {
  monthlyLimit: number;
  frozen: boolean;
};

/** A virtual card issued to one officer's phone wallet. */
export type OfficerCard = {
  id: string;
  orgId: string;
  holderId: string;
  last4: string;
  issuedAt: number;
  expiresAt: number;
  inWallet: boolean;
  deactivatedAt?: number;
  deactivatedReason?: string;
};

export type Activity = {
  id: string;
  orgId: string;
  actorId: string;
  text: string;
  at: number;
};

export type AuditSubmission = {
  submittedBy: string;
  submittedAt: number;
};

/** A person's usual week, plus specific days they can't make anything. */
export type Availability = {
  /** weekday * 24 + hour, where weekday 0 is Sunday. Each slot is one hour. */
  weekly: number[];
  /** Local midnight of each day they're away. */
  away: number[];
};

export type AppState = {
  users: Record<string, User>;
  availability: Record<string, Availability>;
  orgs: Org[];
  messages: Message[];
  connections: Record<string, ConnectionStatus>;
  events: OrgEvent[];
  transactions: Transaction[];
  requests: FundRequest[];
  cardSettings: Record<string, CardSettings>;
  cards: OfficerCard[];
  activity: Activity[];
  /** `${orgId}:${academicYearStart}` -> submission. */
  audits: Record<string, AuditSubmission>;
};
