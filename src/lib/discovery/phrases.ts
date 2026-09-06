/**
 * How a buyer's sentence becomes words we can search and group by. Everything
 * that carries the buyer's constraint survives: ages, negations, prices and
 * the words around a stay, because "hotels that let 19 year olds check in"
 * and "hotels" are not the same demand and must never collapse into one.
 */

/** Words that carry no demand of their own, so a query is better without them. */
const FILLER = new Set([
  "a", "am", "an", "and", "any", "anyone", "are", "as", "at", "be", "been", "being", "but",
  "by", "can", "could", "did", "do", "does", "for", "from", "get", "got", "had", "has",
  "have", "how", "i", "if", "im", "in", "is", "it", "its", "just", "me", "my", "of", "on",
  "or", "our", "really", "should", "so", "some", "somewhere", "that", "the", "their",
  "there", "they", "this", "to", "us", "very", "was", "we", "were", "what", "when", "where",
  "which", "who", "why", "will", "with", "would", "you", "your",
]);

/**
 * Words a buyer uses to state a limit or a refusal. None of these is filler,
 * however common it is, because dropping one inverts what the person asked.
 */
const CONSTRAINT_WORDS = new Set([
  "cannot", "cant", "check", "checkin", "checking", "denied", "minimum", "no", "non",
  "not", "over", "refuse", "refused", "turned", "under", "without", "wont",
]);

/** True for a word this app must keep even though it looks like filler. */
export function isConstraintWord(word: string): boolean {
  return CONSTRAINT_WORDS.has(word);
}

/** True for a bare number, which in this app is almost always an age or a price. */
export function isNumberWord(word: string): boolean {
  return /^\d+$/.test(word);
}

/** One sentence as lowercase words, punctuation and possessives dropped. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 0);
}

/** The words worth searching for: the demand without the grammar around it. */
export function meaningWords(text: string): string[] {
  return words(text).filter(
    (word) => isNumberWord(word) || isConstraintWord(word) || !FILLER.has(word),
  );
}

/**
 * The problem family one phrasing belongs to. Two phrasings of the same demand
 * share their leading meaning words, which is what makes this stable enough to
 * key evidence on without asking the model for a label it would invent.
 */
export function familyKey(phrasing: string): string {
  const kept = meaningWords(phrasing).slice(0, 3);
  return kept.length > 0 ? kept.join("-") : "unnamed";
}

/**
 * The same phrase with every place name taken out. "hotels in vegas for 19
 * year olds" and "hotels in nyc for 19 year olds" are one demand asked in two
 * cities, so ranking must see one phrase, not two.
 */
export function collapseDestinations(text: string, destinations: string[]): string {
  const names = destinations
    .map((name) => words(name).join(" "))
    .filter((name) => name.length > 0)
    .sort((left, right) => right.length - left.length);
  let collapsed = words(text).join(" ");
  for (const name of names) {
    collapsed = collapsed.replaceAll(name, " ");
  }
  return collapsed.replace(/\s+/g, " ").trim();
}
