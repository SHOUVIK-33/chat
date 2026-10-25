// ---------- PDF.js ----------
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

// ---------- State ----------
const chunks = [];   // { text, source, page, embedding }
let busy = false;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const sourceList = $("sourceList");
const messagesEl = $("messages");
const fileInput = $("fileInput");

$("uploadBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  [...fileInput.files].forEach(processFile);
  fileInput.value = "";
});
$("chatForm").addEventListener("submit", onSend);

// ---------- File processing ----------
async function processFile(file) {
  const item = addSource(file.name, "reading…");
  try {
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const text = content.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
        addChunks(text, file.name, p);
      }
      item.querySelector(".status").textContent = `${pdf.numPages} pages · ${countSource(file.name)} chunks`;
    } else {
      const text = await file.text();
      addChunks(text, file.name, 1);
      item.querySelector(".status").textContent = `ready · ${countSource(file.name)} chunks`;
    }
  } catch (err) {
    item.querySelector(".status").textContent = "failed to read";
    console.error(err);
  }
}

function addChunks(text, source, page) {
  const SIZE = 900;
  for (let i = 0; i < text.length; i += SIZE) {
    const slice = text.slice(i, i + SIZE);
    if (slice.trim().length < 40) continue;
    chunks.push({ text: slice, source, page, embedding: null });
  }
}

const countSource = (name) => chunks.filter((c) => c.source === name).length;

// ---------- Embeddings (via backend, so the API key stays server-side) ----------
async function embedPending() {
  const pending = chunks.filter((c) => !c.embedding);
  for (let i = 0; i < pending.length; i += 16) {
    const batch = pending.slice(i, i + 16);
    const res = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: batch.map((c) => c.text) }),
    });
    if (!res.ok) throw new Error("Embedding request failed");
    const { embeddings } = await res.json();
    batch.forEach((c, j) => (c.embedding = embeddings[j]));
  }
}

// ---------- Retrieval ----------
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

async function retrieve(question) {
  const res = await fetch("/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: [question] }),
  });
  if (!res.ok) throw new Error("Embedding request failed");
  const { embeddings } = await res.json();
  return chunks
    .map((c) => ({ ...c, score: cosine(embeddings[0], c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ---------- Chat ----------
async function onSend(e) {
  e.preventDefault();
  const input = $("chatInput");
  const question = input.value.trim();
  if (!question || busy) return;
  if (chunks.length === 0) return alert("Upload a source first.");
  busy = true;
  input.value = "";
  document.querySelector(".empty-state")?.remove();
  addMessage("user", question);
  const thinking = addMessage("assistant", "Reading your sources…");
  try {
    await embedPending();
    const passages = await retrieve(question);
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, passages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    thinking.querySelector(".bubble").innerHTML = renderAnswer(data.answer, passages);
  } catch (err) {
    thinking.querySelector(".bubble").textContent = "⚠️ " + err.message;
  } finally {
    busy = false;
  }
}

function renderAnswer(answer, passages) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const cites = passages
    .map((p, i) => `<li>[${i + 1}] ${esc(p.source)}, page ${p.page}</li>`)
    .join("");
  return `${esc(answer)}<ol class="citations">${cites}</ol>`;
}

// ---------- Rendering helpers ----------
function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = role === "user"
    ? ""
    : '<div class="bubble"></div>';
  if (role === "user") div.textContent = text;
  else div.querySelector(".bubble").textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function addSource(name, status) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="name"></span><span class="status"></span>`;
  li.querySelector(".name").textContent = name;
  li.querySelector(".status").textContent = status;
  sourceList.appendChild(li);
  return li;
}
