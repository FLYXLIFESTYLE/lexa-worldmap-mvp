/**
 * System prompt addendum when concierge databases are unavailable.
 */

export function getClaudeOnlyContextNote(options: {
  supabaseUnavailable: boolean;
  neo4jUnavailable: boolean;
}): string {
  if (!options.supabaseUnavailable && !options.neo4jUnavailable) return '';

  const parts: string[] = [
    '\n## Offline concierge mode',
    'The live concierge knowledge base is temporarily unavailable.',
    'Continue the conversation using your general luxury travel expertise.',
    'You may suggest well-known destinations and experience concepts, but do not present them as verified concierge picks.',
    'Keep the LEXA tone: concise, warm, and emotionally intelligent.',
  ];

  if (options.neo4jUnavailable) {
    parts.push('Do not claim recommendations are grounded in the company POI database.');
  }

  if (options.supabaseUnavailable) {
    parts.push('This conversation is not being saved — the user will refine stories with concierge knowledge later.');
  }

  return parts.join('\n');
}
