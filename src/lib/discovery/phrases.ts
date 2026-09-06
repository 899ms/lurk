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

/**
 * How Google ends a Reddit result's title: the community it is in, the site
 * name, or both. None of that is anything the buyer wrote, so it is cut off
 * before any phrase work, or "reddit" becomes the word every family repeats.
 */
const REDDIT_TITLE_SUFFIX = /\s*(?:[:|-]\s*r\/[a-z0-9_]+|[:|-]\s*reddit)\s*$/i;

/** One Google title as the person wrote it, without Google's own suffix. */
export function stripRedditSuffix(title: string): string {
  let text = title.trim();
  for (let cut = text.replace(REDDIT_TITLE_SUFFIX, ""); cut !== text; cut = text.replace(REDDIT_TITLE_SUFFIX, "")) {
    text = cut;
  }
  return text.trim();
}

/**
 * The part of a destination a person actually types: "Miami, Florida" is asked
 * about as "Miami". The state is how the page disambiguates it, not how the
 * buyer says it, and putting it in a search only narrows the results away.
 */
export function cityPart(name: string): string {
  return name.split(",")[0].trim();
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
 * Every number this product itself says, from its phrasings and its facts. A
 * Reddit title is full of numbers that mean nothing to us - a room rate, a
 * count of replies, a year - and only the ones the product talks about are a
 * constraint worth searching for.
 */
export function numberTerms(texts: string[]): Set<string> {
  const found = new Set<string>();
  for (const text of texts) {
    for (const word of words(text)) {
      if (isNumberWord(word)) {
        found.add(word);
      }
    }
  }
  return found;
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
    .flatMap((name) => [words(name).join(" "), words(cityPart(name)).join(" ")])
    .filter((name) => name.length > 0)
    .sort((left, right) => right.length - left.length);
  let collapsed = words(text).join(" ");
  for (const name of names) {
    collapsed = collapsed.replaceAll(name, " ");
  }
  return collapsed.replace(/\s+/g, " ").trim();
}
