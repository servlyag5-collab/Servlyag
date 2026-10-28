// Screen name vs business name (v16).
// display_name = business name (set on Offer a service); screen_name = chosen at sign-up.
// A chat or review started in Customer view shows the screen name; in Merchant view, the business name.
export type PersonNames = { display_name: string; screen_name?: string | null } | null | undefined;

export function customerName(p: PersonNames, asBusiness = false, fallback = 'Customer') {
  const business = p?.display_name?.trim();
  const screen = p?.screen_name?.trim();
  return (asBusiness ? business || screen : screen || business) || fallback;
}
