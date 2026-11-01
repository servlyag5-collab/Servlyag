// Launch promo codes (v23). A code takes percent_off off the PLAN price (not the booking add-on) for its
// first `months` payments. The database does the real sum when the plan is activated (next_promo_discount);
// this is the same sum for showing it at Checkout.
export type Promo = { code: string; percent_off: number; months: number; months_used: number; hold_until: string };

export const promoDiscount = (planPrice: number, p: Promo | null) =>
  p && p.months_used < p.months ? Math.round(planPrice * p.percent_off) / 100 : 0;

// "for your first 2 months", or "for your next month" once some discounted months are used.
export function promoMonthsLeft(p: Promo) {
  const left = p.months - p.months_used;
  if (p.months_used === 0) return `for your first ${p.months === 1 ? 'month' : `${p.months} months`}`;
  return left === 1 ? 'for your next month' : `for your next ${left} months`;
}
