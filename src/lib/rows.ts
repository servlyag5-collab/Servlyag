// Home rows. "Popular picks" = the listings of the highest-paying plan that has any in these results
// (Business if there are any; otherwise Growth; otherwise Starter). "More local services" = everything
// else, highest-paying first (the order the database returns). So a row is never empty, and nobody can
// tell which plans are missing or what a business pays. `priority` comes from the tier (2, 1, 0).
export function splitRows<T extends { priority: number }>(rows: T[]) {
  if (!rows.length) return [];
  const top = Math.max(...rows.map((s) => s.priority));
  return [
    { title: 'Popular picks', list: rows.filter((s) => s.priority === top) },
    { title: 'More local services', list: rows.filter((s) => s.priority !== top) },
  ].filter((r) => r.list.length > 0);
}
