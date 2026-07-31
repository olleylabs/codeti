const PLACEHOLDER = "<player>";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The site's directory listing and a player's own page can render the same
// name differently (e.g. directory "Gabe Alvarez" vs page "Gabe Álvarez").
// Stripping diacritics before matching lets the redaction find the name
// either way; it doesn't change how "exactly three a's" is counted, which
// still runs against the literal directory name in nameFilter.ts.
function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function normalizeQuestion(question: string, playerName: string): string {
  const collapsed = stripDiacritics(question.replace(/\s+/g, " ").trim());
  const escapedName = escapeRegExp(stripDiacritics(playerName));

  // "Adams'" and "Acosta's" are both grammatically correct possessives of a
  // player's name; without this they'd normalize to two different questions
  // purely because one name happens to end in "s". Collapse both to "'s".
  const possessiveRegex = new RegExp(`${escapedName}'s?`, "gi");
  const withPossessive = collapsed.replace(possessiveRegex, `${PLACEHOLDER}'s`);

  const nameRegex = new RegExp(escapedName, "gi");
  const withPlaceholder = withPossessive.replace(nameRegex, PLACEHOLDER);

  return withPlaceholder.toLowerCase();
}
