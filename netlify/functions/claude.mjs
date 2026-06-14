// Designforge — Anthropic API proxy (Netlify Functions 2.0, streaming pass-through)
// The API key lives ONLY in Netlify environment variables. Never in the frontend, never in chat.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async (req) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.API;
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return json({ error: { message: "POST only" } }, 405);
  }

  if (!apiKey) {
    return json({ error: { message: "No API key found in env" } }, 500);
  }

  let body;
  try {
    body = await req.text();
  } catch (e) {
    return json({ error: { message: "Could not read request body" } }, 400);
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
    });

    // Pass the response straight through (streams SSE when the client asked for stream:true)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...CORS,
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return json({ error: { message: "Upstream request failed: " + e.message } }, 502);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export const config = { path: "/api/claude" };
