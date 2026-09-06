type HighlightedBodyProps = { text: string; phrase: string | null };

/** Post or comment text with the phrase that won the match tinted. */
export function HighlightedBody({ text, phrase }: HighlightedBodyProps) {
  const at = phrase ? text.toLowerCase().indexOf(phrase.toLowerCase()) : -1;
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
