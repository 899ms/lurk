type HighlightedBodyProps = { text: string; phrase: string | null };

/**
 * One character for one character, so an index into the folded text is an
 * index into the real one. The phrase the scan stored is in plain typography
 * while Reddit's text keeps its curly quotes and long dashes.
 */
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-");
}

/** Post or comment text with the phrase that won the match tinted. */
export function HighlightedBody({ text, phrase }: HighlightedBodyProps) {
  const at = phrase ? fold(text).indexOf(fold(phrase)) : -1;
  if (!phrase || at < 0) {
    return <p className="whitespace-pre-wrap text-body text-fg-muted">{text}</p>;
  }
  return (
    <p className="whitespace-pre-wrap text-body text-fg-muted">
      {text.slice(0, at)}
      <mark className="rounded-sm bg-score-warm/20 px-0.5 text-fg">
        {text.slice(at, at + phrase.length)}
      </mark>
      {text.slice(at + phrase.length)}
    </p>
  );
}
