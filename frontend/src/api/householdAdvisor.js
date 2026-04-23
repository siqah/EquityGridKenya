/**
 * Calls Claude via Vite dev proxy (/anthropic → api.anthropic.com).
 * Set ANTHROPIC_API_KEY in frontend/.env.local (not committed).
 */
export async function fetchHouseholdAdvisor(userPrompt) {
  const res = await fetch('/anthropic/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 280,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.content?.find((b) => b.type === 'text')?.text;
  return typeof text === 'string' ? text.trim() : '';
}
