// Designforge — menu extraction proxy
// Fetches the restaurant page server-side, strips HTML, sends to Claude for extraction.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.API;
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  let url;
  try {
    const body = await req.json();
    url = body.url;
  } catch (e) {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!url) return json({ error: "url required" }, 400);

  // Fetch restaurant page server-side
  let pageText = "";
  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Designforge/1.0; +https://designforge23.netlify.app)" },
      signal: AbortSignal.timeout(6000),
    });
    const html = await pageRes.text();
    pageText = stripHtml(html);
  } catch (e) {
    // Continue with empty page — Claude will try from knowledge
  }

  const prompt = pageText
    ? "Below is the text content scraped from a restaurant website at " + url + ". Extract the menu.\n\nPAGE TEXT:\n" + pageText + "\n\nReturn ONLY a raw JSON object, no prose, no markdown. Exactly this shape:\n{\"categories\":[{\"name\":\"\",\"description\":\"\",\"items\":[{\"name\":\"\",\"price\":\"\",\"description\":\"\"}]}]}\n\nExtract every menu category and item you can find in the page text. Keep descriptions under 12 words. Use \"\" for missing prices. Return only the JSON."
    : "The restaurant website at " + url + " could not be fetched. Using your knowledge of this restaurant, return its menu as JSON.\n\n{\"categories\":[{\"name\":\"\",\"description\":\"\",\"items\":[{\"name\":\"\",\"price\":\"\",\"description\":\"\"}]}]}\n\nIf unknown, return {\"categories\":[]}. Return only the JSON.";

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS,
      "Content-Type": upstream.headers.get("content-type") || "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};

export const config = { path: "/api/menu" };
