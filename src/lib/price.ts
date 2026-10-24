// How a listing's price is shown everywhere: "From EC$500" (starting price, merchant gives the
// breakdown by phone/message), "EC$30" (fixed price), or "Ask for price" (no price given).
export function formatPrice(price: number | null | undefined, from?: boolean | null) {
  if (price == null) return 'Ask for price';
  const n = Number(price);
  const amount = `EC$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  return from ? `From ${amount}` : amount;
}
