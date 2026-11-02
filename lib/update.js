'use strict';
// "Update available" check: compares the running version with the latest GitHub release.
const REPO = 'Havoksygene/RimworldModdingTool';
const API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
const PAGE_PREFIX = 'https://github.com/' + REPO + '/';

// "v1.2.3" / "1.2" -> [1,2,3]; anything else (pre-release suffixes ignored) -> null
function parse(v) {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(String(v || '').trim());
  return m ? [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)] : null;
}
function isNewer(latest, current) {
  const a = parse(latest),
    b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
// release JSON from the GitHub API -> { version, url, notes } when it is newer than `current`, else null
function fromRelease(rel, current) {
  if (!rel || rel.draft || rel.prerelease || !rel.tag_name) return null;
  if (!isNewer(rel.tag_name, current)) return null;
  const url = typeof rel.html_url === 'string' && rel.html_url.startsWith(PAGE_PREFIX) ? rel.html_url : PAGE_PREFIX + 'releases/latest';
  return { version: String(rel.tag_name).replace(/^v/, ''), url, notes: String(rel.body || '').slice(0, 600) };
}
const safeUrl = (u) => typeof u === 'string' && u.startsWith(PAGE_PREFIX);
module.exports = { API, PAGE_PREFIX, parse, isNewer, fromRelease, safeUrl };
