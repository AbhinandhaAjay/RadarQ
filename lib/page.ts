// Fetch a public web page and reduce it to readable text for the AI.

const URL_RE = /https?:\/\/[^\s<>"')]+/i;

export function findUrl(text: string): string | null {
  return text.match(URL_RE)?.[0] ?? null;
}

// Only fetch public sites; never internal or local addresses.
function assertPublic(url: string) {
  const u = new URL(url);
  const host = u.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.startsWith("[") ||
    !host.includes(".");
  if (!/^https?:$/.test(u.protocol) || privateHost) throw new Error("only public web pages can be read");
}

export async function fetchPageText(url: string, maxChars = 8000): Promise<string> {
  assertPublic(url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`The page returned HTTP ${res.status}`);
  const html = await res.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|section|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return `${title}\n${metaDesc}\n${body}`.slice(0, maxChars);
}
