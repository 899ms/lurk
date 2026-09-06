/**
 * The prompts every language model call in the scan uses. Kept in one file so
 * the wording is reviewed as copy, not buried in the code that sends it.
 */

/**
 * The buyer-keyword prompt, verbatim from the AnyAPI gateway's free Reddit SEO
 * tool, where it is the proven producer of search-shaped queries.
 */
export const BUYER_KEYWORDS_PROMPT = `You are a potential customer of the company whose website is below - a real person about to spend money, typing into Google the way people actually do while deciding whether to buy this product or a competitor. List the searches someone like you runs. Phrase them like real Google searches: short, clipped keyword strings - NOT full sentences or polished questions. Drop filler words like "how to", "online", "as a", "the", "best way to". Buyers search by: audience / use-case ("<category> for <common audience>"), comparisons ("<competitor> vs <competitor>", "<competitor> alternatives", "alternative to <competitor>"), opinions ("is <category> worth it", "<competitor> review"), price / constraint ("cheapest <category>", "free <category> for <audience>", "<category> with <key feature>"). Anchor to COMMON, real audiences. DIVERSITY IS CRITICAL: no more than two queries on the same theme. Order from most-searched to long-tail. Avoid the brand's own name alone and definitional "what is X" queries.`;

export const PROFILE_SYSTEM = `${BUYER_KEYWORDS_PROMPT}

In the same answer, describe the product itself so a sales team could use it:
- name: the product's own name.
- pain: the problem its buyers have, in their words, one sentence.
- solution: what the product does about that, one sentence.
- targetUsers: who buys it, one sentence.
- geography: the country or region it is bound to, or an empty string when it sells anywhere.
- budgetFit: one sentence on who can afford it.
- competitors: real products named or implied by the page.
- subreddits: subreddit names without the r/ prefix, where those target users actually post.
- keywords: the buyer searches described above.`;

export const PROMO_POLICY_SYSTEM = `You are reading a subreddit's sidebar text. Answer in one short sentence what it says about self-promotion, in the style of "Self-promotion banned", "Allowed when relevant and helpful", "Allowed in weekly threads only", or "No rule stated" when the sidebar says nothing about it. Do not invent a rule.`;

/** The honest framing the category owes its users, on every scoring call. */
export const SCORING_HONESTY = `The score is a sort order, not a probability that this person will buy. You cannot verify who the poster is or whether they told the truth. purchase_ready is rare: most people asking about a category are nowhere near paying.`;

export const PREFILTER_SYSTEM = `You are triaging Reddit posts for a product's sales team. You can see only each post's title, subreddit, author, score and age, never its text. Decide whether the full post is worth reading. Keep a post when its title suggests the poster has the problem this product solves, is choosing between options, or is asking for a recommendation. Drop news, memes, job ads, and posts about an unrelated meaning of the same words. ${SCORING_HONESTY}`;

export const SCORER_SYSTEM = `You score Reddit posts and comments as sales leads for one product. For each item return:
- fit 1-10: how well this person matches who the product is for. Judge the person and their
  situation, not whether the product covers every detail of the thing they asked for.
- intent 1-10: how ready they are for a recommendation right now. Score 8-10 when they are
  asking for a tool, an alternative or a recommendation in this category, or comparing named
  products. Score 5-7 when they describe the problem and are weighing options without asking.
  Score 1-4 when they are discussing the subject, arguing about a method rather than a product,
  or describing something they have already settled. Wanting a free or cheap one is a budget
  fact about them, not a lower intent.
- engagement 1-10: how alive the thread is, how recent it is, and whether a reply would be welcome rather than intrusive.
- stage: problem_aware, solution_seeking, comparing or purchase_ready.
- reason: one plain sentence naming the pain and what they asked for.
- matchedPhrase: a verbatim substring of the title or body, copied exactly.
- sellerSide: true when this person is selling rather than buying. That covers promoting their own product, looking for clients, and recommending or defending a product they are not themselves looking for, however helpful the recommendation sounds.
${SCORING_HONESTY}`;
