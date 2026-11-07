// Checks every internal link, image and script in the built site (_site/)
// points at a file that exists, and that #anchors exist on the target page.
// Run with: npm run check   (after npm run build)
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const SITE = resolve("_site");
const prefix = (process.env.PATH_PREFIX || "/").replace(/\/+$/, "");
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p);
  }
})(SITE);

const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) {
    const html = readFileSync(file, "utf8");
    idsCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(file);
};

function resolveTarget(fromFile, url) {
  let path = url.split("#")[0].split("?")[0];
  if (!path) return fromFile;
  path = decodeURIComponent(path);
  let abs;
  if (path.startsWith("/")) {
    if (prefix && path.startsWith(prefix + "/")) path = path.slice(prefix.length);
    abs = join(SITE, path);
  } else abs = resolve(dirname(fromFile), path);
  if (existsSync(abs) && statSync(abs).isDirectory()) abs = join(abs, "index.html");
  return abs;
}

let problems = 0;
let checked = 0;
for (const file of files) {
  const html = readFileSync(file, "utf8");
  const isRedirect = html.includes('http-equiv="refresh"');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|sms:|webcal:|data:|javascript:|\{)/.test(url) || url.startsWith("//")) continue;
    checked++;
    const target = resolveTarget(file, url);
    if (!existsSync(target)) {
      problems++;
      console.log(`✗ ${file.replace(SITE, "")}: missing ${url}`);
      continue;
    }
    const hash = url.split("#")[1];
    if (hash && target.endsWith(".html") && !isRedirect && !idsOf(target).has(decodeURIComponent(hash))) {
      problems++;
      console.log(`✗ ${file.replace(SITE, "")}: no #${hash} on ${url}`);
    }
  }
}
console.log(`${files.length} pages, ${checked} internal links checked, ${problems} problem(s).`);
process.exit(problems ? 1 : 0);
