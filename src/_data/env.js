// Deployment settings. PATH_PREFIX is set automatically by the GitHub Pages
// workflow when the site is served from a sub-folder (e.g. user.github.io/repo/).
const raw = process.env.PATH_PREFIX || "/";
export default {
  pathPrefix: raw,
  base: raw.replace(/\/+$/, ""), // "" or "/repo-name" – used by client-side scripts
};
