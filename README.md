From zero to a live app in about 20 minutes.

## 1. Put the code on GitHub

1. Create a free account at [github.com](https://github.com) and click **New repository** → name it `sourcechat` → Public.
2. Create these files by hand in the browser (Add file → Create new file), copying from the canvas documents:
3. `index.html`
4. `styles.css`
5. `app.js`
6. `api/embed.js`
7. `api/ask.js`
8. `README.md` (optional)
9. That's it — GitHub's web editor is fully browser-based, so you can edit everything without installing anything.

## 2. Deploy to Vercel

1. Create a free account at [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project** and import your `sourcechat` repo. Vercel auto-detects the `api/` folder as serverless functions — no config needed.
3. Click **Deploy**. You'll get a live URL like `sourcechat.vercel.app`.

## 3. Add your API key (server-side only)

1. In your Vercel project: **Settings → Environment Variables**.
2. Name: `OPENAI_API_KEY` — Value: your key from [platform.openai.com](https://platform.openai.com).
3. Redeploy once so the variable takes effect.

⚠️ **Never** put the key in `app.js` or any file that runs in the browser. It would be visible to every visitor.

## 4. Try it

1. Open your live URL.
2. Upload a PDF or `.txt` file.
3. Ask: _"What does this document say about X?"_ — you'll get an answer with numbered citations like `[1] filename.pdf, page 3`.

## How the RAG pipeline works (what you just built)

1. **Extract** — PDF.js pulls text page by page (page numbers are kept for citations).
2. **Chunk** — text is split into ~900-character chunks.
3. **Embed** — each chunk is converted to a vector via the backend.
4. **Retrieve** — at question time, cosine similarity picks the 5 most relevant chunks.
5. **Ground** — the LLM answers _only_ from those passages and cites them by number.

## Known v1 limits (fine for now)

- Sources live in the browser session — refresh clears them.
- One user, no login.
- Scanned PDFs without a text layer won't extract (PDF.js needs real text).

**Next steps from the roadmap:** persist sources/history (Supabase), chat history, multi-turn follow-ups, and authentication.
