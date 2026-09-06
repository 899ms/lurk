/**
 * Writes public/brands/*.svg from the official brand marks, so no glyph here is
 * hand drawn. Run it with: node scripts/write-brand-marks.mjs
 *
 * Reddit comes from simple-icons (CC0), whose path and hex are taken from
 * https://www.redditinc.com/brand. The glyph is one filled bubble with the Snoo
 * face punched out of it, so the badge paints an FF4500 circle and then paints
 * the face white through a mask of that same path.
 *
 * Google ships its G as a single colour in simple-icons, and the real mark is
 * four colours, so its four paths and four hex values are the ones Google
 * publishes at https://developers.google.com/identity/branding-guidelines.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { siReddit, siDiscord } from "simple-icons";

const OUT = new URL("../public/brands/", import.meta.url);

const GOOGLE_G = [
  {
    hex: "#EA4335",
    d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z",
  },
  {
    hex: "#4285F4",
    d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z",
  },
  {
    hex: "#FBBC05",
    d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z",
  },
  {
    hex: "#34A853",
    d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z",
  },
];

function redditSvg() {
  const fill = `#${siReddit.hex}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="Reddit">
  <title>Reddit</title>
  <mask id="snoo">
    <circle cx="12" cy="12" r="12" fill="#FFFFFF"/>
    <path d="${siReddit.path}" fill="#000000"/>
  </mask>
  <circle cx="12" cy="12" r="12" fill="${fill}"/>
  <circle cx="12" cy="12" r="12" fill="#FFFFFF" mask="url(#snoo)"/>
</svg>
`;
}

function googleSvg() {
  const paths = GOOGLE_G.map((part) => `  <path fill="${part.hex}" d="${part.d}"/>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Google">
  <title>Google</title>
${paths}
</svg>
`;
}

await mkdir(OUT, { recursive: true });
await writeFile(new URL("reddit.svg", OUT), redditSvg());
await writeFile(new URL("google.svg", OUT), googleSvg());
console.log("wrote public/brands/reddit.svg and public/brands/google.svg");

// Slack was removed in simple-icons v15; use its last published official path.
const slackSource = "https://raw.githubusercontent.com/simple-icons/simple-icons/14.15.0/icons/slack.svg";
const slack = await fetch(slackSource);
if (!slack.ok) throw new Error("Cannot fetch the pinned Slack mark");
await writeFile(new URL("slack.svg", OUT), (await slack.text()).replace('<svg ', '<svg fill="#4A154B" '));
await writeFile(new URL("discord.svg", OUT), siDiscord.svg.replace('<svg ', `<svg fill="#${siDiscord.hex}" `));
