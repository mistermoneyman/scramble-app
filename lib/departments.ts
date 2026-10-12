import type { Category } from './types';

/** Campus offices that bill orgs by internal transfer instead of a card. */
export type Department = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  category: Category;
};

export const DEPARTMENTS: Department[] = [
  {
    id: 'print',
    name: 'Print & Copy Center',
    emoji: '🖨️',
    blurb: 'Flyers, posters, and banners. Pick up at the library.',
    category: 'Marketing',
  },
  {
    id: 'spaces',
    name: 'Event Spaces',
    emoji: '🏛️',
    blurb: 'Room and ballroom reservations in the student union.',
    category: 'Events',
  },
  {
    id: 'av',
    name: 'Facilities & AV',
    emoji: '🎤',
    blurb: 'Projectors, mics, tables, and setup crews.',
    category: 'Events',
  },
  {
    id: 'rec',
    name: 'Rec Center',
    emoji: '🏋️',
    blurb: 'Court and field rentals, equipment checkout.',
    category: 'Events',
  },
  {
    id: 'bookstore',
    name: 'Campus Bookstore',
    emoji: '📚',
    blurb: 'Custom apparel, supplies, and swag.',
    category: 'Supplies',
  },
];

export function findDepartment(id: string | undefined) {
  return DEPARTMENTS.find((department) => department.id === id);
}
