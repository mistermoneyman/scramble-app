import type { AppState, Message, OrgEvent, ThreadId, User } from './types';

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

const people: User[] = [
  { id: ME, name: 'Avery Lewis', username: 'averyl' },
  { id: 'u_maya', name: 'Maya Chen', username: 'mayac' },
  { id: 'u_priya', name: 'Priya Patel', username: 'priyap' },
  { id: 'u_marcus', name: 'Marcus Johnson', username: 'mjohnson' },
  { id: 'u_leo', name: 'Leo Park', username: 'leop' },
  { id: 'u_tyler', name: 'Tyler Brooks', username: 'tbrooks' },
  { id: 'u_omar', name: 'Omar Haddad', username: 'omarh' },
  { id: 'u_elena', name: 'Elena García', username: 'elenag' },
  { id: 'u_nina', name: 'Nina Okafor', username: 'ninao' },
  { id: 'u_grace', name: 'Grace Liu', username: 'gracel' },
  { id: 'u_jordan', name: 'Jordan Kim', username: 'jkim' },
  { id: 'u_sam', name: 'Sam Rivera', username: 'samr' },
];

export function createSeed(now: number): AppState {
  const users = Object.fromEntries(people.map((user) => [user.id, user]));

  const orgs = [
    {
      id: 'startup',
      name: 'Startup Club',
      description: 'Founders, builders, and the curious. Weekly pitch practice and demo nights.',
      emoji: '🚀',
      color: '#FDE3D8',
      memberIds: [ME, 'u_maya', 'u_priya', 'u_marcus', 'u_leo'],
    },
    {
      id: 'soccer',
      name: 'Intramural Soccer',
      description: 'Co-ed intramural team. All skill levels, lots of orange slices.',
      emoji: '⚽',
      color: '#DDEFE2',
      memberIds: [ME, 'u_marcus', 'u_tyler', 'u_omar', 'u_elena'],
    },
    {
      id: 'photo',
      name: 'Photography Society',
      description: 'Photo walks, critique nights, and a darkroom we are very proud of.',
      emoji: '📷',
      color: '#E3E8F7',
      memberIds: [ME, 'u_maya', 'u_nina', 'u_grace'],
    },
    {
      id: 'debate',
      name: 'Debate Team',
      description: 'Parliamentary debate. Practice rounds twice a week.',
      emoji: '🎤',
      color: '#F3E1F5',
      memberIds: ['u_priya', 'u_jordan', 'u_leo', 'u_sam'],
    },
    {
      id: 'climb',
      name: 'Climbing Club',
      description: 'Bouldering at the rec center and weekend trips outside.',
      emoji: '🧗',
      color: '#FFF0C9',
      memberIds: ['u_tyler', 'u_nina', 'u_jordan', 'u_omar'],
    },
    {
      id: 'film',
      name: 'Film Society',
      description: 'Screenings every Friday. Snacks provided, opinions required.',
      emoji: '🎬',
      color: '#E0F0F2',
      memberIds: ['u_grace', 'u_elena', 'u_sam', 'u_leo'],
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
      description: 'Five-minute pitches, friendly feedback, free pizza.',
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

  return {
    users,
    orgs,
    messages,
    connections: { u_sam: 'incoming' },
    events,
  };
}
