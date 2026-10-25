export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });



  const { inputs } = req.body ?? {};

  if (!Array.isArray(inputs) || inputs.length === 0)

    return res.status(400).json({ error: "inputs[] required" });



  try {

    const r = await fetch("https://api.openai.com/v1/embeddings", {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,

      },

      body: JSON.stringify({ model: "text-embedding-3-small", input: inputs }),

    });

    const data = await r.json();

    res.status(r.ok ? 200 : 500).json(

      r.ok ? { embeddings: data.data.map((d) => d.embedding) }

           : { error: data.error?.message ?? "Embedding failed" }

    );

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

}
