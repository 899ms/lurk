import { PRODUCT_NAME } from "@/lib/brand";
import { EyebrowLink } from "./EyebrowLink";

export function MarketingIntro() {
  return (
    <section className="editorial-intro" id="introducing" data-proof="intro">
      <EyebrowLink href="#features">Introducing {PRODUCT_NAME}</EyebrowLink>
      <div>
        <p>
          <strong>A keyword match is only the beginning.</strong> To find a useful conversation, you
          still need to read the post, understand what the person needs, and check what that
          community allows.
        </p>
        <p>
          <strong>{PRODUCT_NAME} puts that context on the lead.</strong> It finds and scores posts
          and comments, explains the match, and drafts a reply you copy. It never posts or DMs. The
          data cost is there for you to inspect.
        </p>
      </div>
    </section>
  );
}
