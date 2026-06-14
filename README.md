# Designforge — Deploy Guide

Restaurant website generator by Postforge. Complete build: design extraction (URL / brand guide / description), Presence report intake, 6-step wizard, streaming AI generation, post-generation revisions, autosave.

## What's in this folder

```
designforge-deploy/
├── index.html                      # the entire app (React, single file)
├── netlify.toml                    # Netlify config
└── netlify/functions/claude.mjs    # API proxy — your key lives in Netlify, never in the app
```

## Deploy (Claude Code, recommended)

From this folder, paste into Claude Code:

```
Deploy this folder to Netlify as a new site using the Netlify CLI (netlify deploy --prod).
After deploying, remind me to add ANTHROPIC_API_KEY in Site configuration → Environment
variables, then trigger a redeploy so the function picks it up.
```

## Deploy (manual)

1. Go to **app.netlify.com/drop** and drag the whole `designforge-deploy` folder in
2. In the new site: **Site configuration → Environment variables** → add `ANTHROPIC_API_KEY` = your key from console.anthropic.com
3. **Deploys → Trigger deploy** (the function only sees the key after a redeploy)
4. Open the site URL — done

> Never paste the API key into the app or into a chat. It goes in Netlify's environment variables only. If a key ever leaks, Anthropic auto-disables it.

## How it's wired

- All AI calls go to `/api/claude`, a Netlify function that adds the key server-side and **streams** the response — long site generations don't hit function timeouts
- Design extraction from a URL uses the API's web search tool to actually look at the site
- Brand guide upload accepts PDF or image (sent to Claude as a document/image block)
- The Presence import box (step 2) parses a pasted Presence AI report and pre-fills restaurant info + locations
- Generated sites are single-file, crawlable HTML with embedded menu, order-direct CTAs, per-location schema.org markup, and a "Site by Postforge" footer
- Everything autosaves to the browser's localStorage; "start over" clears it

## Costs

Each generation is one Sonnet call (~15–25K output tokens). Extraction/import calls are small. Netlify free tier covers the hosting and function comfortably at prototype volume.

## Known limits (v1)

- Generated sites use placeholder images — swap in real photos before a client sees it
- No hosting/edit panel for the *generated* sites yet — that's the recurring-revenue layer to build next
- Revisions send the whole site back through the model; very large sites cost more per edit
