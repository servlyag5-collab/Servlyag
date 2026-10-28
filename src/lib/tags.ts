// Search tags on a listing: typed as one line separated by commas, saved as a list of lowercase words.
// Each listing can have up to MAX_TAGS (see "Tag rules" in src/components/TagRules.tsx).
export const MAX_TAGS = 10;

// "Photographer, events, , photographer" -> ['photographer', 'events'] (trimmed, lowercase, no repeats).
export function parseTags(text: string): string[] {
  return [...new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

// The message to show when there are too many tags, or null when it's fine.
export function tagsProblem(text: string): string | null {
  const n = parseTags(text).length;
  return n > MAX_TAGS ? `Please use up to ${MAX_TAGS} tags (you have ${n}). Keep only the ones that describe this service.` : null;
}
