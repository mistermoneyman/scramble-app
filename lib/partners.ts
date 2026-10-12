export type PartnerItem = {
  id: string;
  name: string;
  price: number;
};

export type Partner = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  items: PartnerItem[];
};

/** Vendors the university already has contracts with. Prices in cents. */
export const PARTNERS: Partner[] = [
  {
    id: 'slice',
    name: 'Slice Society Pizza',
    emoji: '🍕',
    blurb: 'Delivers anywhere on campus in 45 minutes',
    items: [
      { id: 'cheese', name: 'Large cheese pizza', price: 1400 },
      { id: 'pepperoni', name: 'Large pepperoni pizza', price: 1600 },
      { id: 'veggie', name: 'Large veggie pizza', price: 1600 },
      { id: 'knots', name: 'Garlic knots (dozen)', price: 800 },
    ],
  },
  {
    id: 'catering',
    name: 'Campus Catering Co.',
    emoji: '🥪',
    blurb: 'Dining services catering, setup included',
    items: [
      { id: 'sandwich', name: 'Sandwich platter (serves 10)', price: 8500 },
      { id: 'snack', name: 'Individual snack box', price: 600 },
      { id: 'salad', name: 'Salad bowl (serves 8)', price: 4200 },
    ],
  },
  {
    id: 'coffee',
    name: 'Bean There Coffee',
    emoji: '☕',
    blurb: 'Student union café',
    items: [
      { id: 'traveler', name: 'Coffee traveler (serves 12)', price: 3200 },
      { id: 'tea', name: 'Hot tea service (serves 12)', price: 2400 },
    ],
  },
  {
    id: 'bakery',
    name: 'Sweet Spot Bakery',
    emoji: '🧁',
    blurb: 'Fresh daily, nut-free options',
    items: [
      { id: 'cookies', name: 'Cookies (dozen)', price: 1800 },
      { id: 'cupcakes', name: 'Cupcakes (dozen)', price: 3000 },
    ],
  },
];

export function findPartner(id: string | undefined) {
  return PARTNERS.find((partner) => partner.id === id);
}
