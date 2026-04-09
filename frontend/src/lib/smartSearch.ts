/**
 * Smart search: splits the query on spaces and dots, then checks that every
 * non-empty token is a substring (case-insensitive) of at least one of the
 * provided field values.
 *
 * Examples:
 *   smartMatch("ti br.", ["Tim Brown", "2024-01-01"]) → true
 *   smartMatch("1",      ["LS-0001"])                 → true
 *   smartMatch("xs",     ["Tim Brown"])               → false
 */
export function smartMatch(
  query: string,
  fields: (string | number | null | undefined)[],
): boolean {
  const tokens = query
    .toLowerCase()
    .split(/[\s.]+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) =>
    fields.some((field) => {
      if (field == null) return false;
      return String(field).toLowerCase().includes(token);
    }),
  );
}
