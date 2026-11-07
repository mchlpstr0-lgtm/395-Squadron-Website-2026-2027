// Redirect pages for URLs from the old Squarespace site so existing links,
// bookmarks and search results keep working.
import { readdirSync, readFileSync } from "node:fs";
import yaml from "js-yaml";

const POSTS = new URL("../announcements/posts/", import.meta.url);

const fixed = [
  { from: "/alumni", to: "/80th-anniversary/" },
  { from: "/history", to: "/squadron-history/" },
  { from: "/cart", to: "/80th-anniversary/#keepsakes" },
  { from: "/calendar-1", to: "/calendar/" },
  { from: "/announcements/2025/1/6/january-2025", to: "/announcements/january-2025/" },
];

export default function () {
  const out = [...fixed];
  for (const file of readdirSync(POSTS)) {
    if (!file.endsWith(".md")) continue;
    const src = readFileSync(new URL(file, POSTS), "utf8");
    const fm = src.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    const data = yaml.load(fm[1]) || {};
    const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    for (const from of [].concat(data.oldUrls || [])) {
      out.push({ from: from.replace(/\/$/, ""), to: `/announcements/${slug}/` });
    }
  }
  return out;
}
