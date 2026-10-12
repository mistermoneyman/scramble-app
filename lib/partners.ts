/** One pick from an option group. `price` is added to the item price, in cents. */
export type Choice = {
  id: string;
  label: string;
  price: number;
  /** Overrides the item's serving count, e.g. pizza size. */
  serves?: number;
};

export type OptionGroup = {
  id: string;
  label: string;
  /** `one` must have exactly one pick (defaults to the first); `many` is optional. */
  kind: 'one' | 'many';
  max?: number;
  choices: Choice[];
};

export type PartnerItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  serves: number;
  options: OptionGroup[];
};

export type Partner = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  deliveryFee: number;
  /** How far ahead an order has to be placed. */
  leadMinutes: number;
  items: PartnerItem[];
};

const choice = (label: string, price = 0, serves?: number): Choice => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label,
  price,
  serves,
});

const PIZZA_SIZE: OptionGroup = {
  id: 'size',
  label: 'Size',
  kind: 'one',
  choices: [choice('Large 14"', 0, 3), choice('Medium 12"', -300, 2), choice('XL 18"', 500, 5)],
};

const CRUST: OptionGroup = {
  id: 'crust',
  label: 'Crust',
  kind: 'one',
  choices: [choice('Hand-tossed'), choice('Thin'), choice('Gluten-free', 300)],
};

const TOPPINGS: OptionGroup = {
  id: 'toppings',
  label: 'Toppings',
  kind: 'many',
  max: 5,
  choices: [
    'Pepperoni',
    'Sausage',
    'Bacon',
    'Mushrooms',
    'Onions',
    'Green peppers',
    'Black olives',
    'Jalapeños',
    'Pineapple',
    'Extra cheese',
  ].map((label) => choice(label, 150)),
};

/** Vendors the university already has contracts with. Prices in cents. */
export const PARTNERS: Partner[] = [
  {
    id: 'slice',
    name: 'Slice Society Pizza',
    emoji: '🍕',
    blurb: 'Delivers anywhere on campus. Order at least an hour ahead.',
    deliveryFee: 399,
    leadMinutes: 60,
    items: [
      {
        id: 'cheese',
        name: 'Cheese pizza',
        description: 'Red sauce, whole-milk mozzarella',
        price: 1400,
        serves: 3,
        options: [PIZZA_SIZE, CRUST, { ...TOPPINGS, label: 'Add toppings' }],
      },
      {
        id: 'pepperoni',
        name: 'Pepperoni pizza',
        description: 'Cup-and-char pepperoni',
        price: 1600,
        serves: 3,
        options: [PIZZA_SIZE, CRUST, { ...TOPPINGS, label: 'Add toppings' }],
      },
      {
        id: 'byo',
        name: 'Build your own',
        description: 'Pick a sauce and up to five toppings',
        price: 1400,
        serves: 3,
        options: [
          PIZZA_SIZE,
          CRUST,
          {
            id: 'sauce',
            label: 'Sauce',
            kind: 'one',
            choices: [choice('Red sauce'), choice('White garlic'), choice('BBQ'), choice('Pesto', 100)],
          },
          TOPPINGS,
        ],
      },
      {
        id: 'knots',
        name: 'Garlic knots',
        description: 'A dozen, brushed with garlic butter',
        price: 800,
        serves: 4,
        options: [
          {
            id: 'dip',
            label: 'Dip',
            kind: 'one',
            choices: [choice('Marinara'), choice('Ranch'), choice('No dip')],
          },
        ],
      },
      {
        id: 'soda',
        name: '2-liter soda',
        description: 'Cups included',
        price: 350,
        serves: 6,
        options: [
          {
            id: 'flavor',
            label: 'Flavor',
            kind: 'one',
            choices: [choice('Coke'), choice('Diet Coke'), choice('Sprite'), choice('Lemonade')],
          },
        ],
      },
    ],
  },
  {
    id: 'catering',
    name: 'Campus Catering Co.',
    emoji: '🥪',
    blurb: 'Dining services catering, setup included. Order two days ahead.',
    deliveryFee: 0,
    leadMinutes: 48 * 60,
    items: [
      {
        id: 'sandwich',
        name: 'Sandwich platter',
        description: 'Assorted halves, chips, and pickles',
        price: 8500,
        serves: 10,
        options: [
          {
            id: 'mix',
            label: 'Mix',
            kind: 'one',
            choices: [choice('Classic mix'), choice('All vegetarian'), choice('Gluten-free bread', 1000)],
          },
        ],
      },
      {
        id: 'snack',
        name: 'Snack box',
        description: 'Fruit, granola bar, and chips',
        price: 600,
        serves: 1,
        options: [
          {
            id: 'diet',
            label: 'Dietary',
            kind: 'one',
            choices: [choice('Standard'), choice('Vegan'), choice('Nut-free')],
          },
        ],
      },
      {
        id: 'salad',
        name: 'Salad bowl',
        description: 'Serves eight as a side',
        price: 4200,
        serves: 8,
        options: [
          {
            id: 'salad',
            label: 'Salad',
            kind: 'one',
            choices: [choice('Garden'), choice('Caesar'), choice('Greek', 500)],
          },
        ],
      },
    ],
  },
  {
    id: 'coffee',
    name: 'Bean There Coffee',
    emoji: '☕',
    blurb: 'Student union café. Order two hours ahead.',
    deliveryFee: 0,
    leadMinutes: 120,
    items: [
      {
        id: 'traveler',
        name: 'Coffee traveler',
        description: 'Cups, cream, and sugar included',
        price: 3200,
        serves: 12,
        options: [
          {
            id: 'roast',
            label: 'Roast',
            kind: 'one',
            choices: [choice('House blend'), choice('Dark roast'), choice('Decaf')],
          },
          {
            id: 'extras',
            label: 'Extras',
            kind: 'many',
            choices: [choice('Oat milk', 200), choice('Pastry box (12)', 2400)],
          },
        ],
      },
      {
        id: 'tea',
        name: 'Hot tea service',
        description: 'Hot water and assorted tea bags',
        price: 2400,
        serves: 12,
        options: [],
      },
    ],
  },
  {
    id: 'bakery',
    name: 'Sweet Spot Bakery',
    emoji: '🧁',
    blurb: 'Fresh daily, nut-free options. Order a day ahead.',
    deliveryFee: 500,
    leadMinutes: 24 * 60,
    items: [
      {
        id: 'cookies',
        name: 'Cookies',
        description: 'A dozen, individually wrapped',
        price: 1800,
        serves: 12,
        options: [
          {
            id: 'flavor',
            label: 'Flavor',
            kind: 'one',
            choices: [choice('Chocolate chip'), choice('Sugar'), choice('Assorted')],
          },
          {
            id: 'diet',
            label: 'Dietary',
            kind: 'one',
            choices: [choice('Standard'), choice('Nut-free'), choice('Vegan', 300)],
          },
        ],
      },
      {
        id: 'cupcakes',
        name: 'Cupcakes',
        description: 'A dozen, buttercream frosting',
        price: 3000,
        serves: 12,
        options: [
          {
            id: 'flavor',
            label: 'Flavor',
            kind: 'one',
            choices: [choice('Vanilla'), choice('Chocolate'), choice('Assorted')],
          },
        ],
      },
    ],
  },
];

export const DELIVERY_SPOTS = [
  'Student Union 204',
  'Library steps',
  'Engineering atrium',
  'Rec Center lobby',
];

export function findPartner(id: string | undefined) {
  return PARTNERS.find((partner) => partner.id === id);
}

/** groupId -> chosen choice ids. */
export type Selection = Record<string, string[]>;

export function defaultSelection(item: PartnerItem): Selection {
  return Object.fromEntries(
    item.options.map((group) => [group.id, group.kind === 'one' ? [group.choices[0].id] : []]),
  );
}

function chosen(item: PartnerItem, selection: Selection) {
  return item.options.flatMap((group) =>
    group.choices.filter((c) => selection[group.id]?.includes(c.id)),
  );
}

export function priceFor(item: PartnerItem, selection: Selection) {
  return item.price + chosen(item, selection).reduce((total, c) => total + c.price, 0);
}

export function servesFor(item: PartnerItem, selection: Selection) {
  return chosen(item, selection).find((c) => c.serves !== undefined)?.serves ?? item.serves;
}

/** Human-readable summary of the picks, e.g. "Large 14" · Thin · Mushrooms, Onions". */
export function describe(item: PartnerItem, selection: Selection) {
  return item.options
    .map((group) =>
      group.choices
        .filter((c) => selection[group.id]?.includes(c.id))
        .map((c) => c.label)
        .join(', '),
    )
    .filter(Boolean)
    .join(' · ');
}
