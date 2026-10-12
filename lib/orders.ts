import type { FundRequest } from './types';

const MINUTE = 60_000;

export type OrderStep = { label: string; at: number; done: boolean };

/** Where a placed partner order is, estimated from the delivery time. */
export function orderSteps(request: FundRequest, now: number): OrderStep[] | undefined {
  if (request.paidAt === undefined || !request.delivery) return undefined;
  const placed = request.paidAt;
  const arrive = Math.max(request.delivery.deliverAt, placed + 30 * MINUTE);
  const steps = [
    { label: 'Order placed', at: placed },
    { label: 'Being made', at: Math.max(placed, arrive - 40 * MINUTE) },
    { label: 'On the way', at: Math.max(placed, arrive - 15 * MINUTE) },
    { label: 'Delivered', at: arrive },
  ];
  return steps.map((step, index) => ({ ...step, done: index === 0 || now >= step.at }));
}

export function orderStatusLabel(request: FundRequest, now: number) {
  const steps = orderSteps(request, now);
  if (!steps) return undefined;
  return [...steps].reverse().find((step) => step.done)?.label ?? 'Order placed';
}

export function makeOrderNumber(vendorId: string) {
  return `${vendorId.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
}
