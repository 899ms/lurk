import { AuthorAvatar } from "@/components/AuthorAvatar";
import { SubredditChip } from "@/components/SubredditChip";
import type { MockThread } from "./mockContent";

export function ThreadIdentity({ thread }: { thread: MockThread }) {
  return (
    <div className="thread-identity">
      <AuthorAvatar name={thread.author} src={thread.avatar} size={32} />
      <span>
        u/{thread.author}
        {thread.subredditIcon ? (
          <SubredditChip
            name={thread.subreddit}
            iconUrl={thread.subredditIcon}
          />
        ) : (
          <small title="Community icon unavailable in the source">
            r/{thread.subreddit}
          </small>
        )}
      </span>
    </div>
  );
}
