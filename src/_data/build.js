// Build information – used for cache-busting CSS/JS and "last updated" notes.
export default function () {
  const now = new Date();
  return {
    time: now.toISOString(),
    version: now.getTime().toString(36),
    year: now.getFullYear(),
  };
}
