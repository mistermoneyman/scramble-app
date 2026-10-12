import { graduatingClass, termEnd } from './academicYear';
import { slotKey, startOfDay } from './availability';
import type {
  Activity,
  AppState,
  Availability,
  FundRequest,
  Message,
  OfficerCard,
  Org,
  OrgEvent,
  ThreadId,
  Transaction,
  User,
} from './types';

export const ME = 'me';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function at(now: number, daysFromNow: number, hour: number, minute = 0) {
  const date = new Date(now);
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

/** yearsLeft 0 means they graduate at the end of this academic year. */
const people: (Omit<User, 'gradYear'> & { yearsLeft: number })[] = [
  { id: ME, name: 'Avery Lewis', username: 'averyl', yearsLeft: 1 },
  { id: 'u_maya', name: 'Maya Chen', username: 'mayac', yearsLeft: 0 },
  { id: 'u_priya', name: 'Priya Patel', username: 'priyap', yearsLeft: 1 },
  { id: 'u_marcus', name: 'Marcus Johnson', username: 'mjohnson', yearsLeft: 0 },
  { id: 'u_leo', name: 'Leo Park', username: 'leop', yearsLeft: 2 },
  { id: 'u_tyler', name: 'Tyler Brooks', username: 'tbrooks', yearsLeft: 0 },
  { id: 'u_omar', name: 'Omar Haddad', username: 'omarh', yearsLeft: 1 },
  { id: 'u_elena', name: 'Elena García', username: 'elenag', yearsLeft: 2 },
  { id: 'u_nina', name: 'Nina Okafor', username: 'ninao', yearsLeft: 0 },
  { id: 'u_grace', name: 'Grace Liu', username: 'gracel', yearsLeft: 1 },
  { id: 'u_jordan', name: 'Jordan Kim', username: 'jkim', yearsLeft: 1 },
  { id: 'u_sam', name: 'Sam Rivera', username: 'samr', yearsLeft: 0 },
];

export function createSeed(now: number): AppState {
  const seniors = graduatingClass(now);
  const users: Record<string, User> = Object.fromEntries(
    people.map(({ yearsLeft, ...user }) => [user.id, { ...user, gradYear: seniors + yearsLeft }]),
  );

  type Block = [weekdays: number[], fromHour: number, toHour: number];
  const week = (...blocks: Block[]): Availability => ({
    weekly: blocks.flatMap(([weekdays, from, to]) =>
      weekdays.flatMap((weekday) =>
        Array.from({ length: to - from }, (_, i) => slotKey(weekday, from + i)),
      ),
    ),
    away: [],
  });
  const MON_THU = [1, 2, 3, 4];
  const WEEKDAYS = [1, 2, 3, 4, 5];
  const availability: Record<string, Availability> = {
    [ME]: { ...week([MON_THU, 17, 22], [[6], 11, 17], [[0], 12, 20]), away: [startOfDay(now, 10)] },
    u_maya: week([WEEKDAYS, 18, 22], [[0, 6], 12, 18]),
    u_priya: week([[1, 3, 4], 17, 22], [[2], 19, 22], [[0, 6], 10, 16]),
    u_marcus: week([MON_THU, 16, 21], [[5], 15, 23], [[6], 10, 14]),
    u_leo: week([WEEKDAYS, 18, 23], [[0], 14, 20]),
    u_tyler: week([[2, 4], 16, 22], [[5, 6], 12, 22]),
    u_omar: week([MON_THU, 18, 22], [[0, 6], 11, 19]),
    u_elena: week([[1, 3, 5], 12, 15], [MON_THU, 19, 22]),
    u_nina: week([WEEKDAYS, 17, 21], [[6], 8, 12]),
    u_grace: week([[2, 3, 4], 18, 22], [[0], 10, 22]),
    u_jordan: week([MON_THU, 19, 22], [[6], 8, 18]),
    u_sam: week([WEEKDAYS, 16, 20]),
  };

  const orgs: Org[] = [
    {
      id: 'startup',
      name: 'Startup Club',
      description: 'Founders, builders, and the curious. Weekly pitch practice and demo nights.',
      emoji: '🚀',
      color: '#FDE3D8',
      memberIds: [ME, 'u_maya', 'u_priya', 'u_marcus', 'u_leo'],
      officers: { u_maya: 'president', [ME]: 'treasurer', u_priya: 'vp' },
      successors: {},
    },
    {
      id: 'soccer',
      name: 'Intramural Soccer',
      description: 'Co-ed intramural team. All skill levels, lots of orange slices.',
      emoji: '⚽',
      color: '#DDEFE2',
      memberIds: [ME, 'u_marcus', 'u_tyler', 'u_omar', 'u_elena'],
      officers: { u_marcus: 'president', u_tyler: 'treasurer' },
      successors: { u_marcus: 'u_omar' },
    },
    {
      id: 'photo',
      name: 'Photography Society',
      description: 'Photo walks, critique nights, and a darkroom we are very proud of.',
      emoji: '📷',
      color: '#E3E8F7',
      memberIds: [ME, 'u_maya', 'u_nina', 'u_grace'],
      officers: { [ME]: 'president', u_nina: 'treasurer', u_grace: 'secretary' },
      successors: {},
    },
    {
      id: 'debate',
      name: 'Debate Team',
      description: 'Parliamentary debate. Practice rounds twice a week.',
      emoji: '🎤',
      color: '#F3E1F5',
      memberIds: ['u_priya', 'u_jordan', 'u_leo', 'u_sam'],
      officers: { u_sam: 'president', u_priya: 'treasurer' },
      successors: {},
    },
    {
      id: 'climb',
      name: 'Climbing Club',
      description: 'Bouldering at the rec center and weekend trips outside.',
      emoji: '🧗',
      color: '#FFF0C9',
      memberIds: ['u_tyler', 'u_nina', 'u_jordan', 'u_omar'],
      officers: { u_jordan: 'president', u_tyler: 'treasurer' },
      successors: {},
    },
    {
      id: 'film',
      name: 'Film Society',
      description: 'Screenings every Friday. Snacks provided, opinions required.',
      emoji: '🎬',
      color: '#E0F0F2',
      memberIds: ['u_grace', 'u_elena', 'u_sam', 'u_leo'],
      officers: { u_grace: 'president', u_elena: 'treasurer' },
      successors: {},
    },
  ];

  let messageCount = 0;
  const message = (threadId: ThreadId, senderId: string, text: string, ago: number): Message => ({
    id: `seed_m${messageCount++}`,
    threadId,
    senderId,
    text,
    sentAt: now - ago,
  });

  const messages: Message[] = [
    message('dm:u_maya', 'u_maya', 'Are you going to pitch night?', 3 * HOUR),
    message('dm:u_maya', ME, 'Planning on it! Still polishing my deck', 2.8 * HOUR),
    message('dm:u_maya', 'u_maya', 'Send it over, happy to take a look', 2.5 * HOUR),
    message('dm:u_marcus', 'u_marcus', 'Bring your cleats Thursday', DAY + 2 * HOUR),
    message('dm:u_marcus', ME, 'Will do 👍', DAY + HOUR),
    message('org:startup', 'u_priya', 'Welcome to everyone who joined this week!', 2 * DAY),
    message('org:startup', 'u_leo', 'Is there a sign-up sheet for pitch slots?', 5 * HOUR),
    message('org:startup', 'u_maya', 'Voting on the date first, check Events', 4 * HOUR),
    message('org:soccer', 'u_tyler', 'Great game last week, everyone', 3 * DAY),
    message('org:soccer', 'u_marcus', 'Scrimmage vs. Engineering is locked in', 20 * HOUR),
    message('org:photo', 'u_nina', 'Golden hour walk poll is up, vote!', 6 * HOUR),
    message('org:photo', 'u_grace', 'I can bring extra film for anyone who needs it', 5 * HOUR),
    message('org:debate', 'u_sam', 'Motion for Thursday is posted', 8 * HOUR),
    message('org:climb', 'u_jordan', 'Who wants to carpool Saturday?', 9 * HOUR),
    message('org:film', 'u_grace', 'Spirited Away this week, bring a friend', 10 * HOUR),
  ];

  const events: OrgEvent[] = [
    {
      id: 'seed_pitch',
      orgId: 'startup',
      title: 'Pitch Night',
      description:
        'Five-minute pitches, friendly feedback, free pizza.\n\n6:00  Doors open, pizza\n6:15  Opening remarks\n6:30  Pitches (8 teams)\n7:30  Judges’ feedback\n7:45  Networking',
      speaker: 'Dana Whitfield, founder of Lumen Labs',
      creatorId: 'u_maya',
      createdAt: now - DAY,
      options: [
        { id: 'a', startsAt: at(now, 3, 19) },
        { id: 'b', startsAt: at(now, 4, 19) },
        { id: 'c', startsAt: at(now, 5, 18) },
      ],
      votes: { a: ['u_maya', 'u_priya'], b: ['u_marcus'], c: ['u_leo', 'u_maya'] },
      pollClosesAt: now + 3 * MINUTE,
    },
    {
      id: 'seed_walk',
      orgId: 'photo',
      title: 'Golden hour photo walk',
      description: 'Meet at the library steps. Any camera works, phones included.',
      creatorId: 'u_nina',
      createdAt: now - 6 * HOUR,
      options: [
        { id: 'a', startsAt: at(now, 6, 18, 30) },
        { id: 'b', startsAt: at(now, 7, 18, 30) },
        { id: 'c', startsAt: at(now, 8, 9) },
      ],
      votes: { a: ['u_nina'], b: ['u_grace', 'u_maya'], c: [] },
      pollClosesAt: now + 2 * DAY,
    },
    {
      id: 'seed_practice',
      orgId: 'debate',
      title: 'Open practice round',
      description: 'Anyone can drop in and judge or debate.',
      creatorId: 'u_sam',
      createdAt: now - 3 * HOUR,
      options: [
        { id: 'a', startsAt: at(now, 3, 18) },
        { id: 'b', startsAt: at(now, 5, 18) },
      ],
      votes: { a: ['u_sam', 'u_jordan'], b: ['u_priya'] },
      pollClosesAt: now + DAY,
    },
    {
      id: 'seed_scrimmage',
      orgId: 'soccer',
      title: 'Scrimmage vs. Engineering',
      description: 'Field 3. Wear the orange jerseys.',
      creatorId: 'u_marcus',
      createdAt: now - 3 * DAY,
      options: [
        { id: 'a', startsAt: at(now, 4, 17) },
        { id: 'b', startsAt: at(now, 5, 17) },
      ],
      votes: { a: ['u_marcus', 'u_tyler', 'u_omar', ME], b: ['u_elena'] },
      pollClosesAt: now - DAY,
    },
    {
      id: 'seed_movie',
      orgId: 'film',
      title: 'Movie Night: Spirited Away',
      description: 'Student union theater. Doors at 7:45.',
      creatorId: 'u_grace',
      createdAt: now - 4 * DAY,
      options: [{ id: 'a', startsAt: at(now, 6, 20) }],
      votes: { a: ['u_grace', 'u_elena', 'u_sam'] },
      pollClosesAt: now - 2 * DAY,
    },
    {
      id: 'seed_kickoff',
      orgId: 'soccer',
      title: 'Season kickoff',
      description: 'First practice of the season.',
      creatorId: 'u_tyler',
      createdAt: now - 12 * DAY,
      options: [{ id: 'a', startsAt: at(now, -5, 17) }],
      votes: { a: ['u_tyler', 'u_marcus', ME] },
      pollClosesAt: now - 8 * DAY,
    },
  ];

  let txCount = 0;
  const tx = (
    orgId: string,
    direction: Transaction['direction'],
    dollars: number,
    description: string,
    category: Transaction['category'],
    daysAgo: number,
    extra: Partial<Transaction> = {},
  ): Transaction => ({
    id: `seed_t${txCount++}`,
    orgId,
    direction,
    amount: Math.round(dollars * 100),
    description,
    category,
    method: direction === 'in' ? 'deposit' : 'card',
    at: now - daysAgo * DAY,
    ...extra,
  });
  const viaRequest = (requestId: string, vendorId?: string) =>
    ({ method: 'request', requestId, vendorId }) as const;

  const transactions: Transaction[] = [
    tx('startup', 'in', 1500, 'Fall allocation', 'University allocation', 55),
    tx('startup', 'in', 400, 'Fall dues (20 members)', 'Member dues', 40),
    tx('startup', 'in', 500, 'First Campus Credit Union', 'Sponsorship', 20),
    tx('startup', 'out', 119.99, 'Canva Pro (annual)', 'Marketing', 35, { cardId: 'seed_c_maya', merchant: 'Canva', byId: 'u_maya' }),
    tx('startup', 'out', 96, 'Pizza for kickoff GBM', 'Food', 28, viaRequest('seed_r_kickoff', 'slice')),
    tx('startup', 'out', 32, 'Coffee for founder panel', 'Food', 14, viaRequest('seed_r_coffee', 'coffee')),
    tx('startup', 'out', 85, 'Club stickers', 'Marketing', 10, { cardId: 'seed_c_me_startup', merchant: 'Sticker Mule', byId: ME }),
    tx('photo', 'in', 800, 'Fall allocation', 'University allocation', 50),
    tx('photo', 'in', 240, 'Fall dues (12 members)', 'Member dues', 38),
    tx('photo', 'out', 142, 'Darkroom paper', 'Supplies', 30, { cardId: 'seed_c_me_photo', merchant: 'B&H Photo', byId: ME }),
    tx('photo', 'out', 36, 'Cookies for critique night', 'Food', 12, viaRequest('seed_r_cookies', 'bakery')),
    tx('photo', 'out', 18.75, 'Prints for critique night', 'Supplies', 6, {
      cardId: 'seed_c_me_photo',
      merchant: 'Office Depot',
      byId: ME,
    }),
    tx('startup', 'out', 42.5, 'Flyers for Pitch Night', 'Marketing', 4, {
      method: 'transfer',
      departmentId: 'print',
      byId: 'u_priya',
    }),
    tx('soccer', 'in', 600, 'Fall allocation', 'University allocation', 52),
    tx('soccer', 'out', 420, 'Team jerseys', 'Supplies', 33, viaRequest('seed_r_jerseys')),
    tx('debate', 'in', 700, 'Fall allocation', 'University allocation', 52),
    tx('debate', 'out', 180, 'Tournament registration', 'Travel', 21, { cardId: 'seed_c_priya', merchant: 'Tabroom.com', byId: 'u_priya' }),
    tx('climb', 'in', 500, 'Fall allocation', 'University allocation', 52),
    tx('climb', 'out', 220, 'Gym day passes', 'Events', 16, { cardId: 'seed_c_tyler_climb', merchant: 'Movement Climbing', byId: 'u_tyler' }),
    tx('film', 'in', 650, 'Fall allocation', 'University allocation', 52),
    tx('film', 'out', 48, 'Popcorn and snacks', 'Food', 9, { cardId: 'seed_c_elena', merchant: 'Target', byId: 'u_elena' }),
  ];

  const signed = (userIds: string[], daysAgo: number) =>
    userIds.map((userId, i) => ({ userId, at: now - daysAgo * DAY + i * HOUR }));

  const requests: FundRequest[] = [
    {
      id: 'seed_r_kickoff',
      orgId: 'startup',
      title: 'Pizza for kickoff GBM',
      amount: 9600,
      category: 'Food',
      vendorId: 'slice',
      items: [
        { name: 'Pepperoni pizza', quantity: 6, unitPrice: 1600, details: 'Large 14" · Hand-tossed' },
      ],
      delivery: {
        location: 'Engineering atrium',
        deliverAt: now - 28 * DAY + 3 * HOUR,
        contactId: 'u_maya',
        instructions: '',
      },
      orderNumber: 'SL-4417',
      note: 'First general body meeting of the semester.',
      requestedBy: 'u_maya',
      createdAt: now - 29 * DAY,
      signatures: signed(['u_maya', ME, 'u_priya'], 29),
      paidAt: now - 28 * DAY,
    },
    {
      id: 'seed_r_coffee',
      orgId: 'startup',
      title: 'Coffee for founder panel',
      amount: 3200,
      category: 'Food',
      vendorId: 'coffee',
      items: [{ name: 'Coffee traveler', quantity: 1, unitPrice: 3200, details: 'House blend' }],
      delivery: {
        location: 'Student Union 204',
        deliverAt: now - 14 * DAY + 4 * HOUR,
        contactId: ME,
        instructions: '',
      },
      orderNumber: 'BE-7781',
      note: '',
      requestedBy: ME,
      createdAt: now - 15 * DAY,
      signatures: signed([ME, 'u_maya', 'u_priya'], 15),
      paidAt: now - 14 * DAY,
    },
    {
      id: 'seed_r_pitch',
      orgId: 'startup',
      title: 'Pizza for Pitch Night',
      amount: 24319,
      category: 'Food',
      vendorId: 'slice',
      items: [
        { name: 'Pepperoni pizza', quantity: 6, unitPrice: 1600, details: 'Large 14" · Hand-tossed' },
        { name: 'Cheese pizza', quantity: 3, unitPrice: 1400, details: 'Large 14" · Hand-tossed' },
        {
          name: 'Build your own',
          quantity: 2,
          unitPrice: 1850,
          details: 'Large 14" · Thin · Red sauce · Mushrooms, Onions, Green peppers',
          note: 'Light on the onions',
        },
        { name: 'Cheese pizza', quantity: 1, unitPrice: 1700, details: 'Large 14" · Gluten-free' },
        { name: 'Garlic knots', quantity: 2, unitPrice: 800, details: 'Marinara' },
      ],
      charges: { subtotal: 20800, deliveryFee: 399, tip: 3120 },
      delivery: {
        location: 'Student Union 204',
        deliverAt: at(now, 3, 18, 45),
        contactId: 'u_maya',
        instructions: 'Side entrance on Elm St. Ask for the Startup Club table.',
      },
      eventId: 'seed_pitch',
      note: 'Expecting about 40 people.',
      requestedBy: 'u_maya',
      createdAt: now - 5 * HOUR,
      signatures: [
        { userId: 'u_maya', at: now - 5 * HOUR },
        { userId: 'u_priya', at: now - 3 * HOUR },
      ],
    },
    {
      id: 'seed_r_cookies',
      orgId: 'photo',
      title: 'Cookies for critique night',
      amount: 3600,
      category: 'Food',
      vendorId: 'bakery',
      items: [
        { name: 'Cookies', quantity: 2, unitPrice: 1800, details: 'Assorted · Nut-free' },
      ],
      delivery: {
        location: 'Library steps',
        deliverAt: now - 12 * DAY + 5 * HOUR,
        contactId: 'u_grace',
        instructions: '',
      },
      orderNumber: 'SW-2093',
      note: '',
      requestedBy: 'u_grace',
      createdAt: now - 13 * DAY,
      signatures: signed(['u_grace', ME, 'u_nina'], 13),
      paidAt: now - 12 * DAY,
    },
    {
      id: 'seed_r_chem',
      orgId: 'photo',
      title: 'Darkroom chemicals',
      amount: 6400,
      category: 'Supplies',
      note: 'Developer and fixer for the rest of the semester.',
      requestedBy: ME,
      createdAt: now - 2 * HOUR,
      signatures: [{ userId: ME, at: now - 2 * HOUR }],
    },
    {
      id: 'seed_r_jerseys',
      orgId: 'soccer',
      title: 'Team jerseys',
      amount: 42000,
      category: 'Supplies',
      note: '',
      requestedBy: 'u_marcus',
      createdAt: now - 34 * DAY,
      signatures: signed(['u_marcus', 'u_tyler'], 34),
      paidAt: now - 33 * DAY,
    },
  ];

  const card = (
    id: string,
    orgId: string,
    holderId: string,
    last4: string,
    issuedDaysAgo: number,
    inWallet: boolean,
  ): OfficerCard => ({
    id,
    orgId,
    holderId,
    last4,
    issuedAt: now - issuedDaysAgo * DAY,
    expiresAt: termEnd(now),
    inWallet,
  });

  let activityCount = 0;
  const activity = (orgId: string, actorId: string, text: string, ago: number): Activity => ({
    id: `seed_a${activityCount++}`,
    orgId,
    actorId,
    text,
    at: now - ago,
  });

  return {
    users,
    availability,
    orgs,
    messages,
    connections: { u_sam: 'incoming' },
    events,
    transactions,
    requests,
    cardSettings: {
      startup: { monthlyLimit: 50000, frozen: false },
      photo: { monthlyLimit: 25000, frozen: false },
      soccer: { monthlyLimit: 25000, frozen: false },
      debate: { monthlyLimit: 25000, frozen: false },
      climb: { monthlyLimit: 10000, frozen: false },
      film: { monthlyLimit: 10000, frozen: false },
    },
    cards: [
      card('seed_c_me_startup', 'startup', ME, '4821', 60, true),
      card('seed_c_maya', 'startup', 'u_maya', '7316', 70, true),
      {
        ...card('seed_c_marcus_startup', 'startup', 'u_marcus', '0558', 300, false),
        expiresAt: termEnd(now - 365 * DAY),
        deactivatedAt: now - 60 * DAY,
        deactivatedReason: 'Marcus Johnson stopped being Treasurer',
      },
      card('seed_c_me_photo', 'photo', ME, '1937', 70, true),
      card('seed_c_nina', 'photo', 'u_nina', '6604', 70, true),
      card('seed_c_marcus', 'soccer', 'u_marcus', '5502', 50, true),
      card('seed_c_priya', 'debate', 'u_priya', '7710', 50, true),
      card('seed_c_tyler_climb', 'climb', 'u_tyler', '3348', 50, true),
      card('seed_c_elena', 'film', 'u_elena', '9024', 50, false),
    ],
    activity: [
      activity('startup', 'u_maya', 'Card •••• 0558 turned off: Marcus Johnson stopped being Treasurer', 60 * DAY),
      activity('startup', 'u_maya', 'Maya Chen made Avery Lewis treasurer', 60 * DAY),
      activity('startup', 'u_maya', 'Maya Chen made Priya Patel vice president', 60 * DAY),
      activity('startup', 'u_maya', 'Maya Chen requested $200.00 for Pizza for Pitch Night', 5 * HOUR),
      activity('photo', ME, 'Avery Lewis became president', 70 * DAY),
      activity('photo', ME, 'Avery Lewis made Nina Okafor treasurer', 70 * DAY),
      activity('photo', ME, 'Avery Lewis requested $64.00 for Darkroom chemicals', 2 * HOUR),
      activity('soccer', 'u_marcus', 'Marcus Johnson lined up Omar Haddad to take over as president', 4 * DAY),
    ],
    audits: {},
  };
}
