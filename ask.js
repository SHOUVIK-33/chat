export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });



  const { question, passages } = req.body ?? {};

  if (!question || !Array.isArray(passages))

    return res.status(400).json({ error: "question and passages required" });



  const context = passages

    .map((p, i) => `[${i + 1}] (${p.source}, page ${p.page})\n${p.text}`)

    .join("\n\n");



  try {

    const r = await fetch("https://api.openai.com/v1/chat/completions", {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,

      },

      body: JSON.stringify({

        model: "gpt-4o-mini",

        temperature: 0.2,

        messages: [

          {

            role: "system",

            content:

              "Answer the user's question using ONLY the numbered passages provided. " +

              "Cite the passages you used like [1][3]. " +

              "If the passages do not contain the answer, say so honestly.",

          },

          {

            role: "user",

            content: `Passages:\n\n${context}\n\nQuestion: ${question}`,

          },

        ],

      }),

    });

    const data = await r.json();

    res.status(r.ok ? 200 : 500).json(

      r.ok ? { answer: data.choices[0].message.content }

           : { error: data.error?.message ?? "LLM call failed" }

    );

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

}
