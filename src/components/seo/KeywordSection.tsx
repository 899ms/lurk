import { OpportunityCard, type RankingThread } from "@/components/seo/OpportunityCard";

type KeywordSectionProps = {
  keyword: string;
  monthlyVolume: number | null;
  threads: RankingThread[];
};

function volumeLine(monthlyVolume: number | null): string {
  return monthlyVolume === null
    ? "volume with a connected wallet"
    : `${monthlyVolume.toLocaleString("en-US")} searches a month`;
}

/** One keyword, what it is worth, and every Reddit thread ranking for it. */
export function KeywordSection({ keyword, monthlyVolume, threads }: KeywordSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-h3" style={{ fontWeight: 500 }}>
          {keyword}
        </h3>
        <span className="text-small text-fg-muted">{volumeLine(monthlyVolume)}</span>
      </div>
      <div className="flex flex-col gap-2">
        {threads.map((thread) => (
          <OpportunityCard key={thread.id} thread={thread} />
        ))}
      </div>
    </section>
  );
}
