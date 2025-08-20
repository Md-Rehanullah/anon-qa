const API = 'https://anon-qa.onrender.com/';
const QUOTES = [
  "Ask bravely. Answer kindly.",
  "Curiosity builds bridges you can walk together.",
  "Every honest question is a step toward clarity.",
  "Silence hides confusion; questions uncover truth.",
  "Be brief, be kind, be clear.",
  "An answer shared helps two minds.",
  "Respect fuels real conversation.",
  "Listen for meaning, not for winning.",
  "Small questions open big doors.",
  "Clarity loves simple words."
];

function setRandomQuote() {
  const el = document.getElementById('quote');
  el.textContent = QUOTES[Math.floor(Math.random()*QUOTES.length)];
}
setRandomQuote();

async function fetchJSON(url, opts={}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadQuestions() {
  const { items } = await fetchJSON(`${API}/api/questions?limit=20`);
  const wrap = document.getElementById('list');
  wrap.innerHTML = '';
  for (const q of items) {
    const node = document.getElementById('qtpl').content.cloneNode(true);
    node.querySelector('.q').textContent = q.text;
    node.querySelector('[data-meta]').textContent = `${new Date(q.createdAt).toLocaleString()} • ${q.answersCount} answers`;
    const answersEl = node.querySelector('.answers');
    fetchJSON(`${API}/api/questions/${q._id || q.id}/answers`).then(({ items }) => {
      answersEl.innerHTML = items.map(a => `<div>– ${a.text}</div>`).join('');
    }).catch(()=> {});
    const form = node.querySelector('.answerForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      try {
        await fetchJSON(`${API}/api/questions/${q._id || q.id}/answer`, {
          method: 'POST', body: JSON.stringify({ text })
        });
        input.value = '';
        loadQuestions();
      } catch(err) { alert(err.message || 'Error'); }
    });
    wrap.appendChild(node);
  }
}

document.getElementById('askForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('q').value.trim();
  if (!text) return;
  try {
    await fetchJSON(`${API}/api/ask`, { method: 'POST', body: JSON.stringify({ text }) });
    document.getElementById('q').value = '';
    loadQuestions();
  } catch (err) { alert(err.message || 'Error'); }
});

loadQuestions();
